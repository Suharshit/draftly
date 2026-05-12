"use client";

import { ZoomIn, ZoomOut, Maximize, Undo2, Redo2 } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useUndo, useRedo, useCanUndo, useCanRedo } from "@liveblocks/react";

// ---------------------------------------------------------------------------
// CanvasControlBar
// ---------------------------------------------------------------------------

/**
 * Floating pill toolbar at bottom-left of the canvas.
 * Contains:
 *  - Group 1: Zoom Out, Fit View, Zoom In (via useReactFlow)
 *  - Group 2: Undo, Redo (via Liveblocks history)
 *
 * Must be rendered inside both a ReactFlowProvider and a Liveblocks RoomProvider.
 */
export function CanvasControlBar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 24,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 0,
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: 9999,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        padding: "4px 6px",
      }}
    >
      {/* ── Group 1: Zoom controls ─────────────────────────────────────────── */}
      <ControlButton
        label="Zoom out"
        onClick={() => zoomOut({ duration: 300 })}
      >
        <ZoomOut className="h-4 w-4" />
      </ControlButton>

      <ControlButton
        label="Fit view"
        onClick={() => fitView({ duration: 300 })}
      >
        <Maximize className="h-4 w-4" />
      </ControlButton>

      <ControlButton
        label="Zoom in"
        onClick={() => zoomIn({ duration: 300 })}
      >
        <ZoomIn className="h-4 w-4" />
      </ControlButton>

      {/* ── Divider ────────────────────────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          width: 1,
          height: 16,
          background: "var(--border-default)",
          margin: "0 6px",
          flexShrink: 0,
        }}
      />

      {/* ── Group 2: History controls ──────────────────────────────────────── */}
      <ControlButton
        label="Undo"
        onClick={undo}
        disabled={!canUndo}
      >
        <Undo2 className="h-4 w-4" />
      </ControlButton>

      <ControlButton
        label="Redo"
        onClick={redo}
        disabled={!canRedo}
      >
        <Redo2 className="h-4 w-4" />
      </ControlButton>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared button primitive
// ---------------------------------------------------------------------------

interface ControlButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function ControlButton({ label, onClick, disabled = false, children }: ControlButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        background: "transparent",
        border: "none",
        borderRadius: 9999,
        color: disabled ? "var(--text-muted)" : "var(--text-primary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? "none" : "auto",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "color-mix(in srgb, var(--accent-primary) 10%, transparent)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = disabled
          ? "var(--text-muted)"
          : "var(--text-primary)";
      }}
    >
      {children}
    </button>
  );
}
