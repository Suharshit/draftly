"use client";

import { Component, type ReactNode } from "react";
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";

import { CanvasFlow } from "@/components/editor/canvas-flow";
import { DraftlyLoader } from "@/components/ui/marketing/draftly-loader";
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave";

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
          <p className="font-brand text-sm text-ink-soft">
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
  canAutosave: boolean;
  onSaveStatusChange?: (status: CanvasSaveStatus) => void;
  isSidebarOpen: boolean;
  /** Moves the canvas status panel clear of the docked AI sidebar. */
  isAiSidebarOpen: boolean;
  /**
   * Rendered inside the room, next to the canvas. Overlays that need room
   * presence (such as the AI sidebar) belong here rather than as a sibling of
   * `CanvasWrapper`, which would place them outside the `RoomProvider`.
   */
  children?: ReactNode;
}

/**
 * Sets up the Liveblocks room for the collaborative canvas.
 *
 * - LiveblocksProvider authenticates via /api/liveblocks-auth
 * - RoomProvider scopes the room to the current projectId
 * - Initial presence includes cursor: null (no active cursor on join)
 * - ClientSideSuspense defers rendering until the room is ready
 * - CanvasErrorBoundary catches Liveblocks connection failures
 * - `children` render inside the room so they can read and write presence
 */
export function CanvasWrapper({
  roomId,
  canAutosave,
  onSaveStatusChange,
  isSidebarOpen,
  isAiSidebarOpen,
  children,
}: CanvasWrapperProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, thinking: false }}
      >
        <CanvasErrorBoundary>
          <ClientSideSuspense
            fallback={
              // Fixed over the whole editor: the navbar and AI sidebar render outside this boundary.
              // z-45 sits above the sidebars (z-20/z-40) and below dialogs (z-50).
              <DraftlyLoader caption="Connecting to canvas" className="fixed inset-0 z-45" />
            }
          >
            <CanvasFlow
              projectId={roomId}
              canAutosave={canAutosave}
              onSaveStatusChange={onSaveStatusChange}
              isSidebarOpen={isSidebarOpen}
              isAiSidebarOpen={isAiSidebarOpen}
            />
          </ClientSideSuspense>
        </CanvasErrorBoundary>
        {children}
      </RoomProvider>
    </LiveblocksProvider>
  );
}
