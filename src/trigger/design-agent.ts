import { mutateFlow } from "@liveblocks/react-flow/node";
import { logger, metadata, task } from "@trigger.dev/sdk/v3";
import type { LanguageModel } from "ai";

import type { DesignAgentPayload, DesignAgentResult, DesignBrief, DesignPlan } from "@/lib/ai/agent-schema";
import {
  analyzeTurn,
  draftPlan,
  emptyBrief,
  generateDesignGraph,
  resolveDesignModel,
} from "@/lib/ai/design-agent-engine";
import { buildCanvasGraph, DESIGN_AGENT_STAGE_KEY, type DesignAgentStage } from "@/lib/design-generation";
import { getLiveblocksClient } from "@/lib/liveblocks";
import { SHAPE_DEFAULTS, type CanvasEdge, type CanvasNode, type CanvasShape } from "@/types/canvas";

export type { DesignAgentPayload, DesignAgentResult };

/** Vertical gap left between existing canvas content and a newly generated graph. */
const EXISTING_CONTENT_GAP = 140;

function setStage(stage: DesignAgentStage) {
  metadata.set(DESIGN_AGENT_STAGE_KEY, stage);
}

function getNodeHeight(node: CanvasNode): number {
  const styledHeight = node.style?.height;
  if (typeof styledHeight === "number") {
    return styledHeight;
  }

  const shape = node.data.shape as CanvasShape | undefined;
  return shape ? SHAPE_DEFAULTS[shape].height : SHAPE_DEFAULTS.rectangle.height;
}

/**
 * Places a generated graph below anything already on the canvas, so a second
 * generation never lands on top of the first.
 */
function resolveOrigin(existingNodes: readonly CanvasNode[]): { x: number; y: number } {
  if (existingNodes.length === 0) {
    return { x: 0, y: 0 };
  }

  let left = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const node of existingNodes) {
    left = Math.min(left, node.position.x);
    bottom = Math.max(bottom, node.position.y + getNodeHeight(node));
  }

  return { x: left, y: bottom + EXISTING_CONTENT_GAP };
}

/** Generates the diagram for an approved plan and writes it into the room. */
async function drawPlan(
  model: LanguageModel,
  roomId: string,
  runId: string,
  brief: DesignBrief,
  plan: DesignPlan,
): Promise<{ nodeCount: number; edgeCount: number }> {
  setStage("generating");
  const design = await generateDesignGraph(model, brief, plan);
  logger.log("Design generated", { nodeCount: design.nodes.length, edgeCount: design.edges.length });

  setStage("writing");
  let counts = { nodeCount: 0, edgeCount: 0 };

  await mutateFlow<CanvasNode, CanvasEdge>({ client: getLiveblocksClient(), roomId }, (flow) => {
    const { nodes, edges } = buildCanvasGraph(design, {
      idPrefix: runId,
      origin: resolveOrigin(flow.nodes),
    });

    flow.addNodes(nodes);
    flow.addEdges(edges);

    counts = { nodeCount: nodes.length, edgeCount: edges.length };
  });

  logger.log("Design written to room", { roomId, ...counts });
  return counts;
}

/**
 * One turn of a design session. Reads the user's turn, then either asks
 * clarifying questions, proposes (or revises) a plan, or draws the approved
 * plan on the canvas. The server stores the returned result on the session.
 */
export const designAgentTask = task({
  id: "design-agent",
  // Each model call already retries transient errors with backoff. Retrying the
  // whole turn on top multiplied quota use (up to 9 calls per failure) and could
  // write a generated diagram twice; a failed turn is shown to the user instead.
  retry: { maxAttempts: 1 },
  // A turn makes at most two model calls, each bounded by its own timeout; this
  // is the backstop so a stuck turn fails and settles instead of staying pending.
  maxDuration: 300,
  run: async (payload: DesignAgentPayload, { ctx }): Promise<DesignAgentResult> => {
    logger.log("Design agent turn", { roomId: payload.roomId, intent: payload.intent });
    const model = resolveDesignModel();

    // An explicit approval skips analysis: the plan is already agreed.
    if (payload.intent === "generate" && payload.plan) {
      const brief = payload.brief ?? emptyBrief();
      const counts = await drawPlan(model, payload.roomId, ctx.run.id, brief, payload.plan);
      setStage("done");
      return { action: "generated", reply: "", ...counts, decisions: payload.plan.decisions, brief };
    }

    setStage("analyzing");
    const analysis = await analyzeTurn(model, payload);
    logger.log("Turn analyzed", { decision: analysis.decision, questions: analysis.questions.length });

    if (analysis.decision === "ask") {
      setStage("done");
      return { action: "ask", reply: analysis.reply, questions: analysis.questions, brief: analysis.brief };
    }

    if (analysis.decision === "generate" && payload.plan) {
      const counts = await drawPlan(model, payload.roomId, ctx.run.id, analysis.brief, payload.plan);
      setStage("done");
      return {
        action: "generated",
        reply: analysis.reply,
        ...counts,
        decisions: payload.plan.decisions,
        brief: analysis.brief,
      };
    }

    setStage("planning");
    const plan = await draftPlan(model, analysis.brief, payload.plan, payload.input);
    logger.log("Plan drafted", { components: plan.components.length, decisions: plan.decisions.length });

    setStage("done");
    return { action: "plan", reply: analysis.reply, plan, brief: analysis.brief };
  },
});
