import { z } from "zod";

import { SPEC_MAX_COMPONENTS } from "@/lib/spec/spec-graph";

// ---------------------------------------------------------------------------
// Spec generation contract
//
// The model writes only prose about the design (overview, group purposes and
// flows, component responsibilities, decisions, risks). Structure — diagrams,
// tables, connections — comes from the canvas in code. Shared by the task,
// the server (validating run output), and the sidebar (status and stages).
// ---------------------------------------------------------------------------

/** Metadata key carrying the current {@link SpecAgentStage}. */
export const SPEC_AGENT_STAGE_KEY = "stage";

export const SPEC_AGENT_STAGES = ["reading", "writing", "rendering", "done"] as const;

export type SpecAgentStage = (typeof SPEC_AGENT_STAGES)[number];

export function parseSpecAgentStage(value: unknown): SpecAgentStage | null {
  return SPEC_AGENT_STAGES.find((stage) => stage === value) ?? null;
}

/** Abort reasons written for users; shown as they are. */
export const SPEC_EMPTY_CANVAS_MESSAGE = "Add some components to the canvas before generating a spec.";
export const SPEC_TOO_LARGE_MESSAGE = `The canvas has more than ${SPEC_MAX_COMPONENTS} components, which is too many for one spec.`;

/** Size limits for model-written lists; stated in descriptions, trimmed in code. */
export const SPEC_LIST_LIMITS = {
  goals: 6,
  flowSteps: 8,
  decisions: 8,
  alternatives: 3,
  risks: 8,
  openQuestions: 8,
} as const;

/** Decisions recorded in AI design sessions passed to one spec run. */
export const RECORDED_DECISION_LIMIT = 12;

export const DECISION_SOURCES = ["recorded", "stated", "inferred"] as const;

export type DecisionSource = (typeof DECISION_SOURCES)[number];

function atMost(limit: number, description: string): string {
  return `${description} At most ${limit} items.`;
}

export const specContentSchema = z.object({
  overview: z
    .string()
    .min(1)
    .describe("Two or three short paragraphs: what the system does, how it is structured, and what matters most."),
  goals: z
    .array(z.string())
    .describe(atMost(SPEC_LIST_LIMITS.goals, "What the design is built to achieve, as evident from the canvas.")),
  groups: z
    .array(
      z.object({
        groupId: z.string().describe("A group id exactly as given in the input, e.g. 'g1' or 'standalone'."),
        name: z.string().min(1).describe("A short name for this diagram, e.g. 'Checkout request path'."),
        purpose: z.string().describe("One or two sentences on what this part of the system does."),
        flow: z
          .array(z.string())
          .describe(
            atMost(
              SPEC_LIST_LIMITS.flowSteps,
              "The main flow through this group as ordered steps that follow its actual connections, naming components exactly.",
            ),
          ),
      }),
    )
    .describe("One entry per group in the input."),
  components: z
    .array(
      z.object({
        componentId: z.string().describe("A component ref exactly as given in the input, e.g. 'c3'."),
        responsibility: z.string().describe("What the component is responsible for, in one sentence."),
      }),
    )
    .describe("One entry per component in the input."),
  decisions: z
    .array(
      z.object({
        title: z.string().min(1).describe("The question the decision answers, e.g. 'Primary datastore'."),
        decision: z.string().min(1).describe("What the design does."),
        rationale: z.string().describe("Why it fits this system."),
        alternatives: z.array(z.string()).describe(atMost(SPEC_LIST_LIMITS.alternatives, "Realistic alternatives.")),
        tradeoffs: z.string().describe("What the choice costs or risks."),
        componentIds: z.array(z.string()).describe("Refs of the components involved."),
        source: z
          .enum(DECISION_SOURCES)
          .describe(
            "'recorded' when it comes from the recorded decisions, 'stated' when a canvas note or connection " +
              "label states it, otherwise 'inferred'.",
          ),
      }),
    )
    .describe(atMost(SPEC_LIST_LIMITS.decisions, "The major architectural decisions, most consequential first.")),
  risks: z
    .array(z.object({ risk: z.string(), mitigation: z.string() }))
    .describe(atMost(SPEC_LIST_LIMITS.risks, "Risks in the design, each with a mitigation.")),
  openQuestions: z
    .array(z.string())
    .describe(atMost(SPEC_LIST_LIMITS.openQuestions, "Questions a reviewer should resolve.")),
});

export type SpecContent = z.infer<typeof specContentSchema>;

