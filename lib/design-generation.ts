import { z } from "zod";

import type { CanvasSummary } from "@/lib/ai/canvas-summary";
import { assignEdgeHandles } from "@/lib/canvas-connections";
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  CANVAS_SHAPES,
  EDGE_ARROW_DIRECTIONS,
  getRoleFill,
  NODE_ROLES,
  SHAPE_DEFAULTS,
  type CanvasEdge,
  type CanvasNode,
} from "@/types/canvas";

// ---------------------------------------------------------------------------
// Generation schema
//
// This is the contract handed to the model. It is deliberately narrower than
// CanvasNode / CanvasEdge: the model only chooses semantics (what exists, what
// role it plays, how it connects, roughly where it sits). Everything the canvas
// needs in order to render — node type, edge type, pixel sizes, fills, edge
// styles, connection points — is filled in by buildCanvasGraph() below, so the
// model can never emit a value the canvas is unable to draw.
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

/**
 * Progress stages a design run can report. A turn starts at `analyzing`, then
 * either finishes (questions), goes through `planning`, or — once a plan is
 * approved — through `generating` and `writing`.
 */
export const DESIGN_AGENT_STAGES = ["analyzing", "planning", "generating", "writing", "done"] as const;

export type DesignAgentStage = (typeof DESIGN_AGENT_STAGES)[number];

/** Narrows an unknown metadata value to a known stage. */
export function parseDesignAgentStage(value: unknown): DesignAgentStage | null {
  return DESIGN_AGENT_STAGES.find((stage) => stage === value) ?? null;
}

/** Upper bound on generated components, to keep a single run legible. */
export const MAX_GRAPH_NODES = 24;

/** Upper bound on generated connections. */
export const MAX_GRAPH_EDGES = 48;

/** A single generated component in the system design. */
export const designNodeSchema = z.object({
  id: z
    .string()
    .min(1)
    .describe("Short unique slug for this new component, e.g. 'api-gateway'. Never of the form 'ex-N'."),
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
      "Visual shape. 'pill' for clients and entry points (DNS, CDN, load balancers, gateways), " +
        "'rectangle' for services, APIs and workers, 'hexagon' for queues, topics and streams, " +
        "'cylinder' for databases, caches and storage, 'diamond' for routers and decisions, " +
        "'circle' for external actors and events.",
    ),
  role: z
    .enum(NODE_ROLES)
    .describe(
      "What the component does, which sets its colour: 'entry' (clients, DNS, CDN, load balancers, gateways), " +
        "'compute' (services, APIs, workers), 'messaging' (queues, topics, streams, brokers), " +
        "'data' (databases, caches, object storage), 'output' (external systems, consumers, delivery).",
    ),
  kicker: z
    .string()
    .describe("One or two word kind shown above the name, e.g. 'Gateway', 'Worker', 'Queue', 'Database'."),
});

/** A single generated connection between two components. */
export const designEdgeSchema = z.object({
  id: z.string().min(1).describe("Short unique slug for this connection."),
  source: z
    .string()
    .min(1)
    .describe("Where the connection starts: a new component's `id`, or an existing component's ref such as 'ex-2'."),
  target: z
    .string()
    .min(1)
    .describe("Where the connection ends: a new component's `id`, or an existing component's ref such as 'ex-2'."),
  label: z.string().optional().describe("Short description of the traffic, e.g. 'writes'."),
  arrowDirection: z
    .enum(EDGE_ARROW_DIRECTIONS)
    .describe("Arrowheads to draw. Use 'forward' for one-way flow."),
  delivery: z
    .enum(["sync", "async"])
    .describe("'async' for events, queues, streams, replication and background work; otherwise 'sync'."),
});

