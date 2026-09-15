"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";

import {
  parseSpecAgentStage,
  SPEC_AGENT_STAGE_KEY,
  type SpecAgentStage,
  type SpecStatus,
  type SpecSummary,
} from "@/lib/spec/spec-schema";
import type { specAgentTask } from "@/src/trigger/spec-agent";

export interface UseSpecGeneratorResult {
  /** The project's latest stored spec. */
  spec: SpecSummary | null;
  /** True until the first status load finishes. */
  isLoading: boolean;
  /** True from clicking generate until the run has finished and been stored. */
  isRunning: boolean;
  statusText: string | null;
  error: string | null;
  /** Same-origin download URL for the stored spec. */
  downloadHref: string;
  generate: () => void;
}

const STAGE_LABELS: Record<SpecAgentStage, string> = {
  reading: "Reading the canvas…",
  writing: "Writing the spec…",
  rendering: "Formatting the Markdown…",
  done: "Saving the spec…",
};

const STARTING_STATUS = "Starting…";

/** While a run is pending the status is re-read on this interval; reading it stores a finished spec. */
const PENDING_POLL_MS = 4000;

async function fetchSpecStatus(projectId: string): Promise<SpecStatus | null> {
  try {
    const response = await fetch(`/api/projects/${projectId}/spec`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as SpecStatus;
  } catch {
    return null;
  }
}

function describeStartFailure(status: number, serverError: string | undefined): string {
  switch (status) {
    case 401:
      return "Your session expired. Sign in again to generate a spec.";
    case 403:
      return "You do not have access to this project, so no spec was generated.";
    case 502:
      return "The spec service is unreachable right now. Try again shortly.";
    default:
      return serverError ?? "The spec could not be started. Try again.";
  }
}

function startDownload(href: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Drives the Specs tab: loads the project's spec status, starts generation,
 * follows the run (Realtime for stages, polling as the guarantee), and
 * downloads the Markdown automatically once the run the user started is stored.
 */
export function useSpecGenerator(projectId: string): UseSpecGeneratorResult {
  const [status, setStatus] = useState<SpecStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [runAccess, setRunAccess] = useState<{ runId: string; token: string } | null>(null);

  const tokenRequestedFor = useRef<string | null>(null);
  /** The run whose stored spec should download automatically. */
  const downloadWhenStored = useRef<string | null>(null);

  const downloadHref = `/api/projects/${projectId}/spec/markdown`;
  const pendingRunId = status?.pendingRunId ?? null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await fetchSpecStatus(projectId);
      if (cancelled) {
        return;
      }
      if (next) {
        setStatus(next);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

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
          return; // Only the user who started a run can watch it; polling still stores it.
        }
        const { token } = (await response.json()) as { token: string };
        setRunAccess({ runId: pendingRunId, token });
      } catch {
        // Polling still stores the spec.
      }
    })();
  }, [pendingRunId]);

  const { run, error: realtimeError } = useRealtimeRun<typeof specAgentTask>(runAccess?.runId, {
    accessToken: runAccess?.token,
    enabled: Boolean(runAccess && runAccess.runId === pendingRunId),
  });

  const activeRun = run && run.id === pendingRunId ? run : undefined;
  const runFinished =
    pendingRunId !== null &&
    (Boolean(activeRun && (activeRun.isSuccess || activeRun.isFailed || activeRun.isCancelled)) ||
      Boolean(realtimeError));

  // Realtime reports the end of a run sooner than the next poll would.
  useEffect(() => {
    if (!runFinished) {
      return;
    }
    void (async () => {
      const next = await fetchSpecStatus(projectId);
      if (next) {
        setStatus(next);
      }
    })();
  }, [projectId, runFinished]);

  useEffect(() => {
    if (!pendingRunId) {
      return;
    }
    const timer = window.setInterval(() => {
      void (async () => {
        const next = await fetchSpecStatus(projectId);
        if (next) {
          setStatus(next);
        }
      })();
    }, PENDING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [pendingRunId, projectId]);

  // Download once the run the user started has been stored; give up if it failed.
  useEffect(() => {
    const awaited = downloadWhenStored.current;
    if (!awaited || !status) {
      return;
    }
    if (status.spec?.runId === awaited) {
      downloadWhenStored.current = null;
      startDownload(downloadHref);
    } else if (!status.pendingRunId && status.lastFailure) {
      downloadWhenStored.current = null;
    }
  }, [downloadHref, status]);

  const generate = useCallback(() => {
    if (isSubmitting || pendingRunId) {
      return;
    }

    setRequestError(null);
    setIsSubmitting(true);

    void (async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/spec`, { method: "POST" });
        const body = (await response.json().catch(() => null)) as { runId?: string; error?: string } | null;

        // 409 means a spec is already being generated; follow that run instead.
        if ((response.status === 202 || response.status === 409) && body?.runId) {
          const runId = body.runId;
          downloadWhenStored.current = runId;
          setStatus((previous) => ({ spec: previous?.spec ?? null, pendingRunId: runId, lastFailure: null }));
          return;
        }

        setRequestError(describeStartFailure(response.status, body?.error));
      } catch {
        setRequestError("The spec could not be started. Try again.");
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [isSubmitting, pendingRunId, projectId]);

  const isRunning = isSubmitting || pendingRunId !== null;

  let statusText: string | null = null;
  if (isRunning) {
    const stage = activeRun ? parseSpecAgentStage(activeRun.metadata?.[SPEC_AGENT_STAGE_KEY]) : null;
    statusText = stage ? STAGE_LABELS[stage] : STARTING_STATUS;
  }

  return {
    spec: status?.spec ?? null,
    isLoading,
    isRunning,
    statusText,
    error: requestError ?? (isRunning ? null : (status?.lastFailure ?? null)),
    downloadHref,
    generate,
  };
}
