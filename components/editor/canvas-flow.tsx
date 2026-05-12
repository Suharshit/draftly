"use client";

import { ReactFlow, MiniMap, Background, BackgroundVariant, ConnectionMode } from "@xyflow/react";
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow";

/**
 * Inner canvas component that must be mounted inside a Liveblocks
 * RoomProvider (via CanvasWrapper). Uses useLiveblocksFlow with suspense
 * so it only renders after the room connection is established.
 */
export function CanvasFlow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        fitView
        connectionMode={ConnectionMode.Loose}
      >
        <Cursors />
        <MiniMap
          position="bottom-right"
          nodeColor={() => "var(--accent-primary)"}
          maskColor="rgba(9,9,11,0.6)"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: 6,
          }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--border-default)"
        />
      </ReactFlow>
    </div>
  );
}
