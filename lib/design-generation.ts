import { z } from "zod";

import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  CANVAS_SHAPES,
  EDGE_ARROW_DIRECTIONS,
  NODE_COLOR_IDS,
  NODE_COLOR_PALETTE,
  SHAPE_DEFAULTS,
  type CanvasEdge,
  type CanvasNode,
  type NodeColorId,
} from "@/types/canvas";

// ---------------------------------------------------------------------------
// Generation schema
//
// This is the contract handed to the model. It is deliberately narrower than
// CanvasNode / CanvasEdge: the model only chooses semantics (what exists, how
// it connects, roughly where it sits). Everything the canvas needs in order to
// render — node type, edge type, pixel sizes, resolved hex colors — is filled
// in by buildCanvasGraph() below, so the model can never emit a value the
// canvas is unable to draw.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Run progress contract
//
// The task publishes its current stage on run metadata; the AI sidebar reads
// it back over Realtime. Both ends import these constants so the key and the
// stage names cannot drift apart.
// ---------------------------------------------------------------------------

/** Metadata key carrying the current {@link DesignAgentStage}. */
export const DESIGN_AGENT_STAGE_KEY = "stage";

/** Progress stages a design run moves through, in order. */
export const DESIGN_AGENT_STAGES = ["generating", "writing", "done"] as const;

export type DesignAgentStage = (typeof DESIGN_AGENT_STAGES)[number];

/** Narrows an unknown metadata value to a known stage. */
export function parseDesignAgentStage(value: unknown): DesignAgentStage | null {
  return DESIGN_AGENT_STAGES.find((stage) => stage === value) ?? null;
}

/** Upper bound on generated components, to keep a single run legible. */
const MAX_NODES = 24;

/** Upper bound on generated connections. */
const MAX_EDGES = 48;

/** A single generated component in the system design. */
export const designNodeSchema = z.object({
  id: z.string().min(1).describe("Short unique slug for this component, e.g. 'api-gateway'."),
  label: z
    .string()
    .min(1)
    .describe("Human readable component name shown on the node, e.g. 'API Gateway'."),
  position: z
    .object({
      x: z.number().describe("Horizontal hint. Sibling components sit side by side."),
      y: z.number().describe("Vertical hint. Requests flow from low y to high y."),
    })
    .describe("Rough layout hint only. Exact pixel placement is resolved by the app."),
  shape: z
    .enum(CANVAS_SHAPES)
    .describe(
      "Visual shape. Use 'cylinder' for datastores, 'pill' for gateways and entry points, " +
        "'diamond' for routers and decisions, 'rectangle' for services, 'hexagon' for queues " +
        "and brokers, 'circle' for clients and external actors.",
    ),
  colorId: z
    .enum(NODE_COLOR_IDS)
    .optional()
    .describe("Palette entry used to tint the node. Give related components the same entry."),
});

/** A single generated connection between two components. */
export const designEdgeSchema = z.object({
  id: z.string().min(1).describe("Short unique slug for this connection."),
  source: z.string().min(1).describe("`id` of the node the connection starts at."),
  target: z.string().min(1).describe("`id` of the node the connection ends at."),
  label: z.string().optional().describe("Short description of the traffic, e.g. 'writes'."),
  arrowDirection: z
    .enum(EDGE_ARROW_DIRECTIONS)
    .describe("Arrowheads to draw. Use 'forward' for one-way flow."),
});

/** The full structured output requested from the model. */
export const designGraphSchema = z.object({
  nodes: z.array(designNodeSchema).min(1).max(MAX_NODES),
  edges: z.array(designEdgeSchema).max(MAX_EDGES),
});

export type DesignGraph = z.infer<typeof designGraphSchema>;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Horizontal distance between two adjacent layout columns. */
const COLUMN_WIDTH = 240;

/** Vertical distance between two adjacent layout rows. */
const ROW_HEIGHT = 170;

/**
 * Vertical distance within which two model-supplied `y` values are treated as
 * belonging to the same row.
 */
const ROW_TOLERANCE = 60;

interface LayoutOrigin {
  x: number;
  y: number;
}

export interface BuildCanvasGraphOptions {
  /**
   * Prefix applied to every generated id, so a run can never collide with
   * content already in the room.
   */
  idPrefix: string;
  /** Top-left corner the generated graph is laid out from. */
  origin?: LayoutOrigin;
}

