import { AbortTaskRunError, logger, metadata, task } from "@trigger.dev/sdk/v3";

import { modelIdOf, resolveDesignModel } from "@/lib/ai/model";
import { readRoomSnapshot } from "@/lib/canvas-room";
import { renderSpecMarkdown } from "@/lib/spec/render-markdown";
import { generateSpecContent } from "@/lib/spec/spec-engine";
import { buildSpecGraph, SPEC_MAX_COMPONENTS } from "@/lib/spec/spec-graph";
import {
  SPEC_AGENT_STAGE_KEY,
  SPEC_EMPTY_CANVAS_MESSAGE,
  SPEC_TOO_LARGE_MESSAGE,
  type SpecAgentPayload,
  type SpecAgentResult,
  type SpecAgentStage,
} from "@/lib/spec/spec-schema";

export type { SpecAgentPayload, SpecAgentResult };

function setStage(stage: SpecAgentStage) {
  metadata.set(SPEC_AGENT_STAGE_KEY, stage);
}

/**
 * Turns the project's canvas into a Markdown technical spec. Reads the room,
 * asks the model once for the prose, and renders the document in code. The
 * server stores the returned Markdown in blob storage when the status is read.
 */
export const specAgentTask = task({
  id: "spec-agent",
  // The model call already retries transient errors; a failed spec is shown to the user instead.
  retry: { maxAttempts: 1 },
  maxDuration: 300,
  run: async (payload: SpecAgentPayload): Promise<SpecAgentResult> => {
    setStage("reading");
    const { nodes, edges } = await readRoomSnapshot(payload.roomId);
    const graph = buildSpecGraph(nodes, edges);
    logger.log("Canvas read for spec", {
      roomId: payload.roomId,
      components: graph.totalComponents,
      connections: graph.connections.length,
      groups: graph.groups.length,
      recordedDecisions: payload.recordedDecisions.length,
    });

    if (graph.components.length === 0) {
      throw new AbortTaskRunError(SPEC_EMPTY_CANVAS_MESSAGE);
    }
    if (graph.totalComponents > SPEC_MAX_COMPONENTS) {
      throw new AbortTaskRunError(SPEC_TOO_LARGE_MESSAGE);
    }

    setStage("writing");
    const model = resolveDesignModel();
    const content = await generateSpecContent(model, graph, payload.projectName, payload.recordedDecisions);

    setStage("rendering");
    const { markdown, stats } = renderSpecMarkdown(graph, content, {
      projectName: payload.projectName,
      generatedAt: new Date(),
      modelId: modelIdOf(model),
    });
    logger.log("Spec rendered", { ...stats, characters: markdown.length });

    setStage("done");
    return { markdown, stats };
  },
});
