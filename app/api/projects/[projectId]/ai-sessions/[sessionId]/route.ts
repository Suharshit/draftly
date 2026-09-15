import { auth } from "@clerk/nextjs/server";

import { deleteSession, getSession } from "@/lib/ai/session-store";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";

type SessionRouteContext = { params: Promise<{ projectId: string; sessionId: string }> };

function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

// Sessions are private to their creator, so another user's session id reads
// the same as one that never existed.
function notFoundResponse() {
  return Response.json({ error: "Session not found" }, { status: 404 });
}

async function resolveScope(projectId: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: unauthorizedResponse() } as const;
  }

  const { primaryEmail } = await getCurrentIdentity();
  const project = await getAccessibleProject(userId, primaryEmail, projectId);
  if (!project) {
    return { error: forbiddenResponse() } as const;
  }

  return { scope: { projectId: project.id, userId } } as const;
}

/** Returns one of the current user's sessions with its full transcript. */
export async function GET(_request: Request, context: SessionRouteContext) {
  const { projectId, sessionId } = await context.params;
  const result = await resolveScope(projectId);
  if ("error" in result) {
    return result.error;
  }

  const session = await getSession(result.scope, sessionId);
  if (!session) {
    return notFoundResponse();
  }

  return Response.json({ session });
}

export async function DELETE(_request: Request, context: SessionRouteContext) {
  const { projectId, sessionId } = await context.params;
  const result = await resolveScope(projectId);
  if ("error" in result) {
    return result.error;
  }

  const deleted = await deleteSession(result.scope, sessionId);
  if (!deleted) {
    return notFoundResponse();
  }

  return new Response(null, { status: 204 });
}
