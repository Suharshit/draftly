"use client";

import { Component, type ReactNode } from "react";
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";

import { CanvasFlow } from "@/components/editor/canvas-flow";

// ---------------------------------------------------------------------------
// Minimal error boundary — avoids adding a new package dependency.
// ---------------------------------------------------------------------------

interface ErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Failed to connect to the collaborative canvas. Check your connection and try again.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------

interface CanvasWrapperProps {
  roomId: string;
}

/**
 * Sets up the Liveblocks room for the collaborative canvas.
 *
 * - LiveblocksProvider authenticates via /api/liveblocks-auth
 * - RoomProvider scopes the room to the current projectId
 * - Initial presence includes cursor: null (no active cursor on join)
 * - ClientSideSuspense defers rendering until the room is ready
 * - CanvasErrorBoundary catches Liveblocks connection failures
 */
export function CanvasWrapper({ roomId }: CanvasWrapperProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, thinking: false }}
      >
        <CanvasErrorBoundary>
          <ClientSideSuspense
            fallback={
              <div className="flex h-full w-full items-center justify-center">
                <p className="text-sm text-muted-foreground">Connecting to canvas…</p>
              </div>
            }
          >
            <CanvasFlow />
          </ClientSideSuspense>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
