import { ApiError, runs, tasks } from "@trigger.dev/sdk/v3";

import type { Prisma } from "@/app/generated/prisma/client";
import {
  AGENT_HISTORY_LIMIT,
  designAgentResultSchema,
  designBriefSchema,
  formatAnswersText,
  formatPlanText,
  formatQuestionsText,
  GENERATE_TURN_TEXT,
  PLAN_NOTHING_TO_ADD_MESSAGE,
  readPlanPayload,
  readQuestionsPayload,
  SKIP_TURN_TEXT,
  type AgentHistoryEntry,
  type ClarifyQuestion,
  type DesignAgentPayload,
  type DesignAgentResult,
  type DesignBrief,
  type DesignPlan,
  type TurnInput,
  type TurnIntent,
} from "@/lib/ai/agent-schema";
import {
  computeExpiresAt,
  DEFAULT_SESSION_TITLE,
  getSession,
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGES_PER_SESSION,
  toSessionTitle,
} from "@/lib/ai/session-store";
import { describeRunFailure } from "@/lib/ai/run-failure";
import { prisma } from "@/lib/prisma";
import type { designAgentTask } from "@/src/trigger/design-agent";
import type {
  AiMessageDto,
  AiMessageKind,
  AiMessageStatus,
  AiSessionDetail,
  AiSessionPhase,
} from "@/types/ai-session";

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

// ---------------------------------------------------------------------------
// Reading the session back for the agent
// ---------------------------------------------------------------------------

function latestAssistantMessage(session: AiSessionDetail): AiMessageDto | undefined {
  return session.messages.findLast((message) => message.role === "ASSISTANT" && message.status === "COMPLETE");
}

/** The most recent plan proposed in the session, if any. */
function latestPlan(session: AiSessionDetail): DesignPlan | null {
  const message = session.messages.findLast((entry) => entry.kind === "PLAN" && entry.status === "COMPLETE");
  return message ? readPlanPayload(message.payload) : null;
}

/** Questions still awaiting answers: only while they are the latest reply. */
function openQuestions(session: AiSessionDetail): ClarifyQuestion[] {
  const message = latestAssistantMessage(session);
  return message?.kind === "QUESTIONS" ? (readQuestionsPayload(message.payload) ?? []) : [];
}

function storedBrief(session: AiSessionDetail): DesignBrief | null {
  const parsed = designBriefSchema.safeParse(session.brief);
  return parsed.success ? parsed.data : null;
}

/** Completed transcript the model sees, oldest first. Failed replies are left out. */
function agentHistory(session: AiSessionDetail): AgentHistoryEntry[] {
  return session.messages
    .filter((message) => message.status === "COMPLETE" && message.content.length > 0)
    .map((message): AgentHistoryEntry => ({
      role: message.role === "USER" ? "user" : "assistant",
      content: message.content,
    }))
    .slice(-AGENT_HISTORY_LIMIT);
}

// ---------------------------------------------------------------------------
// Settling
// ---------------------------------------------------------------------------

interface TurnOutcome {
  kind: AiMessageKind;
  status: AiMessageStatus;
  content: string;
  payload?: Prisma.InputJsonObject;
  /** Omitted for failures, so a failed turn leaves the session where it was. */
  phase?: AiSessionPhase;
  brief?: DesignBrief;
  countsClarifyRound?: boolean;
}

function failedOutcome(content: string): TurnOutcome {
  return { kind: "ERROR", status: "FAILED", content };
}

/** Logs a failed run's raw error and returns the message stored for the user. */
function describeFailedRun(runId: string, message: string | undefined): string {
  console.error("[ai-sessions] design-agent run failed", runId, message);
  return describeRunFailure(message, {
    generic: GENERIC_RUN_ERROR,
    timeout: "The design agent took too long to respond. Try again.",
    passthrough: [PLAN_NOTHING_TO_ADD_MESSAGE],
  });
}

function outcomeFromResult(result: DesignAgentResult): TurnOutcome {
  switch (result.action) {
    case "ask":
      return {
        kind: "QUESTIONS",
        status: "COMPLETE",
        content: formatQuestionsText(result.reply, result.questions),
        payload: { reply: result.reply, questions: result.questions },
        phase: "CLARIFYING",
        brief: result.brief,
        countsClarifyRound: true,
      };
    case "plan":
      return {
        kind: "PLAN",
        status: "COMPLETE",
        content: formatPlanText(result.reply, result.plan),
        payload: { reply: result.reply, plan: result.plan },
        phase: "PLANNED",
        brief: result.brief,
      };
    case "generated":
      return {
        kind: "RESULT",
        status: "COMPLETE",
        content: summarizeDesignResult(result.nodeCount, result.edgeCount),
        payload: { nodeCount: result.nodeCount, edgeCount: result.edgeCount, decisions: result.decisions },
        phase: "COMPLETE",
        brief: result.brief,
      };
  }
}

