import { auth } from "@clerk/nextjs/server";

import { createSession, DEFAULT_SESSION_TITLE, listSessions } from "@/lib/ai/session-store";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";

function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
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

/** Optional `title`; anything else in the body is ignored. */
function parseTitle(value: unknown): string {
  if (typeof value === "object" && value !== null && "title" in value && typeof value.title === "string") {
    return value.title;
  }
  return DEFAULT_SESSION_TITLE;
}

/** Lists the current user's unexpired AI sessions in this project, most recent first. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const result = await resolveScope(projectId);
  if ("error" in result) {
    return result.error;
  }

  const sessions = await listSessions(result.scope);
  return Response.json({ sessions });
}

/** Starts a new AI session for the current user in this project. */
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const result = await resolveScope(projectId);
  if ("error" in result) {
    return result.error;
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // An empty body is allowed; the session gets the default title.
  }

  const session = await createSession(result.scope, parseTitle(body));
  return Response.json({ session }, { status: 201 });
}
