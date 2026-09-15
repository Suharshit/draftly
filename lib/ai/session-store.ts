import {
  AI_SESSION_TTL_MS,
  DEFAULT_SESSION_TITLE,
  MAX_SESSION_TITLE_LENGTH,
  MAX_SESSIONS_PER_USER_PROJECT,
} from "@/lib/ai/session-limits";
import { prisma } from "@/lib/prisma";
import type { AiSessionDetail, AiSessionSummary } from "@/types/ai-session";

export * from "@/lib/ai/session-limits";

export function computeExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + AI_SESSION_TTL_MS);
}

/** Collapses whitespace and truncates text into a session title. */
export function toSessionTitle(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) {
    return DEFAULT_SESSION_TITLE;
  }
  if (collapsed.length <= MAX_SESSION_TITLE_LENGTH) {
    return collapsed;
  }
  return `${collapsed.slice(0, MAX_SESSION_TITLE_LENGTH - 1).trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Queries
//
// Every query is scoped to project + user, and ignores expired sessions even
// before the cleanup cron has removed them. Callers must already have checked
// project access.
// ---------------------------------------------------------------------------

const summarySelect = {
  id: true,
  title: true,
  phase: true,
  lastActivityAt: true,
  expiresAt: true,
  createdAt: true,
} as const;

interface SessionScope {
  projectId: string;
  userId: string;
}

function toSummary(session: {
  id: string;
  title: string;
  phase: AiSessionSummary["phase"];
  lastActivityAt: Date;
  expiresAt: Date;
  createdAt: Date;
}): AiSessionSummary {
  return {
    id: session.id,
    title: session.title,
    phase: session.phase,
    lastActivityAt: session.lastActivityAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  };
}

export async function listSessions({ projectId, userId }: SessionScope): Promise<AiSessionSummary[]> {
  const sessions = await prisma.aiSession.findMany({
    where: { projectId, userId, expiresAt: { gt: new Date() } },
    orderBy: { lastActivityAt: "desc" },
    take: MAX_SESSIONS_PER_USER_PROJECT,
    select: summarySelect,
  });

  return sessions.map(toSummary);
}

/**
 * Creates a session and trims the user's sessions in this project down to
 * {@link MAX_SESSIONS_PER_USER_PROJECT}, dropping the least recently active
 * ones and any that have already expired.
 */
export async function createSession(
  { projectId, userId }: SessionScope,
  title: string = DEFAULT_SESSION_TITLE,
): Promise<AiSessionSummary> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const kept = await tx.aiSession.findMany({
      where: { projectId, userId, expiresAt: { gt: now } },
      orderBy: { lastActivityAt: "desc" },
      take: MAX_SESSIONS_PER_USER_PROJECT - 1,
      select: { id: true },
    });

    await tx.aiSession.deleteMany({
      where: { projectId, userId, id: { notIn: kept.map((session) => session.id) } },
    });

    const session = await tx.aiSession.create({
      data: {
        projectId,
        userId,
        title: toSessionTitle(title),
        lastActivityAt: now,
        expiresAt: computeExpiresAt(now),
      },
      select: summarySelect,
    });

    return toSummary(session);
  });
}

export async function getSession(
  { projectId, userId }: SessionScope,
  sessionId: string,
): Promise<AiSessionDetail | null> {
  const session = await prisma.aiSession.findFirst({
    where: { id: sessionId, projectId, userId, expiresAt: { gt: new Date() } },
    select: {
      ...summarySelect,
      brief: true,
      clarifyRounds: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          kind: true,
          content: true,
          payload: true,
          runId: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  return {
    ...toSummary(session),
    brief: session.brief,
    clarifyRounds: session.clarifyRounds,
    messages: session.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

/** Returns false when no matching session existed. */
export async function deleteSession({ projectId, userId }: SessionScope, sessionId: string): Promise<boolean> {
  const { count } = await prisma.aiSession.deleteMany({
    where: { id: sessionId, projectId, userId },
  });
  return count > 0;
}

/** Deletes every expired session across all projects. Messages cascade. */
export async function deleteExpiredSessions(now: Date = new Date()): Promise<number> {
  const { count } = await prisma.aiSession.deleteMany({
    where: { expiresAt: { lte: now } },
  });
  return count;
}
