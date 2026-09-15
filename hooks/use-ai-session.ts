"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUpdateMyPresence } from "@liveblocks/react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";

import { MAX_SESSIONS_PER_USER_PROJECT } from "@/lib/ai/session-limits";
import {
  DESIGN_AGENT_STAGE_KEY,
  parseDesignAgentStage,
  type DesignAgentStage,
} from "@/lib/design-generation";
import type { designAgentTask } from "@/src/trigger/design-agent";
import type { AiSessionDetail, AiSessionSummary } from "@/types/ai-session";

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Assistant messages reporting a failure render in the error style. */
  isError?: boolean;
}

export interface UseAiSessionResult {
  /** The user's unexpired sessions in this project, most recent first. */
  sessions: AiSessionSummary[];
  activeSessionId: string | null;
  /** Title of the open session, or null for a new, unsaved chat. */
  activeSessionTitle: string | null;
  messages: AiChatMessage[];
  /** Live status line for the in-flight turn, rendered assistant-side. */
  statusText: string | null;
  /** True from submit until the reply is stored. The composer stays disabled meanwhile. */
  isRunning: boolean;
  /** False while a message is being sent, when switching chats could drop the response. */
  canSwitchSession: boolean;
  isLoadingSession: boolean;
  sessionLoadFailed: boolean;
  sendPrompt: (text: string) => void;
  startNewChat: () => void;
  selectSession: (sessionId: string) => void;
  removeSession: (sessionId: string) => void;
  retryLoadSession: () => void;
}

const STAGE_LABELS: Record<DesignAgentStage, string> = {
  analyzing: "Reading your requirements…",
  planning: "Drafting a plan…",
  generating: "Designing the architecture…",
  writing: "Adding components to the canvas…",
  done: "Finishing up…",
};

const STARTING_STATUS = "Thinking…";

const GENERIC_ERROR = "Something went wrong sending that message. Try again.";

/**
 * While a reply is pending, the session is re-read on this interval. Reading it
 * is what settles the turn on the server, so this covers a lost Realtime
 * subscription or a token that could not be minted.
 */
const PENDING_POLL_MS = 4000;

function storageKey(projectId: string): string {
  return `draftly:ai-session:${projectId}`;
}

function readStoredSessionId(projectId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(projectId));
  } catch {
    return null;
  }
}

function writeStoredSessionId(projectId: string, sessionId: string): void {
  try {
    window.localStorage.setItem(storageKey(projectId), sessionId);
  } catch {
    // Remembering the open chat is a convenience; storage can be unavailable.
  }
}

function describeRequestFailure(status: number, serverError: string | undefined): string {
  switch (status) {
    case 400:
      return "That message could not be sent. Try rephrasing it.";
    case 401:
      return "Your session expired. Sign in again to keep designing.";
    case 403:
      return "You do not have access to this project, so the message was not sent.";
    case 404:
      return "This chat no longer exists. It may have expired.";
    case 409:
      return serverError ?? "A reply is still being generated.";
    default:
      return GENERIC_ERROR;
  }
}

function toSummary({ id, title, phase, lastActivityAt, expiresAt, createdAt }: AiSessionDetail): AiSessionSummary {
  return { id, title, phase, lastActivityAt, expiresAt, createdAt };
}

type SessionLoadResult =
  | { status: "ok"; session: AiSessionDetail }
  | { status: "missing" }
  | { status: "failed" };

/** Reads one session. Reading is also what settles its finished turns on the server. */
async function fetchSession(projectId: string, sessionId: string): Promise<SessionLoadResult> {
  try {
    const response = await fetch(`/api/projects/${projectId}/ai-sessions/${sessionId}`, { cache: "no-store" });
    if (response.status === 404) {
      return { status: "missing" };
    }
    if (!response.ok) {
      return { status: "failed" };
    }
    const { session } = (await response.json()) as { session: AiSessionDetail };
    return { status: "ok", session };
  } catch {
    return { status: "failed" };
  }
}

/**
 * Drives the AI Architect chat against stored sessions.
 *
 * The server transcript is the single source of truth: a sent message comes
 * back as a PENDING reply carrying a run id, and the reply is filled in when
 * the session is read after the run finishes. Trigger Realtime only shortens
 * that wait; polling guarantees it. A reload therefore restores the chat and
 * picks the in-flight run back up.
 *
 * Must be used inside a `RoomProvider` — it writes presence for the room.
 */
