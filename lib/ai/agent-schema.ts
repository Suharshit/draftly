import { z } from "zod";

// ---------------------------------------------------------------------------
// Design agent contract
//
// A design session moves through turns: the agent keeps a running brief of
// the requirements, asks clarifying questions while something important is
// unknown, proposes a plan, and generates the diagram once the plan is
// approved. Each turn is one Trigger.dev run. These schemas are shared by the
// task (model output), the server (validating run output before storing it),
// and the client (rendering questions and plans).
// ---------------------------------------------------------------------------

/** Clarifying rounds allowed before the agent must plan with assumptions. */
export const MAX_CLARIFY_ROUNDS = 3;

export const MAX_QUESTIONS_PER_ROUND = 3;

/** Most recent transcript messages sent to the model with each turn. */
export const AGENT_HISTORY_LIMIT = 12;

/**
 * Size limits for lists the model fills in. They are stated in the schema
 * descriptions but not enforced as `maxItems`: the model does not reliably
 * honour them, and one item over a hard limit failed the whole turn. Lists
 * are trimmed to these sizes by the clamp functions below instead.
 */
export const LIST_LIMITS = {
  coreFeatures: 12,
  briefItems: 8,
  openQuestions: 6,
  questionOptions: 4,
  components: 24,
  flows: 6,
  decisions: 6,
  alternatives: 3,
  assumptions: 8,
} as const;

function atMost(limit: number, description: string): string {
  return `${description} At most ${limit} items.`;
}

export const designBriefSchema = z.object({
  goal: z
    .string()
    .describe("One sentence: what the system does and for whom. Empty string if still unknown."),
  scale: z
    .string()
    .describe("Expected users, traffic, or data volume, as stated or assumed. Empty string if unknown."),
  coreFeatures: z
    .array(z.string())
    .describe(atMost(LIST_LIMITS.coreFeatures, "Capabilities the system must provide.")),
  nonFunctional: z
    .array(z.string())
    .describe(atMost(LIST_LIMITS.briefItems, "Latency, availability, consistency, security, or compliance requirements.")),
  constraints: z
    .array(z.string())
    .describe(
      atMost(LIST_LIMITS.briefItems, "Technology preferences, cloud, budget, team, or existing systems to integrate with."),
    ),
  assumptions: z
    .array(z.string())
    .describe(atMost(LIST_LIMITS.briefItems, "Things decided without the user stating them.")),
  openQuestions: z
    .array(z.string())
    .describe(atMost(LIST_LIMITS.openQuestions, "Unknowns that would still change the architecture.")),
});

export type DesignBrief = z.infer<typeof designBriefSchema>;

export const clarifyQuestionSchema = z.object({
  id: z.string().min(1).describe("Short slug, unique within this round, e.g. 'expected-scale'."),
  question: z.string().min(1).describe("The question, phrased for a product owner, not a DBA."),
  why: z.string().describe("One short clause on how the answer changes the design."),
  options: z
    .array(z.string())
    .describe(atMost(LIST_LIMITS.questionOptions, "2 to 4 concrete likely answers the user can pick from.")),
});

export type ClarifyQuestion = z.infer<typeof clarifyQuestionSchema>;

export const TURN_DECISIONS = ["ask", "plan", "generate"] as const;

export type TurnDecision = (typeof TURN_DECISIONS)[number];

/** What the model returns when it reads a user turn. */
export const turnAnalysisSchema = z.object({
  brief: designBriefSchema.describe("The full updated brief, merging everything said so far."),
  decision: z
    .enum(TURN_DECISIONS)
    .describe(
      "'ask' to gather missing requirements, 'plan' to propose or revise a plan, " +
        "'generate' only when a plan exists and the user approved it.",
    ),
  reply: z
    .string()
    .describe("One or two plain sentences to the user. No markdown, and do not restate the questions."),
  questions: z
    .array(clarifyQuestionSchema)
    .describe(
      atMost(MAX_QUESTIONS_PER_ROUND, "Questions for this round, most important first. Empty unless decision is 'ask'."),
    ),
});

export type TurnAnalysis = z.infer<typeof turnAnalysisSchema>;

export const planDecisionSchema = z.object({
  title: z.string().min(1).describe("The question the decision answers, e.g. 'Primary datastore'."),
  choice: z.string().min(1).describe("What was chosen."),
  rationale: z.string().min(1).describe("Why, tied to the brief."),
  alternatives: z
    .array(z.string())
    .describe(atMost(LIST_LIMITS.alternatives, "Realistic options that were not chosen.")),
});

export type PlanDecision = z.infer<typeof planDecisionSchema>;

export const designPlanSchema = z.object({
  summary: z.string().min(1).describe("Two or three sentences describing the architecture."),
  components: z
    .array(
      z.object({
        name: z.string().min(1).describe("Short unique component name, used verbatim on the diagram."),
        role: z
          .string()
          .min(1)
          .describe("One or two word kind: Client, Gateway, Service, Worker, Queue, Cache, Database, External."),
        responsibility: z.string().min(1).describe("What it does, in one sentence."),
      }),
    )
    .min(1)
    .describe(atMost(LIST_LIMITS.components, "The components to draw.")),
  flows: z
    .array(z.string())
    .describe(atMost(LIST_LIMITS.flows, "Key request or data flows, each written as 'A → B → C: purpose'.")),
  decisions: z
    .array(planDecisionSchema)
    .describe(atMost(LIST_LIMITS.decisions, "The major architectural choices, most consequential first.")),
  assumptions: z.array(z.string()).describe(atMost(LIST_LIMITS.assumptions, "Assumptions the plan depends on.")),
});

