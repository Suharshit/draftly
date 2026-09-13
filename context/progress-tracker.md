# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes

## Current Phase

- In Progress

## Current Goal

- Implement the Specs tab (Generate Spec + download), which remains inert.

## Completed

- Fix unit `context/fix/01-AI-sidebar-fix.md` completed (AI sidebar wired to the design agent):
    - Installed `zod` pinned to an exact version (`4.6.2`) for `generateObject`.
    - Added shared generation contract in `lib/design-generation.ts`:
      - Zod schema for model output (`designGraphSchema`): nodes (`id`, `label`,
        `position`, `shape` from `CANVAS_SHAPES`, optional `colorId` from
        `NODE_COLOR_IDS`) and edges (`id`, `source`, `target`, optional `label`,
        `arrowDirection` from `EDGE_ARROW_DIRECTIONS`)
      - `buildCanvasGraph()` maps model output to `CanvasNode` / `CanvasEdge` in
        code: applies `CANVAS_NODE_TYPE` / `CANVAS_EDGE_TYPE`, sizes from
        `SHAPE_DEFAULTS`, palette colors from `NODE_COLOR_PALETTE`, re-keys ids
        under a run-scoped prefix, drops dangling edges, and collapses model
        position hints onto a non-overlapping grid
      - Run progress contract shared by task and sidebar
        (`DESIGN_AGENT_STAGE_KEY`, `DESIGN_AGENT_STAGES`, `parseDesignAgentStage`)
    - Added value-list exports to `types/canvas.ts` so shapes, arrow directions,
      and palette ids can be validated at runtime: `CANVAS_SHAPES`,
      `EDGE_ARROW_DIRECTIONS`, `NODE_COLOR_IDS` / `NodeColorId`,
      `CanvasArrowDirection` (existing types are now derived from them).
    - Implemented `src/trigger/design-agent.ts` (task id and payload unchanged):
      - Calls `generateObject` with `@ai-sdk/google`
        (`GOOGLE_GENERATIVE_AI_MODEL`, default `gemini-3.5-flash`)
      - Writes nodes and edges into the Liveblocks room with `mutateFlow` from
        `@liveblocks/react-flow/node` using `getLiveblocksClient()`; default
        `storageKey` (matches the client `useLiveblocksFlow`)
      - Offsets each generation below existing room content
      - Publishes `stage` / `nodeCount` / `edgeCount` on run metadata and returns
        `{ nodeCount, edgeCount }`
    - Added `hooks/use-design-agent.ts`:
      - `POST /api/ai/design` with `{ prompt, roomId, projectId }`, handling
        `202` / `400` / `401` / `403` and network failures
      - Exchanges the run id for a run-scoped token via
        `POST /api/ai/design/token`, then subscribes with `useRealtimeRun`
      - Derives everything it shows (status line, closing summary, whether the
        composer is locked) from the run's own reported state, so a settlement
        step cannot leave the sidebar stuck mid-run
      - Renders stage-based status, posts a summary naming the component and
        connection counts on success, reports failures, and keeps the composer
        disabled while a run is in flight
      - Sets the Liveblocks `thinking` presence flag while a run is active
    - Wired the sidebar and workspace:
      - `AiSidebar` now takes `projectId` and renders assistant-side messages,
        a live status line, and error messages
      - `CanvasWrapper` accepts `children` rendered inside `RoomProvider`, and
        `EditorWorkspaceShell` nests `AiSidebar` there so it can write presence
      - Added `CanvasThinkingIndicator` in `components/editor/canvas-presence.tsx`
        so collaborators see an in-progress generation
    - Added `GOOGLE_GENERATIVE_AI_MODEL` to `.env.example`
      (`GOOGLE_GENERATIVE_AI_API_KEY` is set locally, server-only, no
      `NEXT_PUBLIC_` prefix).
    - Out of scope and unchanged: the Specs tab, both AI routes, `TaskRun`,
      `lib/project-access.ts`, `lib/prisma.ts`, the Liveblocks auth route, and
      the canvas autosave persistence path.
    - Validation checks:
      - `pnpm lint`, `pnpm typecheck`, and `pnpm build` passed
      - `trigger deploy --dry-run` built the task successfully

- Feature spec `22-design-agent-api.md` completed:
    - Added `TaskRun` Prisma model in `prisma/models/task-run.prisma` with:
      - `runId` unique
      - `projectId`
      - `userId`
      - `createdAt`
      - index on `runId`
      - compound index on `userId` + `projectId`
    - Added migration and applied it:
      - `prisma/migrations/20260523085718_add_task_run_model/migration.sql`
    - Added Trigger design task in `src/trigger/design-agent.ts`:
      - Task ID `design-agent`
      - Accepts `{ prompt, roomId }`
      - Logs and echoes payload (no AI/canvas logic)
    - Added `POST /api/ai/design` in `app/api/ai/design/route.ts`:
      - Validates `prompt`, `roomId`, `projectId`
      - Enforces Clerk authentication
      - Verifies project access
      - Enforces `roomId === projectId`
      - Triggers Trigger.dev run and persists `TaskRun`
      - Returns `202` with `{ runId }`
    - Added `POST /api/ai/design/token` in `app/api/ai/design/token/route.ts`:
      - Validates `runId`
      - Enforces Clerk authentication
      - Verifies run ownership via `TaskRun` (`runId` + `userId`)
      - Mints run-scoped Trigger.dev public token and returns `{ token }`
    - Regenerated Prisma client in `app/generated/prisma`.
    - Validation checks:
      - `pnpm build` passed

- Trigger.dev setup baseline completed (2026-05-23):
    - Confirmed Trigger.dev v4 dependencies, config (`trigger.config.ts`), and task directory (`src/trigger`) are present.
    - Added typed sample payload contract in `src/trigger/example.ts` (removed `any`).
    - Added authenticated route `POST /api/trigger/hello` in `app/api/trigger/hello/route.ts` to enqueue Trigger tasks without long-running API work.
    - Added Trigger CLI scripts in `package.json`:
      - `pnpm trigger:dev`
      - `pnpm trigger:deploy`
    - Added Trigger.dev usage notes and local test command to `README.md`.

- Feature spec `01-design-system.md` completed:
    - shadcn/ui installed and configured
    - Required primitives added (`Button`, `Card`, `Dialog`, `Input`, `Tabs`, `Textarea`, `ScrollArea`)
    - `lucide-react` installed
    - Shared `cn()` utility available in `lib/utils.ts`
    - Dark-only theme tokens aligned in `app/globals.css`
- Feature spec `02-editor.md` completed:
    - Added `components/editor/editor-navbar.tsx`
    - Added `components/editor/project-sidebar.tsx`
    - Added `components/editor/editor-dialog-shell.tsx` for reusable dialog title/description/footer pattern
    - Added `components/editor/editor-shell.tsx` and integrated it in `app/page.tsx`
- Feature spec `03-auth.md` completed:
    - Wrapped root layout in `ClerkProvider` with `@clerk/ui/themes` `dark` base theme and CSS-variable appearance overrides
    - Added `proxy.ts` route protection using Clerk middleware, with auth pages as public routes and all other routes protected
    - Added Clerk auth route group with shared layout:
      - `app/(auth)/layout.tsx` for two-panel desktop layout and form-only mobile layout
      - `app/(auth)/sign-in/[[...sign-in]]/page.tsx`
      - `app/(auth)/sign-up/[[...sign-up]]/page.tsx`
    - Updated `/` behavior to redirect authenticated users to `/editor` and unauthenticated users to `/sign-in`
    - Added `app/editor/page.tsx` and moved editor shell rendering there
    - Added Clerk `UserButton` to the editor navbar right section
- Feature spec `04-project-dialogs.md` completed:
    - Added editor home center content in `/editor` with:
      - Heading: `Create a project or open an existing one`
      - Description: `Start a new architecture workspace, or choose a project from the sidebar.`
      - `New Project` button with `Plus` icon wired to open Create Project dialog
    - Added `hooks/use-project-dialogs.ts` dedicated hook for:
      - Dialog state (`create`, `rename`, `delete`)
      - Form state (`projectName` + live slug preview)
      - Loading state (`isLoading`) with `finally` blocks and simulated async work for visibility
      - Mock project data and create/rename/delete in-memory behavior (no API or persistence)
    - Added `components/editor/project-dialogs.tsx` implementing:
      - Create Project dialog with live slug preview
      - Rename Project dialog with prefilled input, current project name in description, auto-focus, and Enter submit
      - Delete Project dialog with destructive confirmation only and destructive confirm button
    - Updated `components/editor/project-sidebar.tsx` to add:
      - Project item rename/delete actions for owned projects only
      - No actions for shared/collaborator projects
      - Mobile backdrop scrim and tap-outside-to-close behavior
      - Sidebar `New Project` wired to Create dialog
