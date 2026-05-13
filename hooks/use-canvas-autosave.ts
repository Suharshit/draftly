"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseCanvasAutosaveOptions {
  projectId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  enabled: boolean;
  debounceMs?: number;
}

interface CanvasSnapshot {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

function cloneSnapshot(nodes: CanvasNode[], edges: CanvasEdge[]): CanvasSnapshot {
  return {
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
  };
}

async function saveCanvasWithRetry(
  projectId: string,
  snapshot: CanvasSnapshot,
  maxAttempts = 3,
): Promise<void> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`/api/projects/${projectId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });

      if (!response.ok) {
        throw new Error(`Autosave failed with status ${response.status}`);
      }

      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => window.setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw lastError ?? new Error("Autosave failed");
}

export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  enabled,
  debounceMs = 2500,
}: UseCanvasAutosaveOptions) {
  const [status, setStatus] = useState<CanvasSaveStatus>("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const payload = useMemo<CanvasSnapshot>(() => cloneSnapshot(nodes, edges), [nodes, edges]);
  const lastSavedHashRef = useRef<string>("");
  const latestPayloadRef = useRef<CanvasSnapshot>(payload);

  useEffect(() => {
    latestPayloadRef.current = payload;
  }, [payload]);

  const performSave = useCallback(
    async (snapshot: CanvasSnapshot, useKeepalive = false): Promise<boolean> => {
      try {
        if (useKeepalive) {
          const response = await fetch(`/api/projects/${projectId}/canvas`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(snapshot),
            keepalive: true,
          });
          return response.ok;
        }

        await saveCanvasWithRetry(projectId, snapshot);
        return true;
      } catch {
        return false;
      }
    },
    [projectId],
  );

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => {
        setStatus("idle");
        setHasUnsavedChanges(false);
      });
      return;
    }

    const nextHash = JSON.stringify(payload);
    if (nextHash === lastSavedHashRef.current) {
      queueMicrotask(() => {
        setHasUnsavedChanges(false);
      });
      return;
    }

    queueMicrotask(() => {
      setHasUnsavedChanges(true);
      setStatus("saving");
    });

    const timer = window.setTimeout(async () => {
      const ok = await performSave(payload);
      if (ok) {
        lastSavedHashRef.current = nextHash;
        setHasUnsavedChanges(false);
        setStatus("saved");
      } else {
        setStatus("error");
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [debounceMs, enabled, payload, performSave]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      void performSave(latestPayloadRef.current, true);
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, hasUnsavedChanges, performSave]);

  return { saveStatus: status };
}
