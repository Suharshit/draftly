"use client";

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";

import type { CanvasEdgeData } from "@/types/canvas";
import { CANVAS_EDGE_TYPE, NODE_COLOR_PALETTE } from "@/types/canvas";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLOR_REST   = "#52525b"; // slightly brighter dim gray
const COLOR_ACTIVE = "#3b82f6"; // var(--accent-primary) as a literal for SVG markers
const STROKE_WIDTH = 2;
const HIT_WIDTH    = 18; // wide invisible path for easy hover/click

// ---------------------------------------------------------------------------
// Palette-colored arrowhead marker defs
// ---------------------------------------------------------------------------

/**
 * Renders one pair of SVG `<marker>` defs per NODE_COLOR_PALETTE entry, plus
 * the default rest/active pair.  Must be mounted once in the canvas wrapper.
 */
export function CanvasEdgeMarkerDefs() {
  return (
    <svg
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      aria-hidden
    >
      <defs>
        {/* Default markers */}
        <ArrowMarker id="canvas-arrow-default-rest"   color={COLOR_REST}   />
        <ArrowMarker id="canvas-arrow-default-active" color={COLOR_ACTIVE} />

        {/* Per-palette-entry markers */}
        {NODE_COLOR_PALETTE.map((pair) => (
          <Fragment key={pair.id}>
            <ArrowMarker
              id={`canvas-arrow-${pair.id}-rest`}
              color={pair.text}
            />
            <ArrowMarker
              id={`canvas-arrow-${pair.id}-active`}
              color={pair.text}
            />
          </Fragment>
        ))}
      </defs>
    </svg>
  );
}

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
    </marker>
  );
}

// ---------------------------------------------------------------------------
// Marker ID helpers
// ---------------------------------------------------------------------------

function markerId(colorId: string | undefined, state: "rest" | "active"): string {
  const palette = colorId ?? "default";
  return `url(#canvas-arrow-${palette}-${state})`;
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
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
}

