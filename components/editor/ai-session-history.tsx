"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { AI_SESSION_TTL_DAYS, MAX_SESSIONS_PER_USER_PROJECT } from "@/lib/ai/session-limits";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import type { AiSessionSummary } from "@/types/ai-session";

interface AiSessionHistoryProps {
  sessions: AiSessionSummary[];
  activeSessionId: string | null;
  /** False while a message is being sent. */
  canSwitch: boolean;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

const focusClass = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60";

const DAY_MS = 24 * 60 * 60 * 1000;

function describeExpiry(expiresAt: string, now: number): string {
  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining < DAY_MS) {
    return "expires today";
  }
  return `expires in ${Math.floor(remaining / DAY_MS)}d`;
}

/** The AI Architect's saved chats, shown in place of the transcript. */
export function AiSessionHistory({ sessions, activeSessionId, canSwitch, onSelect, onDelete }: AiSessionHistoryProps) {
  // Captured when the list opens; relative times don't need to tick while it is visible.
  const [now] = useState(() => Date.now());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between font-mono text-chrome tracking-chrome text-ink-soft uppercase">
        <span>Recent chats</span>
        <span>
          {sessions.length}/{MAX_SESSIONS_PER_USER_PROJECT}
        </span>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-paper border border-dashed border-ink/25 px-3.5 py-4 font-brand text-sm text-ink-soft">
          No saved chats yet. Send a message to start one.
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((entry) => {
            const isActive = entry.id === activeSessionId;

            return (
              <li key={entry.id} className="relative">
                <button
                  type="button"
                  onClick={() => onSelect(entry.id)}
                  disabled={!canSwitch}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "block w-full cursor-pointer rounded-paper border bg-paper-bright py-2.5 pr-11 pl-3.5 text-left transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    isActive ? "border-ink" : "border-ink/20 hover:border-ink",
                    focusClass,
                  )}
                >
                  <span className="block truncate font-brand text-sm font-medium text-ink">{entry.title}</span>
                  <span className="mt-0.5 block font-mono text-chrome tracking-chrome text-ink-soft uppercase">
                    {formatRelativeTime(entry.lastActivityAt, now)} · {describeExpiry(entry.expiresAt, now)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(entry.id)}
                  aria-label={`Delete chat: ${entry.title}`}
                  className={cn(
                    "absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-paper text-ink-soft",
                    "transition-colors hover:bg-paper-pin-red/10 hover:text-paper-pin-red",
                    focusClass,
                  )}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="font-mono text-chrome tracking-chrome text-ink-soft uppercase">
        Chats are kept for {AI_SESSION_TTL_DAYS} days after last use
      </p>
    </div>
  );
}