export interface KnownSpecIds {
  groupIds: ReadonlySet<string>;
  componentRefs: ReadonlySet<string>;
}

/** Parenthesised refs such as "(c3)", "(c1, c4)", "(g2)" or "(standalone)" copied into prose. */
const SPEC_REF_MENTION = /[ \t]*\((?:\s*(?:c\d+|g\d+|standalone)\s*,?)+\)/g;

/** Removes internal refs from text shown to readers, who only know components by name. */
export function withoutSpecRefs(text: string): string {
  return text.replace(SPEC_REF_MENTION, "");
}

/**
 * Trims the model's prose to the list limits, removes internal refs the model
 * copied into the text, and drops anything that refers to a group or component
 * the canvas does not have.
 */
export function sanitizeSpecContent(content: SpecContent, known: KnownSpecIds): SpecContent {
  const clean = (value: string) => withoutSpecRefs(value).replace(/\s+/g, " ").trim();
  const cleanList = (values: readonly string[], limit: number) => values.map(clean).filter(Boolean).slice(0, limit);

  const seenGroups = new Set<string>();
  const groups = content.groups.flatMap((group) => {
    if (!known.groupIds.has(group.groupId) || seenGroups.has(group.groupId)) {
      return [];
    }
    seenGroups.add(group.groupId);
    return [
      {
        groupId: group.groupId,
        name: clean(group.name),
        purpose: clean(group.purpose),
        flow: cleanList(group.flow, SPEC_LIST_LIMITS.flowSteps),
      },
    ];
  });

  const seenComponents = new Set<string>();
  const components = content.components.flatMap((component) => {
    const responsibility = clean(component.responsibility);
    if (!known.componentRefs.has(component.componentId) || seenComponents.has(component.componentId) || !responsibility) {
      return [];
    }
    seenComponents.add(component.componentId);
    return [{ componentId: component.componentId, responsibility }];
  });

  const decisions = content.decisions
    .flatMap((decision) => {
      const title = clean(decision.title);
      const choice = clean(decision.decision);
      if (!title || !choice) {
        return [];
      }
      return [
        {
          title,
          decision: choice,
          rationale: clean(decision.rationale),
          alternatives: cleanList(decision.alternatives, SPEC_LIST_LIMITS.alternatives),
          tradeoffs: clean(decision.tradeoffs),
          componentIds: [...new Set(decision.componentIds.filter((id) => known.componentRefs.has(id)))],
          source: decision.source,
        },
      ];
    })
    .slice(0, SPEC_LIST_LIMITS.decisions);

  const risks = content.risks
    .flatMap((entry) => {
      const risk = clean(entry.risk);
      return risk ? [{ risk, mitigation: clean(entry.mitigation) }] : [];
    })
    .slice(0, SPEC_LIST_LIMITS.risks);

  return {
    overview: withoutSpecRefs(content.overview).trim(),
    goals: cleanList(content.goals, SPEC_LIST_LIMITS.goals),
    groups,
    components,
    decisions,
    risks,
    openQuestions: cleanList(content.openQuestions, SPEC_LIST_LIMITS.openQuestions),
  };
}

// ---------------------------------------------------------------------------
// Run contract and status
// ---------------------------------------------------------------------------

export interface RecordedDecision {
  title: string;
  choice: string;
  rationale: string;
  alternatives: string[];
}

export interface SpecAgentPayload {
  roomId: string;
  projectName: string;
  /** Decisions stored in the requesting user's AI design sessions, newest first. */
  recordedDecisions: RecordedDecision[];
}

export const specStatsSchema = z.object({
  components: z.number().int().nonnegative(),
  connections: z.number().int().nonnegative(),
  diagrams: z.number().int().nonnegative(),
  decisions: z.number().int().nonnegative(),
});

export type SpecStats = z.infer<typeof specStatsSchema>;

/** Output of one spec-agent run. The server validates it before storing the Markdown. */
export const specAgentResultSchema = z.object({
  markdown: z.string().min(1),
  stats: specStatsSchema,
});

export type SpecAgentResult = z.infer<typeof specAgentResultSchema>;

export interface SpecSummary {
  runId: string;
  generatedAt: string;
  stats: SpecStats | null;
}

/** What `GET /api/projects/[projectId]/spec` returns. */
export interface SpecStatus {
  /** The stored spec, if one has been generated. */
  spec: SpecSummary | null;
  /** A spec run that is still in progress. */
  pendingRunId: string | null;
  /** Why the latest run failed, when it is newer than the stored spec. */
  lastFailure: string | null;
}
