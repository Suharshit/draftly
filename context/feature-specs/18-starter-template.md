# Starter Template Library

Add a library of pre-built diagram templates so users can start from a known architecture pattern instead of a blank canvas.

## Technical Context

- **Node/Edge Types**: Use `CanvasNode` and `CanvasEdge` from [types/canvas.ts](types/canvas.ts).
- **Type Constant**: All nodes must use `type: CANVAS_NODE_TYPE`. All edges must use `type: CANVAS_EDGE_TYPE`.
- **Colors**: Use values from `NODE_COLOR_PALETTE` in [types/canvas.ts](types/canvas.ts).

## Implementation

### 1. Template Definitions (`components/editor/starter-templates.ts`)

Define the template data structure and a set of initial patterns.

- Create `CanvasTemplate` interface:
  - `id: string`
  - `name: string`
  - `description: string`
  - `nodes: CanvasNode[]`
  - `edges: CanvasEdge[]`
- Implement `CANVAS_TEMPLATES` array with at least three detailed templates:
  - **Microservices Architecture**: API Gateway, Auth Service, User Service, Order Service, and shared Database.
  - **CI/CD Pipeline**: Source Control -> Build Agent -> Unit Tests -> Deploy to Staging -> Deploy to Production.
  - **Event-Driven System**: Message Producer -> Event Bus (Topic) -> Multiple Consumers (Emailer, Analytics, Logger).
- **Helper Function**: Create a `createTemplateNode` helper that takes `(id, label, x, y, shape, colorId)` to keep definitions clean. It should look up the hex values for `bg` and `text` from `NODE_COLOR_PALETTE`.

### 2. Template Modal (`components/editor/starter-templates-modal.tsx`)

A dialog-based UI for browsing and importing templates.

- **Component**: `StarterTemplatesModal` props: `open`, `onOpenChange`, `onImport(template)`.
- **UI Structure**: 
  - Use `EditorDialogShell` from [components/editor/editor-dialog-shell.tsx](components/editor/editor-dialog-shell.tsx).
  - Use a `ScrollArea` containing a grid (`grid-cols-1 md:grid-cols-2`).
  - Each card should show:
    - Template `name` and `description`.
    - A stylized `Preview` (see below).
    - An "Import Template" button.
- **Safety**: Warning text indicating that importing a template will clear the current canvas.

### 3. Lightweight Preview Component

Each template card needs a visual preview. Do NOT use a full `ReactFlow` instance here for performance.

- Calculate the "bounding box" of the template nodes.
- Scale and center the nodes/edges within a fixed aspect-ratio `div` (e.g., `aspect-video`).
- Render nodes as simple `div` elements with the correct shape (border-radius) and background color from the template data.
- Render edges as simple SVG lines connecting the centers of nodes.

### 4. Integration (`components/editor/canvas-flow.tsx`)

- Add a "Templates" button to the `CanvasControlBar` or `EditorNavbar`.
- When a template is selected:
  1. Use `useReactFlow()` to clear existing state: `setNodes([])` and `setEdges([])`.
  2. Map template nodes to unique IDs using a timestamp prefix to avoid collisions if multiple templates are imported.
  3. Batch add the new nodes and edges.
  4. Call `fitView({ duration: 800 })` after import.

## Design Rules

- **Theme**: Stick to CSS variables defined in [ui-context.md](context/ui-context.md).
- **Cards**: Use `bg-surface` with `border-default`.
- **Icons**: Use `LayoutTemplate` or `Zap` from `lucide-react` for the entry point.