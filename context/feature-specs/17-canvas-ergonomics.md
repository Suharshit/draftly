# Canvas Ergonomics & Collaborative Edge Styling

Enhance the workspace with custom zoom, undo/redo controls, custom keyboard shortcuts, and dynamic edge formatting (colors, arrow directions, and text formatting) that sync seamlessly in real-time.

---

## Technical Architecture & Proposed Changes

### 1. Canvas Types

#### [MODIFY] [types.ts](file:///e:/ghostai/types/canvas.ts)

- Update `CanvasEdgeData` to explicitly define the schema for edge styling, arrow directions, and typography:
  ```typescript
  export interface CanvasEdgeData extends Record<string, unknown> {
    label?: string;
    /** Direction of arrowheads: 'none' (plain line), 'forward' (at target), 'backward' (at source), 'bidirectional' (both) */
    arrowDirection?: "none" | "forward" | "backward" | "bidirectional";
    /** Hex color code for custom edge strokes (derived from NODE_COLOR_PALETTE.text for high contrast) */
    color?: string;
    /** Whether the edge label is bold */
    bold?: boolean;
    /** Whether the edge label is italic */
    italic?: boolean;
    /** Custom label font size in pixels. Default is 11 */
    fontSize?: number;
  }
  ```

---

### 2. Canvas Control Bar (Zoom & History)

#### [NEW] [canvas-control-bar.tsx](file:///e:/ghostai/components/editor/canvas-control-bar.tsx)

Create a custom component containing sleek buttons for canvas viewport and Liveblocks history:
- **Layout & Styling**:
  - Position absolutely at `bottom-6 left-6 z-10` (keeps it visually balanced with the centered shape panel and bottom-right minimap).
  - Shape: Rounded-full pill container matching the theme (`bg-[var(--bg-surface)]`, border `1px solid var(--border-default)`).
  - Drop shadow: `shadow-lg`.
  - Content structure: Two button groups separated by a vertical divider (`w-[1px] h-4 bg-[var(--border-default)]`).
- **Button Group 1 (Zoom Controls)**:
  - **Zoom Out**: Lucide `ZoomOut` icon. Calls `zoomOut({ duration: 300 })` via `useReactFlow`.
  - **Fit View**: Lucide `Maximize` or `Focus` icon. Calls `fitView({ duration: 300 })` via `useReactFlow`.
  - **Zoom In**: Lucide `ZoomIn` icon. Calls `zoomIn({ duration: 300 })` via `useReactFlow`.
- **Button Group 2 (History Controls)**:
  - **Undo**: Lucide `Undo2` icon. Calls standard Liveblocks `useUndo()`. Disabled when `useCanUndo()` is `false`.
  - **Redo**: Lucide `Redo2` icon. Calls standard Liveblocks `useRedo()`. Disabled when `useCanRedo()` is `false`.
- **Visual States**:
  - Hovering buttons triggers subtle background highlight (`hover:bg-[var(--accent-primary)]/10` and text color change `hover:text-[var(--text-primary)]`).
  - Disabled history buttons must have `opacity-40 cursor-not-allowed pointer-events-none`.

---

### 3. Keyboard Shortcuts Hook

#### [NEW] [use-keyboard-shortcuts.ts](file:///e:/ghostai/hooks/use-keyboard-shortcuts.ts)

Implement a robust React hook for global window listener bindings:
- **Typing Protection**:
  - Include an active input validator helper. Ignore all hotkeys if `document.activeElement` is an `input`, `textarea`, or has `contenteditable="true"` or `contenteditable=""`.
- **Bindings**:
  - `+` or `=` (Zoom In): Call `zoomIn({ duration: 300 })`.
  - `-` (Zoom Out): Call `zoomOut({ duration: 300 })`.
  - `Cmd+Z` / `Ctrl+Z` (Undo): Call `undo()`.
  - `Cmd+Shift+Z` / `Ctrl+Shift+Z` / `Cmd+Y` / `Ctrl+Y` (Redo): Call `redo()`.
- **Cleanup**:
  - Properly remove event listeners on component unmount to prevent leaks.

---

### 4. Edge Rendering & Colored Arrowheads

#### [MODIFY] [canvas-edge.tsx](file:///e:/ghostai/components/editor/canvas-edge.tsx)

