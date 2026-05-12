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

import type { CanvasNodeData, CanvasShape } from "@/types/canvas";
import { NODE_COLOR_PALETTE } from "@/types/canvas";
import type { NodeColorPair } from "@/types/canvas";

// ---------------------------------------------------------------------------
// Partial data update helper type
// ---------------------------------------------------------------------------

type NodeDataUpdate = Partial<
  Pick<CanvasNodeData, "color" | "textColor" | "strokeColor" | "bold" | "italic" | "fontSize">
>;

// ---------------------------------------------------------------------------
// Handles — source + target at every cardinal position
// Only handles with a connected edge are visible; all show on node hover
// ---------------------------------------------------------------------------

const HANDLE_STYLE_BASE: React.CSSProperties = {
  width: 7,
  height: 7,
  background: "var(--text-primary)", // small white dot
  border: "1px solid var(--bg-surface)",
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
// Shared rendering constants
// ---------------------------------------------------------------------------

const STROKE_REST     = "var(--border-default)";
const STROKE_SELECTED = "var(--accent-primary)";
const DEFAULT_FILL    = "var(--bg-surface)";
const DEFAULT_TEXT    = "var(--text-primary)";
const MUTED_TEXT      = "var(--text-muted)";
const STROKE_WIDTH    = 1;

// ---------------------------------------------------------------------------
// SVG shape props
// ---------------------------------------------------------------------------

interface SvgShapeProps {
  width: number;
  height: number;
  selected: boolean;
  label: string;
  shape: CanvasShape;
  fillColor: string;
  strokeColor: string;
  nodeTextColor: string;
  bold: boolean;
  italic: boolean;
  fontSize: number;
  isEditing: boolean;
}

// ---------------------------------------------------------------------------
// SVG renderers — diamond, hexagon, cylinder
// ---------------------------------------------------------------------------

function SvgLabel({
  x, y, label, nodeTextColor, bold, italic, fontSize, placeholder,
}: {
  x: number; y: number; label: string;
  nodeTextColor: string; bold: boolean; italic: boolean; fontSize: number;
  placeholder: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontSize,
        fontFamily: "var(--font-sans)",
        fontWeight: bold ? "bold" : "normal",
        fontStyle: italic || !label ? "italic" : "normal",
        fill: label ? nodeTextColor : MUTED_TEXT,
        pointerEvents: "none",
      }}
    >
      {label || placeholder}
    </text>
  );
}

function DiamondSvg(p: SvgShapeProps) {
  const stroke = p.selected ? STROKE_SELECTED : p.strokeColor;
  const mid = { x: p.width / 2, y: p.height / 2 };
  const points = `${mid.x},0 ${p.width},${mid.y} ${mid.x},${p.height} 0,${mid.y}`;
  return (
    <svg width={p.width} height={p.height} viewBox={`0 0 ${p.width} ${p.height}`}
      style={{ display: "block", transition: "stroke 0.15s ease", overflow: "visible" }}
    >
      <polygon points={points} fill={p.fillColor} stroke={stroke} strokeWidth={STROKE_WIDTH} />
      {!p.isEditing && (
        <SvgLabel x={mid.x} y={mid.y} label={p.label} nodeTextColor={p.nodeTextColor}
          bold={p.bold} italic={p.italic} fontSize={p.fontSize} placeholder="diamond" />
      )}
    </svg>
  );
}

function HexagonSvg(p: SvgShapeProps) {
  const stroke = p.selected ? STROKE_SELECTED : p.strokeColor;
  const mid = { x: p.width / 2, y: p.height / 2 };
  const qx = p.width * 0.25, qx3 = p.width * 0.75;
  const points = `${qx},0 ${qx3},0 ${p.width},${mid.y} ${qx3},${p.height} ${qx},${p.height} 0,${mid.y}`;
  return (
    <svg width={p.width} height={p.height} viewBox={`0 0 ${p.width} ${p.height}`}
      style={{ display: "block", transition: "stroke 0.15s ease", overflow: "visible" }}
    >
      <polygon points={points} fill={p.fillColor} stroke={stroke} strokeWidth={STROKE_WIDTH} />
      {!p.isEditing && (
        <SvgLabel x={mid.x} y={mid.y} label={p.label} nodeTextColor={p.nodeTextColor}
          bold={p.bold} italic={p.italic} fontSize={p.fontSize} placeholder="hexagon" />
      )}
    </svg>
  );
}