- Feature spec `05-prisma.md` completed:
    - Added Prisma project models in `prisma/models/project.prisma`:
      - `Project` with owner mapping (`ownerId`), name, optional description, `ProjectStatus` enum (`DRAFT`, `ARCHIVED`), optional `canvasJsonPath`, timestamps, and indexes on owner and creation date
      - `ProjectCollaborator` with project relation, cascade delete, collaborator email, created timestamp, unique constraint on project/email, and required indexes
    - Added cached Prisma singleton in `lib/prisma.ts`:
      - Uses Accelerate path when `DATABASE_URL` starts with `prism+postgres://`
      - Uses direct `@prisma/adapter-pg` path otherwise
      - Caches instance on `globalThis` in development to avoid hot-reload client churn
    - Created and applied initial migration:
      - `prisma/migrations/20260503143051_init_project_models/migration.sql`
    - Regenerated Prisma client in `app/generated/prisma`
- Feature spec `06-project-apis.md` completed:
    - Added backend project API routes:
      - `GET /api/projects` in `app/api/projects/route.ts` to list current user's owned projects
      - `POST /api/projects` in `app/api/projects/route.ts` to create a project using Clerk `userId` as `ownerId`
      - `PATCH /api/projects/[projectId]` in `app/api/projects/[projectId]/route.ts` to rename project (owner-only)
      - `DELETE /api/projects/[projectId]` in `app/api/projects/[projectId]/route.ts` to delete project (owner-only)
    - Enforced auth and ownership behaviors:
      - Unauthenticated requests return `401` with `{ error: "Unauthorized" }`
      - Non-owner rename/delete requests return `403` with `{ error: "Forbidden" }`
    - Applied create/rename name defaulting:
      - Missing/blank `name` resolves to `Untitled Project`
- Feature spec `07-wire-editor-home.md` completed:
    - Wired editor home initial project lists to real server-side data in `app/editor/page.tsx`:
      - Uses Clerk auth server-side
      - Fetches owned and shared projects via project data helper
      - Passes both lists into editor sidebar wiring (no client-side initial fetch)
    - Added server project data helper in `lib/project-data.ts`:
      - Returns owned and shared sidebar project lists
      - Shared projects are resolved via `ProjectCollaborator.collaboratorEmail`
    - Added `hooks/use-project-actions.ts` for dialog state + API mutations:
      - Create:
        - Manages create dialog state and project name input
        - Generates short unique suffix and slug-based room ID preview
        - Calls `POST /api/projects`
        - Navigates to new workspace route after success
      - Rename:
        - Stores target project id + current name
        - Calls `PATCH /api/projects/[id]`
        - Refreshes on success
      - Delete:
        - Stores target project
        - Calls `DELETE /api/projects/[id]`
        - Redirects to `/editor` when deleting active workspace
        - Otherwise refreshes
    - Updated component wiring:
      - `components/editor/editor-shell.tsx` now consumes server-provided project lists and the new hook
      - `components/editor/project-sidebar.tsx` now renders real `roomId` values
      - `components/editor/project-dialogs.tsx` now shows room ID preview and preserves rename/delete dialog behavior
    - Updated create API to keep project ID aligned with room ID when provided:
      - `app/api/projects/route.ts` accepts optional `id` from request body and persists it
- Feature spec `08-editor-workspace-shell.md` completed:
    - Added `lib/project-access.ts` with server-side access helpers:
      - `getCurrentIdentity()` for Clerk `userId` + primary email
      - `getAccessibleProject()` for owner/collaborator project access validation
    - Added `components/editor/access-denied.tsx` for unauthorized/missing workspace access states
    - Added `components/editor/editor-workspace-shell.tsx`:
      - Full-viewport workspace shell
      - Top navbar with project name, share placeholder, and AI sidebar toggle
      - Left `ProjectSidebar`, center canvas placeholder, and right AI sidebar placeholder
    - Updated `app/editor/[projectId]/page.tsx`:
      - Redirects unauthenticated users to `/sign-in`
      - Renders `AccessDenied` for missing or unauthorized projects
      - Renders workspace shell with active project context
    - Updated `components/editor/project-sidebar.tsx`:
      - Added project navigation links to `/editor/{roomId}`
      - Added active project highlighting support
    - Removed obsolete `canAccessProject()` from `lib/project-data.ts` (replaced by `lib/project-access.ts`)
- Feature spec `09-share-dialog.md` completed:
    - Added collaborator API endpoints:
      - `GET /api/projects/[projectId]/collaborators` for listing collaborators with access checks
      - `POST /api/projects/[projectId]/collaborators` for owner-only invites by email
      - `DELETE /api/projects/[projectId]/collaborators/[collaboratorId]` for owner-only removal
    - Enforced server-side access and ownership:
      - Workspace owner or collaborator can list collaborators
      - Only owner can invite and remove collaborators
    - Added Clerk backend enrichment for collaborator display:
      - Resolves collaborator email to display name and avatar when Clerk user exists
      - Falls back to email-only display when no Clerk user is found
    - Added share dialog UI in `components/editor/share-dialog.tsx`:
      - Invite by email (owner only)
      - Collaborator list with avatars/names when available
      - Remove collaborator action (owner only)
      - Copy workspace link with temporary `Copied!` feedback
    - Wired share dialog into workspace shell:
      - `Share` button in navbar now opens dialog
      - Collaborators get read-only view of collaborator list
    - Updated `lib/project-access.ts`:
      - `AccessibleProject` now includes `isOwner` role context
- Feature spec `11-base-canvas.md` completed:
    - Added shared canvas types in `types/canvas.ts`:
      - `CanvasNodeData` with `label`, `color`, `shape` fields
      - `CanvasEdgeData` typed as generic record
      - `CANVAS_NODE_TYPE` and `CANVAS_EDGE_TYPE` constants
      - `CanvasNode` and `CanvasEdge` fully-typed React Flow node/edge aliases
    - Added `components/editor/canvas-wrapper.tsx`:
      - `LiveblocksProvider` pointing to `/api/liveblocks-auth`
      - `RoomProvider` scoped to the current project ID
      - Initial presence: `cursor: null`, `isThinking: false`
      - `ClientSideSuspense` with "Connecting to canvas…" loading state
      - Inline `CanvasErrorBoundary` class for connection failure fallback
    - Added `components/editor/canvas-flow.tsx`:
      - Uses `useLiveblocksFlow` with `suspense: true`, empty initial nodes and edges
      - `ReactFlow` wired with synced nodes, edges, and change handlers
      - `ConnectionMode.Loose` connection behavior
      - `fitView` enabled
      - `MiniMap` rendered bottom-right with accent color
      - Dot-pattern `Background` using `--border-default` token
      - `Cursors` component for live peer cursors
    - Updated `components/editor/editor-workspace-shell.tsx`:
      - Replaced canvas placeholder section with `<CanvasWrapper roomId={projectId} />`
    - Updated `app/globals.css`:
      - Added `@xyflow/react/dist/style.css`, `@liveblocks/react-ui/styles.css`, and `@liveblocks/react-flow/styles.css` imports

- Feature spec `12-shape-panel.md` completed:
    - Added `CanvasShape` union type and `SHAPE_DEFAULTS` map to `types/canvas.ts`
    - Added `components/editor/canvas-node.tsx`:
      - Custom node renderer (`CanvasNodeComponent`) registered under `CANVAS_NODE_TYPE`
      - Renders every shape as a bordered rectangle with a centered label
      - `selected` state reflected via accent-colored border
      - Four connection handles (Top, Bottom, Left, Right)
    - Added `components/editor/shape-panel.tsx`:
      - Floating pill-shaped toolbar positioned `bottom-6`, centered over the canvas
      - Six draggable icon buttons: Rectangle, Circle, Diamond, Pill, Cylinder, Hexagon
      - Drag payload (`ShapeDragPayload`) serialised to `application/ghost-shape` MIME type with shape name and default dimensions
    - Updated `components/editor/canvas-flow.tsx`:
      - Registered `nodeTypes` map with `CANVAS_NODE_TYPE → CanvasNodeComponent`
      - Added `handleDragOver` to allow drops
      - Added `handleDrop` to read shape payload, convert screen→flow coordinates via `screenToFlowPosition`, center node on drop point, and call `addNodes`
      - Node ID generated from `{shape}-{Date.now()}-{counter}`
      - `ShapePanel` rendered as absolute overlay inside the canvas `div`


