// Wire shapes for the AI session API. Kept free of Prisma imports so client
// code can use them.

export const AI_SESSION_PHASES = ["CLARIFYING", "PLANNED", "GENERATING", "COMPLETE"] as const;
export type AiSessionPhase = (typeof AI_SESSION_PHASES)[number];

export const AI_MESSAGE_ROLES = ["USER", "ASSISTANT"] as const;
export type AiMessageRole = (typeof AI_MESSAGE_ROLES)[number];

export const AI_MESSAGE_KINDS = ["TEXT", "QUESTIONS", "ANSWERS", "PLAN", "RESULT", "ERROR"] as const;
export type AiMessageKind = (typeof AI_MESSAGE_KINDS)[number];

export const AI_MESSAGE_STATUSES = ["PENDING", "COMPLETE", "FAILED"] as const;
export type AiMessageStatus = (typeof AI_MESSAGE_STATUSES)[number];

/** Session as listed in the sidebar's session switcher. */
export interface AiSessionSummary {
  id: string;
  title: string;
  phase: AiSessionPhase;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface AiMessageDto {
  id: string;
  role: AiMessageRole;
  kind: AiMessageKind;
  content: string;
  payload: unknown;
  runId: string | null;
  status: AiMessageStatus;
  createdAt: string;
}

/** Full session with its transcript, oldest message first. */
export interface AiSessionDetail extends AiSessionSummary {
  brief: unknown;
  clarifyRounds: number;
  messages: AiMessageDto[];
}
