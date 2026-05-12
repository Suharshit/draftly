"use client";

import { useState, useEffect, useRef, type DragEvent } from "react";
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
// Shape ghost preview — follows cursor while dragging
// ---------------------------------------------------------------------------

interface DragState {
  shape: CanvasShape;
  width: number;
  height: number;
  x: number;
  y: number;
}

/** Returns inline styles that mimic the canvas node shape for the given shape type. */
function getGhostStyle(shape: CanvasShape, width: number, height: number): React.CSSProperties {
  const base: React.CSSProperties = {
    width,
    height,
    background: "var(--bg-surface)",
    border: "1.5px solid var(--accent-primary)",
    opacity: 0.72,
    pointerEvents: "none",
    boxSizing: "border-box",
  };

  switch (shape) {
    case "circle":
      return { ...base, borderRadius: "50%" };
    case "pill":
      return { ...base, borderRadius: 9999 };
    case "diamond": {
      const mid = { x: width / 2, y: height / 2 };
      return {
        ...base,
        background: "transparent",
        border: "none",
        // Use an SVG background image for the ghost — simpler than mounting SVG here
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Cpolygon points='${mid.x},0 ${width},${mid.y} ${mid.x},${height} 0,${mid.y}' fill='%2318181b' stroke='%233b82f6' stroke-width='1.5'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
      };
    }
    case "hexagon": {
      const mid = { x: width / 2, y: height / 2 };
      const qx = width * 0.25;
      const qx3 = width * 0.75;
      return {
        ...base,
        background: "transparent",
        border: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Cpolygon points='${qx},0 ${qx3},0 ${width},${mid.y} ${qx3},${height} ${qx},${height} 0,${mid.y}' fill='%2318181b' stroke='%233b82f6' stroke-width='1.5'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
      };
    }
    case "cylinder": {
      const ry = Math.max(6, width * 0.12);
      return {
        ...base,
        background: "transparent",
        border: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect x='0' y='${ry}' width='${width}' height='${height - ry}' fill='%2318181b' stroke='%233b82f6' stroke-width='1.5'/%3E%3Cellipse cx='${width / 2}' cy='${height}' rx='${width / 2}' ry='${ry}' fill='%2318181b' stroke='%233b82f6' stroke-width='1.5'/%3E%3Cellipse cx='${width / 2}' cy='${ry}' rx='${width / 2}' ry='${ry}' fill='%2318181b' stroke='%233b82f6' stroke-width='1.5'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
      };
    }
    case "rectangle":
    default:
      return { ...base, borderRadius: 6 };
  }
}

function ShapeGhostPreview({ drag }: { drag: DragState }) {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: drag.x - drag.width / 2,
        top: drag.y - drag.height / 2,
        zIndex: 9999,
        pointerEvents: "none",
        transition: "none",
        ...getGhostStyle(drag.shape, drag.width, drag.height),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Floating bottom toolbar that lets users drag shapes onto the canvas.
 * Rendered inside the canvas section so it overlays the React Flow surface.
 * Shows a ghost preview following the cursor while dragging.
 */
export function ShapePanel() {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragActive = useRef(false);

  // Track cursor position globally during drag
  useEffect(() => {
    if (!drag) return;

    function onMouseMove(e: MouseEvent) {
      if (!dragActive.current) return;
      setDrag((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [drag]);

  function handleDragStart(e: DragEvent<HTMLButtonElement>, entry: ShapeEntry) {
    const payload: ShapeDragPayload = {
      shape: entry.shape,
      ...SHAPE_DEFAULTS[entry.shape],
    };
    e.dataTransfer.setData(SHAPE_DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";

    // Suppress the default browser drag image (transparent 1×1 pixel)
    const ghost = document.createElement("div");
    ghost.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    // Remove temp element after the drag image is captured
    requestAnimationFrame(() => document.body.removeChild(ghost));

    dragActive.current = true;
    setDrag({
      shape: entry.shape,
      width: payload.width,
      height: payload.height,
      x: e.clientX,
      y: e.clientY,
    });
  }

  function handleDragEnd() {
    dragActive.current = false;
    setDrag(null);
  }

  return (
    <>
      {drag && <ShapeGhostPreview drag={drag} />}

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
              onDragEnd={handleDragEnd}
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
    </>
  );
}