- Feature spec `13-node-shape.md` completed:
    - Replaced CSS clip-path diamond/hexagon rendering with SVG `<polygon>` elements that scale exactly with node width/height.
    - Replaced CSS border-radius cylinder with SVG `<rect>` + two `<ellipse>` caps, also scaling with node dimensions.
    - Rectangle, circle, and pill continue to use CSS border-radius as before.
    - Border color transitions: `--border-default` at rest → `--accent-primary` when selected.
    - Added `ShapeGhostPreview` to `shape-panel.tsx`:
        - Suppresses the browser native drag image (transparent 1×1 off-screen div).
        - Tracks `mousemove` during drag to keep a fixed-position ghost centered on the cursor.
        - Ghost shape matches the dragged shape type and default dimensions via CSS / inline SVG data URI.
        - Preview is destroyed on `dragend` (drop or cancel).
    - Collaborative canvas state unchanged; no changes to `canvas-flow.tsx` or `canvas-wrapper.tsx`.

- Feature spec `14-node-editing.md` completed:
    - Added `LabelEditor` overlay component (absolute-positioned, `nodrag nopan`, `textarea`).
    - Double-clicking any node label area enters edit mode and auto-focuses the textarea.
    - Label updates on every keystroke via `setNodes` — propagated through `useLiveblocksFlow` to the shared collaborative state.
    - Editing closes on `blur` or `Escape`; `mousedown` is stopped from bubbling to prevent canvas drag/pan while the textarea is active.
    - SVG-based shapes (diamond, hexagon, cylinder) hide their `<text>` element while editing to prevent overlap with the textarea.
    - CSS-based shapes (rectangle, circle, pill) hide the label `<span>` while editing.
    - `NodeResizer` is hidden during edit mode to reduce visual noise.
    - Dimension hover inputs are suppressed while editing.
    - Shape rendering and panel are unchanged (scope limit honored).

- Feature spec `15-nodes-color-toolbar.md` completed:
    - Added `NodeColorPair` interface and `NODE_COLOR_PALETTE` (8 dark bg / vivid text pairs) to `types/canvas.ts`.
    - Added `textColor?: string` to `CanvasNodeData` to store the paired text color alongside the background.
    - Added `NodeColorToolbar` component in `canvas-node.tsx`:
        - Floating pill above selected node (`bottom: calc(100% + 10px)`, `left: 50%`, `translateX(-50%)`).
        - One circular swatch per palette entry showing its `bg` color.
        - Active swatch has a `text`-colored border + outline; hover shows a tight `box-shadow` ring using the swatch's text color at 33% opacity.
        - `nodrag nopan` class and `onMouseDown` stop-propagation prevent drag/pan interference.
    - SVG shape renderers (diamond, hexagon, cylinder) now accept `fillColor` and `nodeTextColor` props and use them instead of hardcoded `var(--bg-surface)` / `var(--text-primary)`.
    - CSS shape renderer (`getCssShapeStyle`) now takes a `fillColor` argument; background transitions smoothly with `0.15s ease`.
    - Swatch click calls `setNodes` to update both `data.color` (bg) and `data.textColor` on the node — all within the existing `useLiveblocksFlow` collaborative state, no server calls.

- Feature spec `16-edge-behavior.md` completed:
    - Added `components/editor/canvas-edge.tsx`:
        - `CanvasEdgeComponent` using `getSmoothStepPath` for right-angle routing.
        - `BaseEdge` for the visible path; stroke is `#52525b` at rest and `var(--accent-primary)` on hover/selection with `0.15s ease` transition.
        - Dual SVG marker defs (`canvas-arrow-rest` / `canvas-arrow-active`) defined via `CanvasEdgeMarkerDefs` component; arrowhead colour tracks active state.
        - Wide transparent hit path (`strokeWidth: 18`) above the visible path for easy hover/click; `cursor: pointer` on hover.
        - Inline collaborative label via `EdgeLabelRenderer`:
            - Read-only badge (hidden when no label) with `nodrag nopan` class.
            - Double-click on badge or invisible path enters edit mode.
            - Auto-focus + select-all on mount.
            - Auto-growing input width via `measureInputWidth` formula.
            - Commit on `Enter` or `blur`; discard on `Escape`.
            - Saves via `setEdges` — propagated through `useLiveblocksFlow` with no server calls.
    - Updated `types/canvas.ts`:
        - `CanvasEdgeData` is now an `interface` with `label?: string`.
    - Updated `components/editor/canvas-flow.tsx`:
        - Registered `CanvasEdgeComponent` in `edgeTypes` map under `CANVAS_EDGE_TYPE`.
        - `defaultEdgeOptions` set to `{ type: CANVAS_EDGE_TYPE }`.
        - `connectionLineType` switched to `ConnectionLineType.SmoothStep`.
        - `CanvasEdgeMarkerDefs` rendered inside canvas wrapper.
    - Updated `components/editor/canvas-node.tsx`:
        - `HANDLE_STYLE_BASE` updated to `7×7` white dot (`var(--text-primary)`) with `1px solid var(--bg-surface)` border.

