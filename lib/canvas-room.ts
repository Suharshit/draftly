import { mutateFlow } from "@liveblocks/react-flow/node";

import { getLiveblocksClient } from "@/lib/liveblocks";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

/** A copy of a room's nodes and edges, read without changing the room. */
export async function readRoomSnapshot(roomId: string): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> {
  let snapshot: { nodes: CanvasNode[]; edges: CanvasEdge[] } = { nodes: [], edges: [] };

  await mutateFlow<CanvasNode, CanvasEdge>({ client: getLiveblocksClient(), roomId }, (flow) => {
    snapshot = { nodes: [...flow.nodes], edges: [...flow.edges] };
  });

  return snapshot;
}