- **Palette-Colored Arrowheads**:
  - Update `CanvasEdgeMarkerDefs` to dynamically generate rest and active markers for **every entry in `NODE_COLOR_PALETTE`**.
  - Rest markers: fill color is `pair.text` (for high visibility) at a dimmed opacity, or simply using `pair.text` directly.
  - Active markers: fill color is `pair.text` (vivid highlight).
  - Marker IDs: `canvas-arrow-${pair.id}-rest` and `canvas-arrow-${pair.id}-active`.
- **Custom Edge Coloring**:
  - Resolve the path stroke color:
    - If `data.color` is defined: use `data.color`.
    - Otherwise: use the default `#52525b` at rest, and `var(--accent-primary)` when active (hovered or selected).
- **Arrowhead Direction Rules**:
  - Read `data.arrowDirection` (defaults to `"forward"` if undefined/empty).
  - If `"forward"` or `"bidirectional"`: set `markerEnd` to `url(#canvas-arrow-{colorId}-{state})`.
  - If `"backward"` or `"bidirectional"`: set `markerStart` to `url(#canvas-arrow-{colorId}-{state})`.
  - If `"none"`: remove both marker properties.
- **Label Typography**:
  - Style the inline label using `data.bold` (`fontWeight: "bold"`) and `data.italic` (`fontStyle: "italic"`).

---

### 5. Edge Customization Toolbar

#### [MODIFY] [canvas-edge.tsx](file:///e:/ghostai/components/editor/canvas-edge.tsx)

Create a floating formatting toolbar specifically for selected edges:
- **Trigger**:
  - Visible centered above the edge label whenever the edge is `selected` and **not** in label editing mode.
- **Positioning**:
  - Sits in the `<EdgeLabelRenderer>` at `transform: translate(-50%, -100%) translate(${labelX}px, ${labelY - 20}px)`.
- **Controls & Sections**:
  - **Arrow Direction Buttons**:
    - Four compact buttons with clear icons or symbols: None (`—`), Forward (`→`), Backward (`←`), Bidirectional (`↔`).
    - Updates `arrowDirection` to `"none" | "forward" | "backward" | "bidirectional"`.
  - **Label Formatting Toggles**:
    - Bold (`B`) and Italic (`I`) buttons updating `data.bold` and `data.italic` respectively.
  - **Color Picker Swatches**:
    - Same 8-swatch color palette as nodes. Clicking a swatch sets `data.color` to `pair.text` (vivid hex) and `data.colorId` to `pair.id` (to match arrowhead markers). Set `data.color` to `undefined` for the default swatch.
- **Interaction Rules**:
  - Include `nodrag nopan` and stop `onMouseDown` propagation so interacting with the toolbar never moves or pans the canvas.

---

### 6. React Flow Setup

#### [MODIFY] [canvas-flow.tsx](file:///e:/ghostai/components/editor/canvas-flow.tsx)

- Mount `<CanvasControlBar />` as an overlay layer.
- Retrieve keyboard handlers and call the `useKeyboardShortcuts` hook inside the component.
- Configure native deletion hotkeys directly on the `<ReactFlow>` component for seamless collaborative node and edge deletion:
  - Add `deleteKeyCode={["Backspace", "Delete"]}` to React Flow props.

---

## Scope Limits

- Do not change or modify the existing centered draggable shape panel.
- Do not introduce custom sliders or inputs for manual arrowhead styling (keep it strictly to the four standard directions).
- Avoid third-party hotkey packages; implement clean native event listeners.

---

## Check When Done

- [ ] Control bar overlays nicely at `bottom-left` of the canvas workspace.
- [ ] Zoom buttons smooth-animate the canvas zoom and scale changes.
- [ ] Undo and redo buttons disable and dim visually depending on room history availability.
- [ ] Global keyboard shortcuts correctly ignore triggers when focus is inside text inputs/textareas.
- [ ] React Flow supports item deletion using both `Backspace` and `Delete` keys natively.
- [ ] Selected edges display a floating formatting toolbar centered above their midpoint labels.
- [ ] Customized edges can toggle arrow directions, make labels bold/italic, and recolor the stroke.
- [ ] Edge arrowheads match custom stroke colors exactly in both rest and hovered/selected states.
- [ ] `pnpm build` and `pnpm typecheck` finish successfully without any errors or warnings.