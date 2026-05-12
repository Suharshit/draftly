"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";

import type { CanvasEdgeData } from "@/types/canvas";
import { CANVAS_EDGE_TYPE } from "@/types/canvas";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLOR_REST   = "#52525b"; // slightly brighter dim gray (vs --border-default #27272a)
const STROKE_WIDTH = 2;
const HIT_WIDTH    = 18; // wide invisible path for easy hover/click

// ---------------------------------------------------------------------------
// Marker SVG defs — must be rendered once into the React Flow SVG layer
// ---------------------------------------------------------------------------

/**
 * Render this once inside the React Flow `<svg>` element (or any ancestor
 * SVG that shares the same DOM) so both arrowhead markers are defined.
 * CanvasFlow renders this via a hidden <svg> in the canvas wrapper.
 */
export function CanvasEdgeMarkerDefs() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
      <defs>
        <marker
          id="canvas-arrow-rest"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COLOR_REST} />
        </marker>
        <marker
          id="canvas-arrow-active"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
        </marker>
      </defs>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Auto-sizing width helper
// ---------------------------------------------------------------------------

function measureInputWidth(text: string): number {
  return Math.max(60, text.length * 8);
}

// ---------------------------------------------------------------------------
// Inline label — read-only badge + edit input
// ---------------------------------------------------------------------------

interface EdgeLabelProps {
  edgeId: string;
  label: string | undefined;
  labelX: number;
  labelY: number;
  isActive: boolean;
  /** When true, immediately enter editing mode on mount */
  startEditing: boolean;
  onEditingChange: (editing: boolean) => void;
}

function EdgeLabel({
  edgeId,
  label,
  labelX,
  labelY,
  isActive,
  startEditing,
  onEditingChange,
}: EdgeLabelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft]         = useState(label ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const { setEdges } = useReactFlow();

  // Respond to parent requesting edit mode (double-click on invisible path)
  useEffect(() => {
    if (startEditing && !isEditing) {
      setDraft(label ?? "");
      setIsEditing(true);
      onEditingChange(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startEditing]);

  // Auto-focus + select-all when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const enterEdit = useCallback(() => {
    setDraft(label ?? "");
    setIsEditing(true);
    onEditingChange(true);
  }, [label, onEditingChange]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...e.data, label: trimmed || undefined } }
          : e,
      ),
    );
    setIsEditing(false);
    onEditingChange(false);
  }, [draft, edgeId, setEdges, onEditingChange]);

  const discard = useCallback(() => {
    setIsEditing(false);
    onEditingChange(false);
  }, [onEditingChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === "Enter")  { e.preventDefault(); commit(); }
      if (e.key === "Escape") { e.preventDefault(); discard(); }
    },
    [commit, discard],
  );

  return (
    <EdgeLabelRenderer>
      <div
        className="nodrag nopan"
        style={{
          position: "absolute",
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          pointerEvents: "all",
          zIndex: 10,
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: measureInputWidth(draft),
              fontSize: 11,
              fontFamily: "var(--font-sans)",
              color: "var(--text-primary)",
              background: "var(--bg-surface)",
              border: "1px solid var(--accent-primary)",
              borderRadius: 4,
              padding: "2px 6px",
              outline: "none",
              caretColor: "var(--accent-primary)",
              textAlign: "center",
            }}
          />
        ) : (
          <div
            onDoubleClick={(e) => { e.stopPropagation(); enterEdit(); }}
            style={{
              // Always reserve space to allow double-click even without a label,
              // but only show visible badge when a label exists.
              display: "flex",
              alignItems: "center",
              minWidth: label ? undefined : 24,
              minHeight: label ? undefined : 16,
              fontSize: 11,
              fontFamily: "var(--font-sans)",
              color: isActive ? "var(--accent-primary)" : "var(--text-muted)",
              background: label ? "var(--bg-surface)" : "transparent",
              border: label
                ? `1px solid ${isActive ? "var(--accent-primary)" : "var(--border-default)"}`
                : "none",
              borderRadius: 4,
              padding: label ? "2px 6px" : 0,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.15s ease, border-color 0.15s ease",
              userSelect: "none",
            }}
          >
            {label ?? ""}
          </div>
        )}
      </div>
    </EdgeLabelRenderer>
  );
}

// ---------------------------------------------------------------------------
// Main custom edge component
// ---------------------------------------------------------------------------

export function CanvasEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  markerEnd: _markerEnd, // suppress default; we use our own
}: EdgeProps<Edge<CanvasEdgeData>>) {
  const [isHovered,    setIsHovered]    = useState(false);
  const [startEditing, setStartEditing] = useState(false);

  const isActive    = isHovered || !!selected;
  const strokeColor = isActive ? "var(--accent-primary)" : COLOR_REST;
  const markerId    = isActive ? "canvas-arrow-active" : "canvas-arrow-rest";

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const label = typeof data?.label === "string" ? data.label : undefined;

  return (
    <>
      {/* Visible right-angle path */}
      <BaseEdge
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{
          stroke: strokeColor,
          strokeWidth: STROKE_WIDTH,
          strokeLinecap: "round",
          transition: "stroke 0.15s ease",
          fill: "none",
        }}
      />

      {/* Wide transparent hit area — sits above the visible path in SVG stacking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={HIT_WIDTH}
        style={{ cursor: isHovered ? "pointer" : "default" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setStartEditing(true);
        }}
      />

      {/* Inline collaborative label */}
      <EdgeLabel
        edgeId={id}
        label={label}
        labelX={labelX}
        labelY={labelY}
        isActive={isActive}
        startEditing={startEditing}
        onEditingChange={(editing) => {
          if (!editing) setStartEditing(false);
        }}
      />
    </>
  );
}

export { CANVAS_EDGE_TYPE };