- Feature spec `17-canvas-ergonomics.md` completed:
    - Updated `types/canvas.ts`:
        - Expanded `CanvasEdgeData` with `arrowDirection`, `color`, `colorId`, `bold`, `italic`, `fontSize` fields.
    - Added `hooks/use-keyboard-shortcuts.ts`:
        - Global `keydown` listener on `window` for zoom (`+`/`=`/`-`) and history (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl/Cmd+Y`) shortcuts.
        - Typing-protection guard: all hotkeys suppressed when focus is inside `input`, `textarea`, or `contenteditable` elements.
        - Event listener removed on unmount; no third-party hotkey packages used.
    - Added `components/editor/canvas-control-bar.tsx`:
        - Floating pill at `bottom-6 left-6 z-10` with `bg-[var(--bg-surface)]` + border + `shadow-lg`.
        - Group 1: ZoomOut, FitView (Maximize icon), ZoomIn — each calls React Flow API with `duration: 300`.
        - Thin `1px` vertical divider separating groups.
        - Group 2: Undo (`Undo2`) and Redo (`Redo2`) wired to Liveblocks `useUndo`/`useRedo`; disabled + dimmed (`opacity: 0.4`) when `useCanUndo`/`useCanRedo` is false.
    - Updated `components/editor/canvas-edge.tsx`:
        - `CanvasEdgeMarkerDefs` now generates rest+active marker pairs for **every** `NODE_COLOR_PALETTE` entry (using `pair.text` as fill) plus the default pair.
        - Stroke color resolves `data.color` → vivid active accent → rest gray.
        - `markerStart` / `markerEnd` computed from `data.arrowDirection` (defaults to `"forward"`).
        - Marker IDs include palette `colorId` so arrowheads always match the stroke color.
        - `EdgeLabel` now forwards `bold`, `italic`, `fontSize` to both read-only badge and edit input.
        - New `EdgeToolbar` component visible when edge is `selected` and not in label-edit mode:
            - Arrow direction: None / Forward / Backward / Bidirectional buttons.
            - Typography: Bold and Italic toggle buttons.
            - Color swatches: 8-entry palette matching node swatches; clicking sets `data.color` + `data.colorId`.
            - `nodrag nopan` + `onMouseDown` stop-propagation prevent canvas interference.
    - Updated `components/editor/canvas-flow.tsx`:
        - Imports `CanvasControlBar` and mounts it as an overlay inside the canvas `div`.
        - Calls `useKeyboardShortcuts` with `zoomIn`, `zoomOut`, `undo`, `redo` from React Flow + Liveblocks.
        - Added `deleteKeyCode={["Backspace", "Delete"]}` to `<ReactFlow>` for native keyboard deletion.
- Feature spec `18-starter-template.md` completed:
    - Added `components/editor/starter-templates.ts`:
      - Introduced `CanvasTemplate` interface (`id`, `name`, `description`, `nodes`, `edges`).
      - Added `createTemplateNode(id, label, x, y, shape, colorId)` helper that resolves `bg`/`text` from `NODE_COLOR_PALETTE`.
      - Added `CANVAS_TEMPLATES` with three starter patterns:
        - Microservices Architecture (gateway, auth/user/order services, shared database)
        - CI/CD Pipeline (source control through production deployment)
        - Event-Driven System (producer, bus/topic, multiple consumers)
      - Enforced `type: CANVAS_NODE_TYPE` for nodes and `type: CANVAS_EDGE_TYPE` for edges in template definitions.
    - Added `components/editor/starter-templates-modal.tsx`:
      - `StarterTemplatesModal` with props `open`, `onOpenChange`, `onImport(template)`, and `templates`.
      - Dialog content uses `EditorDialogShell` + `ScrollArea` with `grid-cols-1 md:grid-cols-2` template cards.
      - Added import safety warning noting current canvas will be cleared.
      - Added lightweight template preview renderer:
        - Computes node bounding box
        - Scales and centers content in fixed `aspect-video` viewport
        - Renders nodes as styled `div`s by shape/color
        - Renders edges as simple SVG lines between node centers
    - Updated `components/editor/canvas-control-bar.tsx`:
      - Added `onOpenTemplates` prop.
      - Added `Templates` control button with `LayoutTemplate` icon.
    - Updated `components/editor/canvas-flow.tsx`:
      - Added modal state and mounted `StarterTemplatesModal`.
      - Wired `CanvasControlBar` templates trigger.
      - Implemented template import flow:
        - Generates timestamp-prefixed IDs for imported nodes/edges
        - Rewrites edge source/target with remapped node IDs
        - Clears existing graph via `onDelete({ nodes, edges })`
        - Adds imported nodes/edges via `onNodesChange`/`onEdgesChange` add changes
        - Calls `fitView({ duration: 800 })` after import
- Feature spec `21-canvas-autosave.md` completed:
    - Added `@vercel/blob` dependency for object-storage backed canvas snapshots.
    - Added `app/api/projects/[projectId]/canvas/route.ts`:
      - `PUT /api/projects/[projectId]/canvas` validates canvas payload shape (`nodes`/`edges` arrays with required node/edge fields), verifies auth + project access, uploads JSON to Vercel Blob, persists blob URL to `Project.canvasJsonPath`, and best-effort deletes the previous blob URL.
      - `GET /api/projects/[projectId]/canvas` verifies auth + access, resolves `canvasJsonPath` from Prisma, fetches blob JSON when present, validates payload, and falls back to `{ nodes: [], edges: [] }` when missing/invalid/unreachable.
    - Added `hooks/use-canvas-autosave.ts`:
      - Debounced autosave (~2.5s) for canvas state changes.
      - Retry logic (up to 3 attempts) on failed saves.
      - `beforeunload` protection with `keepalive` save attempt and unsaved-changes warning.
      - Exposes sync status union: `idle | saving | saved | error`.
    - Updated `components/editor/canvas-flow.tsx`:
      - On first mount, loads saved canvas from `GET` only when the Liveblocks room is empty.
      - Skips blob load when room already contains collaborative state.
      - Wires autosave hook and propagates save status to parent shell.
    - Updated `components/editor/canvas-wrapper.tsx` and `components/editor/editor-workspace-shell.tsx`:
      - Passed autosave capability/status props through wrapper.
      - Enabled autosave only for project owners to avoid multi-user simultaneous blob uploads.
      - Added top-bar save status indicator (`Saving...`, `Saved`, `Save failed`, `View only`).
    - Updated `app/editor/[projectId]/page.tsx`:
      - Passes project `isOwner` into workspace shell for autosave coordination.

- Added three route shells (structure only, no feature logic):
    - `app/(app)/dashboard/page.tsx` -> `/dashboard`: authenticated landing, placeholder for the
      future project management area.
    - `app/(marketing)/landing/page.tsx` -> `/landing`: public marketing landing page.
    - `app/(marketing)/docs/page.tsx` -> `/docs`: public (non-private) docs page.
    - All three are server components with placeholder markup only. No auth checks, no route
      protection, and no navigation wiring were added; `app/page.tsx` still redirects signed-in
      users to `/editor` and everyone else to `/sign-in`.
    - Route groups `(app)` and `(marketing)` carry no layout files yet, so they do not affect URLs.
    - Validation checks: `pnpm typecheck` and `pnpm lint` passed.


## Next Up

- Select and implement the next available feature spec unit after `22-design-agent-api.md`.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- shadcn/ui over Tailwind v4 (CSS-based token config via @theme inline in global.css, no tailwind.config.js)
- Dark-only theme: all shadcn :root variables set to dark values directly - no .dark class switching.
- Do not modify generated components/ui/* files after shadcn installation.
- Route protection baseline uses `proxy.ts` (Next.js 16 convention) with Clerk middleware and public auth path exceptions.

## Session Notes

- Implemented and validated `01-design-system.md` on 2026-05-02.
- Validation checks passed:
    - `pnpm lint`
    - `pnpm build`
- Implemented `02-editor.md` on 2026-05-03.
- Validation checks:
    - `pnpm lint` passed
    - `pnpm build` blocked in current environment due to `EPERM` on `.next/trace`
- Implemented `03-auth.md` on 2026-05-03.
- Validation checks for `03-auth.md`:
    - `pnpm lint` passed
    - `pnpm build` passed
- Post-implementation adjustment for `03-auth.md`:
    - Replaced component-level auth wrapper with an App Router `(auth)` route group layout to guarantee shared two-panel auth page structure.
    - Added targeted Clerk social auth button appearance overrides to restore readable contrast for GitHub/Google actions in dark theme.
    - Refined auth left panel visual style to match the requested step-card hero composition while preserving existing copy and token-based theming.
    - Adjusted auth split layout to true 50/50 panel proportions and centered right-side form container on both axes.
- Implemented `04-project-dialogs.md` on 2026-05-03.
- Validation checks for `04-project-dialogs.md`:
    - `pnpm lint` passed
    - `pnpm exec tsc --noEmit` passed
- Applied post-spec UI adjustments from `context/current-issues.md` on 2026-05-03:
    - Ensured editor home heading/description/button remain centered using a viewport-aware content height in editor home section.
    - Added pointer cursor behavior to shared button primitive so buttons show pointer on hover consistently.
    - Introduced root `hooks/` folder and moved project dialog hook to `hooks/use-project-dialogs.ts` (left compatibility re-export at `components/editor/use-project-dialogs.ts`).
- Implemented `05-prisma.md` on 2026-05-03.
- Validation checks for `05-prisma.md`:
    - `pnpm prisma migrate dev --name init_project_models` passed
    - `pnpm prisma generate` passed
    - `pnpm build` passed
- Implemented `06-project-apis.md` on 2026-05-11.
- Validation checks for `06-project-apis.md`:
    - `pnpm build` failed in current environment due to `EPERM` on `.next/trace`
- Applied post-spec build/typecheck fixes from `context/current-issuse.md` on 2026-05-11:
    - Fixed Prisma client typing in `lib/prisma.ts` to avoid union-call signature failures in route handlers when using Accelerate extension branch.
    - Added `typecheck` script to `package.json` (`tsc --noEmit`) for parity with `lint` and `build`.
    - Updated CI type-check step in `.github/workflows/ci.yml` to run `pnpm typecheck`.
    - Validation checks:
      - `pnpm typecheck` passed
- Feature spec `19-presence-avatars-cursor.md` completed:
    - Updated `liveblocks.config.ts` presence and user metadata:
      - Presence now uses `cursor` and `thinking`
      - User metadata now includes `{ id, info: { id, name, avatar, color } }`
    - Updated `app/api/liveblocks-auth/route.ts` session user info payload to `{ id, name, avatar, color }`
    - Updated `components/editor/canvas-wrapper.tsx` initial presence to `thinking: false`
    - Added `components/ui/avatar.tsx` with Avatar primitives for image/fallback rendering
    - Added `components/editor/canvas-presence.tsx`:
      - Canvas-only top-right participant overlay (not navbar/global)
      - Collaborator avatars from `useOthers()` excluding current Clerk user from `useUser()`
      - Up to 5 overlapping avatars plus `+N` overflow chip
      - Divider shown only when collaborators exist
      - Current user rendered separately with Clerk `UserButton` (`h-8 w-8`)
      - Custom live cursors for other participants with colored pointer + name badge
    - Updated `components/editor/canvas-flow.tsx`:
      - Broadcasts cursor using wrapper `onPointerMove` + `screenToFlowPosition` + `useUpdateMyPresence`
      - Clears cursor on `onPointerLeave`
      - Replaced default Liveblocks cursors with the custom cursor renderer
      - Mounted the participant avatar overlay on top of the canvas
- Implemented `07-wire-editor-home.md` on 2026-05-11.
- Validation checks for `07-wire-editor-home.md`:
    - `pnpm typecheck` passed
    - `pnpm lint` passed
    - `pnpm build` failed in current environment due to `EPERM` on `.next/trace`
- Applied workspace-route fix on 2026-05-11:
    - Added missing dynamic route `app/editor/[projectId]/page.tsx` so post-create navigation to `/editor/{projectId}` resolves instead of 404.
    - Added `canAccessProject()` in `lib/project-data.ts` and enforced workspace access before rendering.
    - Validation checks:
      - `pnpm typecheck` passed
      - `pnpm lint` passed
- Implemented `08-editor-workspace-shell.md` on 2026-05-11.
- Implemented `09-share-dialog.md` on 2026-05-11.
- Validation checks for `09-share-dialog.md`:
    - `pnpm typecheck` passed
    - `pnpm lint` passed
    - `pnpm build` failed in current environment due to `EPERM` on `.next/trace`
- Implemented `10-liveblocks-setup.md` on 2026-05-12.
    - Installed `@liveblocks/node` package.
    - Updated `liveblocks.config.ts`:
      - `Presence` typed with `cursor: { x: number; y: number } | null` and `isThinking: boolean`
      - `UserMeta.info` typed with `name`, `avatar`, and `cursorColor`
    - Added `lib/liveblocks.ts`:
      - Cached `Liveblocks` node client singleton (via `globalThis`) to survive Next.js hot-reload
      - `getCursorColor(userId)` helper — deterministic hash maps any user ID to one of 8 fixed palette colors
    - Added `app/api/liveblocks-auth/route.ts` (`POST /api/liveblocks-auth`):
      - Requires Clerk authentication (401 if not signed in)
      - Parses project ID as room from request body (400 if missing)
      - Verifies owner/collaborator access via `getAccessibleProject` (403 if denied)
      - Idempotently creates the Liveblocks room via `getOrCreateRoom`
      - Returns an access-token session with user name, avatar, and cursor color
    - Added `LIVEBLOCKS_SECRET_KEY` slot to `.env.local` (must be filled from Liveblocks dashboard)
- Validation checks for `10-liveblocks-setup.md`:
    - `pnpm typecheck` passed
    - `pnpm lint` passed
- Implemented `12-shape-panel.md` on 2026-05-12.
- Validation checks for `12-shape-panel.md`:
    - `pnpm typecheck` passed
    - `pnpm build` passed
- Applied canvas UI fixes from `context/current-issuse.md` on 2026-05-12:
    - Issue 1 (shape visuals): `canvas-node.tsx` now renders each shape using its correct CSS form:
      - Rectangle: `border-radius: 6px`
      - Circle: `border-radius: 50%`
      - Pill: `border-radius: 9999px`
      - Cylinder: `border-radius: 50% / 15%`
      - Diamond: `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)` with filled inner layer
      - Hexagon: `clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)` with filled inner layer
    - Issue 2 (curved edges): added `connectionLineType={ConnectionLineType.Bezier}` and `defaultEdgeOptions={{ type: "default" }}` to `<ReactFlow>` so all connections render as bezier curves
    - Issue 3 (connection direction): replaced single-type handles with stacked source+target handles at every cardinal position (Top, Right, Bottom, Left) so drag direction always matches the resulting edge direction
    - Issue 4 (resize + dimension labels): added `<NodeResizer>` for drag-to-resize; added `<DimInput>` components that show width/height pixel inputs on node hover, hidden otherwise; reduced `SHAPE_DEFAULTS` sizes by ~25%
    - Validation checks:
        - `pnpm typecheck` passed
        - `pnpm build` passed
- Implemented `13-node-shape.md` on 2026-05-12.
- Validation checks for `13-node-shape.md`:
    - `pnpm build` passed (TypeScript + static page generation)
- Implemented `14-node-editing.md` on 2026-05-12.
- Validation checks for `14-node-editing.md`:
    - `pnpm build` passed (TypeScript + static page generation, exit code 0)
- Implemented `16-edge-behavior.md` on 2026-05-13.
- Validation checks for `16-edge-behavior.md`:
    - `pnpm typecheck` passed
    - `pnpm build` passed (exit code 0)
- Implemented `17-canvas-ergonomics.md` on 2026-05-13.
- Validation checks for `17-canvas-ergonomics.md`:
    - `pnpm typecheck` passed
    - `pnpm build` passed (exit code 0)
- Implemented `18-starter-template.md` on 2026-05-13.
- Validation checks for `18-starter-template.md`:
    - `pnpm typecheck` passed
- Applied starter template modal UI layout refinements on 2026-05-13:
    - Increased starter template dialog width to a wide viewport-friendly layout (`min(92vw, 1200px)`).
    - Switched template cards from wrapping grid to a single parallel horizontal row with fixed-width cards and horizontal scrolling.
    - Added optional `contentClassName` support to `EditorDialogShell` so feature dialogs can control content width without modifying shared foundation UI.
    - Validation checks:
      - `pnpm typecheck` passed
- Adjusted starter template dialog overflow and layout behavior on 2026-05-13:
    - Increased dialog width further to `min(96vw, 1400px)` so template content fits within modal bounds.
    - Replaced horizontal scrolling row with responsive in-dialog grid (`1 / 2 / 3` columns by breakpoint) to keep cards parallel without spilling outside the dialog.
    - Kept card sizing unchanged while improving container behavior.
    - Validation checks:
      - `pnpm typecheck` passed
- Implemented `20-ai-sidebar-shell.md` on 2026-05-13.
    - Added `components/editor/ai-sidebar.tsx`:
      - Header with Bot icon, title/subtitle, and close action (`onClose`)
      - Tabs-based layout with `AI Architect` and `Specs` panels
      - Architect panel mock chat surface with empty-state prompt chips, sample user/assistant bubbles, and bottom composer UI (`Textarea` + Send button)
      - Specs panel with `Generate Spec` action, sample spec card, and disabled `Download` button
    - Updated `components/editor/editor-workspace-shell.tsx`:
      - Replaced inline AI placeholder with extracted `AiSidebar` component
      - Kept parent-controlled open/close state
      - Preserved right-side floating slide behavior using transform transitions within the canvas boundary
- Applied AI sidebar chat interaction fixes on 2026-05-13:
    - Updated `components/editor/ai-sidebar.tsx`:
      - Added local mock chat state so typed prompts append to the chat area.
      - Wired starter prompt chips to append as user messages when clicked.
      - Removed hardcoded sample conversation messages.
      - Composer behavior now supports `Enter` to send and `Shift+Enter` for newline.
      - Replaced text send CTA with icon-only circular send button and added helper text (`Enter to send, Shift+Enter for a new line`).
- Implemented `21-canvas-autosave.md` on 2026-05-13.
    - Installed `@vercel/blob`.
    - Added authenticated save/load canvas API at `app/api/projects/[projectId]/canvas/route.ts` with payload validation and blob URL persistence via `Project.canvasJsonPath`.
    - Added debounced autosave hook with retry and unload protection: `hooks/use-canvas-autosave.ts`.
    - Added initial blob-backed canvas hydration in `components/editor/canvas-flow.tsx`, guarded to only run when room state is empty.
    - Added owner-coordinated autosave and top-nav sync indicator in `components/editor/editor-workspace-shell.tsx`.
    - Validation checks:
      - `pnpm lint` passed
      - `pnpm typecheck` passed
- Applied canvas interaction and control-bar fixes from `context/current-issuse.md` on 2026-05-13:
    - Updated `components/editor/canvas-flow.tsx`:
      - Switched to selection-first interactions: `panOnDrag={false}`, `selectionOnDrag`, `panActivationKeyCode="Space"`.
      - Added Space-key cursor behavior so grab cursor appears only while Space is held.
      - Added minimap toggle state and conditional minimap rendering (`isMinimapOpen`, default `false`).
      - Wired minimap toggle and sidebar visibility props into the control bar.
    - Updated `components/editor/canvas-control-bar.tsx`:
      - Redesigned to rounded rectangle (`borderRadius: 12`) instead of pill.
      - Added contextual single-selection controls (node/edge color + text formatting) when exactly one item is selected.
      - Enforced multi-selection constraints: when more than one item is selected, only delete action appears (no formatting controls).
      - Added minimap show/hide toggle button in the left controls group.
      - Hides completely when project sidebar is open.
    - Updated `components/editor/editor-workspace-shell.tsx` and `components/editor/canvas-wrapper.tsx`:
      - Passed `isSidebarOpen` into canvas layers so the control bar can hide dynamically.
    - Updated `components/editor/canvas-node.tsx`:
      - Bound SVG shape render dimensions to live node props (`width`, `height`) so cylinder/diamond/hexagon redraw correctly during resize.
    - Validation checks:
      - `pnpm lint` passed
      - `pnpm typecheck` passed
- Applied canvas UI/UX enhancements from `context/current-issuse.md` on 2026-05-14:
    - Updated `components/editor/canvas-control-bar.tsx`:
      - Switched selected node/edge lookup to reactive `useNodes`/`useEdges` sources so formatting controls (including font size value) update immediately when edge/node data changes.
      - Updated edge arrow toggle default selection fallback from `forward` to `none`.
      - Updated active arrow toggle text color to `var(--text-primary)` token.
    - Updated `components/editor/canvas-flow.tsx`:
      - Set new connection defaults to `defaultEdgeOptions={{ type: CANVAS_EDGE_TYPE, data: { arrowDirection: "none" } }}` so new edges start without arrowheads.
    - Updated `components/editor/canvas-edge.tsx`:
      - Changed edge render fallback to `arrowDirection: "none"` when unset.
    - Updated `components/editor/canvas-node.tsx`:
      - Simplified the cylinder SVG back to a single-cylinder form (removed the middle band ellipse).
    - Updated `components/editor/canvas-flow.tsx`:
      - New nodes now default `textColor` and `strokeColor` to `var(--text-primary)` on creation.
    - Updated `types/canvas.ts`:
      - Reduced default shape sizes for newly created nodes.
    - Updated `components/editor/canvas-control-bar.tsx`:
      - Added edge style controls (solid, dashed, dotted) under the Arrow section.
    - Updated `components/editor/canvas-edge.tsx`:
      - Applied edge stroke style (solid, dashed, dotted) based on `data.edgeStyle`.
    - Updated `components/editor/canvas-flow.tsx`:
      - Default edge options now include `edgeStyle: "solid"`.
    - Updated `components/editor/starter-templates.ts`:
      - Starter template nodes now default `textColor` and `strokeColor` to `var(--text-primary)`.
    - Updated `components/editor/shape-panel.tsx` and `components/editor/canvas-flow.tsx`:
      - Added select/pan toggle buttons to the shape panel and wired them to React Flow pan/selection modes.
    - Updated app icons:
      - Added `app/icon.png` using the ghost logo and removed the invalid `app/favicon.ico`.
      - Center-cropped the logo to a square without resizing for `app/icon.png` and `app/apple-icon.png`.
    - Updated build pipeline for Prisma:
      - Removed `postinstall` Prisma generate and kept generation in the builder stage.
      - Removed schema/config copy from the Docker deps stage to keep installs pure.
    - Updated `components/editor/canvas-node.tsx`:
      - Replaced SVG text labels with `foreignObject`-based wrapped label containers for diamond/hexagon/cylinder so long labels stack and clip within node bounds.
      - Updated CSS-shape label style to multiline wrapping with bounded height and hidden overflow instead of single-line ellipsis.
      - Reworked cylinder renderer into a stacked database-style cylinder (top, middle, and bottom elliptical bands).
- Rolled back the Prisma-to-Supabase data-layer migration on 2026-09-11:
    - Two migration steps had been implemented and were reverted in full: the snake_case schema rename with database-side
      defaults, and the addition of the Supabase client (`@supabase/supabase-js`, the `supabase` CLI, `lib/supabase.ts`,
      `types/database.types.ts`, the Node 20 -> 22 bump, and the `SUPABASE_*` env vars).
    - Decision: Prisma stays the data layer. The database remains Supabase Postgres — that predates this work and is
      unchanged. Auth stays Clerk, real-time stays Liveblocks, blob storage stays Vercel Blob, so Supabase is used only
      as a Postgres host.
    - The database schema was rolled back to its original shape: `Project`, `ProjectCollaborator`, `TaskRun` with
      camelCase columns, the `ProjectStatus` enum, no database-side `id` or `updated_at` defaults, and the
      `moddatetime` trigger and extension removed. All three tables were empty, so no data was involved.
    - The `20260911120000_snake_case_schema_and_db_defaults` migration was removed from `prisma/migrations` and its row
      deleted from `_prisma_migrations`; the two original migrations are the full history again.
    - Also fixed a pre-existing lockfile mismatch on `main`: `pnpm-lock.yaml` recorded `@trigger.dev/react-hooks` as
      `^4.4.6` while `package.json` pins `4.4.6`, which made `pnpm install --frozen-lockfile` (what CI runs) fail.
    - Validation checks:
      - `prisma migrate status` reports 2 migrations and an up-to-date schema; `prisma migrate diff` reports no drift
      - Prisma create/update/delete verified against the restored schema: slug ids, client-side `cuid()` generation and
        `@updatedAt` all behave as before; test rows deleted
      - `pnpm lint`, `pnpm typecheck`, and `pnpm build` passed
- Fixed the production AI design generation break on 2026-09-11:
    - Symptom: prompting the AI in production returned nothing. Server log showed
      `TriggerApiError: No matching branch env` (401) from `tasks.trigger`. Local runs were unaffected.
    - Root cause: `@trigger.dev/core` resolves a preview branch from
      `previewBranch ?? TRIGGER_PREVIEW_BRANCH ?? VERCEL_GIT_COMMIT_REF` and attaches it as the
      `x-trigger-branch` header on every request. Vercel always sets `VERCEL_GIT_COMMIT_REF` (`main` on
      production deploys), so the deployed app sent a branch header that resolved against a preview
      secret key with no matching branch environment. Locally neither variable is set, so no header is
      sent and the `tr_dev_` key resolves against the dev environment.
    - Fix, part 1 (outside the repo): the production `TRIGGER_SECRET_KEY` on Vercel was replaced with a
      `tr_prod_` key.
    - Fix, part 2 — `.github/workflows/ci.yml`:
      - Added a `deploy-trigger` job that runs `pnpm exec trigger deploy` after `ci` passes, gated to
        pushes on `main` so pull requests never overwrite the prod deployment. Previously nothing in CI
        deployed tasks at all, so the prod environment had no deployed version of `design-agent`.
      - The job authenticates with `TRIGGER_ACCESS_TOKEN` (a `tr_pat_` Personal Access Token, which is a
        different credential from the runtime `TRIGGER_SECRET_KEY`) and must be added as a repo secret.
      - No `prisma generate` step: nothing under `src/trigger` imports the Prisma client.
    - Fix, part 3 — `app/api/ai/design/route.ts`:
      - Wrapped `tasks.trigger` in try/catch. The call was previously unguarded, so any Trigger.dev
        failure escaped as an unhandled 500 and the sidebar showed only a generic message. Failures now
        log server-side and return 502.
    - Fix, part 4 — `hooks/use-design-agent.ts`:
      - Added a 502 case to `describeRequestFailure` so an unreachable design service reads as such
        rather than falling through to the generic error. 502 was chosen over 401 deliberately: the
        hook maps 401 to "your session expired", which would misreport an infrastructure failure.
    - Validation checks:
      - `pnpm lint`, `pnpm typecheck`, and `pnpm build` passed
    - Open items:
      - `app/api/trigger/hello/route.ts` has the same unguarded `tasks.trigger` call. Left as is — it is
        a sample route outside this fix's scope.
      - `.claude/skills/trigger-setup/references/environment-setup.md` documents `TRIGGER_SECRET_KEY` for
        `trigger deploy` in CI, which is wrong (the CLI requires `TRIGGER_ACCESS_TOKEN`). It is vendored
        third-party skill content, so it was not edited.
- Built the non-auth marketing landing page on the Lab-site brand system (2026-09-12):
    - New `components/ui/marketing/` module, barrelled through `index.ts`. These components use only the
      brand tokens from `app/globals.css` — none of the product (dark zinc) tokens or the shadcn
      primitives in `components/ui/`, which stay themed for the app surface.
      - `marketing-navbar.tsx` (client) — floating Paper Bright card: Base UI `Menu` trigger on the left
        with Docs (`/docs`) and Login (`/sign-in`) link items, "Draftly" wordmark centred in Archivo, and
        a mono chrome "About" link on the right. Base UI was used rather than a hand-rolled popover so
        focus management and dismissal come for free.
      - `handwritten-note.tsx` — `HandwrittenNote` (cva variants over the four paper accents) and
        `HandwrittenAnnotation` (Caveat straight on the mat, no paper). Both clamp rotation to the ±8deg
        hard limit from the brand spec and are `aria-hidden`.
      - `pinned-photo.tsx` — hatched paper plate under a single Paper Pin Red push-pin.
      - `marketing-button.tsx` — `MarketingButton`, always a link (the landing page has no in-place
        actions). `solid` is the ink slab CTA with the spec's press physics; `quiet` is the mono
        secondary action with the one allowed pin-red underline.
      - `canvas-mockup.tsx` — mini-canvas as a paper object: fixed 460×260 coordinate space so the SVG
        Draft Blue connectors stay aligned to the percentage-positioned ink cards at any width; tilted
        -2deg, one amber sticky, one Caveat label.
    - `app/(marketing)/landing/page.tsx` composes them over a mat-green ground with the 32px/128px
      cutting-mat grid, hero (Archivo line 1 + Instrument Serif italic line 2), CTA pair, mini-canvas,
      and the mono ruler chrome footer. Craft objects sit outside the 640px centre column and are hidden
      below `md`/`lg` to respect the ≤3-object mobile budget.
    - `context/ui-context.md` gained a "Surfaces" section: the product and marketing systems are now
      documented as separate and non-mixable.
    - Validation checks:
      - `pnpm typecheck` and `pnpm lint` passed
      - `/landing` renders 200 on the dev server; the compiled Tailwind chunk was inspected to confirm
        the brand utilities (`text-hero-1`, `tracking-hero`, `shadow-flat`, `rounded-paper`, the paper
        accent colors) resolve to the `:root` brand values rather than the `@theme inline` placeholders
    - Open items:
      - The `#about` nav target does not exist yet — the landing page is hero-only so far.
      - Fonts still load via the `@import` CDN line at the top of `globals.css`; moving them to
        `next/font/google` in `app/layout.tsx` is still pending, as that file notes.