function resolveColor(colorId: NodeColorId | undefined) {
  return NODE_COLOR_PALETTE.find((entry) => entry.id === colorId) ?? NODE_COLOR_PALETTE[0];
}

/**
 * Groups nodes into rows by their model-supplied `y`, then orders each row by
 * `x`. The model's coordinates are only a hint; collapsing them onto a fixed
 * grid means nodes cannot overlap regardless of what the model returned.
 */
function assignGridCells(nodes: DesignGraph["nodes"]): Map<string, { column: number; row: number }> {
  const ordered = [...nodes].sort(
    (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
  );

  const rows: DesignGraph["nodes"][] = [];
  let currentRow: DesignGraph["nodes"] = [];
  let rowAnchorY: number | null = null;

  for (const node of ordered) {
    if (rowAnchorY === null) {
      rowAnchorY = node.position.y;
      currentRow.push(node);
      continue;
    }

    if (Math.abs(node.position.y - rowAnchorY) <= ROW_TOLERANCE) {
      currentRow.push(node);
      continue;
    }

    rows.push(currentRow);
    currentRow = [node];
    rowAnchorY = node.position.y;
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  const cells = new Map<string, { column: number; row: number }>();
  rows.forEach((row, rowIndex) => {
    [...row]
      .sort((a, b) => a.position.x - b.position.x)
      .forEach((node, columnIndex) => {
        cells.set(node.id, { column: columnIndex, row: rowIndex });
      });
  });

  return cells;
}

// ---------------------------------------------------------------------------
// Model output -> canvas graph
// ---------------------------------------------------------------------------

/**
 * Maps validated model output onto fully-formed canvas nodes and edges.
 *
 * Nodes and edges are re-keyed under `idPrefix`, laid out on a non-overlapping
 * grid, and given the canvas node/edge types plus `SHAPE_DEFAULTS` sizing.
 * Edges pointing at nodes the model did not define are dropped.
 */
export function buildCanvasGraph(
  design: DesignGraph,
  { idPrefix, origin = { x: 0, y: 0 } }: BuildCanvasGraphOptions,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const seenNodeIds = new Set<string>();
  const uniqueNodes = design.nodes.filter((node) => {
    if (seenNodeIds.has(node.id)) {
      return false;
    }
    seenNodeIds.add(node.id);
    return true;
  });

  const cells = assignGridCells(uniqueNodes);
  const canvasNodeIds = new Map<string, string>();

  const nodes: CanvasNode[] = uniqueNodes.map((node) => {
    const canvasNodeId = `${idPrefix}-${node.id}`;
    canvasNodeIds.set(node.id, canvasNodeId);

    const dimensions = SHAPE_DEFAULTS[node.shape];
    const color = resolveColor(node.colorId);
    const cell = cells.get(node.id) ?? { column: 0, row: 0 };

    return {
      id: canvasNodeId,
      type: CANVAS_NODE_TYPE,
      position: {
        x: origin.x + cell.column * COLUMN_WIDTH + (COLUMN_WIDTH - dimensions.width) / 2,
        y: origin.y + cell.row * ROW_HEIGHT + (ROW_HEIGHT - dimensions.height) / 2,
      },
      style: {
        width: dimensions.width,
        height: dimensions.height,
      },
      data: {
        label: node.label,
        shape: node.shape,
        color: color.bg,
        textColor: "var(--text-primary)",
        strokeColor: "var(--text-primary)",
      },
    };
  });

  const seenEdgeIds = new Set<string>();
  const edges: CanvasEdge[] = [];

  for (const edge of design.edges) {
    const source = canvasNodeIds.get(edge.source);
    const target = canvasNodeIds.get(edge.target);
    if (!source || !target || source === target) {
      continue;
    }

    const canvasEdgeId = `${idPrefix}-${edge.id}`;
    if (seenEdgeIds.has(canvasEdgeId)) {
      continue;
    }
    seenEdgeIds.add(canvasEdgeId);

    const label = edge.label?.trim();

    edges.push({
      id: canvasEdgeId,
      type: CANVAS_EDGE_TYPE,
      source,
      target,
      data: {
        arrowDirection: edge.arrowDirection,
        ...(label ? { label } : {}),
      },
    });
  }

  return { nodes, edges };
}
