"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUpdateMyPresence } from "@liveblocks/react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";

import {
  DESIGN_AGENT_STAGE_KEY,
  parseDesignAgentStage,
  type DesignAgentStage,
} from "@/lib/design-generation";
import type { designAgentTask } from "@/src/trigger/design-agent";

export interface DesignChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Assistant messages reporting a failure render in the error style. */
  isError?: boolean;
}

export interface UseDesignAgentResult {
  messages: DesignChatMessage[];
  /** Live status line for the in-flight run, rendered assistant-side. */
  statusText: string | null;
  /** True from submit until the run settles. The composer stays disabled meanwhile. */
  isRunning: boolean;
  sendPrompt: (text: string) => void;
}

type RealtimeDesignRun = NonNullable<
  ReturnType<typeof useRealtimeRun<typeof designAgentTask>>["run"]
>;

interface RunOutcome {
  text: string;
  isError: boolean;
}

const STAGE_LABELS: Record<DesignAgentStage, string> = {
  generating: "Designing the architecture…",
  writing: "Adding components to the canvas…",
  done: "Finishing up…",
};

const GENERIC_ERROR = "Something went wrong generating the design. Try again.";

function describeRequestFailure(status: number): string {
  switch (status) {
    case 400:
      return "That prompt could not be sent. Try rephrasing it.";
    case 401:
      return "Your session expired. Sign in again to keep designing.";
    case 403:
      return "You do not have access to this project, so the design was not generated.";
    case 502:
      return "The design service is unreachable right now, so nothing was generated. Try again shortly.";
    default:
      return GENERIC_ERROR;
  }
}

function summarize(run: RealtimeDesignRun): string {
  const nodeCount = run.output?.nodeCount ?? 0;
  const edgeCount = run.output?.edgeCount ?? 0;

  if (nodeCount === 0) {
    return "The design run finished but produced no components. Try a more specific prompt.";
  }

  return (
    `Added ${nodeCount} component${nodeCount === 1 ? "" : "s"} and ` +
    `${edgeCount} connection${edgeCount === 1 ? "" : "s"} to the canvas.`
  );
}

/**
 * Drives one design run at a time: posts the prompt to `/api/ai/design`,
 * exchanges the returned run id for a run-scoped public token, subscribes to
 * the run over Trigger Realtime, and mirrors the run's liveness onto the
 * Liveblocks `thinking` presence flag.
 *
 * The run's own reported state is the single source of truth. Everything the
 * sidebar shows — the status line, the closing summary, whether the composer
 * is locked — is derived from it, so the UI cannot be left mid-run by a
 * settlement step that failed to fire.
 *
 * Must be used inside a `RoomProvider` — it writes presence for the room.
 */
export function useDesignAgent(projectId: string): UseDesignAgentResult {
  const [history, setHistory] = useState<DesignChatMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const updateMyPresence = useUpdateMyPresence();

  const { run, error } = useRealtimeRun<typeof designAgentTask>(runId ?? undefined, {
    accessToken: accessToken ?? undefined,
    enabled: Boolean(runId && accessToken),
  });

  // A freshly started subscription can still be reporting the previous run, so
  // only trust run data whose id matches the run currently being awaited.
  const activeRun = run && run.id === runId ? run : undefined;

  /** The held run's result, or null while it is still in flight. */
  const outcome: RunOutcome | null = useMemo(() => {
    if (!runId) {
      return null;
    }

    if (activeRun?.isSuccess) {
      return { text: summarize(activeRun), isError: false };
    }
    if (activeRun?.isCancelled) {
      return { text: "The design run was cancelled.", isError: true };
    }
    if (activeRun?.isFailed) {
      return { text: activeRun.error?.message ?? GENERIC_ERROR, isError: true };
    }
    if (error) {
      return {
        text: "Lost track of the design run. Reload to see whether it finished.",
        isError: true,
      };
    }

    return null;
  }, [activeRun, error, runId]);

  const outcomeMessage: DesignChatMessage | null = useMemo(() => {
    if (!runId || !outcome) {
      return null;
    }
    return {
      id: `assistant-${runId}`,
      role: "assistant",
      text: outcome.text,
      isError: outcome.isError,
    };
  }, [outcome, runId]);

  // A run is over the moment it reports an outcome; nothing has to be cleared
  // for the composer to unlock.
  const isRunning = isSubmitting || (runId !== null && outcome === null);

  const messages = useMemo(
    () => (outcomeMessage ? [...history, outcomeMessage] : history),
    [history, outcomeMessage],
  );

  const appendToHistory = useCallback((...entries: DesignChatMessage[]) => {
    setHistory((previous) => [...previous, ...entries]);
  }, []);

  const sendPrompt = useCallback(
    (text: string) => {
      const prompt = text.trim();
      if (!prompt || isRunning) {
        return;
      }

      // The finished run is about to be replaced, so commit its derived
      // summary into the transcript before letting go of it.
      const userMessage: DesignChatMessage = {
        id: `user-${history.length}`,
        role: "user",
        text: prompt,
      };
      appendToHistory(...(outcomeMessage ? [outcomeMessage, userMessage] : [userMessage]));

      setRunId(null);
      setAccessToken(null);
      setIsSubmitting(true);

      void (async () => {
        try {
          const response = await fetch("/api/ai/design", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, roomId: projectId, projectId }),
          });

          if (response.status !== 202) {
            appendToHistory({
              id: `assistant-request-${Date.now()}`,
              role: "assistant",
              text: describeRequestFailure(response.status),
              isError: true,
            });
            setIsSubmitting(false);
            return;
          }

          const { runId: startedRunId } = (await response.json()) as { runId: string };

          const tokenResponse = await fetch("/api/ai/design/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId: startedRunId }),
          });

          if (!tokenResponse.ok) {
            appendToHistory({
              id: `assistant-token-${Date.now()}`,
              role: "assistant",
              text: "The design run started but its progress could not be tracked. Reload to see the result.",
              isError: true,
            });
            setIsSubmitting(false);
            return;
          }

          const { token } = (await tokenResponse.json()) as { token: string };

          setRunId(startedRunId);
          setAccessToken(token);
          setIsSubmitting(false);
        } catch {
          appendToHistory({
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            text: GENERIC_ERROR,
            isError: true,
          });
          setIsSubmitting(false);
        }
      })();
    },
    [appendToHistory, history.length, isRunning, outcomeMessage, projectId],
  );

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
    statusText = stage ? STAGE_LABELS[stage] : "Starting the design run…";
  }

  return { messages, statusText, isRunning, sendPrompt };
}