/** The full structured output requested from the model. */
// The limits are stated, not enforced as maxItems: models don't reliably honour
// them, and one extra item would fail the run. buildCanvasGraph trims instead.
export const designGraphSchema = z.object({
  nodes: z.array(designNodeSchema).min(1).describe(`New components to draw. At most ${MAX_GRAPH_NODES}.`),
  edges: z.array(designEdgeSchema).describe(`Connections. At most ${MAX_GRAPH_EDGES}.`),
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

export interface ExistingCanvas {
  summary: CanvasSummary;
  nodes: readonly CanvasNode[];
  edges: readonly CanvasEdge[];
}

export interface BuildCanvasGraphOptions {
  /**
   * Prefix applied to every generated id, so a run can never collide with
   * content already in the room.
   */
  idPrefix: string;
  /** Top-left corner the generated graph is laid out from. */
  origin?: LayoutOrigin;
  /**
   * What is already in the room. Lets edges reference existing components by
   * ref, folds redrawn duplicates into the existing node, and keeps connection
   * points that existing edges already use.
   */
  existing?: ExistingCanvas;
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
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
 * New nodes are re-keyed under `idPrefix`, laid out on a non-overlapping grid,
 * and given the canvas node/edge types, `SHAPE_DEFAULTS` sizing, the role's
 * fill, and the kicker. Async connections are dashed.
 *
 * Endpoints resolve to a new node, an existing node by ref ("ex-2"), or an
 * existing node whose label a generated node repeats (that node is not drawn
 * again). Duplicate labels among new nodes fold into the first. Edges to
 * unknown components, self-loops, and repeated pairs are dropped. Each edge
 * gets a free connection point on both nodes, counting points existing edges
 * already hold. Only the new nodes and edges are returned.
 */
export function buildCanvasGraph(
  design: DesignGraph,
  { idPrefix, origin = { x: 0, y: 0 }, existing }: BuildCanvasGraphOptions,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const existingComponents = existing?.summary.components ?? [];
  const existingNodeIdByRef = new Map(existingComponents.map((component) => [component.ref, component.nodeId]));
  const existingNodeIdByLabel = new Map(
    existingComponents.map((component) => [normalizeLabel(component.label), component.nodeId]),
  );

  /** Design ids that resolve to a node other than their own: existing duplicates and repeated labels. */
  const aliases = new Map<string, string>();
  const firstIdByLabel = new Map<string, string>();
  const seenNodeIds = new Set<string>();

  const uniqueNodes = design.nodes
    .filter((node) => {
      if (seenNodeIds.has(node.id) || existingNodeIdByRef.has(node.id)) {
        return false;
      }
      seenNodeIds.add(node.id);

      const label = normalizeLabel(node.label);
      const onCanvas = existingNodeIdByLabel.get(label);
      if (onCanvas) {
        aliases.set(node.id, onCanvas);
        return false;
      }

      const first = firstIdByLabel.get(label);
      if (first) {
        aliases.set(node.id, `${idPrefix}-${first}`);
        return false;
      }
      firstIdByLabel.set(label, node.id);
      return true;
    })
    .slice(0, MAX_GRAPH_NODES);

  const cells = assignGridCells(uniqueNodes);
  const canvasNodeIds = new Map<string, string>();

  const nodes: CanvasNode[] = uniqueNodes.map((node) => {
    const canvasNodeId = `${idPrefix}-${node.id}`;
    canvasNodeIds.set(node.id, canvasNodeId);

    const dimensions = SHAPE_DEFAULTS[node.shape];
    const cell = cells.get(node.id) ?? { column: 0, row: 0 };
    const kicker = node.kicker.trim();

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
        color: getRoleFill(node.role).value,
        ...(kicker ? { kicker } : {}),
      },
    };
  });

  const drawnIds = new Set(canvasNodeIds.values());
  const resolveEndpoint = (id: string): string | undefined => {
    const resolved = canvasNodeIds.get(id) ?? aliases.get(id) ?? existingNodeIdByRef.get(id);
    // An alias to a repeated label points at the first node, which may have been trimmed away.
    return resolved && (drawnIds.has(resolved) || !resolved.startsWith(`${idPrefix}-`)) ? resolved : undefined;
  };

  const seenEdgeIds = new Set<string>();
  const seenPairs = new Set<string>();
  const edges: CanvasEdge[] = [];

  for (const edge of design.edges) {
    if (edges.length >= MAX_GRAPH_EDGES) {
      break;
    }
    const source = resolveEndpoint(edge.source);
    const target = resolveEndpoint(edge.target);
    if (!source || !target || source === target) {
      continue;
    }

    const pair = [source, target].sort().join("|");
    const canvasEdgeId = `${idPrefix}-${edge.id}`;
    if (seenEdgeIds.has(canvasEdgeId) || seenPairs.has(pair)) {
      continue;
    }
    seenEdgeIds.add(canvasEdgeId);
    seenPairs.add(pair);

    const label = edge.label?.trim();

    edges.push({
      id: canvasEdgeId,
      type: CANVAS_EDGE_TYPE,
      source,
      target,
      data: {
        arrowDirection: edge.arrowDirection,
        edgeStyle: edge.delivery === "async" ? "dashed" : "solid",
        ...(label ? { label } : {}),
      },
    });
  }

  // One edge per node side, counting the sides existing edges already hold.
  const existingEdges = existing?.edges ?? [];
  const assigned = assignEdgeHandles([...(existing?.nodes ?? []), ...nodes], [...existingEdges, ...edges]);

  return { nodes, edges: assigned.slice(existingEdges.length) };
}
