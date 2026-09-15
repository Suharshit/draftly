import { auth } from "@clerk/nextjs/server";

import { MAX_MESSAGE_LENGTH } from "@/lib/ai/session-limits";
import { startTurn } from "@/lib/ai/session-turns";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";

type TurnRouteContext = { params: Promise<{ projectId: string; sessionId: string }> };

/** Only `{ type: "message", text }` for now; answers/generate/skip arrive with the turn engine. */
function parseMessageText(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.type !== "message" || typeof candidate.text !== "string") {
    return null;
  }

  const text = candidate.text.trim();
  if (text.length === 0 || text.length > MAX_MESSAGE_LENGTH) {
    return null;
  }

  return text;
}

/**
 * Sends a message in one of the current user's sessions and starts the design
 * run that answers it. Responds 202 with the updated session (the reply is a
 * PENDING message carrying the run id), or 502 with the session when the run
 * could not be started.
 */
export async function POST(request: Request, context: TurnRouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const text = parseMessageText(body);
  if (!text) {
    return Response.json(
      { error: `Message text is required and must be at most ${MAX_MESSAGE_LENGTH} characters` },
      { status: 400 },
    );
  }

  const { projectId, sessionId } = await context.params;
  const { primaryEmail } = await getCurrentIdentity();
  const project = await getAccessibleProject(userId, primaryEmail, projectId);
  if (!project) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await startTurn({ projectId: project.id, userId }, sessionId, text);
  if (result.ok) {
    return Response.json({ session: result.session }, { status: 202 });
  }

  return Response.json(
    { error: result.error, ...(result.session ? { session: result.session } : {}) },
    { status: result.status },
  );
}
