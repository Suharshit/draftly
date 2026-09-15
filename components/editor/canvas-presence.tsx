"use client";

import { useMemo } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useOthers } from "@liveblocks/react/suspense";
import { useStore, ViewportPortal } from "@xyflow/react";
import { Bot } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface PresenceCursor {
  x: number;
  y: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PanelDivider() {
  return <span aria-hidden className="h-5 w-px shrink-0 bg-ink/15" />;
}

interface CanvasPresenceOverlayProps {
  /** The docked AI sidebar covers the canvas's right edge on lg+, so the panel sits left of it. */
  isAiSidebarOpen: boolean;
}

/** Top-right canvas status: zoom, node count, active collaborators and the user menu. */
export function CanvasPresenceOverlay({ isAiSidebarOpen }: CanvasPresenceOverlayProps) {
  const { user } = useUser();
  const others = useOthers();
  const zoomPercent = useStore((state) => Math.round(state.transform[2] * 100));
  const nodeCount = useStore((state) => state.nodes.length);

  const collaborators = useMemo(() => {
    return others.filter((other) => other.id !== user?.id && other.info.id !== user?.id);
  }, [others, user?.id]);

  const visibleCollaborators = collaborators.slice(0, 5);
  const overflowCount = Math.max(0, collaborators.length - visibleCollaborators.length);

  return (
    <div
      aria-label="Canvas status"
      className={cn(
        "absolute top-3 right-3 z-20 flex h-12 items-center gap-3 rounded-paper border border-ink bg-paper-bright px-3 text-ink shadow-flat scheme-light",
        "transition-[right] duration-300 ease-out",
        isAiSidebarOpen && "lg:right-97",
      )}
    >
      <p className="font-mono text-chrome tracking-chrome text-ink uppercase">
        <span className="sr-only">Zoom </span>
        {zoomPercent}%
      </p>
      <PanelDivider />
      <p className="font-mono text-chrome tracking-chrome text-ink-soft uppercase">
        {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
      </p>
      {collaborators.length > 0 ? (
        <>
          <PanelDivider />
          <div className="flex -space-x-2" title={collaborators.map((collaborator) => collaborator.info.name).join(", ")}>
            <span className="sr-only">
              {collaborators.length} {collaborators.length === 1 ? "collaborator" : "collaborators"} online
            </span>
            {visibleCollaborators.map((collaborator) => (
              <Avatar
                key={collaborator.connectionId}
                className="h-8 w-8 ring-2 ring-paper-bright"
                aria-hidden="true"
              >
                {collaborator.info.avatar ? (
                  <AvatarImage src={collaborator.info.avatar} alt={collaborator.info.name} />
                ) : null}
                <AvatarFallback className="bg-paper-accent-marker-amber font-brand text-xs font-semibold text-ink">
                  {getInitials(collaborator.info.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {overflowCount > 0 ? (
              <div
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-brand text-xs font-semibold text-paper-cream ring-2 ring-paper-bright"
              >
                +{overflowCount}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
      <PanelDivider />
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox: "h-8 w-8",
            avatarBox: "h-8 w-8 border border-ink/40",
          },
        }}
      />
    </div>
  );
}

/**
 * Shows that a collaborator has a design generation running in this room,
 * driven by the `thinking` presence flag the AI sidebar sets.
 *
 * Rendered top-center so it stays visible when the AI sidebar is open.
 */
export function CanvasThinkingIndicator() {
  const others = useOthers();

  const thinkingCount = useMemo(() => {
    return others.filter((other) => other.presence.thinking).length;
  }, [others]);

  if (thinkingCount === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)]/90 px-2.5 py-1.5 backdrop-blur-sm">
        <Bot className="h-4 w-4 animate-pulse text-[var(--accent-primary)]" aria-hidden="true" />
        <p className="text-xs text-[var(--text-muted)]" aria-live="polite">
          {thinkingCount === 1
            ? "A collaborator is generating a design…"
            : `${thinkingCount} collaborators are generating designs…`}
        </p>
      </div>
    </div>
  );
}

export function LiveCursors() {
  const { user } = useUser();
  const others = useOthers();

  const participants = useMemo(() => {
    return others.filter((other) => {
      if (other.id === user?.id || other.info.id === user?.id) {
        return false;
      }
      return other.presence.cursor !== null;
    });
  }, [others, user?.id]);

  return (
    <ViewportPortal>
      {participants.map((participant) => {
        const cursor = participant.presence.cursor as PresenceCursor | null;
        if (!cursor) return null;

        const color = participant.info.color;
        return (
          <div
            key={participant.connectionId}
            className="pointer-events-none absolute select-none"
            style={{ left: cursor.x, top: cursor.y, transform: "translate(-1px, -1px)" }}
          >
            <svg
              width="18"
              height="24"
              viewBox="0 0 18 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M2 2L2 20L7 15.6L10.2 22L13.1 20.6L9.8 14.1L16 14L2 2Z"
                fill={color}
                stroke="var(--bg-base)"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <div
              className="mt-1 inline-flex rounded-sm px-1.5 py-0.5 text-xs font-medium text-[var(--text-primary)]"
              style={{ backgroundColor: color }}
            >
              {participant.info.name}
            </div>
          </div>
        );
      })}
    </ViewportPortal>
  );
}
