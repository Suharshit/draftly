"use client";

import { useMemo } from "react";
import {
  Eye,
  EyeOff,
  LayoutTemplate,
  Maximize,
  Minus,
  Plus,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react";
import { useEdges, useNodes, useReactFlow } from "@xyflow/react";

import { NODE_COLOR_PALETTE } from "@/types/canvas";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

interface CanvasControlBarProps {
  onOpenTemplates: () => void;
  isSidebarOpen: boolean;
  isMinimapOpen: boolean;
  onToggleMinimap: () => void;
}

const ARROW_BUTTONS: { label: string; value: "none" | "forward" | "backward" | "bidirectional"; symbol: string }[] = [
  { label: "No arrow", value: "none", symbol: "-" },
  { label: "Forward", value: "forward", symbol: "->" },
  { label: "Backward", value: "backward", symbol: "<-" },
  { label: "Bidirectional", value: "bidirectional", symbol: "<->" },
];

const EDGE_STYLE_BUTTONS: { label: string; value: "solid" | "dashed" | "dotted"; symbol: string }[] = [
  { label: "Solid", value: "solid", symbol: "___" },
  { label: "Dashed", value: "dashed", symbol: "- -" },
  { label: "Dotted", value: "dotted", symbol: ". ." },
];

export function CanvasControlBar({
  onOpenTemplates,
  isSidebarOpen,
  isMinimapOpen,
  onToggleMinimap,
}: CanvasControlBarProps) {
  const { zoomIn, zoomOut, fitView, setNodes, setEdges, deleteElements } =
    useReactFlow<CanvasNode, CanvasEdge>();
  const liveNodes = useNodes<CanvasNode>();
  const liveEdges = useEdges<CanvasEdge>();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const selectedNodeIds = useMemo(
    () => liveNodes.filter((node) => node.selected).map((node) => node.id),
    [liveNodes],
  );
  const selectedEdgeIds = useMemo(
    () => liveEdges.filter((edge) => edge.selected).map((edge) => edge.id),
    [liveEdges],
  );

  const totalSelected = selectedNodeIds.length + selectedEdgeIds.length;
  const hasSingleNodeSelected = selectedNodeIds.length === 1 && selectedEdgeIds.length === 0;
  const hasSingleEdgeSelected = selectedNodeIds.length === 0 && selectedEdgeIds.length === 1;
  const hasSingleSelection = hasSingleNodeSelected || hasSingleEdgeSelected;

  const selectedNode = useMemo(() => {
    if (!hasSingleNodeSelected) return null;
    const id = selectedNodeIds[0];
    return liveNodes.find((node) => node.id === id) ?? null;
  }, [hasSingleNodeSelected, liveNodes, selectedNodeIds]);

  const selectedEdge = useMemo(() => {
    if (!hasSingleEdgeSelected) return null;
    const id = selectedEdgeIds[0];
    return liveEdges.find((edge) => edge.id === id) ?? null;
  }, [hasSingleEdgeSelected, liveEdges, selectedEdgeIds]);

  if (isSidebarOpen && totalSelected === 0) {
    return null;
  }

  const canShowFormatting = hasSingleSelection;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 24,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 8,
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: 12,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        padding: "8px",
      }}
    >
      {canShowFormatting && selectedNode ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", width: "100%", gap: 8 }}>
          {/* Fill Color */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <TextLabel>Fill</TextLabel>
            <div style={{ display: "flex", gap: 4 }}>
              {NODE_COLOR_PALETTE.map((pair) => (
                <ColorButton
                  key={`fill-${pair.id}`}
                  color={pair.bg}
                  active={(selectedNode.data.color ?? NODE_COLOR_PALETTE[0].bg) === pair.bg}
                  onClick={() => {
                    setNodes((nodes) =>
                      nodes.map((node) =>
                        node.id === selectedNode.id
                          ? { ...node, data: { ...node.data, color: pair.bg, textColor: pair.text } }
                          : node,
                      ),
                    );
                  }}
                />
              ))}
            </div>
          </div>

          <HorizontalDivider />

          {/* Stroke Color */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <TextLabel>Stroke</TextLabel>
            <div style={{ display: "flex", gap: 4 }}>
              {NODE_COLOR_PALETTE.map((pair) => (
                <ColorButton
                  key={`stroke-${pair.id}`}
                  color={pair.text}
                  active={(selectedNode.data.strokeColor ?? "var(--border-default)") === pair.text}
                  onClick={() => {
                    setNodes((nodes) =>
                      nodes.map((node) =>
                        node.id === selectedNode.id
                          ? { ...node, data: { ...node.data, strokeColor: pair.text, textColor: pair.text } }
                          : node,
                      ),
                    );
                  }}
                />
              ))}
            </div>
          </div>

          <HorizontalDivider />

          <div style={{ display: "flex", justifyContent: "center" }}>
            <TextControls
            bold={!!selectedNode.data.bold}
            italic={!!selectedNode.data.italic}
            fontSize={selectedNode.data.fontSize ?? 12}
            onBold={() =>
              setNodes((nodes) =>
                nodes.map((node) =>
                  node.id === selectedNode.id
                    ? { ...node, data: { ...node.data, bold: !node.data.bold } }
                    : node,
                ),
              )
            }
            onItalic={() =>
              setNodes((nodes) =>
                nodes.map((node) =>
                  node.id === selectedNode.id
                    ? { ...node, data: { ...node.data, italic: !node.data.italic } }
                    : node,
                ),
              )
            }
            onDecrease={() =>
              setNodes((nodes) =>
                nodes.map((node) =>
                  node.id === selectedNode.id
                    ? {
                        ...node,
                        data: { ...node.data, fontSize: Math.max(8, (node.data.fontSize ?? 12) - 1) },
                      }
                    : node,
                ),
              )
            }
            onIncrease={() =>
              setNodes((nodes) =>
                nodes.map((node) =>
                  node.id === selectedNode.id
                    ? {
                        ...node,
                        data: { ...node.data, fontSize: Math.min(48, (node.data.fontSize ?? 12) + 1) },
                      }
                    : node,
                ),
              )
            }
          />
          </div>
        </div>
      ) : null}

      {canShowFormatting && selectedEdge ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", width: "100%", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <TextLabel>Arrow</TextLabel>
            <div style={{ display: "flex", gap: 4 }}>
              {ARROW_BUTTONS.map(({ label, value, symbol }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => {
                    setEdges((edges) =>
                      edges.map((edge) =>
                        edge.id === selectedEdge.id
                          ? { ...edge, data: { ...edge.data, arrowDirection: value } }
                          : edge,
                      ),
                    );
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 24,
                    height: 24,
                    borderRadius: 4,
                    border: "none",
                    cursor: "pointer",
                    background: (selectedEdge.data?.arrowDirection ?? "none") === value ? "var(--accent-primary)" : "transparent",
                    color: (selectedEdge.data?.arrowDirection ?? "none") === value ? "var(--text-primary)" : "var(--text-muted)",
                    fontSize: 12,
                    fontFamily: "monospace",
                    padding: "0 4px",
                  }}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>

          <HorizontalDivider />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <TextLabel>Type</TextLabel>
            <div style={{ display: "flex", gap: 4 }}>
              {EDGE_STYLE_BUTTONS.map(({ label, value, symbol }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => {
                    setEdges((edges) =>
                      edges.map((edge) =>
                        edge.id === selectedEdge.id
                          ? { ...edge, data: { ...edge.data, edgeStyle: value } }
                          : edge,
                      ),
                    );
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 24,
                    height: 24,
                    borderRadius: 4,
                    border: "none",
                    cursor: "pointer",
                    background: (selectedEdge.data?.edgeStyle ?? "solid") === value
                      ? "var(--accent-primary)"
                      : "transparent",
                    color: (selectedEdge.data?.edgeStyle ?? "solid") === value
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                    fontSize: 12,
                    fontFamily: "monospace",
                    padding: "0 4px",
                  }}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
          
          <HorizontalDivider />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <TextLabel>Edge</TextLabel>
            <div style={{ display: "flex", gap: 4 }}>
              {NODE_COLOR_PALETTE.map((pair) => (
                <ColorButton
                  key={pair.id}
                  color={pair.text}
                  active={(selectedEdge.data?.color ?? "") === pair.text}
                  onClick={() => {
                    setEdges((edges) =>
                      edges.map((edge) =>
                        edge.id === selectedEdge.id
                          ? { ...edge, data: { ...edge.data, color: pair.text, colorId: pair.id } }
                          : edge,
                      ),
                    );
                  }}
                />
              ))}
            </div>
          </div>
          
          <HorizontalDivider />

          <div style={{ display: "flex", justifyContent: "center" }}>
            <TextControls
            bold={!!selectedEdge.data?.bold}
            italic={!!selectedEdge.data?.italic}
            fontSize={selectedEdge.data?.fontSize ?? 11}
            onBold={() =>
              setEdges((edges) =>
                edges.map((edge) =>
                  edge.id === selectedEdge.id
                    ? { ...edge, data: { ...edge.data, bold: !edge.data?.bold } }
                    : edge,
                ),
              )
            }
            onItalic={() =>
              setEdges((edges) =>
                edges.map((edge) =>
                  edge.id === selectedEdge.id
                    ? { ...edge, data: { ...edge.data, italic: !edge.data?.italic } }
                    : edge,
                ),
              )
            }
            onDecrease={() =>
              setEdges((edges) =>
                edges.map((edge) =>
                  edge.id === selectedEdge.id
                    ? {
                        ...edge,
                        data: {
                          ...edge.data,
                          fontSize: Math.max(8, (edge.data?.fontSize ?? 11) - 1),
                        },
                      }
                    : edge,
                ),
              )
            }
            onIncrease={() =>
              setEdges((edges) =>
                edges.map((edge) =>
                  edge.id === selectedEdge.id
                    ? {
                        ...edge,
                        data: {
                          ...edge.data,
                          fontSize: Math.min(48, (edge.data?.fontSize ?? 11) + 1),
                        },
                      }
                    : edge,
                ),
              )
            }
          />
          </div>
        </div>
      ) : null}

      {canShowFormatting && (selectedNode || selectedEdge) && (
        <div
          aria-hidden
          style={{
            height: 1,
            width: "100%",
            background: "var(--border-default)",
            margin: "0",
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
        {totalSelected > 0 ? (
          <>
            <ControlButton
              label="Delete selection"
              onClick={() => {
                void deleteElements({
                  nodes: selectedNodeIds.map((id) => ({ id })),
                  edges: selectedEdgeIds.map((id) => ({ id })),
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </ControlButton>
            <Divider />
          </>
        ) : null}

        <ControlButton label="Zoom out" onClick={() => zoomOut({ duration: 300 })}>
          <Minus className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Fit view" onClick={() => fitView({ duration: 300 })}>
          <Maximize className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Zoom in" onClick={() => zoomIn({ duration: 300 })}>
          <Plus className="h-4 w-4" />
        </ControlButton>
        <ControlButton
          label={isMinimapOpen ? "Hide minimap" : "Show minimap"}
          onClick={onToggleMinimap}
        >
          {isMinimapOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </ControlButton>
        <Divider />
        <ControlButton label="Undo" onClick={undo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Redo" onClick={redo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </ControlButton>
        <Divider />
        <ControlButton label="Templates" onClick={onOpenTemplates}>
          <LayoutTemplate className="h-4 w-4" />
        </ControlButton>
      </div>
    </div>
  );
}
function HorizontalDivider() {
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        width: "100%",
        background: "var(--border-default)",
        margin: "2px 0",
      }}
    />
  );
}
function Divider() {
  return (
    <div
      aria-hidden
      style={{
        width: 1,
        height: 16,
        background: "var(--border-default)",
        margin: "0 6px",
        flexShrink: 0,
      }}
    />
  );
}

function TextLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        color: "var(--text-muted)",
        marginRight: 6,
        userSelect: "none",
      }}
    >
      {children}
    </span>
  );
}

interface TextControlsProps {
  bold: boolean;
  italic: boolean;
  fontSize: number;
  onBold: () => void;
  onItalic: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
}

function TextControls({
  bold,
  italic,
  fontSize,
  onBold,
  onItalic,
  onDecrease,
  onIncrease,
}: TextControlsProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, marginRight: 2 }}>
      <ControlButton label="Bold" onClick={onBold} active={bold}>
        <span style={{ fontWeight: "bold", fontSize: 13 }}>B</span>
      </ControlButton>
      <ControlButton label="Italic" onClick={onItalic} active={italic}>
        <span style={{ fontStyle: "italic", fontSize: 13 }}>I</span>
      </ControlButton>
      <ControlButton label="Decrease font size" onClick={onDecrease}>
        <Minus className="h-3.5 w-3.5" />
      </ControlButton>
      <span style={{ minWidth: 24, fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>
        {fontSize}
      </span>
      <ControlButton label="Increase font size" onClick={onIncrease}>
        <Plus className="h-3.5 w-3.5" />
      </ControlButton>
    </div>
  );
}

interface ColorButtonProps {
  color: string;
  active: boolean;
  onClick: () => void;
}

function ColorButton({ color, active, onClick }: ColorButtonProps) {
  return (
    <button
      aria-label="Set color"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        border: active ? "2px solid var(--text-primary)" : "1px solid var(--border-default)",
        background: color,
        cursor: "pointer",
      }}
    />
  );
}

interface ControlButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}

function ControlButton({
  label,
  onClick,
  disabled = false,
  active = false,
  children,
}: ControlButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        background: active
          ? "color-mix(in srgb, var(--accent-primary) 26%, transparent)"
          : "transparent",
        border: "none",
        borderRadius: 8,
        color: disabled ? "var(--text-muted)" : "var(--text-primary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? "none" : "auto",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}
