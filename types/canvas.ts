import type { Node, Edge } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Shape catalogue
// ---------------------------------------------------------------------------

/** All supported draggable shapes, as a value list usable for runtime validation. */
export const CANVAS_SHAPES = [
  "rectangle",
  "circle",
  "diamond",
  "pill",
  "cylinder",
  "hexagon",
] as const;

/** All supported draggable shapes. */
export type CanvasShape = (typeof CANVAS_SHAPES)[number];

/**
 * Free text node: no outline, sized by its content. Kept out of `CANVAS_SHAPES` (the AI output schema),
 * so generated designs never contain one.
 */
export const TEXT_NODE_SHAPE = "text" as const;

/** Every node shape the canvas renders: the drawn shapes plus the free text node. */
export type CanvasNodeShape = CanvasShape | typeof TEXT_NODE_SHAPE;

/** Default width / height for each shape (pixels). */
export const SHAPE_DEFAULTS: Record<CanvasNodeShape, { width: number; height: number }> = {
  rectangle: { width: 120, height: 60 },
  circle:    { width: 80,  height: 80 },
  diamond:   { width: 100, height: 100 },
  pill:      { width: 130, height: 54 },
  cylinder:  { width: 90,  height: 80 },
  hexagon:   { width: 100, height: 100 },
  /** Nominal only (drop placement, layout offsets). Text nodes are sized by their content. */
  text:      { width: 160, height: 32 },
};

// ---------------------------------------------------------------------------
// Node color palette
// ---------------------------------------------------------------------------

/** Palette entry ids, as a value list usable for runtime validation. */
export const NODE_COLOR_IDS = [
  "default",
  "blue",
  "purple",
  "green",
  "amber",
  "red",
  "teal",
  "pink",
] as const;

/** Id of a single entry in `NODE_COLOR_PALETTE`. */
export type NodeColorId = (typeof NODE_COLOR_IDS)[number];

/** A predefined background + text color pair for canvas nodes. */
export interface NodeColorPair {
  id: NodeColorId;
  label: string;
  /** Node background color (hex). */
  bg: string;
  /** Paired label text color (hex). */
  text: string;
}

/**
 * Curated dark-surface color pairs for canvas nodes.
 * Each entry is a deep background with a vivid, readable foreground.
 * Stored here because ui-context.md does not define node-specific palette.
 */
export const NODE_COLOR_PALETTE: NodeColorPair[] = [
  { id: "default", label: "Default", bg: "#18181b", text: "#fafafa" },
  { id: "blue",    label: "Blue",    bg: "#172554", text: "#93c5fd" },
  { id: "purple",  label: "Purple",  bg: "#2e1065", text: "#c4b5fd" },
  { id: "green",   label: "Green",   bg: "#052e16", text: "#86efac" },
  { id: "amber",   label: "Amber",   bg: "#451a03", text: "#fcd34d" },
  { id: "red",     label: "Red",     bg: "#450a0a", text: "#fca5a5" },
  { id: "teal",    label: "Teal",    bg: "#042f2e", text: "#5eead4" },
  { id: "pink",    label: "Pink",    bg: "#500724", text: "#f9a8d4" },
];

/** A node fill: paper or one of the sticky-note paper accents from `app/globals.css`. */
export interface NodeFill {
  id: "paper" | "amber" | "coral" | "sage" | "blue";
  label: string;
  /** CSS color stored in `CanvasNodeData.color`. */
  value: string;
}

/** Node fills offered in the control bar. Node stroke and text are always ink. */
export const NODE_FILLS: NodeFill[] = [
  { id: "paper", label: "Paper",        value: "var(--paper-bright)" },
  { id: "amber", label: "Marker amber", value: "var(--paper-accent-marker-amber)" },
  { id: "coral", label: "Scrap coral",  value: "var(--paper-accent-scrap-coral)" },
  { id: "sage",  label: "Cut sage",     value: "var(--paper-accent-cut-sage)" },
  { id: "blue",  label: "Draft blue",   value: "var(--paper-accent-draft-blue)" },
];

/**
 * Legacy dark palette entries (still written by AI generation and starter templates) mapped to the
 * nearest paper fill, so older nodes render in the paper style without rewriting stored data.
 */
const LEGACY_FILL_IDS: Record<NodeColorId, NodeFill["id"]> = {
  default: "paper",
  blue:    "blue",
  purple:  "blue",
  green:   "sage",
  teal:    "sage",
  amber:   "amber",
  red:     "coral",
  pink:    "coral",
};

