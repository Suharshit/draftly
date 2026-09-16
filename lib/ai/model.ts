import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { NoObjectGeneratedError, type LanguageModel } from "ai";

// Model configuration shared by the Trigger.dev agents (design and spec).

const DEFAULT_MODEL_ID = "gemini-3.5-flash";

export type ThinkingLevel = "low" | "medium";

/** Gemini 2.x models take a token budget instead of a thinking level. */
const THINKING_BUDGETS: Record<ThinkingLevel, number> = {
  low: 1024,
  medium: 4096,
};

export function resolveDesignModel(): LanguageModel {
  const configured = process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim();
  return google(configured && configured.length > 0 ? configured : DEFAULT_MODEL_ID);
}

export function modelIdOf(model: LanguageModel): string {
  return typeof model === "string" ? model : model.modelId;
}

/**
 * Model reasoning depth for a step. Default thinking made a single call take up
 * to ~80s; most steps need little reasoning, while drafting plans and specs
 * keeps more. Gemini 3+ takes `thinkingLevel`; Gemini 2.x only understands
 * `thinkingBudget`.
 */
export function thinking(model: LanguageModel, level: ThinkingLevel) {
  const thinkingConfig = /^gemini-2\./.test(modelIdOf(model))
    ? { thinkingBudget: THINKING_BUDGETS[level] }
    : { thinkingLevel: level };
  return { google: { thinkingConfig } satisfies GoogleLanguageModelOptions };
}

/**
 * Runs a structured-output call, retrying once when the response does not
 * match the schema. Transport errors are already retried by the SDK; a schema
 * mismatch is usually a one-off bad sample, so a single fresh attempt is
 * cheaper than failing the whole run.
 */
export async function withSchemaRetry<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!NoObjectGeneratedError.isInstance(error)) {
      throw error;
    }
    console.warn("[ai] model output did not match the schema; retrying once", describeSchemaMismatch(error));
    try {
      return await call();
    } catch (retryError) {
      if (NoObjectGeneratedError.isInstance(retryError)) {
        console.error("[ai] model output did not match the schema again", describeSchemaMismatch(retryError));
      }
      throw retryError;
    }
  }
}

/** What failed and how, without logging the whole (possibly long) response. */
function describeSchemaMismatch(error: NoObjectGeneratedError) {
  return {
    finishReason: error.finishReason,
    cause: error.cause instanceof Error ? error.cause.message : error.cause,
    responseChars: error.text?.length ?? 0,
    responseStart: error.text?.slice(0, 500),
  };
}
