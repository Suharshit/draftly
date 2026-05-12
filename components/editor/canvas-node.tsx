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
// SVG shape renderers — diamond, hexagon, cylinder
// ---------------------------------------------------------------------------

interface SvgShapeProps {
  width: number;
  height: number;
  selected: boolean;
  label: string;
  shape: CanvasShape;
}

const STROKE_REST     = "var(--border-default)";
const STROKE_SELECTED = "var(--accent-primary)";
const FILL_COLOR      = "var(--bg-surface)";
const STROKE_WIDTH    = 1.5;

function DiamondSvg({ width, height, selected, label }: SvgShapeProps) {
  const stroke = selected ? STROKE_SELECTED : STROKE_REST;
  const mid = { x: width / 2, y: height / 2 };
  const points = `${mid.x},0 ${width},${mid.y} ${mid.x},${height} 0,${mid.y}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", transition: "stroke 0.15s ease", overflow: "visible" }}
    >
      <polygon
        points={points}
        fill={FILL_COLOR}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
      />
      <text
        x={mid.x}
        y={mid.y}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: 12,
          fontFamily: "var(--font-sans)",
          fill: label ? "var(--text-primary)" : "var(--text-muted)",
          fontStyle: label ? "normal" : "italic",
          pointerEvents: "none",
        }}
      >
        {label || "diamond"}
      </text>
    </svg>
  );
}

function HexagonSvg({ width, height, selected, label }: SvgShapeProps) {
  const stroke = selected ? STROKE_SELECTED : STROKE_REST;
  const mid = { x: width / 2, y: height / 2 };
  const qx = width * 0.25;
  const qx3 = width * 0.75;
  const points = `${qx},0 ${qx3},0 ${width},${mid.y} ${qx3},${height} ${qx},${height} 0,${mid.y}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", transition: "stroke 0.15s ease", overflow: "visible" }}
    >
      <polygon
        points={points}
        fill={FILL_COLOR}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
      />
      <text
        x={mid.x}
        y={mid.y}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: 12,
          fontFamily: "var(--font-sans)",
          fill: label ? "var(--text-primary)" : "var(--text-muted)",
          fontStyle: label ? "normal" : "italic",
          pointerEvents: "none",
        }}
      >
        {label || "hexagon"}
      </text>
    </svg>
  );
}

function CylinderSvg({ width, height, selected, label }: SvgShapeProps) {
  const stroke = selected ? STROKE_SELECTED : STROKE_REST;
  // Cap ellipse radius along Y axis — proportional to width
  const ry = Math.max(6, width * 0.12);
  const mid = { x: width / 2, y: height / 2 + ry / 2 };
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", transition: "stroke 0.15s ease", overflow: "visible" }}
    >
      {/* Body rectangle */}
      <rect
        x={0}
        y={ry}
        width={width}
        height={height - ry}
        fill={FILL_COLOR}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
      />
      {/* Bottom cap ellipse */}
      <ellipse
        cx={width / 2}
        cy={height}
        rx={width / 2}
        ry={ry}
        fill={FILL_COLOR}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
      />
      {/* Top cap ellipse */}
      <ellipse
        cx={width / 2}
        cy={ry}
        rx={width / 2}
        ry={ry}
        fill={FILL_COLOR}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
      />
      <text
        x={mid.x}
        y={mid.y}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: 12,
          fontFamily: "var(--font-sans)",
          fill: label ? "var(--text-primary)" : "var(--text-muted)",
          fontStyle: label ? "normal" : "italic",
          pointerEvents: "none",
        }}
      >
        {label || "cylinder"}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CSS shape styles — rectangle, circle, pill
// ---------------------------------------------------------------------------

function getCssShapeStyle(shape: CanvasShape | undefined, selected: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    background: "var(--bg-surface)",
    border: `${STROKE_WIDTH}px solid ${selected ? STROKE_SELECTED : STROKE_REST}`,
    transition: "border-color 0.15s ease",
    overflow: "hidden",
    position: "relative",
  };

  switch (shape) {
    case "circle":
      return { ...base, borderRadius: "50%" };
    case "pill":
      return { ...base, borderRadius: 9999 };
    case "rectangle":
    default:
      return { ...base, borderRadius: 6 };
  }
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

const SVG_SHAPES = new Set<CanvasShape>(["diamond", "hexagon", "cylinder"]);

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

  const isSvgShape = shape !== undefined && SVG_SHAPES.has(shape);

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

      {isSvgShape ? (
        /* SVG-based shapes — diamond, hexagon, cylinder */
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {shape === "diamond" && (
            <DiamondSvg
              width={width}
              height={height}
              selected={!!selected}
              label={data.label}
              shape={shape}
            />
          )}
          {shape === "hexagon" && (
            <HexagonSvg
              width={width}
              height={height}
              selected={!!selected}
              label={data.label}
              shape={shape}
            />
          )}
          {shape === "cylinder" && (
            <CylinderSvg
              width={width}
              height={height}
              selected={!!selected}
              label={data.label}
              shape={shape}
            />
          )}
        </div>
      ) : (
        /* CSS-based shapes — rectangle, circle, pill */
        <div style={getCssShapeStyle(shape, !!selected)}>
          <span
            style={{
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              color: data.label ? "var(--text-primary)" : "var(--text-muted)",
              fontStyle: data.label ? "normal" : "italic",
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
            {data.label || (shape ?? "node")}
          </span>
        </div>
      )}

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
