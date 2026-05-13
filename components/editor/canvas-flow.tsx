"use client";

import { useCallback, useState } from "react";
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
import { useUndo, useRedo } from "@liveblocks/react";

import { CanvasNodeComponent } from "@/components/editor/canvas-node";
import { CanvasEdgeComponent, CanvasEdgeMarkerDefs } from "@/components/editor/canvas-edge";
import { ShapePanel, SHAPE_DRAG_MIME, type ShapeDragPayload } from "@/components/editor/shape-panel";
import { CanvasControlBar } from "@/components/editor/canvas-control-bar";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { CANVAS_NODE_TYPE, CANVAS_EDGE_TYPE } from "@/types/canvas";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

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
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });

  const { screenToFlowPosition, addNodes, zoomIn, zoomOut, fitView } = useReactFlow<CanvasNode>();

  // Liveblocks history
  const undo = useUndo();
  const redo = useRedo();

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    zoomIn:  () => zoomIn({ duration: 300 }),
    zoomOut: () => zoomOut({ duration: 300 }),
    undo,
    redo,
  });

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

  const handleImportTemplate = useCallback(
    (template: CanvasTemplate) => {
      const importPrefix = `${template.id}-${Date.now()}`;
      const idMap = new Map<string, string>();

      const importedNodes = template.nodes.map((node, index) => {
        const nextId = `${importPrefix}-node-${index + 1}`;
        idMap.set(node.id, nextId);

        return {
          ...node,
          id: nextId,
        };
      });

      const importedEdges = template.edges.map((edge, index) => {
        const nextSource = idMap.get(edge.source);
        const nextTarget = idMap.get(edge.target);
        if (!nextSource || !nextTarget) {
          return null;
        }

        return {
          ...edge,
          id: `${importPrefix}-edge-${index + 1}`,
          source: nextSource,
          target: nextTarget,
        };
      }).filter((edge): edge is NonNullable<typeof edge> => edge !== null);

      onDelete({ nodes, edges });
      onNodesChange(
        importedNodes.map((node, index) => ({
          type: "add",
          item: node,
          index,
        })),
      );
      onEdgesChange(
        importedEdges.map((edge, index) => ({
          type: "add",
          item: edge,
          index,
        })),
      );

      setIsTemplatesOpen(false);
      window.setTimeout(() => {
        fitView({ duration: 800 });
      }, 0);
    },
    [edges, fitView, nodes, onDelete, onEdgesChange, onNodesChange],
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
        deleteKeyCode={["Backspace", "Delete"]}
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

      {/* Floating overlays */}
      <CanvasControlBar onOpenTemplates={() => setIsTemplatesOpen(true)} />
      <ShapePanel />
      <StarterTemplatesModal
        open={isTemplatesOpen}
        onOpenChange={setIsTemplatesOpen}
        onImport={handleImportTemplate}
        templates={CANVAS_TEMPLATES}
      />
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
