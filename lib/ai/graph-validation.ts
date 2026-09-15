import type { DesignPlan } from "@/lib/ai/agent-schema";
import { CONNECTION_POINTS_PER_COMPONENT, EXISTING_REF_PATTERN, type CanvasSummary } from "@/lib/ai/canvas-summary";
import { MAX_GRAPH_EDGES, MAX_GRAPH_NODES, type DesignGraph } from "@/lib/design-generation";

// ---------------------------------------------------------------------------
// Generated graph validation
//
// Checks a generated diagram against the rules the canvas and the plan impose.
// The messages are written for the model: they are sent back verbatim in a
// single repair attempt. Whatever survives repair is still sanitised by
// buildCanvasGraph, so these are quality checks, not safety checks.
// ---------------------------------------------------------------------------

interface ValidationContext {
  canvas?: CanvasSummary | null;
  plan?: DesignPlan | null;
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

export function validateDesignGraph(graph: DesignGraph, { canvas, plan }: ValidationContext = {}): string[] {
  const issues: string[] = [];
  const existing = canvas?.components ?? [];
  const existingByRef = new Map(existing.map((component) => [component.ref, component]));
  const existingByLabel = new Map(existing.map((component) => [normalizeLabel(component.label), component]));

  if (graph.nodes.length > MAX_GRAPH_NODES) {
    issues.push(`There are ${graph.nodes.length} components; draw at most ${MAX_GRAPH_NODES}.`);
  }
  if (graph.edges.length > MAX_GRAPH_EDGES) {
    issues.push(`There are ${graph.edges.length} connections; draw at most ${MAX_GRAPH_EDGES}.`);
  }

  // --- components
  const labelById = new Map<string, string>();
  const seenLabels = new Set<string>();

  for (const node of graph.nodes) {
    if (labelById.has(node.id)) {
      issues.push(`Component id "${node.id}" is used more than once; give every component a unique id.`);
      continue;
    }
    if (EXISTING_REF_PATTERN.test(node.id)) {
      issues.push(
        `Component id "${node.id}" looks like a ref for an existing canvas component; choose a different id for new components.`,
      );
    }
    labelById.set(node.id, node.label);

    const label = normalizeLabel(node.label);
    const onCanvas = existingByLabel.get(label);
    if (onCanvas) {
      issues.push(
        `"${node.label}" is already on the canvas as ${onCanvas.ref}; do not draw it again, connect to ${onCanvas.ref} instead.`,
      );
    } else if (seenLabels.has(label)) {
      issues.push(`"${node.label}" appears more than once; each component needs a unique name.`);
    }
    seenLabels.add(label);
  }

  const nameOf = (id: string) => labelById.get(id) ?? existingByRef.get(id)?.label ?? id;

  // --- connections
  const connectionCounts = new Map<string, number>(existing.map((component) => [component.ref, component.usedConnections]));
  const seenPairs = new Set<string>();

  for (const edge of graph.edges) {
    const unknown = [edge.source, edge.target].filter((id) => !labelById.has(id) && !existingByRef.has(id));
    if (unknown.length > 0) {
      issues.push(
        `Connection "${edge.id}" references ${unknown.map((id) => `"${id}"`).join(" and ")}, which is neither a new component id nor an existing ref.`,
      );
      continue;
    }
    if (edge.source === edge.target) {
      issues.push(`Connection "${edge.id}" connects "${nameOf(edge.source)}" to itself.`);
      continue;
    }

    const pair = [edge.source, edge.target].sort().join("|");
    if (seenPairs.has(pair)) {
      issues.push(`"${nameOf(edge.source)}" and "${nameOf(edge.target)}" are connected more than once; keep one connection.`);
      continue;
    }
    seenPairs.add(pair);

    for (const id of [edge.source, edge.target]) {
      connectionCounts.set(id, (connectionCounts.get(id) ?? 0) + 1);
    }
  }

  for (const [id, count] of connectionCounts) {
    if (count > CONNECTION_POINTS_PER_COMPONENT) {
      const note = existingByRef.has(id) ? " (including connections it already has on the canvas)" : "";
      issues.push(
        `"${nameOf(id)}" has ${count} connections${note}; each component has ${CONNECTION_POINTS_PER_COMPONENT} connection points, so keep it to ${CONNECTION_POINTS_PER_COMPONENT}.`,
      );
    }
  }

  // --- unconnected components
  if (graph.nodes.length > 1 || existing.length > 0) {
    for (const [id, label] of labelById) {
      if (!connectionCounts.has(id)) {
        issues.push(`"${label}" is not connected to anything.`);
      }
    }
  }

  // --- plan coverage
  if (plan) {
    for (const component of plan.components) {
      const name = normalizeLabel(component.name);
      if (!seenLabels.has(name) && !existingByLabel.has(name)) {
        issues.push(`Plan component "${component.name}" is missing from the diagram.`);
      }
    }
  }

  return issues;
}
