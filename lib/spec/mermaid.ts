import type { SpecGraph, SpecGroup } from "@/lib/spec/spec-graph";
import type { CanvasArrowDirection, CanvasShape } from "@/types/canvas";

// Mermaid flowcharts for spec diagram sections. Every node label is quoted and
// entity-escaped, so component names cannot break the diagram syntax.

const SHAPE_WRAPPERS: Record<CanvasShape, readonly [string, string]> = {
  rectangle: ['["', '"]'],
  circle: ['(("', '"))'],
  diamond: ['{"', '"}'],
  pill: ['(["', '"])'],
  cylinder: ['[("', '")]'],
  hexagon: ['{{"', '"}}'],
};

/** Text safe inside a quoted Mermaid label. */
export function escapeMermaidText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/#/g, "#35;")
    .replace(/"/g, "#quot;")
    .replace(/</g, "#lt;")
    .replace(/>/g, "#gt;")
    .replace(/\|/g, "#124;");
}

function edgeOperator(direction: CanvasArrowDirection, async: boolean): { operator: string; reverse: boolean } {
  switch (direction) {
    case "forward":
      return { operator: async ? "-.->" : "-->", reverse: false };
    case "backward":
      return { operator: async ? "-.->" : "-->", reverse: true };
    case "bidirectional":
      return { operator: async ? "<-.->" : "<-->", reverse: false };
    default:
      return { operator: async ? "-.-" : "---", reverse: false };
  }
}

/** The group as a top-down Mermaid flowchart, without code fences. */
export function renderGroupMermaid(graph: SpecGraph, group: SpecGroup): string {
  const componentByRef = new Map(graph.components.map((component) => [component.ref, component]));
  const lines = ["flowchart TD"];

  for (const ref of group.componentRefs) {
    const component = componentByRef.get(ref);
    if (!component) {
      continue;
    }
    const [open, close] = SHAPE_WRAPPERS[component.shape];
    lines.push(`  ${ref}${open}${escapeMermaidText(component.label)}${close}`);
  }

  for (const index of group.connectionIndexes) {
    const connection = graph.connections[index];
    if (!connection) {
      continue;
    }
    const { operator, reverse } = edgeOperator(connection.direction, connection.async);
    const [from, to] = reverse
      ? [connection.targetRef, connection.sourceRef]
      : [connection.sourceRef, connection.targetRef];
    const label = connection.label ? `|"${escapeMermaidText(connection.label)}"|` : "";
    lines.push(`  ${from} ${operator}${label} ${to}`);
  }

  return lines.join("\n");
}