/**
 * Writes a run's outcome onto its pending message. The status guard makes this
 * safe to call concurrently: only the first caller changes anything.
 */
async function applyOutcome(sessionId: string, messageId: string, outcome: TurnOutcome): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.aiMessage.updateMany({
      where: { id: messageId, sessionId, status: "PENDING" },
      data: {
        kind: outcome.kind,
        status: outcome.status,
        content: outcome.content,
        ...(outcome.payload ? { payload: outcome.payload } : {}),
      },
    });

    if (count === 0 || (!outcome.phase && !outcome.brief)) {
      return;
    }

    await tx.aiSession.update({
      where: { id: sessionId },
      data: {
        ...(outcome.phase ? { phase: outcome.phase } : {}),
        ...(outcome.brief ? { brief: outcome.brief } : {}),
        ...(outcome.countsClarifyRound ? { clarifyRounds: { increment: 1 } } : {}),
      },
    });
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
    // Run output crosses a service boundary; don't store it unchecked.
    const parsed = designAgentResultSchema.safeParse(run.output);
    if (parsed.success) {
      outcome = outcomeFromResult(parsed.data);
    } else {
      console.error("[ai-sessions] unexpected design-agent output", runId, parsed.error.issues);
      outcome = failedOutcome("The design agent returned an unexpected response. Try again.");
    }
  } else if (run.isCancelled) {
    outcome = failedOutcome("The design run was cancelled.");
  } else if (run.isFailed) {
    outcome = failedOutcome(describeFailedRun(runId, run.error?.message));
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

// ---------------------------------------------------------------------------
// Starting a turn
// ---------------------------------------------------------------------------

export type { TurnInput };

interface ResolvedTurn {
  intent: TurnIntent;
  /** What is stored and shown as the user's message, and what the model reads. */
  content: string;
  kind: AiMessageKind;
  payload?: Prisma.InputJsonObject;
}

type ResolveTurnResult = { ok: true; turn: ResolvedTurn } | { ok: false; status: 400 | 409; error: string };

/** Checks a turn against the session state and renders it as a user message. */
function resolveTurn(session: AiSessionDetail, input: TurnInput): ResolveTurnResult {
  switch (input.type) {
    case "message":
      return { ok: true, turn: { intent: "message", content: input.text, kind: "TEXT" } };

    case "answers": {
      const questions = openQuestions(session);
      if (questions.length === 0) {
        return { ok: false, status: 409, error: "There are no open questions to answer" };
      }

      const answers = input.answers
        .map((entry) => ({ questionId: entry.questionId, answer: entry.answer.trim() }))
        .filter((entry) => entry.answer.length > 0 && questions.some((question) => question.id === entry.questionId));
      if (answers.length === 0) {
        return { ok: false, status: 400, error: "Answer at least one question" };
      }

      const content = formatAnswersText(questions, answers);
      if (content.length > MAX_MESSAGE_LENGTH) {
        return { ok: false, status: 400, error: `Answers must be at most ${MAX_MESSAGE_LENGTH} characters` };
      }

      return { ok: true, turn: { intent: "answers", content, kind: "ANSWERS", payload: { answers } } };
    }

    case "generate":
      if (!latestPlan(session)) {
        return { ok: false, status: 409, error: "There is no plan to generate yet" };
      }
      return { ok: true, turn: { intent: "generate", content: GENERATE_TURN_TEXT, kind: "TEXT" } };

    case "skip":
      return {
        ok: true,
        turn: { intent: "skip", content: SKIP_TURN_TEXT, kind: "TEXT" },
      };
  }
}

export type StartTurnResult =
  | { ok: true; session: AiSessionDetail }
  | { ok: false; status: 400 | 404 | 409 | 502; error: string; session?: AiSessionDetail };

/**
 * Records a user turn and starts the design-agent run that answers it.
 *
 * The run is triggered before anything is written, so a stored PENDING message
 * always has a run id to settle from. If the trigger fails, the user message is
 * still stored with an error reply, so the transcript explains what happened.
 */
export async function startTurn(scope: SessionScope, sessionId: string, input: TurnInput): Promise<StartTurnResult> {
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

  const resolved = resolveTurn(session, input);
  if (!resolved.ok) {
    return resolved;
  }
  const { turn } = resolved;

  const payload: DesignAgentPayload = {
    roomId: scope.projectId,
    intent: turn.intent,
    input: turn.content,
    history: agentHistory(session),
    brief: storedBrief(session),
    plan: latestPlan(session),
    clarifyRounds: session.clarifyRounds,
  };

  let runId: string | null = null;
  try {
    const handle = await tasks.trigger<typeof designAgentTask>("design-agent", payload);
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
      data: {
        sessionId,
        role: "USER",
        kind: turn.kind,
        content: turn.content,
        ...(turn.payload ? { payload: turn.payload } : {}),
        createdAt: userAt,
      },
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
        ...(input.type === "message" && session.title === DEFAULT_SESSION_TITLE
          ? { title: toSessionTitle(input.text) }
          : {}),
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