/** Resolves a stored node color (paper fill, legacy palette hex, or nothing) to a paper fill. */
export function resolveNodeFill(color: string | undefined): NodeFill {
  const direct = NODE_FILLS.find((fill) => fill.value === color);
  if (direct) return direct;
  const legacy = NODE_COLOR_PALETTE.find((pair) => pair.bg === color);
  const fillId = legacy ? LEGACY_FILL_IDS[legacy.id] : "paper";
  return NODE_FILLS.find((fill) => fill.id === fillId) ?? NODE_FILLS[0];
}

// ---------------------------------------------------------------------------
// Node / edge types
// ---------------------------------------------------------------------------

/**
 * Data payload carried by every canvas node.
 * Shape and color are reserved for future custom node rendering.
 */
export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  /** Node background color (hex). Undefined = default surface. */
  color?: string;
  /** Node text color (hex). Paired with `color` from NODE_COLOR_PALETTE. */
  textColor?: string;
  /** Node border/outline color (hex). Undefined = default border. */
  strokeColor?: string;
  /** Whether the node label is bold. */
  bold?: boolean;
  /** Whether the node label is italic. */
  italic?: boolean;
  /** Node label font size in pixels. Default 12. */
  fontSize?: number;
  /** Small mono label above the node name. Undefined = the shape's default (e.g. "Service"). */
  kicker?: string;
  shape?: CanvasNodeShape;
}

/** Supported edge arrowhead directions, as a value list usable for runtime validation. */
export const EDGE_ARROW_DIRECTIONS = ["none", "forward", "backward", "bidirectional"] as const;

/** Direction of arrowheads rendered on a canvas edge. */
export type CanvasArrowDirection = (typeof EDGE_ARROW_DIRECTIONS)[number];

/** An edge stroke color. Dark brand tokens only, so lines read on the paper canvas. */
export interface EdgeColor {
  id: "ink" | "graphite" | "green" | "red";
  label: string;
  /** CSS color, used for both the stroke and the arrowhead marker fill. */
  value: string;
}

/** The four edge colors offered in the control bar. The first is the default. */
export const EDGE_COLORS: EdgeColor[] = [
  { id: "ink",      label: "Ink",       value: "var(--ink)" },
  { id: "graphite", label: "Graphite",  value: "var(--ink-soft)" },
  { id: "green",    label: "Mat green", value: "var(--mat-green)" },
  { id: "red",      label: "Pin red",   value: "var(--paper-pin-red)" },
];

/** Resolves a stored edge `colorId` to an edge color. Missing or legacy palette ids fall back to ink. */
export function resolveEdgeColor(colorId: string | undefined): EdgeColor {
  return EDGE_COLORS.find((color) => color.id === colorId) ?? EDGE_COLORS[0];
}

/**
 * Data payload carried by every canvas edge.
 */
export interface CanvasEdgeData extends Record<string, unknown> {
  /** Optional inline label displayed at the edge midpoint. */
  label?: string;
  /** Edge stroke style. */
  edgeStyle?: "solid" | "dashed" | "dotted";
  /**
   * Direction of arrowheads.
   * 'none'          — plain line, no arrowhead
   * 'forward'       — arrowhead at target end only
   * 'backward'      — arrowhead at source end only
   * 'bidirectional' — arrowheads at both ends
   */
  arrowDirection?: CanvasArrowDirection;
  /** Stroke color value from `EDGE_COLORS`. Rendering reads `colorId`; this is kept for older readers. */
  color?: string;
  /**
   * `EDGE_COLORS` id; the stroke and arrowhead markers resolve from it.
   * Undefined or a legacy palette id = ink.
   */
  colorId?: string;
  /** Whether the edge label is rendered bold. */
  bold?: boolean;
  /** Whether the edge label is rendered italic. */
  italic?: boolean;
  /** Custom label font size in pixels. Default 11. */
  fontSize?: number;
}

/** Named node type constant used across the canvas. */
export const CANVAS_NODE_TYPE = "canvasNode" as const;

/** Named edge type constant used across the canvas. */
export const CANVAS_EDGE_TYPE = "canvasEdge" as const;

/** Fully-typed React Flow node for the Ghost AI canvas. */
export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>;

/** Fully-typed React Flow edge for the Ghost AI canvas. */
export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>;
