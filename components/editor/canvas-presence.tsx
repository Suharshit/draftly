"use client";

import { useMemo } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useOthers } from "@liveblocks/react/suspense";
import { ViewportPortal } from "@xyflow/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

export function CanvasPresenceOverlay() {
  const { user } = useUser();
  const others = useOthers();

  const collaborators = useMemo(() => {
    return others.filter((other) => other.id !== user?.id && other.info.id !== user?.id);
  }, [others, user?.id]);

  const visibleCollaborators = collaborators.slice(0, 5);
  const overflowCount = Math.max(0, collaborators.length - visibleCollaborators.length);

  return (
    <div className="absolute right-3 top-3 z-20 flex items-center rounded-md border border-[var(--border-default)] bg-[var(--bg-base)]/85 px-2 py-1 backdrop-blur-sm">
      {collaborators.length > 0 ? (
        <>
          <div className="flex -space-x-2">
            {visibleCollaborators.map((collaborator) => (
              <Avatar
                key={collaborator.connectionId}
                className="h-8 w-8 ring-2 ring-background"
                aria-hidden="true"
              >
                {collaborator.info.avatar ? (
                  <AvatarImage src={collaborator.info.avatar} alt={collaborator.info.name} />
                ) : null}
                <AvatarFallback className="text-xs font-medium">
                  {getInitials(collaborator.info.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {overflowCount > 0 ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] ring-2 ring-background">
                +{overflowCount}
              </div>
            ) : null}
          </div>
          <div className="mx-2 h-6 w-px bg-[var(--border-default)]" />
        </>
      ) : null}
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox: "h-8 w-8",
          },
        }}
      />
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
