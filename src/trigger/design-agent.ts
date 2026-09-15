import { google } from "@ai-sdk/google";
import { mutateFlow } from "@liveblocks/react-flow/node";
import { logger, metadata, task } from "@trigger.dev/sdk/v3";
import { generateObject } from "ai";

import {
  buildCanvasGraph,
  designGraphSchema,
  DESIGN_AGENT_STAGE_KEY,
  type DesignAgentStage,
} from "@/lib/design-generation";
import { getLiveblocksClient } from "@/lib/liveblocks";
import { SHAPE_DEFAULTS, type CanvasEdge, type CanvasNode, type CanvasShape } from "@/types/canvas";

export interface DesignAgentPayload {
  prompt: string;
  roomId: string;
}

export interface DesignAgentResult {
  nodeCount: number;
  edgeCount: number;
}

/** Vertical gap left between existing canvas content and a newly generated graph. */
const EXISTING_CONTENT_GAP = 140;

const DEFAULT_MODEL_ID = "gemini-3.5-flash";

const SYSTEM_PROMPT = [
  "You are a system design architect. Turn the user's description into a component diagram.",
  "Return only components that belong on an architecture diagram: clients, gateways, services,",
  "queues, caches, datastores, and external systems. Give every component a short, concrete",
  "label. Connect components in the direction traffic actually flows, and label a connection",
  "only when the protocol or payload is not obvious from the two components it joins.",
  "Lay the diagram out top to bottom: entry points at the lowest y values, datastores at the",
  "highest. Components that sit at the same level of the request path share a y value.",
  "Every component has four connection points (top, right, bottom, left) and each point takes",
  "one connection, so give each component at most four connections in total.",
  "Prefer a focused diagram of the components that matter over an exhaustive one.",
].join(" ");

function resolveModelId(): string {
  const configured = process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_MODEL_ID;
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

export const designAgentTask = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload, { ctx }): Promise<DesignAgentResult> => {
    logger.log("Design agent task triggered", { roomId: payload.roomId });

    metadata.set(DESIGN_AGENT_STAGE_KEY, "generating" satisfies DesignAgentStage);

    const { object: design } = await generateObject({
      model: google(resolveModelId()),
      schema: designGraphSchema,
      system: SYSTEM_PROMPT,
      prompt: payload.prompt,
    });

    logger.log("Design generated", {
      nodeCount: design.nodes.length,
      edgeCount: design.edges.length,
    });

    metadata.set(DESIGN_AGENT_STAGE_KEY, "writing" satisfies DesignAgentStage);

    const client = getLiveblocksClient();
    let result: DesignAgentResult = { nodeCount: 0, edgeCount: 0 };

    await mutateFlow<CanvasNode, CanvasEdge>(
      { client, roomId: payload.roomId },
      (flow) => {
        const { nodes, edges } = buildCanvasGraph(design, {
          idPrefix: ctx.run.id,
          origin: resolveOrigin(flow.nodes),
        });

        flow.addNodes(nodes);
        flow.addEdges(edges);

        result = { nodeCount: nodes.length, edgeCount: edges.length };
      },
    );

    metadata.set(DESIGN_AGENT_STAGE_KEY, "done" satisfies DesignAgentStage);
    metadata.set("nodeCount", result.nodeCount);
    metadata.set("edgeCount", result.edgeCount);

    logger.log("Design written to room", { roomId: payload.roomId, ...result });

    return result;
  },
});
