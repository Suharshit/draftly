"use client";

import type { DragEvent } from "react";
import {
  Square,
  Circle,
  Diamond,
  Pill,
  Cylinder,
  Hexagon,
  type LucideIcon,
} from "lucide-react";

import type { CanvasShape } from "@/types/canvas";
import { SHAPE_DEFAULTS } from "@/types/canvas";

// ---------------------------------------------------------------------------
// Drag payload format
// ---------------------------------------------------------------------------

export interface ShapeDragPayload {
  shape: CanvasShape;
  width: number;
  height: number;
}

export const SHAPE_DRAG_MIME = "application/ghost-shape";

// ---------------------------------------------------------------------------
// Shape catalogue
// ---------------------------------------------------------------------------

interface ShapeEntry {
  shape: CanvasShape;
  label: string;
  Icon: LucideIcon;
}

const SHAPES: ShapeEntry[] = [
  { shape: "rectangle", label: "Rectangle", Icon: Square },
  { shape: "circle",    label: "Circle",    Icon: Circle },
  { shape: "diamond",   label: "Diamond",   Icon: Diamond },
  { shape: "pill",      label: "Pill",      Icon: Pill },
  { shape: "cylinder",  label: "Cylinder",  Icon: Cylinder },
  { shape: "hexagon",   label: "Hexagon",   Icon: Hexagon },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Floating bottom toolbar that lets users drag shapes onto the canvas.
 * Rendered inside the canvas section so it overlays the React Flow surface.
 */
export function ShapePanel() {
  function handleDragStart(e: DragEvent<HTMLButtonElement>, entry: ShapeEntry) {
    const payload: ShapeDragPayload = {
      shape: entry.shape,
      ...SHAPE_DEFAULTS[entry.shape],
    };
    e.dataTransfer.setData(SHAPE_DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center"
      aria-label="Shape panel"
    >
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 shadow-lg"
        role="toolbar"
        aria-label="Draggable shapes"
      >
        {SHAPES.map((entry) => (
          <button
            key={entry.shape}
            type="button"
            draggable
            onDragStart={(e) => handleDragStart(e, entry)}
            title={entry.label}
            aria-label={`Drag ${entry.label} shape onto canvas`}
            className="group flex cursor-grab flex-col items-center gap-1 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--accent-primary)]/10 active:cursor-grabbing"
          >
            <entry.Icon
              className="h-5 w-5 text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent-primary)]"
              strokeWidth={1.5}
            />
            <span className="text-[10px] leading-none text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]">
              {entry.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