function EdgeLabel({
  edgeId,
  label,
  labelX,
  labelY,
  isActive,
  isEditing,
  onEditingChange,
  bold,
  italic,
  fontSize = 11,
}: EdgeLabelProps) {
  const [draft, setDraft] = useState(label ?? "");
  const [prevIsEditing, setPrevIsEditing] = useState(isEditing);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setEdges } = useReactFlow();

  if (isEditing !== prevIsEditing) {
    setPrevIsEditing(isEditing);
    if (isEditing) {
      setDraft(label ?? "");
    }
  }

  // Auto-focus + select-all when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const enterEdit = useCallback(() => {
    onEditingChange(true);
  }, [onEditingChange]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...e.data, label: trimmed || undefined } }
          : e,
      ),
    );
    onEditingChange(false);
  }, [draft, edgeId, setEdges, onEditingChange]);

  const discard = useCallback(() => {
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
              fontSize,
              fontFamily: "var(--font-sans)",
              fontWeight: bold ? "bold" : "normal",
              fontStyle:  italic ? "italic" : "normal",
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
              // Always reserve space to allow double-click even without a label
              display: "flex",
              alignItems: "center",
              minWidth: label ? undefined : 24,
              minHeight: label ? undefined : 16,
              fontSize,
              fontFamily: "var(--font-sans)",
              fontWeight: bold ? "bold" : "normal",
              fontStyle:  italic ? "italic" : "normal",
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

// interface EdgeToolbarProps {
//   edgeId: string;
//   labelX: number;
//   labelY: number;
//   data: CanvasEdgeData;
// }

// const ARROW_BUTTONS: { label: string; value: CanvasEdgeData["arrowDirection"]; symbol: string }[] = [
//   { label: "No arrow", value: "none", symbol: "-" },
//   { label: "Forward", value: "forward", symbol: "->" },
//   { label: "Backward", value: "backward", symbol: "<-" },
//   { label: "Bidirectional", value: "bidirectional", symbol: "<->" },
// ];

// function EdgeToolbar({ edgeId, labelX, labelY, data }: EdgeToolbarProps) {
//   const { setEdges } = useReactFlow();

//   const patch = useCallback(
//     (patchValue: Partial<CanvasEdgeData>) => {
//       setEdges((eds) =>
//         eds.map((e) =>
//           e.id === edgeId ? { ...e, data: { ...e.data, ...patchValue } } : e,
//         ),
//       );
//     },
//     [edgeId, setEdges],
//   );

//   const currentDirection = data.arrowDirection ?? "forward";
//   const currentColorId = data.colorId ?? "default";

//   return (
//     <EdgeLabelRenderer>
//       <div
//         className="nodrag nopan"
//         onMouseDown={(e) => e.stopPropagation()}
//         style={{
//           position: "absolute",
//           transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 20}px)`,
//           pointerEvents: "all",
//           zIndex: 20,
//           display: "flex",
//           alignItems: "center",
//           gap: 4,
//           background: "var(--bg-surface)",
//           border: "1px solid var(--border-default)",
//           borderRadius: 8,
//           padding: "4px 8px",
//           boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
//         }}
//       >
//         {ARROW_BUTTONS.map(({ label, value, symbol }) => (
//           <ToolbarButton
//             key={value}
//             label={label}
//             active={currentDirection === value}
//             onClick={() => patch({ arrowDirection: value })}
//             mono
//           >
//             {symbol}
//           </ToolbarButton>
//         ))}

//         <ToolbarDivider />

//         <ToolbarButton
//           label="Bold"
//           active={!!data.bold}
//           onClick={() => patch({ bold: !data.bold })}
//           mono={false}
//           bold
//         >
//           B
//         </ToolbarButton>
//         <ToolbarButton
//           label="Italic"
//           active={!!data.italic}
//           onClick={() => patch({ italic: !data.italic })}
//           mono={false}
//           italic
//         >
//           I
//         </ToolbarButton>

//         <ToolbarDivider />

//         {NODE_COLOR_PALETTE.map((pair) => {
//           const isDefault = pair.id === "default";
//           const isActive = currentColorId === pair.id;
//           return (
//             <button
//               key={pair.id}
//               title={pair.label}
//               aria-label={`Edge color: ${pair.label}`}
//               onClick={() =>
//                 patch({
//                   color: isDefault ? undefined : pair.text,
//                   colorId: isDefault ? undefined : pair.id,
//                 })
//               }
//               style={{
//                 width: 14,
//                 height: 14,
//                 borderRadius: 9999,
//                 background: isDefault ? "var(--border-default)" : pair.text,
//                 border: isActive ? "2px solid var(--text-primary)" : "2px solid transparent",
//                 cursor: "pointer",
//                 flexShrink: 0,
//                 outline: isActive ? `2px solid ${pair.text}40` : "none",
//                 outlineOffset: 1,
//                 transition: "border-color 0.1s, outline 0.1s",
//               }}
//             />
//           );
//         })}
//       </div>
//     </EdgeLabelRenderer>
//   );
// }

// interface ToolbarButtonProps {
//   label: string;
//   active: boolean;
//   onClick: () => void;
//   children: React.ReactNode;
//   mono?: boolean;
//   bold?: boolean;
//   italic?: boolean;
// }

// function ToolbarButton({
//   label,
//   active,
//   onClick,
//   children,
//   mono = true,
//   bold = false,
//   italic = false,
// }: ToolbarButtonProps) {
//   return (
//     <button
//       title={label}
//       aria-label={label}
//       onClick={onClick}
//       style={{
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         minWidth: 22,
//         height: 22,
//         padding: "0 4px",
//         borderRadius: 4,
//         border: "none",
//         background: active
//           ? "color-mix(in srgb, var(--accent-primary) 15%, transparent)"
//           : "transparent",
//         color: active ? "var(--accent-primary)" : "var(--text-muted)",
//         fontSize: 12,
//         fontWeight: bold ? "bold" : "normal",
//         fontStyle: italic ? "italic" : "normal",
//         fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
//         cursor: "pointer",
//         transition: "background 0.1s, color 0.1s",
//       }}
//     >
//       {children}
//     </button>
//   );
// }

// function ToolbarDivider() {
//   return (
//     <div
//       aria-hidden
//       style={{
//         width: 1,
//         height: 14,
//         background: "var(--border-default)",
//         flexShrink: 0,
//         margin: "0 2px",
//       }}
//     />
//   );
// }

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
}: EdgeProps<Edge<CanvasEdgeData>>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isActive = isHovered || !!selected;

  // ── Stroke color ──────────────────────────────────────────────────────────
  // If data.color is set use it; otherwise use default rest/active colors.
  const strokeColor = data?.color
    ? data.color
    : isActive
      ? "var(--accent-primary)"
      : COLOR_REST;

  const edgeStyle = data?.edgeStyle ?? "solid";
  const strokeDasharray =
    edgeStyle === "dashed"
      ? "8 6"
      : edgeStyle === "dotted"
        ? "2 6"
        : undefined;

  // ── Arrowhead direction ───────────────────────────────────────────────────
  const direction = data?.arrowDirection ?? "none";
  const state     = isActive ? "active" : "rest";
  const colorId   = data?.colorId; // undefined → default marker pair

  const markerEnd   =
    direction === "forward" || direction === "bidirectional"
      ? markerId(colorId, state)
      : undefined;
  const markerStart =
    direction === "backward" || direction === "bidirectional"
      ? markerId(colorId, state)
      : undefined;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const label     = typeof data?.label === "string" ? data.label : undefined;
  // const showToolbar = !!selected && !isEditing;
  return (
    <>
      {/* Visible right-angle path */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          stroke: strokeColor,
          strokeWidth: STROKE_WIDTH,
          strokeLinecap: "round",
          strokeDasharray,
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
          setIsEditing(true);
        }}
      />

      {/* Inline collaborative label with typography */}
      <EdgeLabel
        edgeId={id}
        label={label}
        labelX={labelX}
        labelY={labelY}
        isActive={isActive}
        isEditing={isEditing}
        onEditingChange={setIsEditing}
        bold={data?.bold}
        italic={data?.italic}
        fontSize={data?.fontSize}
      />
    </>
  );
}

export { CANVAS_EDGE_TYPE };