export function useAiSession(projectId: string): UseAiSessionResult {
  const [sessions, setSessions] = useState<AiSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<AiSessionDetail | null>(null);
  const [failedSessionId, setFailedSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticPrompt, setOptimisticPrompt] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [runAccess, setRunAccess] = useState<{ runId: string; token: string } | null>(null);

  // Guards async responses against a chat switch that happened while they were in flight.
  const activeSessionIdRef = useRef<string | null>(null);
  const tokenRequestedFor = useRef<string | null>(null);

  const updateMyPresence = useUpdateMyPresence();

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const upsertSummary = useCallback((summary: AiSessionSummary) => {
    setSessions((previous) =>
      [summary, ...previous.filter((entry) => entry.id !== summary.id)]
        .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
        .slice(0, MAX_SESSIONS_PER_USER_PROJECT),
    );
  }, []);

  const dropSession = useCallback((sessionId: string) => {
    setSessions((previous) => previous.filter((entry) => entry.id !== sessionId));
    setActiveSessionId((current) => (current === sessionId ? null : current));
  }, []);

  const applySessionLoad = useCallback(
    (sessionId: string, result: SessionLoadResult) => {
      if (activeSessionIdRef.current !== sessionId) {
        return;
      }
      if (result.status === "missing") {
        dropSession(sessionId);
        return;
      }
      if (result.status === "failed") {
        setFailedSessionId(sessionId);
        return;
      }
      setSession(result.session);
      setFailedSessionId(null);
      upsertSummary(toSummary(result.session));
    },
    [dropSession, upsertSummary],
  );

  const loadSession = useCallback(
    async (sessionId: string) => {
      applySessionLoad(sessionId, await fetchSession(projectId, sessionId));
    },
    [applySessionLoad, projectId],
  );

  // List sessions once, and reopen the chat this browser last had open.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/ai-sessions`, { cache: "no-store" });
        if (!response.ok || cancelled) {
          return;
        }
        const { sessions: listed } = (await response.json()) as { sessions: AiSessionSummary[] };
        if (cancelled) {
          return;
        }

        setSessions(listed);
        const stored = readStoredSessionId(projectId);
        const initial = listed.find((entry) => entry.id === stored)?.id ?? listed[0]?.id ?? null;
        setActiveSessionId((current) => current ?? initial);
      } catch {
        // Without the list the sidebar still works as a new chat.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (activeSessionId) {
      writeStoredSessionId(projectId, activeSessionId);
    }
  }, [activeSessionId, projectId]);

  const visibleSession = session && session.id === activeSessionId ? session : null;

  useEffect(() => {
    if (!activeSessionId || session?.id === activeSessionId) {
      return;
    }
    const sessionId = activeSessionId;
    void (async () => {
      applySessionLoad(sessionId, await fetchSession(projectId, sessionId));
    })();
  }, [activeSessionId, applySessionLoad, projectId, session?.id]);

  const pendingRunId =
    visibleSession?.messages.find((message) => message.status === "PENDING" && message.runId)?.runId ?? null;

  // Exchange the pending run id for a run-scoped Realtime token.
  useEffect(() => {
    if (!pendingRunId || tokenRequestedFor.current === pendingRunId) {
      return;
    }
    tokenRequestedFor.current = pendingRunId;

    void (async () => {
      try {
        const response = await fetch("/api/ai/design/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: pendingRunId }),
        });
        if (!response.ok) {
          return; // Polling still settles the turn.
        }
        const { token } = (await response.json()) as { token: string };
        setRunAccess({ runId: pendingRunId, token });
      } catch {
        // Polling still settles the turn.
      }
    })();
  }, [pendingRunId]);

  const { run, error: realtimeError } = useRealtimeRun<typeof designAgentTask>(runAccess?.runId, {
    accessToken: runAccess?.token,
    enabled: Boolean(runAccess && runAccess.runId === pendingRunId),
  });

  // A freshly started subscription can still be reporting the previous run.
  const activeRun = run && run.id === pendingRunId ? run : undefined;
  const runFinished =
    pendingRunId !== null &&
    (Boolean(activeRun && (activeRun.isSuccess || activeRun.isFailed || activeRun.isCancelled)) ||
      Boolean(realtimeError));

  // Realtime reports the end of a run sooner than the next poll would.
  useEffect(() => {
    if (!runFinished || !activeSessionId) {
      return;
    }
    const sessionId = activeSessionId;
    void (async () => {
      applySessionLoad(sessionId, await fetchSession(projectId, sessionId));
    })();
  }, [activeSessionId, applySessionLoad, projectId, runFinished]);

  useEffect(() => {
    if (!pendingRunId || !activeSessionId) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadSession(activeSessionId);
    }, PENDING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [activeSessionId, loadSession, pendingRunId]);

  const isRunning = isSubmitting || pendingRunId !== null;

  const sendPrompt = useCallback(
    (text: string) => {
      const prompt = text.trim();
      if (!prompt || isRunning) {
        return;
      }

      setRequestError(null);
      setOptimisticPrompt(prompt);
      setIsSubmitting(true);

      void (async () => {
        try {
          let sessionId = activeSessionId;

          // A new chat is only stored once it has a first message.
          if (!sessionId) {
            const created = await fetch(`/api/projects/${projectId}/ai-sessions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: prompt }),
            });
            const createdBody = (await created.json().catch(() => null)) as
              | { session?: AiSessionSummary; error?: string }
              | null;
            if (created.status !== 201 || !createdBody?.session) {
              setRequestError(describeRequestFailure(created.status, createdBody?.error));
              return;
            }

            const summary = createdBody.session;
            sessionId = summary.id;
            upsertSummary(summary);
            setSession({ ...summary, brief: null, clarifyRounds: 0, messages: [] });
            activeSessionIdRef.current = summary.id;
            setActiveSessionId(summary.id);
          }

          const response = await fetch(`/api/projects/${projectId}/ai-sessions/${sessionId}/turns`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "message", text: prompt }),
          });
          const body = (await response.json().catch(() => null)) as
            | { session?: AiSessionDetail; error?: string }
            | null;

          // 202, and 502 (the run failed to start), both return the stored transcript.
          if (body?.session) {
            upsertSummary(toSummary(body.session));
            if (activeSessionIdRef.current === sessionId) {
              setSession(body.session);
            }
            return;
          }

          if (response.status === 404) {
            dropSession(sessionId);
          }
          setRequestError(describeRequestFailure(response.status, body?.error));
        } catch {
          setRequestError(GENERIC_ERROR);
        } finally {
          setOptimisticPrompt(null);
          setIsSubmitting(false);
        }
      })();
    },
    [activeSessionId, dropSession, isRunning, projectId, upsertSummary],
  );

  const startNewChat = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    setRequestError(null);
    setActiveSessionId(null);
  }, [isSubmitting]);

  const selectSession = useCallback(
    (sessionId: string) => {
      if (isSubmitting) {
        return;
      }
      setRequestError(null);
      setActiveSessionId(sessionId);
    },
    [isSubmitting],
  );

  const removeSession = useCallback(
    (sessionId: string) => {
      void (async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}/ai-sessions/${sessionId}`, {
            method: "DELETE",
          });
          if (response.status === 204 || response.status === 404) {
            dropSession(sessionId);
            return;
          }
          setRequestError("That chat could not be deleted. Try again.");
        } catch {
          setRequestError("That chat could not be deleted. Try again.");
        }
      })();
    },
    [dropSession, projectId],
  );

  const retryLoadSession = useCallback(() => {
    if (activeSessionId) {
      setFailedSessionId(null);
      void loadSession(activeSessionId);
    }
  }, [activeSessionId, loadSession]);

  const messages = useMemo(() => {
    const transcript: AiChatMessage[] = (visibleSession?.messages ?? [])
      .filter((message) => message.status !== "PENDING")
      .map((message) => ({
        id: message.id,
        role: message.role === "USER" ? "user" : "assistant",
        text: message.content,
        isError: message.kind === "ERROR" || message.status === "FAILED",
      }));

    if (optimisticPrompt) {
      transcript.push({ id: "optimistic-prompt", role: "user", text: optimisticPrompt });
    }
    if (requestError) {
      transcript.push({ id: "request-error", role: "assistant", text: requestError, isError: true });
    }
    return transcript;
  }, [optimisticPrompt, requestError, visibleSession]);

  // Let collaborators in the room see that a generation is in progress.
  useEffect(() => {
    updateMyPresence({ thinking: isRunning });
  }, [isRunning, updateMyPresence]);

  useEffect(() => {
    return () => {
      updateMyPresence({ thinking: false });
    };
  }, [updateMyPresence]);

  let statusText: string | null = null;
  if (isRunning) {
    const stage = activeRun ? parseDesignAgentStage(activeRun.metadata?.[DESIGN_AGENT_STAGE_KEY]) : null;
    statusText = stage ? STAGE_LABELS[stage] : STARTING_STATUS;
  }

  const hasActiveSession = activeSessionId !== null && visibleSession === null;

  return {
    sessions,
    activeSessionId,
    activeSessionTitle:
      visibleSession?.title ?? sessions.find((entry) => entry.id === activeSessionId)?.title ?? null,
    messages,
    statusText,
    isRunning,
    canSwitchSession: !isSubmitting,
    isLoadingSession: hasActiveSession && failedSessionId !== activeSessionId,
    sessionLoadFailed: hasActiveSession && failedSessionId === activeSessionId,
    sendPrompt,
    startNewChat,
    selectSession,
    removeSession,
    retryLoadSession,
  };
}
