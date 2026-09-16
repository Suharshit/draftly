import { generateText, Output, type LanguageModel, type ModelMessage } from "ai";

import {
  clampBrief,
  clampPlan,
  clampQuestions,
  designBriefSchema,
  designPlanDraftSchema,
  MAX_CLARIFY_ROUNDS,
  sanitizePlanDraft,
  turnAnalysisSchema,
  type DesignAgentPayload,
  type DesignBrief,
  type DesignPlan,
  type TurnAnalysis,
} from "@/lib/ai/agent-schema";
import { formatCanvasSummary, type CanvasSummary } from "@/lib/ai/canvas-summary";
import { validateDesignGraph } from "@/lib/ai/graph-validation";
import { thinking, withSchemaRetry } from "@/lib/ai/model";
import {
  ANALYZE_SYSTEM_PROMPT,
  buildAnalyzeContext,
  buildGeneratePrompt,
  buildPlanPrompt,
  buildRepairPrompt,
  GENERATE_SYSTEM_PROMPT,
  PLAN_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { designGraphSchema, type DesignGraph } from "@/lib/design-generation";

// Model calls for one design turn. No canvas or database access, so the steps
// can be exercised directly from a script.

export { resolveDesignModel } from "@/lib/ai/model";

/**
 * Upper bound for each structured call, retries included. Under provider load a
 * request was held open for over five minutes with no response, which left the
 * turn pending and the composer locked; a timeout fails the turn instead.
 */
const CALL_TIMEOUT_MS = {
  analyze: 90_000,
  plan: 150_000,
  generate: 120_000,
} as const;

/**
 * Builds the model conversation from stored history plus the new turn. Leading
 * assistant entries are dropped, since a trimmed history can start mid-reply
 * and providers expect a conversation to open with the user.
 */
function toMessages(payload: DesignAgentPayload): ModelMessage[] {
  const firstUser = payload.history.findIndex((entry) => entry.role === "user");
  const history = firstUser === -1 ? [] : payload.history.slice(firstUser);

  return [
    ...history.map((entry): ModelMessage => ({ role: entry.role, content: entry.content })),
    { role: "user", content: payload.input },
  ];
}

/**
 * Applies the rules the model is asked to follow but cannot be trusted to:
 * no questions past the round limit or after a skip, no generating without a
 * plan, no "ask" without questions, and no text-only answer to a turn that
 * answers questions or skips them.
 */
export function enforceDecision(analysis: TurnAnalysis, payload: DesignAgentPayload): TurnAnalysis {
  let { decision } = analysis;

  if ((decision === "reply" || decision === "unsupported") && payload.intent !== "message") {
    decision = "plan";
  }

  if (decision === "ask") {
    const mayAsk =
      payload.intent !== "skip" &&
      payload.clarifyRounds < MAX_CLARIFY_ROUNDS &&
      analysis.questions.length > 0;
    if (!mayAsk) {
      decision = "plan";
    }
  }

  if (decision === "generate" && !payload.plan) {
    decision = "plan";
  }

  return {
    ...analysis,
    decision,
    questions: decision === "ask" ? analysis.questions : [],
  };
}

export async function analyzeTurn(
  model: LanguageModel,
  payload: DesignAgentPayload,
  canvas: CanvasSummary | null = null,
): Promise<TurnAnalysis> {
  const { output } = await withSchemaRetry(() =>
    generateText({
      model,
      system: `${ANALYZE_SYSTEM_PROMPT}\n\n${buildAnalyzeContext(payload, formatCanvasSummary(canvas))}`,
      messages: toMessages(payload),
      output: Output.object({ schema: turnAnalysisSchema, name: "turn_analysis" }),
      providerOptions: thinking(model, "low"),
      timeout: { totalMs: CALL_TIMEOUT_MS.analyze },
    }),
  );

  return enforceDecision(
    { ...output, brief: clampBrief(output.brief), questions: clampQuestions(output.questions) },
    payload,
  );
}

/** Parenthesised canvas refs such as "(ex-7)" or "(ex-2, ex-3)". */
const CANVAS_REF_MENTION = /\s*\((?:\s*ex-\d+\s*,?)+\)/g;

function withoutRefs(text: string): string {
  return text.replace(CANVAS_REF_MENTION, "");
}

/**
 * Removes canvas refs the model copies from the canvas summary into plan text.
 * Refs are internal handles for connecting to existing components; the plan
 * is shown to the user, who only knows components by name.
 */
export function removeCanvasRefs(plan: DesignPlan): DesignPlan {
  return {
    summary: withoutRefs(plan.summary),
    components: plan.components.map((component) => ({
      ...component,
      responsibility: withoutRefs(component.responsibility),
    })),
    flows: plan.flows.map(withoutRefs),
    decisions: plan.decisions.map((decision) => ({
      ...decision,
      choice: withoutRefs(decision.choice),
      rationale: withoutRefs(decision.rationale),
      alternatives: decision.alternatives.map(withoutRefs),
    })),
    assumptions: plan.assumptions.map(withoutRefs),
  };
}

export async function draftPlan(
  model: LanguageModel,
  brief: DesignBrief,
  previousPlan: DesignPlan | null,
  latestInput: string,
  canvas: CanvasSummary | null = null,
): Promise<DesignPlan | null> {
  const { output } = await withSchemaRetry(() =>
    generateText({
      model,
      system: PLAN_SYSTEM_PROMPT,
      prompt: buildPlanPrompt(brief, previousPlan, latestInput, formatCanvasSummary(canvas)),
      output: Output.object({ schema: designPlanDraftSchema, name: "design_plan" }),
      providerOptions: thinking(model, "medium"),
      timeout: { totalMs: CALL_TIMEOUT_MS.plan },
    }),
  );

  const plan = sanitizePlanDraft(output);
  return plan ? removeCanvasRefs(clampPlan(plan)) : null;
}

export interface GeneratedDesign {
  graph: DesignGraph;
  /** Problems still present in `graph`; buildCanvasGraph drops what it cannot draw. */
  issues: string[];
  /** Problems found in the first attempt and sent back for repair, if a repair ran. */
  repairedIssues: string[];
}

async function requestGraph(model: LanguageModel, prompt: string): Promise<DesignGraph> {
  const { output } = await withSchemaRetry(() =>
    generateText({
      model,
      system: GENERATE_SYSTEM_PROMPT,
      prompt,
      output: Output.object({ schema: designGraphSchema, name: "design_graph" }),
      providerOptions: thinking(model, "low"),
      timeout: { totalMs: CALL_TIMEOUT_MS.generate },
    }),
  );
  return output;
}

/**
 * Generates the diagram for an approved plan, validates it, and when anything
 * is wrong asks the model once to fix exactly those problems. The attempt with
 * fewer remaining problems wins; a failed repair call keeps the first attempt.
 */
export async function generateDesignGraph(
  model: LanguageModel,
  brief: DesignBrief,
  plan: DesignPlan,
  canvas: CanvasSummary | null = null,
): Promise<GeneratedDesign> {
  const prompt = buildGeneratePrompt(brief, plan, formatCanvasSummary(canvas));
  const first = await requestGraph(model, prompt);
  const firstIssues = validateDesignGraph(first, { canvas, plan });

  if (firstIssues.length === 0) {
    return { graph: first, issues: [], repairedIssues: [] };
  }

  try {
    const repaired = await requestGraph(model, buildRepairPrompt(prompt, first, firstIssues));
    const remaining = validateDesignGraph(repaired, { canvas, plan });
    return remaining.length <= firstIssues.length
      ? { graph: repaired, issues: remaining, repairedIssues: firstIssues }
      : { graph: first, issues: firstIssues, repairedIssues: firstIssues };
  } catch (error) {
    console.warn("[design-agent] repair attempt failed; keeping the first diagram", error);
    return { graph: first, issues: firstIssues, repairedIssues: [] };
  }
}

/** An empty brief, for a generate turn that somehow has none stored. */
export function emptyBrief(): DesignBrief {
  return designBriefSchema.parse({
    goal: "",
    scale: "",
    coreFeatures: [],
    nonFunctional: [],
    constraints: [],
    assumptions: [],
    openQuestions: [],
  });
}
