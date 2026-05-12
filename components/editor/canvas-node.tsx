"use client";

import { memo, useState, useCallback, Fragment } from "react";
import {
  Handle,
  Position,
  NodeResizer,
  useReactFlow,
  type NodeProps,
  type Node,
} from "@xyflow/react";

import type { CanvasNodeData, CanvasShape } from "@/types/canvas";

// ---------------------------------------------------------------------------
// Handles — source + target at every cardinal position (fixes direction issue)
// ---------------------------------------------------------------------------

const HANDLE_STYLE: React.CSSProperties = {
  width: 8,
  height: 8,
  background: "var(--accent-primary)",
  border: "2px solid var(--bg-surface)",
  borderRadius: "50%",
};

const POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left] as const;

function NodeHandles() {
  return (
    <>
      {POSITIONS.map((pos) => (
        <Fragment key={pos}>
          <Handle type="source" position={pos} id={`${pos}-s`} style={HANDLE_STYLE} />
          <Handle type="target" position={pos} id={`${pos}-t`} style={HANDLE_STYLE} />
        </Fragment>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shape visual styles
// ---------------------------------------------------------------------------

function getShapeStyle(shape: CanvasShape | undefined, selected: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    background: "var(--bg-surface)",
    border: `1.5px solid ${selected ? "var(--accent-primary)" : "var(--border-default)"}`,
    transition: "border-color 0.15s ease",
    overflow: "hidden",
    position: "relative",
  };

  switch (shape) {
    case "circle":   return { ...base, borderRadius: "50%" };
    case "pill":     return { ...base, borderRadius: 9999 };
    case "cylinder": return { ...base, borderRadius: "50% / 15%" };
    case "diamond":
      return {
        ...base,
        background: "transparent",
        border: "none",
        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
      };
    case "hexagon":
      return {
        ...base,
        background: "transparent",
        border: "none",
        clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
      };
    case "rectangle":
    default:
      return { ...base, borderRadius: 6 };
  }
}

// Diamond and hexagon need a filled inner layer since the outer uses clip-path (border gets clipped).
function ClipFill({ shape, selected }: { shape: CanvasShape; selected: boolean }) {
  const clipPath =
    shape === "diamond"
      ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
      : "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg-surface)",
        border: `1.5px solid ${selected ? "var(--accent-primary)" : "var(--border-default)"}`,
        clipPath,
        transition: "border-color 0.15s ease",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Dimension input — appears on node hover
// ---------------------------------------------------------------------------

interface DimInputProps {
  axis: "width" | "height";
  value: number;
  onCommit: (v: number) => void;
}

function DimInput({ axis, value, onCommit }: DimInputProps) {
  const [draft, setDraft] = useState(String(Math.round(value)));

  function commit() {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 20) onCommit(n);
    else setDraft(String(Math.round(value)));
  }

  const posStyle: React.CSSProperties =
    axis === "width"
      ? { position: "absolute", top: -24, left: "50%", transform: "translateX(-50%)" }
      : { position: "absolute", right: -50, top: "50%", transform: "translateY(-50%) rotate(90deg)" };

  return (
    <div
      className="nodrag nopan"
      style={{ ...posStyle, display: "flex", alignItems: "center", gap: 2, zIndex: 20, pointerEvents: "all" }}
    >
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); e.stopPropagation(); }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 38,
          fontSize: 10,
          textAlign: "center",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: 3,
          color: "var(--text-muted)",
          padding: "1px 3px",
          outline: "none",
        }}
      />
      <span style={{ fontSize: 9, color: "var(--text-muted)" }}>px</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom node component
// ---------------------------------------------------------------------------

export const CanvasNodeComponent = memo(function CanvasNodeComponent({
  data,
  selected,
  id,
}: NodeProps<Node<CanvasNodeData>>) {
  const [isHovered, setIsHovered] = useState(false);
  const { setNodes, getNode } = useReactFlow();

  const shape = data.shape;

  // Read current dimensions from the node object (where style lives).
  const node = getNode(id);
  const width  = (node?.style?.width  as number | undefined) ?? (node?.measured?.width  ?? 120);
  const height = (node?.style?.height as number | undefined) ?? (node?.measured?.height ?? 60);

  const updateDim = useCallback(
    (axis: "width" | "height", val: number) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, style: { ...n.style, [axis]: val } } : n,
        ),
      );
    },
    [id, setNodes],
  );

  const needsClipFill = shape === "diamond" || shape === "hexagon";

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer
        minWidth={40}
        minHeight={30}
        isVisible={selected || isHovered}
        lineStyle={{ border: "1px solid var(--accent-primary)" }}
        handleStyle={{ width: 8, height: 8, background: "var(--accent-primary)", border: "none", borderRadius: 2 }}
      />

      <NodeHandles />

      {/* Shape visual — inner div so clip-path doesn't swallow the handles */}
      <div style={getShapeStyle(shape, !!selected)}>
        {needsClipFill && <ClipFill shape={shape!} selected={!!selected} />}
        <span
          style={{
            fontSize: 12,
            fontFamily: "var(--font-sans)",
            color: "var(--text-primary)",
            textAlign: "center",
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "80%",
            position: "relative",
            zIndex: 1,
          }}
        >
          {data.label || (
            <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
              {shape ?? "node"}
            </span>
          )}
        </span>
      </div>

      {/* Dimension inputs — only on hover */}
      {isHovered && (
        <>
          <DimInput axis="width"  value={width}  onCommit={(v) => updateDim("width", v)} />
          <DimInput axis="height" value={height} onCommit={(v) => updateDim("height", v)} />
        </>
      )}
    </div>
  );
});
