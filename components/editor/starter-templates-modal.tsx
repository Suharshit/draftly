"use client";

import type { CSSProperties } from "react";
import { TriangleAlert } from "lucide-react";

import {
  PaperDialog,
  paperPrimaryButtonClass,
  paperSecondaryButtonClass,
} from "@/components/editor/paper-dialog";
import type { CanvasTemplate } from "@/components/editor/starter-templates";
import { cn } from "@/lib/utils";
import { resolveEdgeColor, resolveNodeFill, type CanvasNode } from "@/types/canvas";

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
  fill: string;
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
    fill: resolveNodeFill(node.data.color).value,
    shape: node.data.shape ?? "rectangle",
  };
}

function getNodeShapeStyle(shape: string): CSSProperties {
  switch (shape) {
    case "circle":
    case "pill":
      return { borderRadius: "9999px" };
    case "diamond":
      return { clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" };
    case "hexagon":
      return { clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" };
    case "cylinder":
      return { borderRadius: "50% / 16%" };
    default:
      return { borderRadius: 2 };
  }
}

/** Clip-path shapes lose their CSS border, so they get an ink backing layer instead. */
function isClippedShape(shape: string) {
  return shape === "diamond" || shape === "hexagon";
}

const previewGroundStyle: CSSProperties = {
  backgroundImage: "radial-gradient(color-mix(in srgb, var(--ink) 22%, transparent) 1px, transparent 1px)",
  backgroundSize: "12px 12px",
};

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

  // Node frames are laid out in the 640x360 view box, then placed as percentages of the preview.
  const toPercent = (value: number, total: number) => `${(value / total) * 100}%`;

  return (
    <div
      aria-hidden="true"
      className="relative aspect-video overflow-hidden rounded-paper border border-ink/20 bg-paper-cream"
      style={previewGroundStyle}
    >
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
              stroke={resolveEdgeColor(edge.data?.colorId).value}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {nodes.map((node) => {
        const shapeStyle = getNodeShapeStyle(node.shape);
        const frameStyle: CSSProperties = {
          left: toPercent(offsetX + (node.x - minX) * scale, viewWidth),
          top: toPercent(offsetY + (node.y - minY) * scale, viewHeight),
          width: toPercent(node.width * scale, viewWidth),
          height: toPercent(node.height * scale, viewHeight),
        };

        if (isClippedShape(node.shape)) {
          return (
            <div key={node.id} className="absolute bg-ink p-px" style={{ ...frameStyle, ...shapeStyle }}>
              <div className="h-full w-full" style={{ background: node.fill, ...shapeStyle }} />
            </div>
          );
        }

        return (
          <div
            key={node.id}
            className="absolute border border-ink"
            style={{ ...frameStyle, background: node.fill, ...shapeStyle }}
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
    <PaperDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="Starter templates"
      description="Import a prebuilt architecture pattern into your canvas."
      contentClassName="w-[min(96vw,1000px)] sm:max-w-none"
      footer={
        <button type="button" className={paperSecondaryButtonClass} onClick={() => onOpenChange(false)}>
          Close
        </button>
      }
    >
      <div className="space-y-5">
        <p
          role="note"
          className="flex items-start gap-2.5 rounded-paper border border-ink/15 border-l-2 border-l-paper-pin-red bg-paper-cream px-3.5 py-2.5 font-brand text-sm text-ink"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-paper-pin-red" aria-hidden="true" />
          Importing a template clears the current canvas before loading the selected pattern.
        </p>

        <div className="flex items-center justify-between font-mono text-chrome tracking-chrome text-ink-soft uppercase">
          <span>Templates</span>
          <span>{templates.length}</span>
        </div>

        <ul className="-mr-3 grid max-h-[56vh] grid-cols-1 gap-5 overflow-y-auto pr-3 pb-3 md:grid-cols-3 border border-ink/40 rounded-paper p-3 shadow-inner bg-paper-cream">
          {templates.map((template) => (
            <li
              key={template.id}
              className="flex flex-col rounded-paper border border-ink bg-paper-bright p-4"
            >
              <p className="font-mono text-chrome tracking-chrome text-ink-soft uppercase">
                {template.nodes.length} nodes · {template.edges.length} edges
              </p>
              <h3 className="mt-1.5 font-brand text-base font-semibold text-ink">{template.name}</h3>
              <p className="mt-1 flex-1 font-brand text-sm text-ink-soft">{template.description}</p>
              <div className="mt-4">
                <TemplatePreview template={template} />
              </div>
              <button
                type="button"
                className={cn(paperPrimaryButtonClass, "mt-4 w-full")}
                onClick={() => onImport(template)}
                aria-label={`Import ${template.name} template`}
              >
                Import template
              </button>
            </li>
          ))}
        </ul>
      </div>
    </PaperDialog>
  );
}
