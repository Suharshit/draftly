"use client";

import {
  memo,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  Fragment,
} from "react";
import {
  Handle,
  Position,
  NodeResizer,
  useReactFlow,
  useEdges,
  type NodeProps,
  type Node,
} from "@xyflow/react";

import { resolveNodeFill, TEXT_NODE_SHAPE } from "@/types/canvas";
import type { CanvasNodeData, CanvasNodeShape } from "@/types/canvas";

// ---------------------------------------------------------------------------
// Handles — source + target at every cardinal position
// Only handles with a connected edge are visible; all show on node hover
// ---------------------------------------------------------------------------

const HANDLE_STYLE_BASE: React.CSSProperties = {
  width: 7,
  height: 7,
  background: "var(--ink)",
  border: "1px solid var(--paper-bright)",
  borderRadius: "50%",
  transition: "opacity 0.15s ease",
};

const POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left] as const;

function NodeHandles({ nodeId, isHovered }: { nodeId: string; isHovered: boolean }) {
  const edges = useEdges();

  // Set of position strings ("top" | "right" | "bottom" | "left") that have ≥1 edge
  const connectedPositions = useMemo(() => {
    const set = new Set<string>();
    for (const edge of edges) {
      if (edge.source === nodeId && edge.sourceHandle) {
        set.add(edge.sourceHandle.split("-")[0]);
      }
      if (edge.target === nodeId && edge.targetHandle) {
        set.add(edge.targetHandle.split("-")[0]);
      }
    }
    return set;
  }, [edges, nodeId]);

  return (
    <>
      {POSITIONS.map((pos) => {
        const visible = isHovered || connectedPositions.has(pos);
        const style: React.CSSProperties = {
          ...HANDLE_STYLE_BASE,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? undefined : "none",
        };
        return (
          <Fragment key={pos}>
            <Handle type="source" position={pos} id={`${pos}-s`} style={style} />
            <Handle type="target" position={pos} id={`${pos}-t`} style={style} />
          </Fragment>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared rendering constants — paper card: ink hairline, hard offset shadow
// ---------------------------------------------------------------------------

const INK                 = "var(--ink)";
const PLACEHOLDER_TEXT    = "color-mix(in srgb, var(--ink-soft) 70%, transparent)";
const STROKE_WIDTH        = 1.5;
const STROKE_WIDTH_ACTIVE = 2.5;
/** Hard offset shadow, never blurred. `--shadow-flat` is valid drop-shadow() syntax. */
const SHAPE_SHADOW_FILTER = "drop-shadow(var(--shadow-flat))";
export const DEFAULT_NODE_FONT_SIZE = 14;

/** Default mono kicker above the label, describing what the shape usually stands for. */
export const SHAPE_KICKERS: Record<CanvasNodeShape, string> = {
  rectangle: "Service",
  circle:    "Event",
  diamond:   "Decision",
  pill:      "Queue",
  cylinder:  "Database",
  hexagon:   "External",
  text:      "Note",
};

// ---------------------------------------------------------------------------
// Label block — mono kicker + Archivo label
// ---------------------------------------------------------------------------

interface NodeLabelProps {
  kicker: string;
  label: string;
  bold: boolean;
  italic: boolean;
  fontSize: number;
  showKicker: boolean;
  align: "left" | "center";
}

function NodeLabel({ kicker, label, bold, italic, fontSize, showKicker, align }: NodeLabelProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "left" ? "flex-start" : "center",
        gap: 5,
        maxWidth: "100%",
        maxHeight: "100%",
        overflow: "hidden",
        textAlign: align,
        position: "relative",
        zIndex: 1,
      }}
    >
      {showKicker && (
        <span
          style={{
            fontFamily: "var(--font-brand-mono)",
            fontSize: 10,
            lineHeight: 1,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-soft)",
            whiteSpace: "nowrap",
          }}
        >
          {kicker}
        </span>
      )}
      <span
        style={{
          fontFamily: "var(--font-brand-primary)",
          fontSize,
          fontWeight: bold ? 800 : 600,
          fontStyle: italic ? "italic" : "normal",
          lineHeight: 1.25,
          color: label ? INK : PLACEHOLDER_TEXT,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {label || "Untitled"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG shape props
// ---------------------------------------------------------------------------

interface SvgShapeProps {
  width: number;
  height: number;
  selected: boolean;
  fillColor: string;
  isEditing: boolean;
  labelProps: NodeLabelProps;
}

// ---------------------------------------------------------------------------
// SVG renderers — diamond, hexagon, cylinder
// ---------------------------------------------------------------------------

function SvgLabel({
  width, height, padding, labelProps,
}: {
  width: number; height: number; padding: string; labelProps: NodeLabelProps;
}) {
  return (
    <foreignObject x={0} y={0} width={width} height={height} style={{ pointerEvents: "none" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <NodeLabel {...labelProps} />
      </div>
    </foreignObject>
  );
}

function shapePaintProps(p: SvgShapeProps) {
  return {
    fill: p.fillColor,
    stroke: INK,
    strokeWidth: p.selected ? STROKE_WIDTH_ACTIVE : STROKE_WIDTH,
    strokeLinejoin: "round" as const,
  };
}

const SVG_STYLE: React.CSSProperties = {
  display: "block",
  overflow: "visible",
  transition: "stroke-width 0.15s ease",
};

function DiamondSvg(p: SvgShapeProps) {
  const mid = { x: p.width / 2, y: p.height / 2 };
  const points = `${mid.x},0 ${p.width},${mid.y} ${mid.x},${p.height} 0,${mid.y}`;
  return (
    <svg width={p.width} height={p.height} viewBox={`0 0 ${p.width} ${p.height}`} style={SVG_STYLE}>
      <polygon points={points} {...shapePaintProps(p)} style={{ filter: SHAPE_SHADOW_FILTER }} />
      {!p.isEditing && (
        <SvgLabel width={p.width} height={p.height} labelProps={p.labelProps}
          padding={`${p.height * 0.2}px ${p.width * 0.22}px`} />
      )}
    </svg>
  );
}

function HexagonSvg(p: SvgShapeProps) {
  const mid = { x: p.width / 2, y: p.height / 2 };
  const qx = p.width * 0.25, qx3 = p.width * 0.75;
  const points = `${qx},0 ${qx3},0 ${p.width},${mid.y} ${qx3},${p.height} ${qx},${p.height} 0,${mid.y}`;
  return (
    <svg width={p.width} height={p.height} viewBox={`0 0 ${p.width} ${p.height}`} style={SVG_STYLE}>
      <polygon points={points} {...shapePaintProps(p)} style={{ filter: SHAPE_SHADOW_FILTER }} />
      {!p.isEditing && (
        <SvgLabel width={p.width} height={p.height} labelProps={p.labelProps}
          padding={`8px ${p.width * 0.16}px`} />
      )}
    </svg>
  );
}

function CylinderSvg(p: SvgShapeProps) {
  const ry = Math.max(6, Math.min(16, p.height * 0.12));
  const topY = ry + 1;
  const bottomY = Math.max(topY + 8, p.height - ry - 1);
  const paint = shapePaintProps(p);
  return (
    <svg width={p.width} height={p.height} viewBox={`0 0 ${p.width} ${p.height}`} style={SVG_STYLE}>
      <g style={{ filter: SHAPE_SHADOW_FILTER }}>
        {/* Body: bottom cap, then side walls, then the open top ellipse drawn over them */}
        <ellipse cx={p.width / 2} cy={bottomY} rx={Math.max(2, p.width / 2 - 1)} ry={ry} {...paint} />
        <rect x={1} y={topY} width={p.width - 2} height={Math.max(8, bottomY - topY)}
          fill={p.fillColor} stroke="none" />
        <line x1={1} y1={topY} x2={1} y2={bottomY} stroke={INK} strokeWidth={paint.strokeWidth} />
        <line x1={p.width - 1} y1={topY} x2={p.width - 1} y2={bottomY} stroke={INK} strokeWidth={paint.strokeWidth} />
        <ellipse cx={p.width / 2} cy={topY} rx={Math.max(2, p.width / 2 - 1)} ry={ry} {...paint} />
      </g>
      {!p.isEditing && (
        <SvgLabel width={p.width} height={p.height} labelProps={p.labelProps}
          padding={`${ry * 2 + 2}px 10px ${ry}px`} />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CSS shape — rectangle, circle, pill
// ---------------------------------------------------------------------------

function getCssShapeStyle(
  shape: CanvasNodeShape,
  selected: boolean,
  fillColor: string,
): React.CSSProperties {
  const base: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 12px",
    boxSizing: "border-box",
    background: fillColor,
    border: `${STROKE_WIDTH}px solid ${INK}`,
    boxShadow: selected ? `0 0 0 1px ${INK}, var(--shadow-flat)` : "var(--shadow-flat)",
    transition: "box-shadow 0.15s ease, background 0.15s ease",
    overflow: "hidden",
    position: "relative",
  };
  switch (shape) {
    case "circle":  return { ...base, borderRadius: "50%" };
    case "pill":    return { ...base, borderRadius: 9999, padding: "6px 18px" };
    case "rectangle":
    default:        return { ...base, borderRadius: 2, justifyContent: "flex-start", padding: "10px 16px" };
  }
}

// ---------------------------------------------------------------------------
// Inline label editor overlay
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Free text node — no border or fill, sized by its content
// ---------------------------------------------------------------------------

const TEXT_NODE_MAX_WIDTH = 320;

interface TextNodeBodyProps {
  data: CanvasNodeData;
  selected: boolean;
  isEditing: boolean;
  editValue: string;
  onChange: (v: string) => void;
  onClose: () => void;
}

function TextNodeBody({ data, selected, isEditing, editValue, onChange, onClose }: TextNodeBodyProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [isEditing]);

  const text = isEditing ? editValue : data.label;

  const typography: React.CSSProperties = {
    fontFamily: "var(--font-brand-primary)",
    fontSize: data.fontSize ?? DEFAULT_NODE_FONT_SIZE,
    fontWeight: data.bold ? 700 : 400,
    fontStyle: data.italic ? "italic" : "normal",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  };

  return (
    // The textarea and an invisible copy of its text share one grid cell, so the copy sets the size.
    <div
      style={{
        display: "inline-grid",
        minWidth: 48,
        maxWidth: TEXT_NODE_MAX_WIDTH,
        padding: "4px 6px",
        borderRadius: 2,
        outline: selected || isEditing ? `1px dashed ${INK}` : "none",
        outlineOffset: 2,
      }}
    >
      <span
        aria-hidden={isEditing || undefined}
        style={{
          ...typography,
          gridArea: "1 / 1",
          visibility: isEditing ? "hidden" : "visible",
          color: text ? INK : PLACEHOLDER_TEXT,
        }}
      >
        {/* A trailing space keeps a final empty line measurable while typing. */}
        {text ? (isEditing ? `${text} ` : text) : "Add text"}
      </span>
      {isEditing && (
        <textarea
          ref={ref}
          className="nodrag nopan"
          aria-label="Text"
          value={editValue}
          rows={1}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onClose}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") onClose(); }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...typography,
            gridArea: "1 / 1",
            width: "100%",
            height: "100%",
            margin: 0,
            padding: 0,
            resize: "none",
            overflow: "hidden",
            background: "transparent",
            border: "none",
            outline: "none",
            color: INK,
            caretColor: INK,
          }}
        />
      )}
    </div>
  );
}

interface LabelEditorProps {
  value: string;
  data: CanvasNodeData;
  onChange: (v: string) => void;
  onClose: () => void;
}

function LabelEditor({ value, data, onChange, onClose }: LabelEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  return (
    <div
      className="nodrag nopan"
      style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 30, pointerEvents: "all",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onClose}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") onClose(); }}
        onClick={(e) => e.stopPropagation()}
        rows={2}
        style={{
          width: "80%", resize: "none", textAlign: "center",
          fontSize: data.fontSize ?? DEFAULT_NODE_FONT_SIZE,
          fontFamily: "var(--font-brand-primary)",
          fontWeight: data.bold ? 800 : 600,
          fontStyle: data.italic ? "italic" : "normal",
          color: INK,
          background: "transparent", border: "none", outline: "none",
          caretColor: INK,
          lineHeight: 1.4, padding: 0, overflowY: "hidden",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom node component
// ---------------------------------------------------------------------------

const SVG_SHAPES = new Set<CanvasNodeShape>(["diamond", "hexagon", "cylinder"]);

export const CanvasNodeComponent = memo(function CanvasNodeComponent({
  data,
  selected,
  id,
  width: nodeWidth,
  height: nodeHeight,
}: NodeProps<Node<CanvasNodeData>>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const { setNodes } = useReactFlow();

  const shape = data.shape ?? "rectangle";
  const width = typeof nodeWidth === "number" ? nodeWidth : 120;
  const height = typeof nodeHeight === "number" ? nodeHeight : 60;

  // Stroke and text are always ink; only the fill varies (legacy dark colors map to an accent).
  const fillColor = resolveNodeFill(data.color).value;

  const showKicker =
    shape === "diamond" ? width >= 120 && height >= 100 : width >= 88 && height >= 52;

  const labelProps: NodeLabelProps = {
    kicker: data.kicker?.trim() || SHAPE_KICKERS[shape],
    label: data.label,
    bold: !!data.bold,
    italic: !!data.italic,
    fontSize: data.fontSize ?? DEFAULT_NODE_FONT_SIZE,
    showKicker,
    align: shape === "rectangle" ? "left" : "center",
  };

  // ── Label editing ────────────────────────────────────────────────────────
  const enterEditing = useCallback(() => {
    setEditValue(data.label ?? "");
    setIsEditing(true);
  }, [data.label]);

  const handleLabelChange = useCallback(
    (v: string) => {
      setEditValue(v);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, label: v } } : n,
        ),
      );
    },
    [id, setNodes],
  );

  const closeEditing = useCallback(() => setIsEditing(false), []);

  if (shape === TEXT_NODE_SHAPE) {
    return (
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={(e) => { e.stopPropagation(); enterEditing(); }}
      >
        {/* Notes are free annotations: no connection handles. */}
        <TextNodeBody
          data={data}
          selected={!!selected}
          isEditing={isEditing}
          editValue={editValue}
          onChange={handleLabelChange}
          onClose={closeEditing}
        />
      </div>
    );
  }

  const isSvgShape = SVG_SHAPES.has(shape);

  const svgProps: SvgShapeProps = {
    width, height, selected: !!selected, fillColor, isEditing, labelProps,
  };

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={(e) => { e.stopPropagation(); enterEditing(); }}
    >
      <NodeResizer
        minWidth={40}
        minHeight={40}
        isVisible={!isEditing && !!selected}
        keepAspectRatio={shape === "circle" || shape === "pill"}
        lineStyle={{ borderColor: INK, borderStyle: "dashed", borderWidth: 1 }}
        handleStyle={{ width: 8, height: 8, background: "var(--paper-bright)", border: `1px solid ${INK}`, borderRadius: 0 }}
      />

      <NodeHandles nodeId={id} isHovered={isHovered} />

      {isSvgShape ? (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {shape === "diamond"  && <DiamondSvg  {...svgProps} />}
          {shape === "hexagon"  && <HexagonSvg  {...svgProps} />}
          {shape === "cylinder" && <CylinderSvg {...svgProps} />}
        </div>
      ) : (
        <div style={getCssShapeStyle(shape, !!selected, fillColor)}>
          {!isEditing && <NodeLabel {...labelProps} />}
        </div>
      )}

      {/* Inline label editor */}
      {isEditing && (
        <LabelEditor
          value={editValue}
          data={data}
          onChange={handleLabelChange}
          onClose={closeEditing}
        />
      )}
    </div>
  );
});