- Added the about-section groundwork to `components/ui/marketing/` (2026-09-12, not assembled into a page yet):
    - `rotation.ts` — `clampRotation`, the ±8deg object-physics limit, extracted out of
      `handwritten-note.tsx` and `pinned-photo.tsx`, which had duplicated it.
    - `paper-section.tsx` — `PaperSection`, the notebook-paper ground: 22px rule rhythm masked to fade at
      the sheet's top and bottom edges, one coral margin line, 3% SVG grain. The mat-to-paper hand-off is
      a cut edge (hairline plus a hard offset shadow cast upward), not a gradient — the dashed rule at the
      foot of the hero is ruler chrome on the mat and is not the seam.
    - `author-photo.tsx` — `AuthorPhoto`, the "that's me" plate. Held by a strip of marker-amber tape
      rather than a push-pin, because it sits on paper; Paper Pin Red stays reserved for the mat. Renders
      a hatched placeholder until a `src` is passed, then `next/image`.
    - `skill-pill.tsx` — `SkillPill`, a hand-cut accent strip. Renders `<li>`, so the assembled section
      needs a `<ul>`; accents are ink backgrounds only, never the label color.
    - Validation checks:
      - `pnpm typecheck` and `pnpm lint` passed; `/landing` still renders 200
    - Open items:
      - Nothing consumes these yet — the about section itself has not been laid out.
