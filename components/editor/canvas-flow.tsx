"use client";

import { useCallback } from "react";
import type { DragEvent } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Background,
  BackgroundVariant,
  ConnectionMode,
  ConnectionLineType,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow";

import { CanvasNodeComponent } from "@/components/editor/canvas-node";
import { CanvasEdgeComponent, CanvasEdgeMarkerDefs } from "@/components/editor/canvas-edge";
import { ShapePanel, SHAPE_DRAG_MIME, type ShapeDragPayload } from "@/components/editor/shape-panel";
import { CANVAS_NODE_TYPE, CANVAS_EDGE_TYPE } from "@/types/canvas";
import type { CanvasNode } from "@/types/canvas";

// ---------------------------------------------------------------------------
// Custom node / edge type registration
// ---------------------------------------------------------------------------

const nodeTypes: NodeTypes = {
  [CANVAS_NODE_TYPE]: CanvasNodeComponent,
};

const edgeTypes: EdgeTypes = {
  [CANVAS_EDGE_TYPE]: CanvasEdgeComponent,
};

// ---------------------------------------------------------------------------
// Node ID generator
// ---------------------------------------------------------------------------

const counters: Record<string, number> = {};

function generateNodeId(shape: string): string {
  counters[shape] = (counters[shape] ?? 0) + 1;
  return `${shape}-${Date.now()}-${counters[shape]}`;
}

// ---------------------------------------------------------------------------
// Inner canvas — rendered inside ReactFlowProvider so useReactFlow() works
// ---------------------------------------------------------------------------

function CanvasFlowInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });

  const { screenToFlowPosition, addNodes } = useReactFlow<CanvasNode>();

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes(SHAPE_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      const raw = e.dataTransfer.getData(SHAPE_DRAG_MIME);
      if (!raw) return;

      let payload: ShapeDragPayload;
      try {
        payload = JSON.parse(raw) as ShapeDragPayload;
      } catch {
        return;
      }

      // Convert screen coordinates to canvas flow coordinates.
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      const newNode: CanvasNode = {
        id: generateNodeId(payload.shape),
        type: CANVAS_NODE_TYPE,
        position: {
          x: position.x - payload.width / 2,
          y: position.y - payload.height / 2,
        },
        style: {
          width: payload.width,
          height: payload.height,
        },
        data: {
          label: "",
          color: undefined,
          shape: payload.shape,
        },
      };

      addNodes(newNode);
    },
    [screenToFlowPosition, addNodes],
  );

  return (
    <div
      className="relative h-full w-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <CanvasEdgeMarkerDefs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{ type: CANVAS_EDGE_TYPE }}
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

      <ShapePanel />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export — wraps with ReactFlowProvider so useReactFlow() has context
// ---------------------------------------------------------------------------

/**
 * Inner canvas component that must be mounted inside a Liveblocks
 * RoomProvider (via CanvasWrapper). ReactFlowProvider is declared here so
 * that useReactFlow() is available inside CanvasFlowInner without requiring
 * a separate provider in the parent tree.
 */
export function CanvasFlow() {
  return (
    <ReactFlowProvider>
      <CanvasFlowInner />
    </ReactFlowProvider>
  );
}
