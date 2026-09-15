import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, Output, type LanguageModel, type ModelMessage } from "ai";

import {
  clampBrief,
  clampPlan,
  clampQuestions,
  designBriefSchema,
  designPlanSchema,
  MAX_CLARIFY_ROUNDS,
  turnAnalysisSchema,
  type DesignAgentPayload,
  type DesignBrief,
  type DesignPlan,
  type TurnAnalysis,
} from "@/lib/ai/agent-schema";
import {
  ANALYZE_SYSTEM_PROMPT,
  buildAnalyzeContext,
  buildGeneratePrompt,
  buildPlanPrompt,
  GENERATE_SYSTEM_PROMPT,
  PLAN_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { designGraphSchema, type DesignGraph } from "@/lib/design-generation";

// Model calls for one design turn. No canvas or database access, so the steps
// can be exercised directly from a script.

const DEFAULT_MODEL_ID = "gemini-3.5-flash";

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

type ThinkingLevel = "low" | "medium";

/** Gemini 2.x models take a token budget instead of a thinking level. */
const THINKING_BUDGETS: Record<ThinkingLevel, number> = {
  low: 1024,
  medium: 4096,
};

export function resolveDesignModel(): LanguageModel {
  const configured = process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim();
  return google(configured && configured.length > 0 ? configured : DEFAULT_MODEL_ID);
}

function modelIdOf(model: LanguageModel): string {
  return typeof model === "string" ? model : model.modelId;
}

/**
 * Model reasoning depth per step. Default thinking made a single turn take up
 * to ~80s; reading a turn and drawing an agreed plan need little reasoning,
 * while drafting the plan (where the architectural decisions are made) keeps
 * more. Gemini 3+ takes `thinkingLevel`; Gemini 2.x only understands
 * `thinkingBudget`.
 */
function thinking(model: LanguageModel, level: ThinkingLevel) {
  const thinkingConfig = /^gemini-2\./.test(modelIdOf(model))
    ? { thinkingBudget: THINKING_BUDGETS[level] }
    : { thinkingLevel: level };
  return { google: { thinkingConfig } satisfies GoogleLanguageModelOptions };
}

/**
 * Runs a structured-output call, retrying once when the response does not
 * match the schema. Transport errors are already retried by the SDK; a schema
 * mismatch is usually a one-off bad sample, so a single fresh attempt is
 * cheaper than failing the whole turn.
 */
async function withSchemaRetry<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!NoObjectGeneratedError.isInstance(error)) {
      throw error;
    }
    console.warn("[design-agent] model output did not match the schema; retrying once", error.cause);
    return call();
  }
}

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
 * plan, no "ask" without questions.
 */
export function enforceDecision(analysis: TurnAnalysis, payload: DesignAgentPayload): TurnAnalysis {
  let { decision } = analysis;

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

export async function analyzeTurn(model: LanguageModel, payload: DesignAgentPayload): Promise<TurnAnalysis> {
  const { output } = await withSchemaRetry(() =>
    generateText({
      model,
      system: `${ANALYZE_SYSTEM_PROMPT}\n\n${buildAnalyzeContext(payload)}`,
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

export async function draftPlan(
  model: LanguageModel,
  brief: DesignBrief,
  previousPlan: DesignPlan | null,
  latestInput: string,
): Promise<DesignPlan> {
  const { output } = await withSchemaRetry(() =>
    generateText({
      model,
      system: PLAN_SYSTEM_PROMPT,
      prompt: buildPlanPrompt(brief, previousPlan, latestInput),
      output: Output.object({ schema: designPlanSchema, name: "design_plan" }),
      providerOptions: thinking(model, "medium"),
      timeout: { totalMs: CALL_TIMEOUT_MS.plan },
    }),
  );

  return clampPlan(output);
}

export async function generateDesignGraph(
  model: LanguageModel,
  brief: DesignBrief,
  plan: DesignPlan,
): Promise<DesignGraph> {
  const { output } = await withSchemaRetry(() =>
    generateText({
      model,
      system: GENERATE_SYSTEM_PROMPT,
      prompt: buildGeneratePrompt(brief, plan),
      output: Output.object({ schema: designGraphSchema, name: "design_graph" }),
      providerOptions: thinking(model, "low"),
      timeout: { totalMs: CALL_TIMEOUT_MS.generate },
    }),
  );

  return output;
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
