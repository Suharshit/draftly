Replace the default canvas edges with custom edges that feel easier to follow, easier to click, and support inline labels.

## Proposed Changes

### [Canvas Edge Component]

#### [NEW] [canvas-edge.tsx](file:///e:/ghostai/components/editor/canvas-edge.tsx)

Create a custom React Flow edge component `CanvasEdgeComponent` to handle right-angle routing, hover/selection state, interactive click detection, and inline collaborative label editing.

- **Routing & Rendering**:
  - Use `getSmoothStepPath` from `@xyflow/react` to calculate the right-angle path string and label midpoint `(labelX, labelY)`.
  - Pass the calculated path to a visible SVG `<path>` element.
  - Visible stroke style:
    - Normal state: `var(--border-default)` (or a slightly brighter dimmed gray like `#52525b`), `strokeWidth: 2`, `strokeLinecap: "round"`.
    - Hovered or Selected state: `var(--accent-primary)` (`#3b82f6`) with smooth `0.15s ease` transition on color.
  - Visible arrowhead:
    - Pass `markerEnd` to the path element so React Flow's arrowheads are rendered.
    - Arrowhead color should dynamically match the path color state.

- **Enhanced Hover & Click Detection**:
  - To make thin lines easy to hover/click, render a **second, invisible/transparent path** in the same `<g>` element *above* the visible path.
  - Set its `strokeWidth` to `16` or `20`, `stroke: "transparent"`, and `fill: "none"`.
  - Attach hover (`onMouseEnter`/`onMouseLeave`) and double-click (`onDoubleClick`) event listeners to this invisible path.
  - Add `cursor: "pointer"` when hovered to signify interactivity.

- **Collaborative Label Editing**:
  - Use React Flow's `<EdgeLabelRenderer>` to render the label container.
  - Position the label container using an absolute-positioned `div` at `transform: translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`.
  - Enforce `pointer-events: "all"` on the label container, and always include the `"nodrag nopan"` classes to prevent dragging or panning the canvas when interacting with the input.
  - Label states:
    - **Read-only state**: Render label text inside a styled badge (e.g., background `var(--bg-surface)`, border `1px solid var(--border-default)`, small font, rounded corner, padding). Double-clicking this badge (or the invisible path) enters edit mode.
    - **Editing state**: Render an auto-focusing single-line `<input>` text element.
      - Auto-select all text on mount.
      - Ensure the input is transparent with no border/outline, matching the typography.
      - **Auto-growing behavior**: Dynamically adjust input width. A clean React pattern for this is to use a hidden inline helper element (e.g. standard `span` styled identically but positioned offscreen or hidden) to measure text width and update the input style width dynamically, or use a responsive length formula like `width: Math.max(60, text.length * 8) + "px"`.
      - **Committer behaviors**: Pressing `Enter` or losing focus (`blur`) saves the changes to the shared collaborative state and exits edit mode.
      - **Canceller behaviors**: Pressing `Escape` discards any pending edits and exits edit mode.

### [Canvas Types]

#### [MODIFY] [types.ts](file:///e:/ghostai/types/canvas.ts)

- Update `CanvasEdgeData` to explicitly specify the label schema:
  ```typescript
  export interface CanvasEdgeData extends Record<string, unknown> {
    label?: string;
  }
  ```

### [Canvas Flow Interface]

#### [MODIFY] [canvas-flow.tsx](file:///e:/ghostai/components/editor/canvas-flow.tsx)

- Import `CanvasEdgeComponent` and `CANVAS_EDGE_TYPE`.
- Register the custom edge in the `edgeTypes` map of `<ReactFlow>`:
  ```typescript
  const edgeTypes = {
    [CANVAS_EDGE_TYPE]: CanvasEdgeComponent,
  };
  ```
- Configure `<ReactFlow>` to use this custom edge renderer as default:
  - Add `edgeTypes={edgeTypes}` prop.
  - Update `defaultEdgeOptions` to `{ type: CANVAS_EDGE_TYPE }`.
- Change `connectionLineType` on `<ReactFlow>` from `ConnectionLineType.Bezier` to `ConnectionLineType.SmoothStep` to ensure connection previews match the right-angle edge style.

### [Canvas Node Handles]

#### [MODIFY] [canvas-node.tsx](file:///e:/ghostai/components/editor/canvas-node.tsx)

- Update the existing `HANDLE_STYLE_BASE` to match a subtle, professional aesthetic:
  - Background: `var(--text-primary)` (small white dot).
  - Border: `1px solid var(--bg-surface)` or `var(--border-default)`.
  - Dimensions: Keep them compact (e.g., `width: 6, height: 6` or `8`).

## Collaborative State Sync Guide

When the edge label is saved:
1. Use React Flow's `setEdges` state updater (which `useLiveblocksFlow` automatically syncs across clients):
   ```typescript
   setEdges((eds) =>
     eds.map((e) =>
       e.id === edgeId ? { ...e, data: { ...e.data, label: newValue } } : e
     )
   );
   ```
2. No manual database or server mutations are needed (handled 100% via Liveblocks room presence and storage).

## Scope Limits

- Do not implement custom multi-line text boxes or markdown support for edges.
- Do not allow custom color picking for individual edges; edge colors are derived from active states (dim vs primary accent).
- Do not modify node creation/panel logic.
- Keep components focused and small.

## Check When Done

- [ ] New connections use right-angle routing and the custom `canvasEdge` renderer.
- [ ] Active dragging connection preview uses right-angle (SmoothStep) path.
- [ ] Edges are styled with `--border-default` color at rest, and change to `--accent-primary` when hovered or selected.
- [ ] Arrowheads are visible on connections and match the path color.
- [ ] Edges are extremely easy to hover and click via a wide invisible interaction path.
- [ ] Double-clicking an edge (or its label badge) enters inline edit mode.
- [ ] Inline label input has `nodrag nopan` and does not interfere with canvas dragging or panning.
- [ ] Inline input automatically grows in width as text is typed.
- [ ] Inline edits are committed on `Enter` or `blur`, and discarded on `Escape`.
- [ ] Edge label changes synchronize in real-time across all active collaborators (Liveblocks-powered).
- [ ] Compact, subtle white node handles with dark borders are displayed on node hover.
- [ ] `pnpm build` and `pnpm typecheck` pass successfully without errors.