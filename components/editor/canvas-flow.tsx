"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, PointerEvent } from "react";
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
import { useLiveblocksFlow } from "@liveblocks/react-flow";
import { useUndo, useRedo, useUpdateMyPresence } from "@liveblocks/react";

import { CanvasNodeComponent } from "@/components/editor/canvas-node";
import { CanvasEdgeComponent, CanvasEdgeMarkerDefs } from "@/components/editor/canvas-edge";
import { CanvasPresenceOverlay, LiveCursors } from "@/components/editor/canvas-presence";
import { ShapePanel, SHAPE_DRAG_MIME, type ShapeDragPayload } from "@/components/editor/shape-panel";
import { CanvasControlBar } from "@/components/editor/canvas-control-bar";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates";
import { useCanvasAutosave, type CanvasSaveStatus } from "@/hooks/use-canvas-autosave";
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

interface CanvasFlowInnerProps {
  projectId: string;
  canAutosave: boolean;
  onSaveStatusChange?: (status: CanvasSaveStatus) => void;
  isSidebarOpen: boolean;
}

function CanvasFlowInner({
  projectId,
  canAutosave,
  onSaveStatusChange,
  isSidebarOpen,
}: CanvasFlowInnerProps) {
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMinimapOpen, setIsMinimapOpen] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [interactionMode, setInteractionMode] = useState<"select" | "pan">("select");
  const hasAttemptedHydrationRef = useRef(false);

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });

  const { screenToFlowPosition, addNodes, zoomIn, zoomOut, fitView } = useReactFlow<CanvasNode>();
  const updateMyPresence = useUpdateMyPresence();

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

  useEffect(() => {
    if (hasAttemptedHydrationRef.current) {
      return;
    }

    hasAttemptedHydrationRef.current = true;

    if (nodes.length > 0 || edges.length > 0) {
      queueMicrotask(() => {
        setIsHydrated(true);
      });
      return;
    }

    let canceled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/canvas`, {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { nodes?: CanvasNode[]; edges?: CanvasEdge[] };
        if (canceled) {
          return;
        }

        const loadedNodes = Array.isArray(payload.nodes) ? payload.nodes : [];
        const loadedEdges = Array.isArray(payload.edges) ? payload.edges : [];

        if (loadedNodes.length > 0) {
          onNodesChange(
            loadedNodes.map((node, index) => ({ type: "add", item: node, index })),
          );
        }
        if (loadedEdges.length > 0) {
          onEdgesChange(
            loadedEdges.map((edge, index) => ({ type: "add", item: edge, index })),
          );
        }
      } finally {
        if (!canceled) {
          queueMicrotask(() => {
            setIsHydrated(true);
          });
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [edges.length, nodes.length, onEdgesChange, onNodesChange, projectId]);

  const { saveStatus } = useCanvasAutosave({
    projectId,
    nodes,
    edges,
    enabled: canAutosave && isHydrated,
  });

  useEffect(() => {
    onSaveStatusChange?.(saveStatus);
  }, [onSaveStatusChange, saveStatus]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    const onBlur = () => {
      setIsSpacePressed(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

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
          textColor: "var(--text-primary)",
          strokeColor: "var(--text-primary)",
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

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const cursor = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      updateMyPresence({ cursor });
    },
    [screenToFlowPosition, updateMyPresence],
  );

  const handlePointerLeave = useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  return (
    <div
      className={`relative h-full w-full ${isSpacePressed ? "cursor-grab" : "cursor-default"}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
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
        defaultEdgeOptions={{ type: CANVAS_EDGE_TYPE, data: { arrowDirection: "none", edgeStyle: "solid" } }}
        deleteKeyCode={["Backspace", "Delete"]}
        panOnScroll
        zoomOnScroll={false}
        panOnDrag={interactionMode === "pan"}
        selectionOnDrag={interactionMode !== "pan"}
        panActivationKeyCode="Space"
      >
        <LiveCursors />
        {isMinimapOpen ? (
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
        ) : null}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--border-default)"
        />
      </ReactFlow>

      {/* Floating overlays */}
      <CanvasPresenceOverlay />
      <CanvasControlBar
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        isSidebarOpen={isSidebarOpen}
        isMinimapOpen={isMinimapOpen}
        onToggleMinimap={() => setIsMinimapOpen((prev) => !prev)}
      />
      <ShapePanel mode={interactionMode} onModeChange={setInteractionMode} />
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
interface CanvasFlowProps {
  projectId: string;
  canAutosave: boolean;
  onSaveStatusChange?: (status: CanvasSaveStatus) => void;
  isSidebarOpen: boolean;
}

export function CanvasFlow({
  projectId,
  canAutosave,
  onSaveStatusChange,
  isSidebarOpen,
}: CanvasFlowProps) {
  return (
    <ReactFlowProvider>
      <CanvasFlowInner
        projectId={projectId}
        canAutosave={canAutosave}
        onSaveStatusChange={onSaveStatusChange}
        isSidebarOpen={isSidebarOpen}
      />
    </ReactFlowProvider>
  );
}
