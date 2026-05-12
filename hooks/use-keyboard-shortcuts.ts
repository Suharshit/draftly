"use client";

import { useEffect } from "react";

// ---------------------------------------------------------------------------
// Typing protection helper
// ---------------------------------------------------------------------------

/**
 * Returns true when the current document focus is inside a text-entry element
 * (input, textarea, or any element with contenteditable).
 * All hotkeys are suppressed in this case.
 */
function isTypingActive(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  const ce = el.getAttribute("contenteditable");
  return ce === "true" || ce === "";
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface KeyboardShortcutHandlers {
  zoomIn: () => void;
  zoomOut: () => void;
  undo: () => void;
  redo: () => void;
}

/**
 * Binds global keyboard shortcuts for canvas viewport and history controls.
 *
 * Bindings:
 *  - `+` / `=`            → zoomIn
 *  - `-`                  → zoomOut
 *  - Ctrl/Cmd + Z         → undo
 *  - Ctrl/Cmd + Shift + Z → redo
 *  - Ctrl/Cmd + Y         → redo (Windows convention)
 *
 * All bindings are suppressed when focus is inside an input or editable element.
 * Event listeners are cleaned up on unmount.
 */
export function useKeyboardShortcuts({
  zoomIn,
  zoomOut,
  undo,
  redo,
}: KeyboardShortcutHandlers): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingActive()) return;

      const meta = e.metaKey || e.ctrlKey;

      // ── Redo: Ctrl/Cmd + Shift + Z  or  Ctrl/Cmd + Y ──────────────────────
      if (meta && e.shiftKey && e.key === "z") {
        e.preventDefault();
        redo();
        return;
      }
      if (meta && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }

      // ── Undo: Ctrl/Cmd + Z ─────────────────────────────────────────────────
      if (meta && e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }

      // ── Zoom (no modifier) ─────────────────────────────────────────────────
      if (!meta) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          zoomIn();
          return;
        }
        if (e.key === "-") {
          e.preventDefault();
          zoomOut();
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [zoomIn, zoomOut, undo, redo]);
}