function CylinderSvg(p: SvgShapeProps) {
  const stroke = p.selected ? STROKE_SELECTED : p.strokeColor;
  const ry = Math.max(6, p.width * 0.12);
  const mid = { x: p.width / 2, y: p.height / 2 + ry / 2 };
  return (
    <svg width={p.width} height={p.height} viewBox={`0 0 ${p.width} ${p.height}`}
      style={{ display: "block", transition: "stroke 0.15s ease", overflow: "visible" }}
    >
      <rect x={0} y={ry} width={p.width} height={p.height - ry}
        fill={p.fillColor} stroke={stroke} strokeWidth={STROKE_WIDTH} />
      <ellipse cx={p.width / 2} cy={p.height} rx={p.width / 2} ry={ry}
        fill={p.fillColor} stroke={stroke} strokeWidth={STROKE_WIDTH} />
      <ellipse cx={p.width / 2} cy={ry} rx={p.width / 2} ry={ry}
        fill={p.fillColor} stroke={stroke} strokeWidth={STROKE_WIDTH} />
      {!p.isEditing && (
        <SvgLabel x={mid.x} y={mid.y} label={p.label} nodeTextColor={p.nodeTextColor}
          bold={p.bold} italic={p.italic} fontSize={p.fontSize} placeholder="cylinder" />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CSS shape — rectangle, circle, pill
// ---------------------------------------------------------------------------

function getCssShapeStyle(
  shape: CanvasShape | undefined,
  selected: boolean,
  fillColor: string,
  strokeColor: string,
): React.CSSProperties {
  const base: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    background: fillColor,
    border: `${STROKE_WIDTH}px solid ${selected ? STROKE_SELECTED : strokeColor}`,
    transition: "border-color 0.15s ease, background 0.15s ease",
    overflow: "hidden",
    position: "relative",
  };
  switch (shape) {
    case "circle":  return { ...base, borderRadius: "50%" };
    case "pill":    return { ...base, borderRadius: 9999 };
    case "rectangle":
    default:        return { ...base, borderRadius: 6 };
  }
}

// ---------------------------------------------------------------------------
// Toolbar helpers
// ---------------------------------------------------------------------------

function ToolbarDivider() {
  return (
    <span style={{
      display: "inline-block", width: 1,
      height: 16, background: "var(--border-default)",
      margin: "0 6px", flexShrink: 0,
    }} />
  );
}

function ToolbarLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9, color: "var(--text-muted)",
      userSelect: "none", marginRight: 4, flexShrink: 0,
    }}>
      {children}
    </span>
  );
}

