import { getUsedSides } from "@/lib/canvas-connections";
import { SHAPE_KICKERS, TEXT_NODE_SHAPE, type CanvasEdge, type CanvasNode } from "@/types/canvas";

// ---------------------------------------------------------------------------
// Canvas summary
//
// A compact, model-readable view of what is already on the canvas, so the
// design agent extends an existing design instead of redrawing it. Each drawn
// component gets a short ref ("ex-3") the model can use to connect new
// components to it.
// ---------------------------------------------------------------------------

export const CANVAS_SUMMARY_LIMITS = {
  components: 60,
  connections: 80,
  notes: 10,
} as const;

/** Connection points per component; each holds one edge. */
export const CONNECTION_POINTS_PER_COMPONENT = 4;

export interface ExistingComponent {
  /** Short reference the model uses to connect to this component, e.g. "ex-3". */
  ref: string;
  nodeId: string;
  label: string;
  /** The node's kicker, or its shape's default kicker. */
  kind: string;
  /** Connection points already holding an edge (0 to 4). */
  usedConnections: number;
}

export interface ExistingConnection {
  from: string;
  to: string;
  label?: string;
  async: boolean;
}

export interface CanvasSummary {
  components: ExistingComponent[];
  connections: ExistingConnection[];
  /** Text of free text notes on the canvas. */
  notes: string[];
  /** Drawn components on the canvas, including any beyond the listing limit. */
  totalComponents: number;
}

export const EXISTING_REF_PATTERN = /^ex-\d+$/;

function labelOf(node: CanvasNode): string {
  return typeof node.data.label === "string" ? node.data.label.trim() : "";
}

export function summarizeCanvas(nodes: readonly CanvasNode[], edges: readonly CanvasEdge[]): CanvasSummary {
  const drawn = nodes.filter((node) => node.data.shape !== TEXT_NODE_SHAPE && labelOf(node).length > 0);

  const components: ExistingComponent[] = drawn
    .slice(0, CANVAS_SUMMARY_LIMITS.components)
    .map((node, index) => ({
      ref: `ex-${index + 1}`,
      nodeId: node.id,
      label: labelOf(node),
      kind: node.data.kicker?.trim() || SHAPE_KICKERS[node.data.shape ?? "rectangle"],
      usedConnections: getUsedSides(edges, node.id).size,
    }));

  const refByNodeId = new Map(components.map((component) => [component.nodeId, component.ref]));

  const connections: ExistingConnection[] = edges
    .flatMap((edge): ExistingConnection[] => {
      const from = refByNodeId.get(edge.source);
      const to = refByNodeId.get(edge.target);
      if (!from || !to) {
        return [];
      }
      const label = edge.data?.label?.trim();
      return [{ from, to, ...(label ? { label } : {}), async: edge.data?.edgeStyle === "dashed" }];
    })
    .slice(0, CANVAS_SUMMARY_LIMITS.connections);

  const notes = nodes
    .filter((node) => node.data.shape === TEXT_NODE_SHAPE)
    .map(labelOf)
    .filter((note) => note.length > 0)
    .slice(0, CANVAS_SUMMARY_LIMITS.notes);

  return { components, connections, notes, totalComponents: drawn.length };
}

/** The summary as prompt text. */
export function formatCanvasSummary(summary: CanvasSummary | null): string {
  if (!summary || summary.components.length === 0) {
    return summary && summary.notes.length > 0
      ? `The canvas has no components yet. Notes on it:\n${summary.notes.map((note) => `- ${note}`).join("\n")}`
      : "The canvas is empty.";
  }

  const byRef = new Map(summary.components.map((component) => [component.ref, component]));
  const sections = [
    `Components already on the canvas (ref: name, kind, connection points used):\n${summary.components
      .map(
        (component) =>
          `- ${component.ref}: ${component.label} (${component.kind}), ` +
          `${component.usedConnections}/${CONNECTION_POINTS_PER_COMPONENT} used`,
      )
      .join("\n")}`,
  ];

  if (summary.totalComponents > summary.components.length) {
    sections.push(`...and ${summary.totalComponents - summary.components.length} more components not listed.`);
  }

  if (summary.connections.length > 0) {
    sections.push(
      `Existing connections:\n${summary.connections
        .map((connection) => {
          const from = byRef.get(connection.from)?.label ?? connection.from;
          const to = byRef.get(connection.to)?.label ?? connection.to;
          const details = [connection.label, connection.async ? "async" : ""].filter(Boolean).join(", ");
          return `- ${from} (${connection.from}) → ${to} (${connection.to})${details ? `: ${details}` : ""}`;
        })
        .join("\n")}`,
    );
  }

  if (summary.notes.length > 0) {
    sections.push(`Notes on the canvas:\n${summary.notes.map((note) => `- ${note}`).join("\n")}`);
  }

  return sections.join("\n\n");
}
