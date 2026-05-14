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
// import { NODE_COLOR_PALETTE } from "@/types/canvas";
// import type { NodeColorPair } from "@/types/canvas";

// type NodeDataUpdate = Partial<
//   Pick<CanvasNodeData, "color" | "textColor" | "strokeColor" | "bold" | "italic" | "fontSize">
// >;

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
const STROKE_WIDTH    = 2;

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
  width, height, label, nodeTextColor, bold, italic, fontSize, placeholder,
}: {
  width: number; height: number; label: string;
  nodeTextColor: string; bold: boolean; italic: boolean; fontSize: number;
  placeholder: string;
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
          padding: "6px 8px",
          boxSizing: "border-box",
          textAlign: "center",
          overflow: "hidden",
          lineHeight: 1.25,
          fontSize,
          fontFamily: "var(--font-sans)",
          fontWeight: bold ? "bold" : "normal",
          fontStyle: italic || !label ? "italic" : "normal",
          color: label ? nodeTextColor : MUTED_TEXT,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {label || placeholder}
      </div>
    </foreignObject>
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
        <SvgLabel width={p.width} height={p.height} label={p.label} nodeTextColor={p.nodeTextColor}
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
        <SvgLabel width={p.width} height={p.height} label={p.label} nodeTextColor={p.nodeTextColor}
          bold={p.bold} italic={p.italic} fontSize={p.fontSize} placeholder="hexagon" />
      )}
    </svg>
  );
}

function CylinderSvg(p: SvgShapeProps) {
  const stroke = p.selected ? STROKE_SELECTED : p.strokeColor;
  const ry = Math.max(6, Math.min(16, p.height * 0.12));
  const topY = ry + 1;
  const bottomY = Math.max(topY + 8, p.height - ry - 1);
  return (
    <svg width={p.width} height={p.height} viewBox={`0 0 ${p.width} ${p.height}`}
      style={{ display: "block", transition: "stroke 0.15s ease", overflow: "visible" }}
    >
      <rect
        x={1}
        y={topY}
        width={p.width - 2}
        height={Math.max(8, bottomY - topY)}
        fill={p.fillColor} stroke={stroke} strokeWidth={STROKE_WIDTH} />
      <ellipse cx={p.width / 2} cy={topY} rx={Math.max(2, p.width / 2 - 1)} ry={ry}
        fill={p.fillColor} stroke={stroke} strokeWidth={STROKE_WIDTH} />
      <ellipse cx={p.width / 2} cy={bottomY} rx={Math.max(2, p.width / 2 - 1)} ry={ry}
        fill={p.fillColor} stroke={stroke} strokeWidth={STROKE_WIDTH} />
      {!p.isEditing && (
        <SvgLabel width={p.width} height={p.height} label={p.label} nodeTextColor={p.nodeTextColor}
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
  width: nodeWidth,
  height: nodeHeight,
}: NodeProps<Node<CanvasNodeData>>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const { setNodes } = useReactFlow();

  const shape = data.shape;
  const width = typeof nodeWidth === "number" ? nodeWidth : 120;
  const height = typeof nodeHeight === "number" ? nodeHeight : 60;

  // Derived color values
  const fillColor      = data.color       ?? DEFAULT_FILL;
  const nodeTextColor  = data.textColor   ?? DEFAULT_TEXT;
  const strokeColor    = data.strokeColor ?? STROKE_REST;
  const bold           = !!data.bold;
  const italic         = !!data.italic;
  const fontSize       = data.fontSize    ?? 12;

  // const handleDataUpdate = useCallback(
  //   (update: NodeDataUpdate) => {
  //     setNodes((nds) =>
  //       nds.map((n) =>
  //         n.id === id ? { ...n, data: { ...n.data, ...update } } : n,
  //       ),
  //     );
  //   },
  //   [id, setNodes],
  // );
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
              textAlign: "center",
              lineHeight: 1.25,
              overflow: "hidden",
              maxWidth: "84%",
              maxHeight: "78%",
              display: "block",
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              position: "relative",
              zIndex: 1,
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
