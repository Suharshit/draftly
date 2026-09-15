import type { SpecGraph } from "@/lib/spec/spec-graph";
import type { RecordedDecision } from "@/lib/spec/spec-schema";

export const SPEC_SYSTEM_PROMPT = [
  "You are a staff engineer writing the technical specification for a system design drawn on a",
  "collaborative canvas. The design is given as structured data: groups of connected components (each",
  "group is one diagram), components with refs, names and kinds, the connections between them (with",
  "labels, direction, and whether they are asynchronous), notes the designers wrote on the canvas, and",
  "decisions recorded when the design was generated with the AI architect.",
  "",
  "Explain the design as drawn. Never invent components or connections that are not in the input.",
  "- overview: two or three short paragraphs for an engineer new to the system.",
  "- goals: what the design is built to achieve, as evident from the canvas.",
  "- groups: for every group, a short name, its purpose, and its main flow as ordered steps that follow",
  "  its actual connections, naming components exactly.",
  "- components: a one-sentence responsibility for every component.",
  "- decisions: the major architectural decisions the design shows — datastores, sync vs async messaging,",
  "  caching, gateways and entry points, authentication, service boundaries, scaling, integration",
  "  boundaries. Identify them from the diagram itself (usually 3 to 6 for a design with several",
  "  components), and add every recorded decision that still matches the canvas on top of those; recorded",
  "  decisions are never the whole list. For each, what the design does, why it fits, realistic",
  "  alternatives, trade-offs, the refs of the components involved, and its source. Most consequential first.",
  "- risks: real weaknesses of this design (single points of failure, consistency gaps, scaling limits,",
  "  security exposure), each with a mitigation.",
  "- openQuestions: what a reviewer should resolve before building.",
  "Use the group ids and component refs exactly as given. Write plain text in every field: no markdown",
  "headings, tables, or code blocks.",
].join("\n");

const DIRECTION_ARROWS = {
  forward: "→",
  backward: "←",
  bidirectional: "↔",
  none: "—",
} as const;

/** The canvas and recorded decisions as prompt text. */
export function buildSpecPrompt(
  graph: SpecGraph,
  projectName: string,
  recordedDecisions: readonly RecordedDecision[],
): string {
  const componentByRef = new Map(graph.components.map((component) => [component.ref, component]));
  const name = (ref: string) => componentByRef.get(ref)?.label ?? ref;

  const sections = [
    `Project: ${projectName.trim() || "Untitled project"}`,
    `Totals: ${graph.components.length} components, ${graph.connections.length} connections, ${graph.groups.length} groups.`,
  ];

  for (const group of graph.groups) {
    const lines = [
      group.standalone
        ? `Group ${group.id} (components not connected to anything):`
        : `Group ${group.id}:`,
      "  Components:",
      ...group.componentRefs.map((ref) => {
        const component = componentByRef.get(ref);
        return `  - ${ref}: ${component?.label ?? ref} (${component?.kind ?? "Component"})`;
      }),
    ];

    if (group.connectionIndexes.length > 0) {
      lines.push("  Connections:");
      for (const index of group.connectionIndexes) {
        const connection = graph.connections[index];
        const details = [connection.label, connection.async ? "async" : "sync"].filter(Boolean).join(", ");
        lines.push(
          `  - ${name(connection.sourceRef)} (${connection.sourceRef}) ${DIRECTION_ARROWS[connection.direction]} ` +
            `${name(connection.targetRef)} (${connection.targetRef}): ${details}`,
        );
      }
    }

    if (group.notes.length > 0) {
      lines.push("  Notes:", ...group.notes.map((note) => `  - ${note}`));
    }

    sections.push(lines.join("\n"));
  }

  if (graph.generalNotes.length > 0) {
    sections.push(`Other notes on the canvas:\n${graph.generalNotes.map((note) => `- ${note}`).join("\n")}`);
  }

  sections.push(
    recordedDecisions.length > 0
      ? `Decisions recorded during AI design sessions:\n${recordedDecisions
          .map((decision) => {
            const alternatives = decision.alternatives.length > 0 ? ` (alternatives: ${decision.alternatives.join(", ")})` : "";
            return `- ${decision.title}: ${decision.choice} — ${decision.rationale}${alternatives}`;
          })
          .join("\n")}`
      : "Decisions recorded during AI design sessions: none.",
  );

  return sections.join("\n\n");
}
