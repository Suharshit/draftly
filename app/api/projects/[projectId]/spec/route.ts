import { auth } from "@clerk/nextjs/server";

import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { getSpecStatus, startSpecRun } from "@/lib/spec/spec-store";

type SpecRouteContext = { params: Promise<{ projectId: string }> };

async function resolveProject(projectId: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const { primaryEmail } = await getCurrentIdentity();
  const project = await getAccessibleProject(userId, primaryEmail, projectId);
  if (!project) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  return { project, userId } as const;
}

/**
 * The project's spec status: the stored spec (if any), a pending run, or why
 * the latest run failed. A finished run is stored before responding.
 */
export async function GET(_request: Request, context: SpecRouteContext) {
  const { projectId } = await context.params;
  const result = await resolveProject(projectId);
  if ("error" in result) {
    return result.error;
  }

  return Response.json(await getSpecStatus(result.project.id));
}

/** Starts generating a spec from the current canvas. Owners and collaborators can generate. */
export async function POST(_request: Request, context: SpecRouteContext) {
  const { projectId } = await context.params;
  const result = await resolveProject(projectId);
  if ("error" in result) {
    return result.error;
  }

  const started = await startSpecRun({
    projectId: result.project.id,
    userId: result.userId,
    projectName: result.project.name,
  });

  if (started.ok) {
    return Response.json({ runId: started.runId }, { status: 202 });
  }
  if (started.status === 409) {
    return Response.json({ error: started.error, runId: started.runId }, { status: 409 });
  }
  return Response.json({ error: started.error }, { status: started.status });
}
