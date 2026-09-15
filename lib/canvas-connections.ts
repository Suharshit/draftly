import { SHAPE_DEFAULTS, type CanvasNodeShape } from "@/types/canvas";

/**
 * Connection points. Every node has one point per side, and each point holds a single edge
 * (in either direction). A side's source handle is `${side}-s` and its target handle `${side}-t`.
 */
export const HANDLE_SIDES = ["top", "right", "bottom", "left"] as const;

export type HandleSide = (typeof HANDLE_SIDES)[number];

/** The ends of an edge or an in-progress connection. */
interface EdgeEnds {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/** The node fields needed to work out which way an edge leaves it. */
interface NodeBox {
  id: string;
  position: { x: number; y: number };
  style?: { width?: unknown; height?: unknown };
  data?: { shape?: string };
}

interface Box {
  cx: number;
  cy: number;
  width: number;
  height: number;
}

const OPPOSITE_SIDE: Record<HandleSide, HandleSide> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
};

/**
 * Side of a handle id. Edges saved without a handle id resolve to the top side, because
 * React Flow attaches them to the node's first handle, which is the top one.
 */
export function getHandleSide(handleId: string | null | undefined): HandleSide {
  const side = handleId?.split("-")[0];
  return HANDLE_SIDES.find((entry) => entry === side) ?? "top";
}

export function getHandleId(side: HandleSide, type: "source" | "target"): string {
  return `${side}-${type === "source" ? "s" : "t"}`;
}

/** Sides of `nodeId` that already hold an edge. */
export function getUsedSides(edges: readonly EdgeEnds[], nodeId: string): Set<string> {
  const used = new Set<string>();
  for (const edge of edges) {
    if (edge.source === nodeId) used.add(getHandleSide(edge.sourceHandle));
    if (edge.target === nodeId) used.add(getHandleSide(edge.targetHandle));
  }
  return used;
}

/** Whether a new connection lands on two free points. */
export function canConnect(edges: readonly EdgeEnds[], connection: EdgeEnds): boolean {
  const sourceSide = getHandleSide(connection.sourceHandle);
  const targetSide = getHandleSide(connection.targetHandle);

  if (connection.source === connection.target && sourceSide === targetSide) {
    return false;
  }

  const others = connection.id ? edges.filter((edge) => edge.id !== connection.id) : edges;
  return (
    !getUsedSides(others, connection.source).has(sourceSide) &&
    !getUsedSides(others, connection.target).has(targetSide)
  );
}

function getBox(node: NodeBox): Box {
  const shape = (node.data?.shape ?? "rectangle") as CanvasNodeShape;
  const fallback = SHAPE_DEFAULTS[shape] ?? SHAPE_DEFAULTS.rectangle;
  const width = typeof node.style?.width === "number" ? node.style.width : fallback.width;
  const height = typeof node.style?.height === "number" ? node.style.height : fallback.height;

  return {
    cx: node.position.x + width / 2,
    cy: node.position.y + height / 2,
    width,
    height,
  };
}

/** Sides of `from`, best first, for an edge heading to `to`: facing side, then the turn towards it. */
function rankSides(from: Box, to: Box): HandleSide[] {
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const horizontalGap = Math.abs(dx) - (from.width + to.width) / 2;
  const verticalGap = Math.abs(dy) - (from.height + to.height) / 2;

  const horizontal: HandleSide = dx >= 0 ? "right" : "left";
  const vertical: HandleSide = dy >= 0 ? "bottom" : "top";
  const [primary, secondary] = horizontalGap > verticalGap ? [horizontal, vertical] : [vertical, horizontal];

  return [primary, secondary, OPPOSITE_SIDE[secondary], OPPOSITE_SIDE[primary]];
}

/** 0 for a perfectly straight horizontal/vertical edge, up to 1 for a 45° diagonal. */
function getSkew(source: Box | undefined, target: Box | undefined): number {
  if (!source || !target) return 1;
  const dx = Math.abs(target.cx - source.cx);
  const dy = Math.abs(target.cy - source.cy);
  return Math.min(dx, dy) / Math.max(dx, dy, 1);
}

/**
 * Gives every edge without handles a free side on each node, one edge per side.
 *
 * Straight edges pick first so they keep the facing sides; diagonal edges then turn out of a
 * free side. Existing handles are kept. A node with more than four edges has to share a side.
 */
export function assignEdgeHandles<E extends EdgeEnds>(nodes: readonly NodeBox[], edges: readonly E[]): E[] {
  const boxes = new Map(nodes.map((node) => [node.id, getBox(node)]));
  const usedSides = new Map<string, Set<HandleSide>>();

  const getSidesOf = (nodeId: string) => {
    let sides = usedSides.get(nodeId);
    if (!sides) {
      sides = new Set();
      usedSides.set(nodeId, sides);
    }
    return sides;
  };

  for (const edge of edges) {
    if (edge.sourceHandle) getSidesOf(edge.source).add(getHandleSide(edge.sourceHandle));
    if (edge.targetHandle) getSidesOf(edge.target).add(getHandleSide(edge.targetHandle));
  }

  const pickSide = (nodeId: string, ranked: HandleSide[]) => {
    const sides = getSidesOf(nodeId);
    const side = ranked.find((entry) => !sides.has(entry)) ?? ranked[0];
    sides.add(side);
    return side;
  };

  const order = edges
    .map((_, index) => index)
    .sort((a, b) => {
      const skewA = getSkew(boxes.get(edges[a].source), boxes.get(edges[a].target));
      const skewB = getSkew(boxes.get(edges[b].source), boxes.get(edges[b].target));
      return skewA - skewB || a - b;
    });

  const result = [...edges];
  for (const index of order) {
    const edge = edges[index];
    const sourceBox = boxes.get(edge.source);
    const targetBox = boxes.get(edge.target);
    if (!sourceBox || !targetBox) continue;

    result[index] = {
      ...edge,
      sourceHandle: edge.sourceHandle ?? getHandleId(pickSide(edge.source, rankSides(sourceBox, targetBox)), "source"),
      targetHandle: edge.targetHandle ?? getHandleId(pickSide(edge.target, rankSides(targetBox, sourceBox)), "target"),
    };
  }

  return result;
}
