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

import { cn } from "@/lib/utils";
import { DEFAULT_NODE_FONT_SIZE, SHAPE_KICKERS } from "@/components/editor/canvas-node";
import { EDGE_COLORS, NODE_FILLS, resolveEdgeColor, resolveNodeFill, TEXT_NODE_SHAPE } from "@/types/canvas";
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

const focusClass = "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink/60";

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
    <div className="absolute bottom-6 left-6 z-10 flex flex-col rounded-paper border border-ink bg-paper-bright text-ink shadow-flat scheme-light">
      {canShowFormatting && selectedNode ? (
        <div className="flex flex-col gap-2.5 border-b border-ink/15 p-3">
          {/* Free text nodes have no kicker or fill — only the text controls apply. */}
          {selectedNode.data.shape !== TEXT_NODE_SHAPE ? (
          <>
          {/* Kicker label above the node name. Empty falls back to the shape default. */}
          <FormatRow label="Label">
            <input
              type="text"
              value={selectedNode.data.kicker ?? ""}
              placeholder={SHAPE_KICKERS[selectedNode.data.shape ?? "rectangle"]}
              maxLength={24}
              aria-label="Node label"
              onChange={(event) => {
                const kicker = event.target.value;
                setNodes((nodes) =>
                  nodes.map((node) =>
                    node.id === selectedNode.id
                      ? { ...node, data: { ...node.data, kicker: kicker === "" ? undefined : kicker } }
                      : node,
                  ),
                );
              }}
              className={cn(
                "h-7 w-38 rounded-paper border border-ink/20 bg-paper-cream px-2",
                "font-mono text-chrome tracking-chrome text-ink uppercase placeholder:text-ink-soft/60",
                "transition-colors hover:border-ink focus:border-ink",
                focusClass,
              )}
            />
          </FormatRow>

          <HorizontalDivider />

          {/* Fill — sticky-note accents. Stroke and text are always ink. */}
          <FormatRow label="Fill">
            {NODE_FILLS.map((fill) => (
              <ColorButton
                key={`fill-${fill.id}`}
                color={fill.value}
                label={fill.label}
                active={resolveNodeFill(selectedNode.data.color).id === fill.id}
                onClick={() => {
                  setNodes((nodes) =>
                    nodes.map((node) =>
                      node.id === selectedNode.id
                        ? { ...node, data: { ...node.data, color: fill.value } }
                        : node,
                    ),
                  );
                }}
              />
            ))}
          </FormatRow>

          <HorizontalDivider />
          </>
          ) : null}

          <div className="flex justify-center">
            <TextControls
              bold={!!selectedNode.data.bold}
              italic={!!selectedNode.data.italic}
              fontSize={selectedNode.data.fontSize ?? DEFAULT_NODE_FONT_SIZE}
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
                          data: { ...node.data, fontSize: Math.max(8, (node.data.fontSize ?? DEFAULT_NODE_FONT_SIZE) - 1) },
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
                          data: { ...node.data, fontSize: Math.min(48, (node.data.fontSize ?? DEFAULT_NODE_FONT_SIZE) + 1) },
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
        <div className="flex flex-col gap-2.5 border-b border-ink/15 p-3">
          <FormatRow label="Arrow">
            {ARROW_BUTTONS.map(({ label, value, symbol }) => (
              <SymbolButton
                key={value}
                label={label}
                symbol={symbol}
                active={(selectedEdge.data?.arrowDirection ?? "none") === value}
                onClick={() => {
                  setEdges((edges) =>
                    edges.map((edge) =>
                      edge.id === selectedEdge.id
                        ? { ...edge, data: { ...edge.data, arrowDirection: value } }
                        : edge,
                    ),
                  );
                }}
              />
            ))}
          </FormatRow>

          <HorizontalDivider />

          <FormatRow label="Type">
            {EDGE_STYLE_BUTTONS.map(({ label, value, symbol }) => (
              <SymbolButton
                key={value}
                label={label}
                symbol={symbol}
                active={(selectedEdge.data?.edgeStyle ?? "solid") === value}
                onClick={() => {
                  setEdges((edges) =>
                    edges.map((edge) =>
                      edge.id === selectedEdge.id
                        ? { ...edge, data: { ...edge.data, edgeStyle: value } }
                        : edge,
                    ),
                  );
                }}
              />
            ))}
          </FormatRow>

          <HorizontalDivider />

          <FormatRow label="Edge">
            {EDGE_COLORS.map((color) => (
              <ColorButton
                key={color.id}
                color={color.value}
                label={color.label}
                active={resolveEdgeColor(selectedEdge.data?.colorId).id === color.id}
                onClick={() => {
                  setEdges((edges) =>
                    edges.map((edge) =>
                      edge.id === selectedEdge.id
                        ? { ...edge, data: { ...edge.data, color: color.value, colorId: color.id } }
                        : edge,
                    ),
                  );
                }}
              />
            ))}
          </FormatRow>

          <HorizontalDivider />

          <div className="flex justify-center">
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

      {/* Segmented bar: every control is a cell split by a hairline. */}
      <div className="flex flex-wrap items-stretch">
        {totalSelected > 0 ? (
          <ControlButton
            label="Delete selection"
            className="hover:text-paper-pin-red"
            onClick={() => {
              void deleteElements({
                nodes: selectedNodeIds.map((id) => ({ id })),
                edges: selectedEdgeIds.map((id) => ({ id })),
              });
            }}
          >
            <Trash2 className="h-4 w-4" />
          </ControlButton>
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
        <ControlButton label="Undo" onClick={undo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Redo" onClick={redo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Templates" onClick={onOpenTemplates}>
          <LayoutTemplate className="h-4 w-4" />
        </ControlButton>
      </div>
    </div>
  );
}

function HorizontalDivider() {
  return <div aria-hidden className="h-px w-full bg-ink/15" />;
}

function FormatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <TextLabel>{label}</TextLabel>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

function TextLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-chrome tracking-chrome text-ink-soft uppercase select-none">
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
    <div className="flex items-stretch rounded-paper border border-ink/20">
      <ControlButton label="Bold" onClick={onBold} active={bold}>
        <span className="font-brand text-[13px] font-bold">B</span>
      </ControlButton>
      <ControlButton label="Italic" onClick={onItalic} active={italic}>
        <span className="font-serif text-[15px] italic">I</span>
      </ControlButton>
      <ControlButton label="Decrease font size" onClick={onDecrease}>
        <Minus className="h-3.5 w-3.5" />
      </ControlButton>
      <span className="flex min-w-9 items-center justify-center border-l border-ink/15 font-mono text-chrome text-ink-soft">
        {fontSize}
      </span>
      <ControlButton label="Increase font size" onClick={onIncrease}>
        <Plus className="h-3.5 w-3.5" />
      </ControlButton>
    </div>
  );
}

interface SymbolButtonProps {
  label: string;
  symbol: string;
  active: boolean;
  onClick: () => void;
}

function SymbolButton({ label, symbol, active, onClick }: SymbolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-paper border px-1.5 font-mono text-xs transition-colors",
        active ? "border-ink bg-ink text-paper-cream" : "border-ink/20 text-ink hover:border-ink",
        focusClass,
      )}
    >
      {symbol}
    </button>
  );
}

interface ColorButtonProps {
  color: string;
  label?: string;
  active: boolean;
  onClick: () => void;
}

function ColorButton({ color, label = "Set color", active, onClick }: ColorButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      style={{ background: color }}
      className={cn(
        "size-5 cursor-pointer rounded-full border outline-none",
        active ? "border-ink ring-2 ring-ink ring-offset-1 ring-offset-paper-bright" : "border-ink/25 hover:border-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60",
      )}
    />
  );
}

interface ControlButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}

function ControlButton({
  label,
  onClick,
  disabled = false,
  active = false,
  className,
  children,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={cn(
        "flex size-9 shrink-0 cursor-pointer items-center justify-center border-l border-ink/15 first:border-l-0 transition-colors",
        active ? "bg-ink text-paper-cream" : "text-ink hover:bg-ink/5",
        "disabled:pointer-events-none disabled:opacity-35",
        focusClass,
        className,
      )}
    >
      {children}
    </button>
  );
}
