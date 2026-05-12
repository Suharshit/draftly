import type { Node, Edge } from "@xyflow/react";

/**
 * Data payload carried by every canvas node.
 * Shape and color are reserved for future custom node rendering.
 */
export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  color?: string;
  shape?: string;
}

/**
 * Data payload carried by every canvas edge.
 * Reserved for future custom edge rendering.
 */
export type CanvasEdgeData = Record<string, unknown>;

/** Named node type constant used across the canvas. */
export const CANVAS_NODE_TYPE = "canvasNode" as const;

/** Named edge type constant used across the canvas. */
export const CANVAS_EDGE_TYPE = "canvasEdge" as const;

/** Fully-typed React Flow node for the Ghost AI canvas. */
export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>;

/** Fully-typed React Flow edge for the Ghost AI canvas. */
export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>;
