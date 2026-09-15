import { ApiError, runs, tasks } from "@trigger.dev/sdk/v3";

import {
  computeExpiresAt,
  DEFAULT_SESSION_TITLE,
  getSession,
  MAX_MESSAGES_PER_SESSION,
  toSessionTitle,
} from "@/lib/ai/session-store";
import { prisma } from "@/lib/prisma";
import type { designAgentTask } from "@/src/trigger/design-agent";
import type { AiMessageKind, AiMessageStatus, AiSessionDetail, AiSessionPhase } from "@/types/ai-session";

// ---------------------------------------------------------------------------
// Turns
//
// A turn is one user message plus the assistant message a Trigger.dev run
// produces for it. The assistant message is stored PENDING with the run id
// when the run starts, and settled from the run's final state whenever the
// session is read. Settling on read (not from the client) means a turn is
// saved even if the tab closed mid-run, and the task itself never needs the
// database.
// ---------------------------------------------------------------------------

interface SessionScope {
  projectId: string;
  userId: string;
}

const GENERIC_RUN_ERROR = "Something went wrong generating the design. Try again.";

export function summarizeDesignResult(nodeCount: number, edgeCount: number): string {
  if (nodeCount === 0) {
    return "The design run finished but produced no components. Try a more specific prompt.";
  }

  return (
    `Added ${nodeCount} component${nodeCount === 1 ? "" : "s"} and ` +
    `${edgeCount} connection${edgeCount === 1 ? "" : "s"} to the canvas.`
  );
}

interface TurnOutcome {
  kind: AiMessageKind;
  status: AiMessageStatus;
  content: string;
  payload?: { nodeCount: number; edgeCount: number };
  phase: AiSessionPhase;
}

function failedOutcome(content: string): TurnOutcome {
  return { kind: "ERROR", status: "FAILED", content, phase: "CLARIFYING" };
}

/**
 * Writes a run's outcome onto its pending message. The status guard makes this
 * safe to call concurrently: only the first caller changes anything.
 */
async function applyOutcome(sessionId: string, messageId: string, outcome: TurnOutcome): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.aiMessage.updateMany({
      where: { id: messageId, sessionId, status: "PENDING" },
      data: {
        kind: outcome.kind,
        status: outcome.status,
        content: outcome.content,
        ...(outcome.payload ? { payload: outcome.payload } : {}),
      },
    });

    if (count === 0) {
      return false;
    }

    await tx.aiSession.update({ where: { id: sessionId }, data: { phase: outcome.phase } });
    return true;
  });
}

/**
 * Settles one pending message from its run. Leaves it pending while the run is
 * still going or Trigger.dev can't be reached.
 *
 * Returns true once the run has finished — whether this call stored the
 * outcome or a concurrent read already had — so the caller knows its copy of
 * the session is stale.
 */
async function settleTurn(sessionId: string, messageId: string, runId: string): Promise<boolean> {
  let run: Awaited<ReturnType<typeof runs.retrieve<typeof designAgentTask>>>;
  try {
    run = await runs.retrieve<typeof designAgentTask>(runId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await applyOutcome(sessionId, messageId, failedOutcome("The design run could not be found. Try again."));
      return true;
    }
    console.error("[ai-sessions] failed to retrieve run", runId, error);
    return false;
  }

  let outcome: TurnOutcome;
  if (run.isSuccess) {
    const nodeCount = run.output?.nodeCount ?? 0;
    const edgeCount = run.output?.edgeCount ?? 0;
    outcome = {
      kind: "RESULT",
      status: "COMPLETE",
      content: summarizeDesignResult(nodeCount, edgeCount),
      payload: { nodeCount, edgeCount },
      phase: "COMPLETE",
    };
  } else if (run.isCancelled) {
    outcome = failedOutcome("The design run was cancelled.");
  } else if (run.isFailed) {
    outcome = failedOutcome(run.error?.message ?? GENERIC_RUN_ERROR);
  } else {
    return false;
  }

  await applyOutcome(sessionId, messageId, outcome);
  return true;
}

/** Loads a session after settling any of its turns whose runs have finished. */
export async function getSettledSession(scope: SessionScope, sessionId: string): Promise<AiSessionDetail | null> {
  const session = await getSession(scope, sessionId);
  if (!session) {
    return null;
  }

  const pending = session.messages.filter((message) => message.status === "PENDING" && message.runId);
  if (pending.length === 0) {
    return session;
  }

  const changed = await Promise.all(
    pending.map((message) => settleTurn(session.id, message.id, message.runId as string)),
  );

  return changed.some(Boolean) ? getSession(scope, sessionId) : session;
}

export type StartTurnResult =
  | { ok: true; session: AiSessionDetail }
  | { ok: false; status: 404 | 409 | 502; error: string; session?: AiSessionDetail };

/**
 * Records a user message and starts the design run that answers it.
 *
 * The run is triggered before anything is written, so a stored PENDING message
 * always has a run id to settle from. If the trigger fails, the user message is
 * still stored with an error reply, so the transcript explains what happened.
 */
export async function startTurn(scope: SessionScope, sessionId: string, text: string): Promise<StartTurnResult> {
  const session = await getSettledSession(scope, sessionId);
  if (!session) {
    return { ok: false, status: 404, error: "Session not found" };
  }

  if (session.messages.some((message) => message.status === "PENDING")) {
    return { ok: false, status: 409, error: "A reply is still being generated" };
  }

  if (session.messages.length + 2 > MAX_MESSAGES_PER_SESSION) {
    return { ok: false, status: 409, error: "This chat is full. Start a new chat to keep designing." };
  }

  let runId: string | null = null;
  try {
    const handle = await tasks.trigger<typeof designAgentTask>("design-agent", {
      prompt: text,
      roomId: scope.projectId,
    });
    runId = handle.id;
  } catch (error) {
    // wrong-environment TRIGGER_SECRET_KEY, a branch env that does not exist, or
    // no deployed version of the task.
    console.error("[ai-sessions] failed to trigger design-agent", error);
  }

  // Explicit timestamps keep the reply ordered after the prompt; both rows are
  // written in one transaction, where the database clock would not advance.
  const userAt = new Date();
  const replyAt = new Date(userAt.getTime() + 1);

  await prisma.$transaction(async (tx) => {
    await tx.aiMessage.create({
      data: { sessionId, role: "USER", kind: "TEXT", content: text, createdAt: userAt },
    });

    await tx.aiMessage.create({
      data: runId
        ? { sessionId, role: "ASSISTANT", kind: "TEXT", content: "", runId, status: "PENDING", createdAt: replyAt }
        : {
            sessionId,
            role: "ASSISTANT",
            kind: "ERROR",
            content: "The design service is unreachable right now, so nothing was generated. Try again shortly.",
            status: "FAILED",
            createdAt: replyAt,
          },
    });

    if (runId) {
      await tx.taskRun.create({ data: { runId, projectId: scope.projectId, userId: scope.userId } });
    }

    await tx.aiSession.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: userAt,
        expiresAt: computeExpiresAt(userAt),
        ...(runId ? { phase: "GENERATING" } : {}),
        ...(session.title === DEFAULT_SESSION_TITLE ? { title: toSessionTitle(text) } : {}),
      },
    });
  });

  const updated = await getSession(scope, sessionId);
  if (!updated) {
    return { ok: false, status: 404, error: "Session not found" };
  }

  return runId
    ? { ok: true, session: updated }
    : { ok: false, status: 502, error: "Design service unavailable", session: updated };
}