- Assembled the about section onto `/landing` over the paper ground (2026-09-12):
    - `app/(marketing)/landing/page.tsx` restructured into two stacked grounds: `<main>` now carries the
      paper-cream base, the hero lives in its own `overflow-hidden` mat section above it, and
      `PaperSection id="about"` follows. `#about` in the navbar now resolves.
    - The seam is a cut edge owned by the mat, not the sheet: the mat section sits at `z-10` and casts
      `0 5px 0` of hard offset shadow down onto the paper, with the sheet contributing only its top
      hairline. `paper-section.tsx` lost the upward shadow it had been given — against a dark mat it was
      invisible and it implied the wrong stacking order.
    - About content: Caveat section title, the Instrument Serif "what's up" label on a Paper Bright chip,
      a two-sentence intro, `AuthorPhoto` on the right, five `SkillPill` strips in a `<ul>`, and three
      Caveat contact links whose underline turns Paper Pin Red on hover. One red dot is the section's
      only signal.
    - Fixed a stray `]` in the hero footer's `gap-(--space-1)]` class.
    - Validation checks:
      - `pnpm typecheck` and `pnpm lint` passed; `/landing` renders 200 with the about markup present and
        no errors in the dev log
    - Open items:
      - About copy, the GitHub/Email hrefs, and the author photo are placeholders — `AuthorPhoto` renders
        its hatched plate until a real `src` is passed.
