import { auth } from "@clerk/nextjs/server";

import { MAX_QUESTIONS_PER_ROUND } from "@/lib/ai/agent-schema";
import { MAX_MESSAGE_LENGTH } from "@/lib/ai/session-limits";
import { startTurn, type TurnInput } from "@/lib/ai/session-turns";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";

type TurnRouteContext = { params: Promise<{ projectId: string; sessionId: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Accepts one of:
 * - `{ type: "message", text }` — free text, 1 to MAX_MESSAGE_LENGTH characters
 * - `{ type: "answers", answers: [{ questionId, answer }] }` — replies to the open questions
 * - `{ type: "generate" }` — draw the latest plan
 * - `{ type: "skip" }` — stop asking questions and plan with assumptions
 */
function parseTurnInput(value: unknown): TurnInput | null {
  if (!isRecord(value)) {
    return null;
  }

  switch (value.type) {
    case "message": {
      if (typeof value.text !== "string") {
        return null;
      }
      const text = value.text.trim();
      return text.length > 0 && text.length <= MAX_MESSAGE_LENGTH ? { type: "message", text } : null;
    }

    case "answers": {
      if (!Array.isArray(value.answers) || value.answers.length === 0) {
        return null;
      }
      if (value.answers.length > MAX_QUESTIONS_PER_ROUND) {
        return null;
      }
      const answers = value.answers.flatMap((entry) =>
        isRecord(entry) && typeof entry.questionId === "string" && typeof entry.answer === "string"
          ? [{ questionId: entry.questionId, answer: entry.answer }]
          : [],
      );
      return answers.length === value.answers.length ? { type: "answers", answers } : null;
    }

    case "generate":
      return { type: "generate" };

    case "skip":
      return { type: "skip" };

    default:
      return null;
  }
}

/**
 * Sends a turn in one of the current user's sessions and starts the design
 * agent run that answers it. Responds 202 with the updated session (the reply
 * is a PENDING message carrying the run id), or 502 with the session when the
 * run could not be started.
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

  const input = parseTurnInput(body);
  if (!input) {
    return Response.json({ error: "Invalid turn" }, { status: 400 });
  }

  const { projectId, sessionId } = await context.params;
  const { primaryEmail } = await getCurrentIdentity();
  const project = await getAccessibleProject(userId, primaryEmail, projectId);
  if (!project) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await startTurn({ projectId: project.id, userId }, sessionId, input);
  if (result.ok) {
    return Response.json({ session: result.session }, { status: 202 });
  }

  return Response.json(
    { error: result.error, ...(result.session ? { session: result.session } : {}) },
    { status: result.status },
  );
}