function ToolbarBtn({
  children, active, title, onClick, style,
}: {
  children: React.ReactNode;
  active?: boolean;
  title?: string;
  onClick: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 22, height: 22, borderRadius: 4, border: "none", cursor: "pointer",
        background: active ? "var(--accent-primary)" : "transparent",
        color: active ? "#fff" : "var(--text-muted)",
        fontSize: 12, padding: 0, flexShrink: 0,
        transition: "background 0.12s ease, color 0.12s ease",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Swatch — shared between fill and stroke sections
// ---------------------------------------------------------------------------

function Swatch({
  pair, isActive, isStroke, onSelect,
}: {
  pair: NodeColorPair;
  isActive: boolean;
  isStroke: boolean;
  onSelect: (pair: NodeColorPair) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const baseStyle: React.CSSProperties = isStroke
    ? {
        background: `${pair.bg}28`,
        border: `2px solid ${pair.bg}`,
      }
    : {
        background: pair.bg,
        border: isActive ? `3px solid ${pair.text}` : "3px solid transparent",
      };

  return (
    <button
      title={pair.label}
      onClick={(e) => { e.stopPropagation(); onSelect(pair); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 16, height: 16, borderRadius: "50%", cursor: "pointer",
        flexShrink: 0, padding: 0,
        outline: isActive ? `1px solid ${pair.text}` : "none",
        outlineOffset: 1,
        transition: "box-shadow 0.12s ease",
        boxShadow: hovered && !isActive
          ? `0 0 0 3px ${pair.text}44`
          : isActive
          ? `0 0 0 2px ${pair.text}33`
          : "none",
        ...baseStyle,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Node format toolbar — rounded rectangle, above node when selected
// ---------------------------------------------------------------------------

interface NodeFormatToolbarProps {
  data: CanvasNodeData;
  onUpdate: (update: NodeDataUpdate) => void;
}

function NodeFormatToolbar({ data, onUpdate }: NodeFormatToolbarProps) {
  const fontSize = data.fontSize ?? 12;

  return (
    <div
      className="nodrag nopan"
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 0,
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: 8,           // rounded rectangle, NOT pill
        padding: "4px 8px",
        zIndex: 50,
        pointerEvents: "all",
        boxShadow: "0 4px 20px rgba(0,0,0,0.55)",
        whiteSpace: "nowrap",
      }}
    >
      {/* ── Fill colors ── */}
      <ToolbarLabel>Fill</ToolbarLabel>
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        {NODE_COLOR_PALETTE.map((pair) => (
          <Swatch
            key={pair.id}
            pair={pair}
            isStroke={false}
            isActive={(data.color ?? NODE_COLOR_PALETTE[0].bg) === pair.bg}
            onSelect={(p) => onUpdate({ color: p.bg, textColor: p.text })}
          />
        ))}
      </div>

      <ToolbarDivider />

      {/* ── Stroke / outline colors ── */}
      <ToolbarLabel>Stroke</ToolbarLabel>
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        {NODE_COLOR_PALETTE.map((pair) => (
          <Swatch
            key={pair.id}
            pair={pair}
            isStroke
            isActive={(data.strokeColor ?? NODE_COLOR_PALETTE[0].bg) === pair.bg}
            onSelect={(p) => onUpdate({ strokeColor: p.bg })}
          />
        ))}
      </div>

      <ToolbarDivider />

      {/* ── Text formatting ── */}
      <ToolbarBtn
        title="Bold"
        active={!!data.bold}
        onClick={() => onUpdate({ bold: !data.bold })}
        style={{ fontWeight: "bold", fontSize: 13 }}
      >
        B
      </ToolbarBtn>
      <ToolbarBtn
        title="Italic"
        active={!!data.italic}
        onClick={() => onUpdate({ italic: !data.italic })}
        style={{ fontStyle: "italic", fontSize: 13 }}
      >
        I
      </ToolbarBtn>

      <ToolbarDivider />

      {/* ── Font size ── */}
      <ToolbarBtn
        title="Decrease font size"
        onClick={() => onUpdate({ fontSize: Math.max(8, fontSize - 1) })}
      >
        −
      </ToolbarBtn>
      <span style={{
        fontSize: 10, color: "var(--text-muted)",
        minWidth: 28, textAlign: "center", userSelect: "none", flexShrink: 0,
      }}>
        {fontSize}px
      </span>
      <ToolbarBtn
        title="Increase font size"
        onClick={() => onUpdate({ fontSize: Math.min(48, fontSize + 1) })}
      >
        +
      </ToolbarBtn>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline label editor overlay
// ---------------------------------------------------------------------------

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
          fontSize: data.fontSize ?? 12,
          fontFamily: "var(--font-sans)",
          fontWeight: data.bold ? "bold" : "normal",
          fontStyle: data.italic ? "italic" : "normal",
          color: data.textColor ?? DEFAULT_TEXT,
          background: "transparent", border: "none", outline: "none",
          caretColor: "var(--accent-primary)",
          lineHeight: 1.4, padding: 0, overflowY: "hidden",
        }}
      />
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
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const { setNodes, getNode } = useReactFlow();

  const shape = data.shape;
  const node = getNode(id);
  const width  = (node?.style?.width  as number | undefined) ?? (node?.measured?.width  ?? 120);
  const height = (node?.style?.height as number | undefined) ?? (node?.measured?.height ?? 60);

  // Derived color values
  const fillColor      = data.color       ?? DEFAULT_FILL;
  const nodeTextColor  = data.textColor   ?? DEFAULT_TEXT;
  const strokeColor    = data.strokeColor ?? STROKE_REST;
  const bold           = !!data.bold;
  const italic         = !!data.italic;
  const fontSize       = data.fontSize    ?? 12;

  // ── Collaborative data updater ──────────────────────────────────────────
  const handleDataUpdate = useCallback(
    (update: NodeDataUpdate) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...update } } : n,
        ),
      );
    },
    [id, setNodes],
  );

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

  const isSvgShape = shape !== undefined && SVG_SHAPES.has(shape);

  const svgProps: SvgShapeProps = {
    width, height, selected: !!selected,
    label: data.label, shape: shape ?? "rectangle",
    fillColor, strokeColor, nodeTextColor,
    bold, italic, fontSize, isEditing,
  };

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={(e) => { e.stopPropagation(); enterEditing(); }}
    >
      {/* Format toolbar — visible when selected and not editing */}
      {!!selected && !isEditing && (
        <NodeFormatToolbar data={data} onUpdate={handleDataUpdate} />
      )}

      <NodeResizer
        minWidth={40}
        minHeight={40}
        isVisible={!isEditing && !!selected}
        keepAspectRatio={shape === "circle" || shape === "pill"}
        lineStyle={{ border: "1px solid var(--accent-primary)" }}
        handleStyle={{ width: 8, height: 8, background: "var(--accent-primary)", border: "none", borderRadius: 2 }}
      />

      <NodeHandles nodeId={id} isHovered={isHovered} />

      {isSvgShape ? (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {shape === "diamond"  && <DiamondSvg  {...svgProps} />}
          {shape === "hexagon"  && <HexagonSvg  {...svgProps} />}
          {shape === "cylinder" && <CylinderSvg {...svgProps} />}
        </div>
      ) : (
        <div style={getCssShapeStyle(shape, !!selected, fillColor, strokeColor)}>
          {!isEditing && (
            <span style={{
              fontSize,
              fontFamily: "var(--font-sans)",
              fontWeight: bold ? "bold" : "normal",
              fontStyle: (italic || !data.label) ? "italic" : "normal",
              color: data.label ? nodeTextColor : MUTED_TEXT,
              textAlign: "center", lineHeight: 1.4,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: "80%", position: "relative", zIndex: 1,
            }}>
              {data.label || (shape ?? "node")}
            </span>
          )}
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