- Reworked the hero/about seam so the mini-canvas bridges both grounds (2026-09-12, `page.tsx` only):
    - The mini-canvas moved out of the hero flow and into the top of the about section, pulled up with a
      negative margin (`-mt-[60px]`, `md:-mt-[170px]`) so its upper half sits on the mat and the about
      content begins exactly where it ends.
    - Stacking flipped for the overlap: `PaperSection` is passed `z-20` (over the mat's `z-10`) so the
      overflowing canvas paints above the mat. The mat's `0 5px 0` seam shadow was removed — with the
      sheet now on top it could not be seen, and the wireframe's seam is the dashed rule instead.
    - One dashed line on the page: `PaperSection` is passed `border-dashed border-ink/30`, which
      tailwind-merge resolves against its own `border-t border-ink/25`. The hero footer lost its own
      dashed rule and keeps only the mono coords and the ruler squares, now at `--space-7` so the
      straddling canvas clears them.
    - The hero's "tiny live canvas" annotation went with the canvas; the seam carries "bridges both
      worlds" in ink-soft on the paper side, matching the wireframe.
    - Validation checks:
      - `pnpm typecheck` and `pnpm lint` passed; `/landing` renders 200 and the about section's merged
        class list confirms the single dashed seam
- Swapped the navbar menu for the D mark and rebuilt the app icons from it (2026-09-13):
    - `marketing-navbar.tsx`: the Base UI `Menu` (hamburger trigger + Docs/Login popup) was removed and the
      left slot now holds `public/Draftly Wordmark-selection (1).png` — the square green D mark — at the
      same `size-11` footprint, wrapped in a `/landing` link with an `aria-label` since the image is
      decorative. With no interactive primitive left, the file dropped `"use client"` and renders on the
      server.
    - `app/icon.png` and `app/apple-icon.png` are now generated from the same D mark rather than the
      Gemini-generated ghost. The rounding has to be baked into the pixels — a favicon is an image file,
      so CSS cannot round it — so both were rendered with `sharp` (already in the lockfile via Next's
      image optimizer) from the 168px source: `icon.png` is upscaled to 512 and masked with a rounded
      rect at a 35% corner radius, a squircle that reads as heavily rounded without collapsing into a
      circle; `apple-icon.png` is a flat 180px square, left unrounded because iOS applies its own mask
      and renders transparent corners black. The ghost source file is still in `public/` and is
      unreferenced.
    - Validation checks:
      - `tsc --noEmit` passed
    - Open items:
      - The Login (`/sign-in`) entry point disappeared with the menu; the hero's "Start creating" button
        and the about footer's Docs link are the only remaining routes off `/landing`.
      - The corner rounding is baked into `app/icon.png`, so re-deriving it from the source mark means
        re-running the `sharp` mask rather than editing a class.
- Set the navbar centre brand as the two-face wordmark lockup (2026-09-13, `marketing-navbar.tsx` only):
    - The centre link was a single Archivo string; it now splits into "Draft" in Archivo Bold with
      `tracking-brand-tight` and "ly" in Instrument Serif Italic, matching the brand sheet's primary
      wordmark. Set as text rather than placed as an image: the only wordmark asset in `public/` is a
      framed board with a "PRIMARY" caption baked into the artwork, and the two faces it is drawn from
      are already loaded — as text the lockup stays crisp at any density and inherits `text-ink`.
    - The lockup moved from 1.25rem to 1.5rem because Instrument Serif is never set below 24px. The two
      spans share one `text-[1.5rem] leading-none` parent and align on `items-baseline`, with `-ml-px`
      tucking the italic "l" against the "t" the way the sheet draws it. `aria-label="Draftly"` keeps it
      one word to a screen reader.
    - The D mark in the left slot is unchanged.
    - Validation checks:
      - `tsc --noEmit` and `eslint` passed; `/landing` renders 200 with the split lockup in the markup and
        the icons resolving as `icon.png` 512x512 and `apple-icon.png` 180x180
- Moved the auth layout onto the craft mat (2026-09-13, `app/(auth)/layout.tsx`):
    - The dark product split panel (Ghost icon, gradient, feature cards) was replaced with a full-bleed
      `bg-mat-green` ground and grid. The left column holds a large cream `DraftlyWordmark` with a small
      push-pin, the tagline "Draw the system, argue on the canvas, leave with a decision.", a mono chrome
      line, and a `CanvasMockup` ("payments · v3" / "retry here?") pinned to the bottom on `lg+`. The right
      column is a centred 520px slot for the Clerk `SignIn` / `SignUp` children, which are unchanged.
    - Shared pieces extracted into `components/ui/marketing/`: `DraftlyWordmark` (the navbar's centre
      lockup, now used by `MarketingNavbar` too) and `MatGrid` (the mat grid overlay, now used by
      `/landing` too). `CanvasMockup` gained optional `caption` and `annotation` props, defaulting to the
      landing copy.
    - `ui-context.md` now lists auth under the craft system rather than the product surface.
    - Open items:
      - The Clerk card itself still uses the dark product appearance from `app/layout.tsx`; the paper sheet
        (pin, rotation, GitHub/Google buttons, ink Continue button) is the next step.
- Replaced Clerk's prebuilt `<SignIn />` with a custom paper sign-in card (2026-09-13):
    - `components/auth/sign-in-card.tsx` (client) runs on the Core 3 `useSignIn()` API (`@clerk/nextjs` 7.3.0),
      so Clerk still owns sessions, verification and bot protection. Flow: email → `signIn.create` → password
      step when the account has a password factor, otherwise `emailCode.sendCode` → code step; then
      `needs_client_trust` / `needs_second_factor` are routed to an email/phone code or TOTP step; `complete`
      calls `finalize` with `decorateUrl` for Safari ITP. GitHub/Google go through `signIn.sso` to
      `/sign-in/sso-callback`, which renders `AuthenticateWithRedirectCallback` plus a `#clerk-captcha` mount
      for SSO transfers into sign-up.
    - `redirect_url` is read on the server in `sign-in/[[...sign-in]]/page.tsx` and only honoured when it
      resolves to the same origin; otherwise the fallback is `/`, which sends signed-in users to `/editor`.
    - Visuals follow the wireframe: pinned `paper-bright` sheet tilted 1deg, ink-bordered SSO buttons with mono
      GitHub/Google marks, amber "Last used" tag from `client.lastAuthenticationStrategy`, dashed OR rule, cream
      input, the solid `marketingButtonVariants` Continue slab, pin-red Sign up link, and a mono footer that shows
      "Development mode" only for `pk_test_` keys.
    - Validation checks:
      - `pnpm typecheck` and `eslint` passed; `/sign-in?redirect_url=/dashboard` and `/sign-in/sso-callback` render 200
    - Open items:
      - Not yet exercised end-to-end in a browser (email code, password, GitHub, Google).
      - Forgot-password and session tasks (e.g. forced org selection) are not handled by the custom card.
      - Sign-up still uses the prebuilt dark `<SignUp />`.
- Fixed the sign-in card rendering with no padding, margins or sizing (2026-09-13, `app/globals.css`):
    - Cause: none of the card's spacing/size utilities (`pt-(--space-6)`, `min-h-14`, `min-h-16`, the heading clamp)
      were in the served CSS, although a fresh Tailwind compile of `globals.css` produced all of them. Classes from
      existing files (auth layout, marketing navbar) were present; only the new `components/auth/` folder was missing.
      Next 16.1+ enables Turbopack's filesystem cache for `next dev` by default (`.next/dev/cache/turbopack`), and it
      reused a Tailwind scan from before that folder existed — even across a dev-server restart.
    - Fix: added `@source "../components";` after the `@import` block. Changing `globals.css` invalidated the cached
      result, and the explicit source keeps component folders in the scan. The served CSS picked up every card
      class without a restart.
    - If a new folder's classes are ever missing again: stop `pnpm dev`, delete `.next/dev/cache`, restart.
- Replaced Clerk's prebuilt `<SignUp />` with a custom paper sign-up card (2026-09-13):
    - `components/auth/sign-up-card.tsx` (client) runs on the Core 3 `useSignUp()` API against the instance's settings
      (email required and verified by email code, password required, first/last name optional, Turnstile bot
      protection, no legal consent). Flow: first name / last name / email → password step, where one
      `signUp.password({ emailAddress, password, firstName, lastName })` call creates the sign-up → emailed code via
      `verifications.sendEmailCode` / `verifyEmailCode` → `finalize`. Errors on email or name params (e.g. an address
      already in use) send the user back to the details step, read from the returned API error's `meta.paramName`
      because the hook's `errors` is stale inside the handler. GitHub/Google use `signUp.sso` to
      `/sign-up/sso-callback`, which re-exports the sign-in callback page. A `#clerk-captcha` mount stays in the card
      for every request.
    - Shared pieces moved into `components/auth/auth-card.tsx` (card shell with pin + footer, title lockup, SSO buttons,
      field, submit slab, OR divider, last-used tag, email chip, input classes, and the `toSafeDestination`,
      `navigateAfterAuth`, `withRedirect` helpers). `sign-in-card.tsx` now uses them with no behaviour change.
    - `sign-up/[[...sign-up]]/page.tsx` reads `redirect_url` on the server; both cards carry it across the
      Sign in / Sign up switch links.
    - Validation checks:
      - `pnpm typecheck` and `eslint` passed; `/sign-up?redirect_url=/dashboard`, `/sign-up/sso-callback` and `/sign-in`
        render 200 with the expected markup
    - Open items:
      - Not yet exercised end-to-end in a browser (email + password + code, GitHub, Google, existing-email error).
      - An email that already has an account shows Clerk's error on the details step rather than transferring to
        sign-in.
- Fixed two sign-up card bugs (2026-09-13, `components/auth/sign-up-card.tsx`, `sign-in-card.tsx`):
    - Password leaking into the verification-code field: the password and code step forms rendered at the same spot
      with the same element structure, so React reused the uncontrolled `<input>` DOM node and its typed value when
      the step changed. Every step form in both cards now has its own `key`, so each step mounts fresh inputs.
    - An email that already has an account reached the password step: the details step only advanced local state and
      Clerk wasn't asked until the password was submitted. Checked the instance: enumeration protection is off, and
      the one user with the reported address was created by this sign-up card (email-code verified, password set, no
      GitHub account linked). The details step now calls `signUp.create({ emailAddress, firstName, lastName })`, so
      Clerk's "email taken" error shows under the email field before the password step. The password step still sends
      the email and names with `signUp.password`.
- Removed first/last name from the sign-up card (2026-09-13, `components/auth/sign-up-card.tsx`):
    - Names are optional on the Clerk instance and unused by the app, so the details step now collects only the email.
      `signUp.create` and `signUp.password` send just the email (plus the password), and only `email_address` errors
      send the user back to the details step. Flow unchanged: email → password → emailed code → finalize.
