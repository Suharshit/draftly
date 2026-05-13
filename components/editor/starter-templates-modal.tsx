"use client";

import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditorDialogShell } from "@/components/editor/editor-dialog-shell";
import type { CanvasNode } from "@/types/canvas";
import type { CanvasTemplate } from "@/components/editor/starter-templates";

interface StarterTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (template: CanvasTemplate) => void;
  templates: CanvasTemplate[];
}

interface NodeFrame {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bg: string;
  text: string;
  shape: string;
}

function getNodeFrame(node: CanvasNode): NodeFrame {
  const width = Number(node.style?.width ?? 120);
  const height = Number(node.style?.height ?? 60);
  return {
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width,
    height,
    bg: node.data.color ?? "var(--bg-surface)",
    text: node.data.textColor ?? "var(--text-primary)",
    shape: node.data.shape ?? "rectangle",
  };
}

function getNodeShapeStyle(shape: string): CSSProperties {
  switch (shape) {
    case "circle":
      return { borderRadius: "9999px" };
    case "pill":
      return { borderRadius: "9999px" };
    case "diamond":
      return { clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" };
    case "hexagon":
      return { clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" };
    case "cylinder":
      return { borderRadius: "50% / 16%" };
    default:
      return { borderRadius: 6 };
  }
}

function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const nodes = template.nodes.map(getNodeFrame);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));

  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);

  const viewWidth = 640;
  const viewHeight = 360;
  const pad = 24;
  const scale = Math.min(
    (viewWidth - pad * 2) / contentWidth,
    (viewHeight - pad * 2) / contentHeight,
  );

  const offsetX = (viewWidth - contentWidth * scale) / 2;
  const offsetY = (viewHeight - contentHeight * scale) / 2;

  const getCenter = (nodeId: string) => {
    const node = nodesById.get(nodeId);
    if (!node) return null;
    return {
      x: offsetX + (node.x - minX + node.width / 2) * scale,
      y: offsetY + (node.y - minY + node.height / 2) * scale,
    };
  };

  return (
    <div className="relative aspect-video overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-base)]">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${viewWidth} ${viewHeight}`}>
        {template.edges.map((edge) => {
          const source = getCenter(edge.source);
          const target = getCenter(edge.target);
          if (!source || !target) return null;
          return (
            <line
              key={edge.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="var(--border-default)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {nodes.map((node) => {
        const left = offsetX + (node.x - minX) * scale;
        const top = offsetY + (node.y - minY) * scale;
        const width = node.width * scale;
        const height = node.height * scale;

        return (
          <div
            key={node.id}
            className="absolute border text-[10px] font-medium"
            style={{
              left,
              top,
              width,
              height,
              background: node.bg,
              color: node.text,
              borderColor: "var(--border-default)",
              ...getNodeShapeStyle(node.shape),
            }}
          />
        );
      })}
    </div>
  );
}

export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
  templates,
}: StarterTemplatesModalProps) {
  return (
    <EditorDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Starter Templates"
      description="Import a prebuilt architecture pattern into your canvas."
      contentClassName="w-[min(96vw,1000px)] sm:max-w-none"
    >
      <p className="rounded-md border border-[var(--state-error)]/40 bg-[color-mix(in_srgb,var(--state-error)_12%,transparent)] px-3 py-2 text-xs text-[var(--text-primary)]">
        Importing a template clears the current canvas before loading the selected pattern.
      </p>

      <ScrollArea className="h-[36vh] pr-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-3"
            >
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{template.name}</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{template.description}</p>
              <div className="mt-3">
                <TemplatePreview template={template} />
              </div>
              <Button
                className="mt-3 w-full"
                onClick={() => onImport(template)}
              >
                Import Template
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </EditorDialogShell>
  );
}
