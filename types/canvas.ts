import type { Node, Edge } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Shape catalogue
// ---------------------------------------------------------------------------

/** All supported draggable shapes. */
export type CanvasShape =
  | "rectangle"
  | "circle"
  | "diamond"
  | "pill"
  | "cylinder"
  | "hexagon";

/** Default width / height for each shape (pixels). */
export const SHAPE_DEFAULTS: Record<CanvasShape, { width: number; height: number }> = {
  rectangle: { width: 110, height: 54 },
  circle:    { width: 72,  height: 72 },
  diamond:   { width: 90,  height: 90 },
  pill:      { width: 110, height: 46 },
  cylinder:  { width: 82,  height: 72 },
  hexagon:   { width: 90,  height: 90 },
};

// ---------------------------------------------------------------------------
// Node color palette
// ---------------------------------------------------------------------------

/** A predefined background + text color pair for canvas nodes. */
export interface NodeColorPair {
  id: string;
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
  shape?: CanvasShape;
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
  arrowDirection?: "none" | "forward" | "backward" | "bidirectional";
  /**
   * Custom stroke color (hex). When defined uses pair.text from NODE_COLOR_PALETTE
   * for high visibility. Undefined = default zinc gray.
   */
  color?: string;
  /**
   * Matching palette entry id so arrowhead markers resolve to the correct color.
   * Undefined = default marker pair.
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
