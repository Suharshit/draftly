import { generateText, Output, type LanguageModel } from "ai";

import { thinking, withSchemaRetry } from "@/lib/ai/model";
import type { SpecGraph } from "@/lib/spec/spec-graph";
import { buildSpecPrompt, SPEC_SYSTEM_PROMPT } from "@/lib/spec/spec-prompt";
import {
  sanitizeSpecContent,
  specContentSchema,
  type RecordedDecision,
  type SpecContent,
} from "@/lib/spec/spec-schema";

/** Upper bound for the spec call, retries included. */
const SPEC_CALL_TIMEOUT_MS = 180_000;

/** Asks the model for the spec's prose and drops anything that doesn't match the canvas. */
export async function generateSpecContent(
  model: LanguageModel,
  graph: SpecGraph,
  projectName: string,
  recordedDecisions: readonly RecordedDecision[],
): Promise<SpecContent> {
  const { output } = await withSchemaRetry(() =>
    generateText({
      model,
      system: SPEC_SYSTEM_PROMPT,
      prompt: buildSpecPrompt(graph, projectName, recordedDecisions),
      output: Output.object({ schema: specContentSchema, name: "technical_spec" }),
      providerOptions: thinking(model, "medium"),
      timeout: { totalMs: SPEC_CALL_TIMEOUT_MS },
    }),
  );

  return sanitizeSpecContent(output, {
    groupIds: new Set(graph.groups.map((group) => group.id)),
    componentRefs: new Set(graph.components.map((component) => component.ref)),
  });
}