export type DesignPlan = z.infer<typeof designPlanSchema>;

/** Output of one design-agent run. The server validates it before storing it. */
export const designAgentResultSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ask"),
    reply: z.string(),
    questions: z.array(clarifyQuestionSchema).min(1),
    brief: designBriefSchema,
  }),
  z.object({
    action: z.literal("plan"),
    reply: z.string(),
    plan: designPlanSchema,
    brief: designBriefSchema,
  }),
  z.object({
    action: z.literal("generated"),
    reply: z.string(),
    nodeCount: z.number().int().nonnegative(),
    edgeCount: z.number().int().nonnegative(),
    decisions: z.array(planDecisionSchema),
    brief: designBriefSchema,
  }),
]);

export type DesignAgentResult = z.infer<typeof designAgentResultSchema>;

// ---------------------------------------------------------------------------
// Clamping
// ---------------------------------------------------------------------------

export function clampBrief(brief: DesignBrief): DesignBrief {
  return {
    ...brief,
    coreFeatures: brief.coreFeatures.slice(0, LIST_LIMITS.coreFeatures),
    nonFunctional: brief.nonFunctional.slice(0, LIST_LIMITS.briefItems),
    constraints: brief.constraints.slice(0, LIST_LIMITS.briefItems),
    assumptions: brief.assumptions.slice(0, LIST_LIMITS.briefItems),
    openQuestions: brief.openQuestions.slice(0, LIST_LIMITS.openQuestions),
  };
}

export function clampQuestions(questions: readonly ClarifyQuestion[]): ClarifyQuestion[] {
  return questions.slice(0, MAX_QUESTIONS_PER_ROUND).map((question) => ({
    ...question,
    options: question.options.slice(0, LIST_LIMITS.questionOptions),
  }));
}

export function clampPlan(plan: DesignPlan): DesignPlan {
  return {
    ...plan,
    components: plan.components.slice(0, LIST_LIMITS.components),
    flows: plan.flows.slice(0, LIST_LIMITS.flows),
    decisions: plan.decisions.slice(0, LIST_LIMITS.decisions).map((decision) => ({
      ...decision,
      alternatives: decision.alternatives.slice(0, LIST_LIMITS.alternatives),
    })),
    assumptions: plan.assumptions.slice(0, LIST_LIMITS.assumptions),
  };
}

// ---------------------------------------------------------------------------
// Turn input
// ---------------------------------------------------------------------------

/**
 * - `message`: free text from the composer
 * - `answers`: replies to the latest clarifying questions
 * - `generate`: approve the latest plan and draw it
 * - `skip`: stop asking questions and plan with assumptions
 */
export const TURN_INTENTS = ["message", "answers", "generate", "skip"] as const;

export type TurnIntent = (typeof TURN_INTENTS)[number];

export interface ClarifyAnswer {
  questionId: string;
  answer: string;
}

export interface AgentHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export interface DesignAgentPayload {
  roomId: string;
  intent: TurnIntent;
  /** The user's turn rendered as text (answers are paired with their questions). */
  input: string;
  /** Prior transcript, oldest first, at most {@link AGENT_HISTORY_LIMIT} entries. */
  history: AgentHistoryEntry[];
  brief: DesignBrief | null;
  /** The latest plan in the session, if one was proposed. */
  plan: DesignPlan | null;
  clarifyRounds: number;
}

// ---------------------------------------------------------------------------
// Text renderings
//
// Stored as message content: they are what the model reads back as history,
// and what the sidebar shows for messages it has no dedicated card for.
// ---------------------------------------------------------------------------

export function formatQuestionsText(reply: string, questions: readonly ClarifyQuestion[]): string {
  const lines = questions.map((question, index) => {
    const options = question.options.length > 0 ? ` (e.g. ${question.options.join(" / ")})` : "";
    return `${index + 1}. ${question.question}${options}`;
  });
  return [reply.trim(), ...lines].filter(Boolean).join("\n");
}

export function formatPlanText(reply: string, plan: DesignPlan): string {
  const sections = [
    reply.trim(),
    plan.summary,
    `Components:\n${plan.components.map((c) => `- ${c.name} (${c.role}): ${c.responsibility}`).join("\n")}`,
    plan.flows.length > 0 ? `Flows:\n${plan.flows.map((flow) => `- ${flow}`).join("\n")}` : "",
    plan.decisions.length > 0
      ? `Key decisions:\n${plan.decisions.map((d) => `- ${d.title}: ${d.choice} — ${d.rationale}`).join("\n")}`
      : "",
    plan.assumptions.length > 0 ? `Assumptions:\n${plan.assumptions.map((a) => `- ${a}`).join("\n")}` : "",
  ];
  return sections.filter(Boolean).join("\n\n");
}

export function formatAnswersText(
  questions: readonly ClarifyQuestion[],
  answers: readonly ClarifyAnswer[],
): string {
  return answers
    .map((entry) => {
      const question = questions.find((candidate) => candidate.id === entry.questionId);
      return question ? `${question.question}\n→ ${entry.answer}` : entry.answer;
    })
    .join("\n\n");
}
