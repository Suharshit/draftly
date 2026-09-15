import {
  CANVAS_SHAPES,
  SHAPE_DEFAULTS,
  SHAPE_KICKERS,
  TEXT_NODE_SHAPE,
  type CanvasArrowDirection,
  type CanvasEdge,
  type CanvasNode,
  type CanvasShape,
} from "@/types/canvas";

// ---------------------------------------------------------------------------
// Spec graph
//
// The canvas as the spec describes it: drawn components split into groups of
// connected components (each group becomes one diagram section), the
// connections between them, and text notes placed with the group they sit
// next to. Components get short refs ("c1") and groups short ids ("g1") that
// the model uses; the renderer maps them back to names.
// ---------------------------------------------------------------------------

/** Largest canvas a single spec run covers. */
export const SPEC_MAX_COMPONENTS = 200;

/** A note further than this from every group is listed as a general note. */
const NOTE_ATTACH_DISTANCE = 600;

export interface SpecComponent {
  ref: string;
  nodeId: string;
  label: string;
  kind: string;
  shape: CanvasShape;
  groupId: string;
}

export interface SpecConnection {
  sourceRef: string;
  targetRef: string;
  label?: string;
  async: boolean;
  direction: CanvasArrowDirection;
}

export interface SpecGroup {
  /** "g1", "g2", … in reading order, or "standalone". */
  id: string;
  standalone: boolean;
  componentRefs: string[];
  /** Indexes into `SpecGraph.connections`. */
  connectionIndexes: number[];
  notes: string[];
}

export interface SpecGraph {
  components: SpecComponent[];
  connections: SpecConnection[];
  groups: SpecGroup[];
  /** Notes that are not near any group. */
  generalNotes: string[];
  /** Drawn components on the canvas, including any beyond `SPEC_MAX_COMPONENTS`. */
  totalComponents: number;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function labelOf(node: CanvasNode): string {
  return typeof node.data?.label === "string" ? node.data.label.trim() : "";
}

function resolveShape(shape: unknown): CanvasShape {
  return (CANVAS_SHAPES as readonly unknown[]).includes(shape) ? (shape as CanvasShape) : "rectangle";
}

function boxOf(node: CanvasNode): Box {
  const fallback = node.data?.shape === TEXT_NODE_SHAPE ? SHAPE_DEFAULTS.text : SHAPE_DEFAULTS[resolveShape(node.data?.shape)];
  const width = typeof node.style?.width === "number" ? node.style.width : fallback.width;
  const height = typeof node.style?.height === "number" ? node.style.height : fallback.height;
  return { x: node.position.x, y: node.position.y, width, height };
}

/** Distance from a point to the nearest edge of a box; 0 inside it. */
function distanceToBox(point: { x: number; y: number }, box: Box): number {
  const dx = Math.max(box.x - point.x, 0, point.x - (box.x + box.width));
  const dy = Math.max(box.y - point.y, 0, point.y - (box.y + box.height));
  return Math.hypot(dx, dy);
}

function boundingBox(boxes: readonly Box[]): Box {
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function buildSpecGraph(nodes: readonly CanvasNode[], edges: readonly CanvasEdge[]): SpecGraph {
  const drawnAll = nodes.filter((node) => node.data?.shape !== TEXT_NODE_SHAPE && labelOf(node).length > 0);
  const drawn = drawnAll.slice(0, SPEC_MAX_COMPONENTS);
  const nodeById = new Map(drawn.map((node) => [node.id, node]));
  const boxes = new Map(drawn.map((node) => [node.id, boxOf(node)]));

  const keptEdges = edges.filter(
    (edge) => nodeById.has(edge.source) && nodeById.has(edge.target) && edge.source !== edge.target,
  );

  // Union-find over connections: each connected set of components is one diagram.
  const parent = new Map(drawn.map((node) => [node.id, node.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) {
      root = parent.get(root) as string;
    }
    let current = id;
    while (parent.get(current) !== root) {
      const next = parent.get(current) as string;
      parent.set(current, root);
      current = next;
    }
    return root;
  };
  for (const edge of keptEdges) {
    const a = find(edge.source);
    const b = find(edge.target);
    if (a !== b) {
      parent.set(a, b);
    }
  }

  const clusters = new Map<string, string[]>();
  for (const node of drawn) {
    const root = find(node.id);
    clusters.set(root, [...(clusters.get(root) ?? []), node.id]);
  }

  const byPosition = (a: string, b: string) => {
    const boxA = boxes.get(a) as Box;
    const boxB = boxes.get(b) as Box;
    return boxA.y - boxB.y || boxA.x - boxB.x;
  };
  const clusterBox = (ids: readonly string[]) => boundingBox(ids.map((id) => boxes.get(id) as Box));

  const connected = [...clusters.values()]
    .filter((ids) => ids.length > 1)
    .sort((a, b) => {
      const boxA = clusterBox(a);
      const boxB = clusterBox(b);
      return boxA.y - boxB.y || boxA.x - boxB.x;
    });
  const singles = [...clusters.values()].filter((ids) => ids.length === 1).flat();

  const ordered = connected.map((ids, index) => ({ id: `g${index + 1}`, standalone: false, nodeIds: [...ids].sort(byPosition) }));
  if (singles.length > 0) {
    ordered.push({ id: "standalone", standalone: true, nodeIds: [...singles].sort(byPosition) });
  }

  const refByNodeId = new Map<string, string>();
  const components: SpecComponent[] = [];
  for (const group of ordered) {
    for (const nodeId of group.nodeIds) {
      const node = nodeById.get(nodeId) as CanvasNode;
      const ref = `c${components.length + 1}`;
      const shape = resolveShape(node.data?.shape);
      refByNodeId.set(nodeId, ref);
      components.push({
        ref,
        nodeId,
        label: labelOf(node),
        kind: node.data?.kicker?.trim() || SHAPE_KICKERS[shape],
        shape,
        groupId: group.id,
      });
    }
  }

  const connections: SpecConnection[] = keptEdges.map((edge) => {
    const label = edge.data?.label?.trim();
    return {
      sourceRef: refByNodeId.get(edge.source) as string,
      targetRef: refByNodeId.get(edge.target) as string,
      ...(label ? { label } : {}),
      async: edge.data?.edgeStyle === "dashed" || edge.data?.edgeStyle === "dotted",
      direction: edge.data?.arrowDirection ?? "none",
    };
  });

  const groups: SpecGroup[] = ordered.map((group) => ({
    id: group.id,
    standalone: group.standalone,
    componentRefs: group.nodeIds.map((nodeId) => refByNodeId.get(nodeId) as string),
    connectionIndexes: [],
    notes: [],
  }));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const groupIdByRef = new Map(components.map((component) => [component.ref, component.groupId]));
  connections.forEach((connection, index) => {
    groupById.get(groupIdByRef.get(connection.sourceRef) as string)?.connectionIndexes.push(index);
  });

  const generalNotes: string[] = [];
  const groupBoxes = ordered.map((group) => ({ id: group.id, box: clusterBox(group.nodeIds) }));
  for (const note of nodes.filter((node) => node.data?.shape === TEXT_NODE_SHAPE && labelOf(node).length > 0)) {
    const box = boxOf(note);
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const nearest = groupBoxes
      .map((entry) => ({ id: entry.id, distance: distanceToBox(center, entry.box) }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (nearest && nearest.distance <= NOTE_ATTACH_DISTANCE) {
      groupById.get(nearest.id)?.notes.push(labelOf(note));
    } else {
      generalNotes.push(labelOf(note));
    }
  }

  return { components, connections, groups, generalNotes, totalComponents: drawnAll.length };
}
