# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes

## Current Phase

- In Progress

## Current Goal

- Persistent, multi-turn AI design sessions (plan: storage → wire sessions → turn engine → UI cards → generation
  quality → docs). Steps 1 (storage, PR #21), 2 (sessions in the sidebar, PR #22) and 3 (clarify → plan → generate
  turn engine, PR #23) and 4 (question/plan/result cards, PR #25) are done; step 5 (generation quality: canvas
  context, roles and kickers, async edges, validate-and-repair, PR #26) and step 6 (docs, PR #27) are done.
- Generate Spec (unit G1) was reviewed in PR #28 and merged into its stacked base (`feat/ai-sessions-docs`).
- Repository note (2026-09-16): #25–#28 had been merged into stacked base branches instead of `main`, whose content
  was exactly step 3 (squash commits of #21–#23). #29 (step 4, `feat/ai-design-turn-engine` → `main`) conflicted with
  that squash history in 6 files; it was resolved with a merge commit that kept the branch content unchanged (no force
  push) and merged. Steps 5–6, the spec feature, and this tracker then went to `main` through a sync PR built the same
  way, so `main` holds all of the AI sessions and spec work.
- After that: the Specs tab (Generate Spec + automatic Markdown download), which remains inert.

## Completed

> Spec file references: the prompt files named below (`context/feature-specs/NN-*.md`,
> `context/fix/01-AI-sidebar-fix.md`, `context/current-issuse.md` / `current-issues.md`) were
> removed on 2026-09-15 after every unit shipped. The names are kept as labels. Restore an
> original with `git show f9711dc:<path>`; `docs.md` → Contributing → Spec index maps each unit
> to what it delivered.

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
- Added a loading state to the sign-in and sign-up submit buttons (2026-09-13, `components/auth/`):
    - `SubmitButton` takes `loading`: it disables, sets `aria-busy`, keeps full opacity with a wait cursor, and shows
      "Loading…" (a `role="status"` span) in place of Continue / Verify.
    - Both cards wrap each form submit in `withPending`, so `pending` covers the whole handler, including chained
      requests (create → send code, verify → finalize) that `fetchStatus` alone flickers between; repeat submits
      while loading are ignored. A `redirecting` flag is set before `finalize` and cleared only if it errors, so the
      button stays in "Loading…" until navigation lands. GitHub/Google and the quiet links stay disabled throughout.
- Served the landing page at `/` and fixed logout getting stuck (2026-09-13):
    - Cause: `UserButton` signs out to Clerk's default `/`, and `app/page.tsx` then called `redirect("/landing")` for
      signed-out visitors. That second server redirect ran during Clerk's client-side navigation while the session was
      clearing, so the page didn't move on until a manual reload.
    - `app/page.tsx` now renders the landing page component directly for signed-out visitors (imported from
      `app/(marketing)/landing/page.tsx`, which stays where it is for editing) and still redirects signed-in users to
      `/editor`. No second redirect is left on logout.
    - `/landing` redirects to `/` via a temporary (307) `redirects()` entry in `next.config.ts`, so old links still work.
      The navbar's D mark and wordmark and the auth layout's wordmark now link to `/`, `/landing` left the proxy's
      public route list, and `ClerkProvider` sets `afterSignOutUrl="/"` explicitly.
- Added the brand loading screen component (2026-09-14):
    - `components/ui/marketing/draftly-loader.tsx` (client), exported as `DraftlyLoader` from the marketing barrel,
      built from the wireframe `Draftly Loading Screen.html`. Notebook-paper ground (22px rules, coral margin line,
      soft vignette), amber sticky note with tape that swings between -3deg and -1.4deg, a Caveat status word that
      rotates every `pace` ms (min 600) from the `craft` or `plain` word set, three pulsing ink dots, a crawling dashed
      rule, the wordmark, a mono caption and a footer line. Brand tokens only.
    - Props: `tone`, `pace`, `caption`, `fullScreen` (viewport height, or fill the parent with a 480px floor).
    - Accessibility: `role="status"` with a static sr-only "Loading. {caption}." so the rotating words aren't announced;
      decorative parts `aria-hidden`; motion uses `motion-safe:` so reduced-motion users see a still note.
    - Keyframes `loader-dot`, `loader-swing`, `loader-crawl` and `--animate-loader-*` live in a `@theme` block at the end
      of `app/globals.css`.
    - Not used anywhere yet. `/docs` temporarily renders it full-screen for testing; replace when docs get content.
- Added `docs.md` at the repo root as the source content for the future `/docs` site (2026-09-15):
    - Built from every file in `context/` plus the current code, so examples match real routes, types and hooks.
    - Organised like the docs sidebar wireframe: categories (Getting Started, Platform, AI, Authentication, Design
      System, Reference, Contributing, Roadmap) → sections → pages, each with a status
      (`STABLE` / `BETA` / `PREVIEW` / `PLANNED`), source spec numbers, guides and project examples.
    - Includes a spec-to-docs index and a known-issues list taken from the tracker and the task notes.
    - Docs only; no code changed. The `/docs` page still renders `DraftlyLoader`.
- Filled `docs.md` gaps and retired the shipped spec prompt files (2026-09-15):
    - Added to `docs.md`: "What is Draftly" (goals, 10-step core user flow with status, success criteria),
      product layout patterns, a full Architecture page (stack, boundaries, storage & access, invariants),
      and "Decisions & history" (architecture decisions and a dated change history).
    - Deleted 24 files from `context/`: `feature-specs/01`–`22`, `fix/01-AI-sidebar-fix.md`, and
      `current-issuse.md`. Every unit was already logged here and indexed in `docs.md`. Originals are
      recoverable with `git show f9711dc:<path>`.
    - Spec names in this file stay as labels (see the note at the top of "Completed"). `context/` now holds
      only the six `AGENTS.md` context files plus the gitignored `things-to-rember.md`.
- Pointed onboarding at the editor instead of the dashboard (2026-09-15, `app/(marketing)/landing/page.tsx`):
    - The hero "Start creating" button linked to `/dashboard`, so a new user signed in via
      `/sign-in?redirect_url=/dashboard` and landed on the empty dashboard placeholder. It now links to `/editor`,
      so sign-in returns them straight to the editor home.
    - `/` already redirected signed-in users to `/editor`; unchanged. `/dashboard` still exists as a placeholder
      but nothing links to it now.
- Restyled the editor chrome to the editor shell wireframe (2026-09-15, `components/editor/`):
    - `EditorNavbar` now serves both states. Cream bar (h-16) with an ink sidebar toggle, "Draftly / No project
      open" or "Draftly / {project name}", a mono status (READY, or SAVING… / SAVED / SAVE FAILED / VIEW ONLY),
      an outline Share button (disabled with no project), the AI toggle when a project is open, and Clerk's
      `UserButton` (still in the navbar). `EditorWorkspaceShell` uses it in place of its inline header.
    - `ProjectSidebar` is docked on md+ (pushes content, collapses to 0 width) and an overlay below md. Ink
      "New project" button, project search, RECENT (3 most recently updated across owned + shared), ALL PROJECTS,
      SHARED WITH YOU, mono relative times (2h / 1d / 1w / 1mo), hover/focus rename + delete for owned projects,
      and a footer with the signed-in user's initials, name and project count. Tabs removed.
    - `EditorShell` (editor home): sidebar open by default, small connected-boxes mark, heading, "New project"
      and "Open recent" (links to the most recently updated project; disabled when there are none), and an
      "or press N" hint. Plain N opens the create dialog (Ctrl/⌘+N is reserved by browsers).
    - `SidebarProject` gained `updatedAt` (ISO string); sidebar lists are ordered by `updatedAt desc`.
    - Still dark: canvas, AI sidebar, canvas control bar, project dialogs, share dialog. `CanvasControlBar` still
      hides when the sidebar is open with nothing selected; with a docked sidebar that is no longer needed.
    - `pnpm typecheck` and `pnpm lint` pass. Not checked in a browser.
- Fixed long project names running under the rename/delete buttons in `ProjectSidebar` (2026-09-15):
    - On hover or keyboard focus of an owned row, the time is removed, the link reserves right padding for the
      buttons, and the name's ellipsis is replaced by a 2rem fade (CSS mask). Otherwise the name shows as before.
- Restyled `AiSidebar` to the AI sidebar wireframe (2026-09-15, `components/editor/ai-sidebar.tsx` only):
    - Docked full-height cream panel on the right edge of the canvas area (w-94, left hairline, slides out when
      closed, `inert` while closed). Brand tokens, `scheme-light`; no shadcn primitives (Base UI tabs directly,
      native textarea/buttons, plain scroll container).
    - Header: sparkle mark, "AI Workspace", "Collaborate with Draftly AI" (was "Ghost AI"), close button.
    - Underlined "AI Architect" / "Specs" tabs. Empty state is an ink-bordered card with the three starter prompts
      as full-width rows. User messages are ink slabs, assistant messages paper cards, errors get a pin-red left
      rule, and the run status is mono chrome with a spinner.
    - Composer: ink-bordered textarea, mono "Enter to send · Shift+Enter new line" hint, square ink send button
      with an arrow. Specs tab restyled but still inert.
    - Behaviour and `useDesignAgent` wiring unchanged. Canvas and navbar untouched.
- Fixed and restyled the canvas `ShapePanel` (2026-09-15, `components/editor/shape-panel.tsx` only):
    - It was `absolute` inside the canvas section, so it re-centred whenever the docked project sidebar opened or
      closed. It is now `fixed` to the viewport (bottom 24px, horizontally centred), so it stays put. No ancestor has
      a transform, so `fixed` resolves against the viewport.
    - New look from the shape panel wireframe: one paper-bright bar with an ink border and flat shadow, 2px corners,
      cells split by ink hairlines, Archivo labels, the active mode (Select / Pan) as an ink cell with cream text
      (`aria-pressed`). Same lucide icons; the Select/Pan divider is gone.
    - Drag-to-canvas, the ghost preview, mode switching and the canvas itself are unchanged.
- Restyled `CanvasControlBar` to the control bar wireframe (2026-09-15, `components/editor/canvas-control-bar.tsx` only):
    - Inline dark styles replaced with brand-token Tailwind classes, matching the shape panel: paper-bright bar,
      ink border, flat shadow, 2px corners. Bottom row is a segmented bar of 36px cells split by ink hairlines
      (the old gap dividers are gone); delete tints pin-red on hover; disabled undo/redo fade to 35%.
    - Node/edge formatting panel sits above the bar with a hairline: mono uppercase labels (Fill, Stroke, Arrow,
      Type, Edge), round swatches with an ink ring when active, arrow/line-style chips that fill ink when active,
      and a segmented B / I / − size + group. Toggles now expose `aria-pressed`.
    - All handlers, conditions (including hiding when the project sidebar is open with nothing selected), icons,
      position and node/edge data values are unchanged. No backend changes.
- Light canvas ground and a canvas status panel (2026-09-15):
    - `canvas-flow.tsx`: canvas ground is `paper-cream` with ink dots at 22%; the minimap is a paper-bright card
      with an ink border, flat shadow, ink node blocks and a light ink mask. The workspace canvas section and the
      canvas connecting/error text (`canvas-wrapper.tsx`) switched to cream / ink-soft so loading doesn't flash dark.
    - Nodes, edges and cursors are unchanged: the dark node slabs and grey edges still stand out on cream.
    - `CanvasPresenceOverlay` is now the top-right canvas status panel: zoom % and node count (mono, read from the
      React Flow store), then the collaborator avatar stack (amber initials, ink "+N"), then the user button, on a
      paper-bright card with an ink border and flat shadow.
    - The docked AI sidebar used to cover that panel. `isAiSidebarOpen` now flows
      `EditorWorkspaceShell` → `CanvasWrapper` → `CanvasFlow` → `CanvasPresenceOverlay`, which moves left of the
      sidebar on lg+ (where the sidebar shows). No backend changes.
- Stopped the project sidebar from shifting the canvas (2026-09-15):
    - Cause: on md+ the docked `ProjectSidebar` took layout width, so the canvas section narrowed and React Flow's
      viewport origin (its left edge) moved right with it.
    - `ProjectSidebar` gained `docked` (default `true`). `EditorWorkspaceShell` passes `docked={false}`, so inside a
      project the sidebar floats over the canvas (fixed, flat shadow) at every width and the canvas keeps its size.
      The editor home keeps the docked layout from the wireframe.
    - `CanvasControlBar`'s existing rule (hide while the sidebar is open and nothing is selected) applies again,
      since the floating sidebar covers its bottom-left spot.
- Paper-style canvas nodes, merged node color control, 100% default zoom (2026-09-15):
    - `canvas-flow.tsx`: `fitViewOptions={{ minZoom: 1, maxZoom: 1 }}`, so the canvas opens centred at 100%.
      Dropped nodes no longer store white `textColor` / `strokeColor`.
    - `canvas-node.tsx`: every shape is a paper card from the rectangle reference: 1.5px ink stroke, hard offset
      shadow (`--shadow-flat`, drop-shadow for SVG shapes), 2px corners on rectangles, a mono uppercase kicker
      (Service / Event / Decision / Queue / Database / External, shown when the shape is big enough) above a
      semibold Archivo label (default 14px, left-aligned on rectangles, centred elsewhere, "Untitled" placeholder).
      Selection thickens the ink stroke; the resizer is a dashed ink line with square paper handles; handles are
      ink dots. Cylinder side walls redrawn so the fill doesn't show seams.
    - `types/canvas.ts`: `NODE_FILLS` (paper-bright + the four sticky-note paper accents) and `resolveNodeFill()`,
      which maps legacy dark palette colors (still written by AI generation and starter templates) to the nearest
      accent. `NODE_COLOR_PALETTE`, the AI schema and stored data are unchanged.
    - `canvas-control-bar.tsx`: node Fill and Stroke merged into one Fill row of the five paper fills (labelled
      swatches). Stroke and text are always ink. Edge colors unchanged.
- Editable node kicker label (2026-09-15):
    - `CanvasNodeData.kicker?: string` (types only; the canvas API already accepts any `data` object).
    - `canvas-node.tsx` shows `data.kicker` when set, otherwise the shape default from the exported `SHAPE_KICKERS`
      (Service / Event / Decision / Queue / Database / External).
    - `canvas-control-bar.tsx`: a "Label" input above Fill for the selected node, placeholder = the shape default.
      Clearing it removes `kicker`, so the node falls back to the default. Max 24 characters. Canvas shortcuts
      and React Flow's delete key already ignore typing in inputs.
- Added a free text node for notes and descriptions around other nodes (2026-09-15):
    - `types/canvas.ts`: `TEXT_NODE_SHAPE = "text"` and `CanvasNodeShape` (drawn shapes + text). `CanvasNodeData.shape`
      and `SHAPE_DEFAULTS` use it; text has a nominal 160x32 default for drop placement and the design agent's layout
      offset. `CANVAS_SHAPES` (the AI output schema) is unchanged, so AI generation never emits text nodes.
    - `shape-panel.tsx`: "Text" tool (lucide `Type`) after Hexagon; dashed ink ghost while dragging.
    - `canvas-flow.tsx`: dropped text nodes get no `style` width/height, so React Flow sizes them from content.
    - `canvas-node.tsx`: text nodes have no border, fill or shadow. Archivo 400 ink text (bold/italic/size from the
      control bar, default 14px), wraps at 320px, "Add text" placeholder. Double-click to edit; the textarea shares a
      grid cell with an invisible copy of the text, so the node grows while typing. Dashed ink outline only when
      selected or editing. No resizer; connection handles on hover as usual.
    - `canvas-control-bar.tsx`: text nodes show only the text controls (no Label or Fill rows).
- Text notes lose connection handles; edges use four dark colors (2026-09-15):
    - `canvas-node.tsx`: text nodes no longer render `NodeHandles`, so nothing can connect to a note.
    - `types/canvas.ts`: `EDGE_COLORS` (Ink default, Graphite `--ink-soft`, Mat green, Pin red) and `resolveEdgeColor()`;
      missing or legacy palette `colorId`s resolve to ink, so older edges need no data rewrite.
    - `canvas-edge.tsx`: stroke and arrowheads come from `resolveEdgeColor(colorId)`; one marker per edge color
      (fill set via `style` so CSS variables resolve). Hover/selection thickens the line (2 to 3px) instead of
      switching to the old blue. The old zinc default and per-palette rest/active markers are gone.
    - `canvas-control-bar.tsx`: the Edge row shows exactly those four labelled swatches.
- Project dialogs restyled to the brand theme from the dialog wireframe (2026-09-15):
    - `project-dialogs.tsx` no longer uses `EditorDialogShell`, `Button` or `Input` (all untouched). A local
      `ProjectDialogFrame` builds on the `ui/dialog` primitives: paper-cream card, 1px ink border, `shadow-flat`, 2px
      corners, semibold Archivo title with ink-soft description, ink X close button, and a footer strip
      (`paper-cream-rule/40`, ink/15 top rule).
    - Create: uppercase "Project name" label, ink-bordered paper-bright input, mono "ROOM ID" preview line,
      outline Cancel + ink "Create project" buttons. Rename and Delete share the frame; Delete's confirm is pin-red.
    - The popup radius uses `rounded-(--radius-paper)`, because `tailwind-merge` can't tell that `rounded-paper`
      replaces the base `rounded-xl`.
- Share dialog and user menu restyled to the brand theme from their wireframes (2026-09-15):
    - New `components/editor/paper-dialog.tsx`: `PaperDialog` (paper-bright card, ink border, `shadow-flat`, 2px
      corners, title/description, X close, cream footer strip) plus shared class constants for secondary, primary
      and destructive buttons, labels and inputs. `project-dialogs.tsx` now uses it instead of a local frame.
    - `share-dialog.tsx` uses `PaperDialog` (still not `EditorDialogShell`, `Button` or `Input`): email input + ink
      Invite button, a cream COLLABORATORS box with a mono header and count, an amber-initials list with pin-red remove
      hover, and Close / Copy link outline buttons. Fetching, invite and remove logic unchanged.
    - New `components/editor/user-menu-button.tsx`: `UserMenuButton` wraps Clerk's `UserButton` with brand
      `appearance` variables and element style objects (ink-bordered paper popover, flat shadow, larger preview avatar,
      hairline-separated actions, cream "Secured by Clerk" footer). It uses style objects, not Tailwind classes, so
      the styles win over Clerk's CSS-in-JS. It replaces the raw `UserButton` in `EditorNavbar` (2.5rem) and
      `CanvasPresenceOverlay` (2rem). The provider's `dark` theme only sets variables, so these override it.
      Clerk's "Manage account" profile modal is still dark.
    - Type check and lint pass. Not checked in a browser.
- Starter templates modal restyled to the brand theme (2026-09-15, no wireframe; follows the paper dialogs):
    - `PaperDialog` gained optional `contentClassName` (merged onto the popup, used for width) and an optional
      `footer` (the cream strip is skipped when omitted).
    - `starter-templates-modal.tsx` uses `PaperDialog` at `min(96vw, 1000px)` with a Close footer. Contents: a cream
      note with a pin-red left rule and warning icon ("Importing a template clears the current canvas…"), a mono
      TEMPLATES count, and a native-scrolling 1/3-column grid (`max-h-[52vh]`, replaces `ScrollArea`) of ink-bordered
      paper cards (mono "N nodes · M edges" kicker, semibold name, ink-soft description, ink "Import template" button).
    - Previews look like the paper canvas: cream ground with ink dots, node fills from `resolveNodeFill()`,
      1px ink borders (diamond/hexagon get an ink backing layer, since clip-path hides CSS borders), edge strokes
      from `resolveEdgeColor()`. Frames use percentages of the 640x360 view box so they scale with the card.
      Import behaviour is unchanged.
    - `EditorDialogShell` has no users left; it is kept, not deleted.
    - Type check and lint pass. Not checked in a browser.
- Smaller default node text, slightly larger default shapes (2026-09-15):
    - `canvas-node.tsx`: `DEFAULT_NODE_FONT_SIZE` 14 → 11. It is also the fallback for free text nodes and the
      control bar's font-size stepper. Nodes with a stored `data.fontSize` keep it.
    - `types/canvas.ts` `SHAPE_DEFAULTS` grew ~10%: rectangle 120x60, circle 80x80, diamond 100x100, pill 120x50,
      cylinder 90x80, hexagon 100x100 (text nominal size unchanged). This applies to dropped shapes, starter templates
      and AI-generated nodes. Existing nodes keep their stored `style` size.
    - Type check passes. Not checked in a browser.
- One edge per connection point; starter templates reworked (2026-09-15):
    - New `lib/canvas-connections.ts`: every node has four points (top/right/bottom/left), each holding one edge in
      either direction. `getUsedSides`, `canConnect` (rejects a connection onto a used point or a same-side
      self-loop), and `assignEdgeHandles` (gives handle-less edges a free side on both nodes; straight edges pick
      first, diagonal ones turn out of a free side; existing handles kept; only a node with more than 4 edges shares).
      Edges saved without handle ids count as the top side, where React Flow draws them.
    - `canvas-node.tsx`: a used point stays visible and gets `isConnectableStart/End={false}` (not-allowed cursor).
      `canvas-flow.tsx`: `isValidConnection` uses `canConnect`, so drops that snap onto a used point are refused too.
    - `lib/design-generation.ts`: `buildCanvasGraph` runs `assignEdgeHandles`. The design-agent system prompt now
      tells the model each component has at most four connections.
    - `starter-templates.ts` rewritten: nodes placed by centre so rows/columns line up; explicit kickers (Client,
      Gateway, Queue, Database…), since the shape defaults said "Queue" on pills and "External" on hexagons; paper
      fills by role (entry blue, compute paper, messaging coral, data amber, output sage) instead of legacy dark
      palette colors, with no white `textColor`/`strokeColor`; every edge has forward/two-way arrows, short labels
      where the flow isn't obvious, and dashed style for async hand-offs (DLQ edge pin red). Nodes that had more
      than 4 edges were restructured: shared DB became per-service DBs (Microservices), app servers ×N + DB proxy
      (Scalable Web App), command bus (Saga), push fed by chat (Real-Time Messaging), processor archives to the lake
      (Streaming), one telemetry source + alerting above metrics (Observability), embedder serves search (RAG).
      CI/CD gained an image registry.
    - `canvas-edge.tsx`: edge labels and the inline label editor moved to paper styling (paper-bright, ink text,
      Archivo 500, 2px corners, ink hairline border).
    - Type check and lint pass. A tsx script over all 13 templates confirmed: every edge has handles, no node side
      holds two edges, max 4 edges per node, no overlapping nodes. It also covered `canConnect` cases and AI graph
      handles. Not checked in a browser.
- Loading states for canvas connect and project actions (2026-09-15):
    - `canvas-wrapper.tsx`: the `ClientSideSuspense` fallback is now `DraftlyLoader` (caption "Connecting to canvas",
      `fixed inset-0 z-45`) instead of plain text. It covers the whole editor, navbar and AI sidebar included
      (they render outside the Suspense boundary); z-45 is above the sidebars (z-20/z-40), below dialogs (z-50).
      The connection error message is unchanged.
    - `hooks/use-project-actions.ts`: `isLoading` = request in flight OR router transition pending. The
      `router.push` / `router.refresh` after a successful create, rename or delete runs in `useTransition`
      with `setActiveDialog(null)`, so the dialog stays open and busy until the new page / refreshed names
      render. `closeDialog` and the submit handlers ignore calls while loading (no dismiss mid-action, no
      double submit). Failed requests still leave the dialog open with no error message (unchanged).
    - `project-dialogs.tsx`: primary buttons show a `Loader2` spinner with "Creating…", "Saving…",
      "Deleting…" and `aria-busy`; name inputs are disabled while loading.
    - Type check and lint pass. Not checked in a browser.
- AI sessions, step 1: storage for persistent design agent chats (2026-09-15):
    - Why: the AI sidebar kept its chat in React state only (`useDesignAgent` `useState`), so a reload lost the
      transcript and any in-flight run, and every prompt reached the model with no history.
    - `prisma/models/ai-session.prisma`: `AiSession` (projectId → `Project` cascade, userId, title, phase
      `CLARIFYING|PLANNED|GENERATING|COMPLETE`, `brief` JSON, `clarifyRounds`, `lastActivityAt`, `expiresAt`) and
      `AiMessage` (sessionId cascade, role `USER|ASSISTANT`, kind `TEXT|QUESTIONS|ANSWERS|PLAN|RESULT|ERROR`, `content`,
      `payload` JSON, unique `runId`, status `PENDING|COMPLETE|FAILED`). `Project.aiSessions` back-relation.
      Migration `20260915163917_add_ai_sessions` (additive only) applied.
    - `types/ai-session.ts`: Prisma-free wire types (`AiSessionSummary`, `AiSessionDetail`, `AiMessageDto`) and value
      lists for the enums, for client use in step 2.
    - `lib/ai/session-store.ts`: limits (7-day sliding TTL, 10 sessions per user per project, 60 messages per
      session, 4,000-char messages, 80-char titles), `toSessionTitle`, `listSessions`, `createSession` (one
      transaction that trims to the cap, dropping least recently active and expired), `getSession` (with transcript),
      `deleteSession`, `deleteExpiredSessions`. Every read filters `expiresAt > now`, scoped to project + user.
    - Routes (Clerk auth + `getAccessibleProject`; sessions private to their creator, others' ids return 404):
      - `GET/POST /api/projects/[projectId]/ai-sessions` — list mine / create (optional `title`, 201).
      - `GET/DELETE /api/projects/[projectId]/ai-sessions/[sessionId]` — session + messages / delete (204).
      - `GET /api/cron/ai-sessions/cleanup` — deletes expired sessions; requires `Authorization: Bearer $CRON_SECRET`
        (constant-time compare, 401 when unset or wrong). `/api/cron(.*)` added to the public routes in `proxy.ts`.
    - `vercel.json` (new): daily cron at 03:00 UTC. `CRON_SECRET` added to `.env.example`; it must also be set in
      Vercel project env for the cron to authenticate.
    - `architecture-context.md` storage model documents session retention.
    - Not wired to the UI yet; `useDesignAgent` and `/api/ai/design` are unchanged.
    - Validation checks:
      - `pnpm typecheck` and `pnpm lint` passed (2 pre-existing warnings in vendored skill templates)
      - A tsx script against the database confirmed: title normalisation, 7-day expiry, the 10-session cap deletes
        the oldest rows, other users can't read/delete or count toward the cap, transcripts load, expired sessions
        are hidden from get/list, cleanup deletes them with messages cascading, and project delete cascades. Test
        rows were removed.
      - Against the running dev server: signed-out requests to the session routes are stopped by Clerk (404 / 307
        to sign-in) before the handler; the cron route is reachable and returns 401 JSON with no or a wrong bearer.
    - Not yet exercised: the session routes over HTTP with a signed-in user, and the cron route with the correct
      secret (the dev server had no `CRON_SECRET`).
- AI sessions, step 2: the AI Architect chat runs on stored sessions (2026-09-15, branch `feat/ai-sessions-wiring`):
    - Generation is still one-shot (one prompt → one design run); only persistence and resume changed.
    - `lib/ai/session-limits.ts`: the limit constants moved out of `session-store.ts` (which re-exports them) so client
      code can import them without pulling in Prisma. Added `AI_SESSION_TTL_DAYS`.
    - `lib/ai/session-turns.ts`:
      - `startTurn(scope, sessionId, text)`: settles finished turns, rejects with 409 while a reply is pending or when
        the chat would pass 60 messages, triggers `design-agent`, then in one transaction stores the USER message and
        a PENDING assistant message with the run id (explicit `createdAt` so the reply sorts after the prompt), a
        `TaskRun` row, the session's sliding `lastActivityAt`/`expiresAt`, phase `GENERATING`, and the first prompt as
        title. If the trigger fails, the prompt is still stored with a FAILED error reply and the result is 502.
      - `getSettledSession`: before returning a session, settles each PENDING message from `runs.retrieve` — success →
        `RESULT` (`payload: { nodeCount, edgeCount }`, phase `COMPLETE`); failed/cancelled or a 404 run → `ERROR`
        (phase `CLARIFYING`); still running or Trigger unreachable → stays pending. The write is guarded on
        `status: PENDING`, so concurrent reads settle once, and every reader re-reads once the run is final.
      - Settling on read means a reply is saved even when the tab closed mid-run; the task still has no DB access.
    - Routes:
      - New `POST /api/projects/[projectId]/ai-sessions/[sessionId]/turns` with `{ type: "message", text }` (1–4,000
        chars): 202 `{ session }`, 502 `{ error, session }`, 400/401/403/404/409 `{ error }`.
      - `GET .../ai-sessions/[sessionId]` now returns the settled session.
      - Removed `POST /api/ai/design` (replaced by the turns route). `POST /api/ai/design/token` is unchanged and still
        authorises by `TaskRun`.
    - `hooks/use-ai-session.ts` replaces `hooks/use-design-agent.ts` (deleted):
      - Lists sessions on mount and reopens the chat last open in this browser (`draftly:ai-session:{projectId}` in
        localStorage), else the most recent.
      - A new chat is stored lazily: the first message creates the session (titled from the prompt), then sends the
        turn. The prompt shows optimistically until the server transcript returns.
      - While a reply is PENDING it mints a run token and subscribes with `useRealtimeRun` for the stage line and an
        early refresh when the run ends, and re-reads the session every 4s as the guaranteed path (covers a lost
        subscription or token failure). Async responses are dropped if the user switched chats meanwhile.
      - Request failures show as a local (unsaved) error message. The `thinking` presence flag works as before.
    - `components/editor/ai-session-history.tsx`: saved chats list (title, relative last activity, "expires in Nd",
      delete), count out of 10, and a "kept for 7 days" note.
    - `ai-sidebar.tsx`: session bar under the tabs (history toggle showing the current title, "New chat"), history list
      in place of the transcript when open, "Loading chat…" and a retryable load error, `whitespace-pre-wrap` bubbles,
      and scrolling to the latest message. Specs tab unchanged.
    - `lib/relative-time.ts`: `formatRelativeTime` extracted from `project-sidebar.tsx`, now shared.
    - Validation checks:
      - `pnpm typecheck` and `pnpm lint` passed (after `next typegen` cleared the removed route from `.next/types`)
      - tsx script against the database: a missing run settles FAILED with an explanation; concurrent settles agree;
        failure resets phase; a full chat and an unknown session are rejected; a pending turn that can't be settled
        blocks a new turn (409); a trigger failure returns 502 with the prompt stored before a FAILED reply, the title
        taken from the prompt, activity/expiry moved forward, and no `TaskRun`
      - End-to-end through the local `trigger dev` worker on a throwaway project + Liveblocks room: 202 with a PENDING
        reply, `TaskRun` recorded, 409 for a second message, then settled via `runs.retrieve` as RESULT "Added 3
        components and 2 connections to the canvas." with phase `COMPLETE`; re-reading changed nothing. Test project,
        room, sessions and `TaskRun` removed.
      - Signed-out requests to the turns and session routes are stopped by Clerk.
    - Not checked in a browser (sidebar UI, reload resume, history switching and deleting, Realtime stage line).
- AI sessions, step 3: multi-turn design agent — clarify → plan → generate (2026-09-15, branch
  `feat/ai-design-turn-engine`):
    - Each turn is still one `design-agent` run; the task now decides what the turn does.
    - `lib/ai/agent-schema.ts` (zod, client-safe): `designBriefSchema` (goal, scale, core features, non-functional,
      constraints, assumptions, open questions), `clarifyQuestionSchema` (id, question, why, 2–4 options),
      `turnAnalysisSchema` (updated brief + decision `ask|plan|generate` + reply + ≤3 questions), `designPlanSchema`
      (summary, components with role/responsibility, flows, decisions with choice/rationale/alternatives,
      assumptions), and `designAgentResultSchema` — the run output (`ask` / `plan` / `generated`), validated by the
      server before storing. Also the task payload (`intent`, `input`, last 12 history entries, brief, latest plan,
      `clarifyRounds`), limits (`MAX_CLARIFY_ROUNDS` 3, `MAX_QUESTIONS_PER_ROUND` 3), and text renderings of
      questions/plans/answers used as message content (what the model reads back and the sidebar shows until step 4).
    - `lib/ai/prompts.ts`: analyze, plan, and generate system prompts plus context builders.
    - `lib/ai/design-agent-engine.ts` (no canvas/DB access): `analyzeTurn`, `draftPlan`, `generateDesignGraph` on
      `generateText` + `Output.object` (replacing the deprecated `generateObject`), and `enforceDecision`, which
      overrides the model: no questions after a skip or past 3 rounds, no `generate` without a plan, no `ask` with
      zero questions. Gemini `thinkingLevel` per step: analyze `low`, plan `medium`, generate `low` — default thinking
      took 34–82s per call; with these levels analyze calls took 14–24s in the eval.
    - `src/trigger/design-agent.ts`: `generate` intent with a plan → draw it; otherwise analyze → questions, or draw
      the existing plan when the user approved it in text, or draft/revise a plan. Stages `analyzing` → `planning` →
      `generating` → `writing` → `done`. `retry: { maxAttempts: 1 }` — model calls already retry with backoff, and
      turn-level retries multiplied quota use and could draw a diagram twice.
    - `lib/ai/session-turns.ts`:
      - `TurnInput`: `message` (text), `answers` (`{ questionId, answer }[]`, only while the latest reply is
        questions, paired with the question text), `generate` (409 without a plan), `skip`.
      - Settling stores `QUESTIONS` (payload `questions`, phase `CLARIFYING`, `clarifyRounds + 1`), `PLAN` (payload
        `plan`, phase `PLANNED`), or `RESULT` (payload counts + the plan's `decisions`, phase `COMPLETE`), and saves
        the brief on the session. Invalid run output is stored as an error. A failed turn leaves the phase unchanged.
      - Run failures are stored as friendly messages (usage limit / busy / timeout / generic); the raw provider error
        is only logged.
      - Phase is no longer set to `GENERATING` when a turn starts.
    - Turns route accepts all four inputs (`{ type: "message" | "answers" | "generate" | "skip" }`); 400 for anything else.
    - `hooks/use-ai-session.ts`: stage labels for the new stages. The composer still sends only `message` turns, so for
      now users answer questions and approve plans in free text ("looks good, draw it"); buttons come in step 4.
    - Validation checks:
      - `pnpm typecheck` and `pnpm lint` passed
      - DB turn script (15 checks) passed with the new input types, including failed turns leaving the phase unchanged
      - Engine eval against Gemini (default thinking): vague prompt → 3 relevant questions with options; answers → plan
        with a goal and no repeated questions; detailed URL-shortener prompt → straight to a plan (10 components, 4
        decisions with alternatives, validates against the result schema); approval → `generate`; drawn graph used
        exactly the 8 plan components with sensible edges; "add a Redis cache" → revised plan that kept every
        component and added "Link Cache". All six enforced rules passed.
      - With the new thinking levels: vague prompt and answers passed again (24s and 14s, from 75s and 39s).
      - Full flow via the local Trigger worker confirmed the 409 guards (generate before a plan, answers without open
        questions or after a plan), that a failed run is stored as the friendly usage-limit message, and cleanup.
    - The Gemini key hit its free-tier quota on `gemini-3.5-flash` (20 requests), so testing moved to
      `gemini-2.5-flash` (`GOOGLE_GENERATIVE_AI_MODEL` in `.env.local`; free tier 5 requests/minute):
      - `design-agent-engine.ts` now sends `thinkingBudget` (low 1024, medium 4096 tokens) to `gemini-2.x` models,
        which don't take `thinkingLevel`; Gemini 3+ keeps `thinkingLevel`.
      - Eval on 2.5-flash, 4–20s per call: vague prompt → 3 questions with options; answers → plan; detailed prompt →
        straight to a plan (13 components, 5 decisions with alternatives, validates); drawn graph used exactly the 8
        plan components; "add a Redis cache" → revised plan keeping every component plus "Link Cache"; skip → plan
        with 6 recorded assumptions; "Looks good, go ahead and draw it" → `generate`; "Looks good, but use Postgres
        instead" → `plan`. All passed.
      - Full flow via Trigger: 409 guards passed; the single task attempt failed in 16s and stored the friendly
        usage-limit message.
      - Full flow via the restarted Trigger worker on 2.5-flash: first message → 3 questions (12.6s); answers stored as
        ANSWERS paired with the questions → a second round of 3 questions (12.4s); `clarifyRounds` and phase correct
        each round; brief stored. The skip turn then failed after 39.6s with "No object generated: response did not
        match schema".
    - Fix for that failure — list limits are no longer hard schema constraints:
      - Cause: the model regularly fills lists up to their `maxItems` (a replay produced exactly 8 plan assumptions and
        8 brief features against caps of 8 and 12), and Gemini doesn't reliably enforce `maxItems`, so one extra item
        failed the whole turn.
      - `agent-schema.ts`: `.max()` removed from every model-filled list (brief lists, question options, plan
        components/flows/decisions/alternatives/assumptions, questions per round) and the `options` minimum dropped;
        limits live in `LIST_LIMITS` and are stated in the schema descriptions. New `clampBrief`, `clampQuestions`,
        `clampPlan` trim to the limits, keeping the first items. Required minimums that matter stay (a plan needs a
        component; an `ask` result needs a question).
      - `design-agent-engine.ts`: every result is clamped, and each structured call retries once on
        `NoObjectGeneratedError` (transport errors are already retried by the SDK).
      - `design-generation.ts`: `designGraphSchema` no longer enforces 24 nodes / 48 edges; `buildCanvasGraph` trims to
        those limits, and edges pointing at a trimmed node are still dropped.
      - Offline check (no model calls, 15 checks): over-long briefs, questions, plans and graphs parse and are trimmed
        to their limits, a single-option question parses, an empty plan or graph is still rejected, clamped plans
        validate as stored run output, and no edge references a trimmed node. `pnpm typecheck` and `pnpm lint` pass.
    - Moved testing to `gemini-3-flash-preview` (`gemini-3-flash` is not an id on this key; free tier 20 requests/day,
      5/minute). The first full-flow run hung: the run sat in `analyzing` for over 5 minutes with one attempt and no
      error, while probes showed the model under load ("high demand" on a bare call) but answering `analyzeTurn` in
      30.7s. Nothing bounded a model call or the task (config `maxDuration` 3600s), so a held request would keep the
      reply pending and the composer locked. Fix:
      - `design-agent-engine.ts`: `timeout: { totalMs }` on every structured call — analyze 90s, plan 150s, generate
        120s. A timeout fails the turn with the existing "took too long" message.
      - `src/trigger/design-agent.ts`: `maxDuration: 300` as the backstop.
      - The stuck test run was cancelled.
      - Re-run after the fix: the first turn again got no model response inside the worker and failed cleanly at the 90s
        analyze timeout (settled after 97.1s as "The design agent took too long to respond. Try again."), so the
        timeout path is verified. Two worker runs on `gemini-3-flash-preview` got no response while a direct call took
        30.7s and `gemini-2.5-flash` runs through the same worker succeeded, which points to preview-model overload
        rather than code.
    - Verified end to end on 2026-09-16 on `gemini-3.5-flash-lite` through the restarted Trigger worker (run with the
      step 4 branch, whose engine and task are unchanged from step 3): first message → 3 questions (15.8s); skip →
      PLAN (12.3s) with 9 components, 4 flows, 3 decisions, and assumptions, phase `PLANNED`, brief stored, plan payload
      valid; answers after the plan → 409; generate → RESULT "Added 9 components and 8 connections to the canvas."
      (12.6s) carrying the plan's decisions, phase `COMPLETE`. Test project, room, sessions, and TaskRuns removed.
- AI sessions, step 4: question, plan, and result cards in the AI sidebar (2026-09-16, branch `feat/ai-agent-cards`):
    - Local testing model is now `gemini-3.5-flash-lite` (`.env.local`, not committed).
    - `lib/ai/agent-schema.ts` (client-safe) now also holds `TurnInput`, `GENERATE_TURN_TEXT` / `SKIP_TURN_TEXT`, and
      payload readers (`readReplyPayload`, `readQuestionsPayload`, `readAnswersPayload`, `readPlanPayload`,
      `readResultPayload`) used by both the server and the sidebar. `session-turns.ts` uses them instead of its own
      copies, and QUESTIONS / PLAN payloads now also store the agent's `reply` (older messages read as an empty intro).
    - `hooks/use-ai-session.ts`: `sendTurn(input)` for `message`, `answers`, `generate`, and `skip` (`sendPrompt` wraps
      it); the optimistic user message matches what the server will store (answers paired with their questions, the
      fixed generate/skip texts); every message now exposes `kind` and `payload`. Non-message turns require an existing
      session.
    - `components/editor/ai-chat-cards.tsx`:
      - `QuestionsCard`: kicker, intro, numbered questions with their "why", option chips (`aria-pressed`, toggle),
        and a free-text input per question (a typed answer wins over a chip). "Send answers" is disabled until one
        question is answered; "Skip, plan with assumptions" sends a skip turn. Once answered, it renders read-only with
        the chosen chip pressed and any typed answer shown.
      - `PlanCard`: summary; key decisions highlighted on marker-amber paper with choice, rationale, and "Considered"
        alternatives; components (first 6, "Show all N" toggle) with role labels; key flows; assumptions; and a
        "Draw this plan" button with an "or describe changes below" hint.
      - `ResultCard`: the canvas summary with a collapsible "Decisions · N" list.
    - `ai-sidebar.tsx` renders assistant messages by kind (falling back to the text bubble when a payload doesn't
      read). Only the newest non-failed assistant reply is interactive, and only while no turn is pending, which
      mirrors the server's rules for open questions and the plan to draw. The composer placeholder changes to "Or answer
      in your own words..." / "Describe changes to the plan..." while questions or a plan are open.
    - Validation checks:
      - `pnpm typecheck` and `pnpm lint` passed
      - Static render checks (29, `react-dom/server`): open vs answered questions (chips, inputs, disabled send, skip,
        labelled groups, pressed chip, typed answer, no controls), plan (intro, highlighted decisions, alternatives
        line only when present, 6 of 8 components with show-all, flows, assumptions, draw action only when
        interactive, empty sections omitted), result (collapsible decisions only when present), and the payload
        readers (including step 2 results without decisions)
      - DB turn checks (15) passed after the shared-reader refactor
      - Live flow on `gemini-3.5-flash-lite` through the Trigger worker passed (message → questions → skip → plan →
        generate; see the step 3 entry), including QUESTIONS and PLAN payloads that now store the agent's reply.
    - Browser check by the user (2026-09-16), both working: a detailed prompt with every question answered, and a
      low-detail prompt that skipped the questions and generated a good design.
- AI sessions, step 5: generation quality — canvas context, roles and kickers, async edges, validate and repair
  (2026-09-16, branch `feat/ai-generation-quality`):
    - Shared node roles: `types/canvas.ts` now has `NODE_ROLES` (entry, compute, messaging, data, output),
      `NODE_ROLE_FILLS`, and `getRoleFill`, taken from the starter templates' private role map, which now uses them.
      `SHAPE_KICKERS` moved here from `canvas-node.tsx` (re-exported there for the control bar) so server code can read
      it without importing React Flow.
    - `lib/ai/canvas-summary.ts`: `summarizeCanvas` turns the room into components with refs (`ex-1`…), kind (kicker or
      the shape default), and used connection points; connections (label, async); and text notes. Capped at 60
      components, 80 connections, 10 notes. `formatCanvasSummary` renders it for prompts.
    - `lib/design-generation.ts`: the generation schema replaces the legacy dark `colorId` with `role` and `kicker`, and
      edges gain `delivery: sync | async`. Edge endpoints may be a new node id or an existing ref. `buildCanvasGraph`
      takes the existing canvas: refs resolve to existing node ids; a generated node that repeats an existing label is
      not drawn and its edges attach to the existing node; repeated labels among new nodes fold into the first;
      unknown endpoints, self loops, and repeated pairs (either direction) are dropped; fills come from the role; async
      edges are dashed; connection points are assigned with existing edges counted. `MAX_GRAPH_NODES` /
      `MAX_GRAPH_EDGES` are exported.
    - `lib/ai/graph-validation.ts`: `validateDesignGraph` reports, in messages written for the model: over-limit counts,
      duplicate ids, new ids shaped like refs, components already on the canvas, duplicate labels, unknown references,
      self loops, repeated connections, components over 4 connections (existing ones included), unconnected new
      components, and plan components missing from the diagram.
    - `lib/ai/prompts.ts`: the canvas summary goes into analyze (treat requests as changes to the existing design),
      plan (list only components to add, refer to existing ones by name), and generate (connect by ref, roles,
      kickers, async delivery, every new component connected). New `buildRepairPrompt`.
    - `lib/ai/design-agent-engine.ts`: `analyzeTurn`, `draftPlan`, and `generateDesignGraph` take the canvas summary.
      `generateDesignGraph` validates the diagram and, when anything is wrong, makes one repair call with the issues
      and the previous diagram, keeping whichever attempt has fewer issues (a failed repair keeps the first). It
      returns `{ graph, issues, repairedIssues }`.
    - `src/trigger/design-agent.ts`: reads the room read-only at the start of every turn and passes the summary to each
      step. When writing, it uses the live room for layout and connection points and drops refs to components deleted
      since the read. Repaired and remaining issues are logged. Comment updated: a turn makes at most three model calls.
    - Validation checks:
      - `pnpm typecheck` and `pnpm lint` passed
      - Offline checks (36, no model calls): canvas summary (refs only for labelled drawn components, kinds, used points,
        connections, notes, empty canvas, 60-component cap); every validation rule, including a clean graph with no
        issues; `buildCanvasGraph` (existing duplicates and repeated labels not drawn, role fills, kickers, ref and
        duplicate resolution, dropped unknown refs, self loops and repeated pairs, dashed async edges, handles on every
        edge, new edges avoiding used sides, only an already-full node sharing a side, refs dropped without canvas
        context); all 13 starter templates still on paper fills, entry still draft blue.
      - Live extend run on `gemini-3.5-flash-lite` through the Trigger worker, on a throwaway room seeded with the
        Microservices template (8 nodes, 8 edges): "Add a Redis cache in front of the user database, and a notification
        service that consumes order events." → PLAN in 12.4s listing only the 3 new components (User Cache, Event
        Broker, Notification Service) with 2 decisions → generate in 12.6s added 3 nodes (kickers Queue / Worker /
        Cache, paper fills) and 4 edges: User Service → User Cache → User DB, and Order Service → Event Broker →
        Notification Service, both order-event links dashed. Existing nodes untouched, no component redrawn, no
        node forced to share a connection point, counts match the room. Test project, room, sessions, and TaskRuns
        removed. 0 failures, 0 warnings.
    - Follow-up from that run: the plan's flows read "User Service (ex-7) → User Cache → User DB (ex-8)" — the model
      copied internal refs into user-facing plan text despite the prompt. `removeCanvasRefs` in
      `design-agent-engine.ts` now strips parenthesised refs ("(ex-7)", "(ex-4, ex-5)") from the plan summary,
      responsibilities, flows, decisions, and assumptions after drafting; other parentheses are left alone. Covered
      by 3 more offline checks.
- AI sessions, step 6: documentation refresh (2026-09-16, branch `feat/ai-sessions-docs`, docs only, no code):
    - `docs.md` is listed in `.gitignore` (and has never been committed), so its refresh below stays in the local
      working copy by decision; the branch commits `README.md` and the context files only.
    - `docs.md`:
      - AI category rewritten: **AI design sessions** (flow diagram, guide through the questions / plan / result
        cards, stages, code-enforced rules, the Microservices extend example from the live run, error messages),
        **How generation works** (turn steps with files, output contract with roles / kickers / delivery / refs,
        validation checks, models, thinking, timeouts, retries), **Sessions & storage** (models, limits, settle on
        read, cleanup cron), **Run tracking & tokens** (example now `useAiSession` + turns route), and **Spec
        generation** (still planned; notes the stored plan decisions). The planned "AI sessions" page and "Diagram
        from prompt" are gone; the sidebar nav matches.
      - Getting started: goal 4, core user flow rows 5–6, and the worked example describe clarify → plan → draw.
        Quickstart adds Vercel Cron / `CRON_SECRET`, the AI session migrations, and restarting the worker after a
        model change.
      - Reference: API routes (session and turns routes and the cleanup cron replace `/api/ai/design`), data models
        (`AiSession`, `AiMessage`, `Project.aiSessions`), canvas types (`SHAPE_KICKERS`, fills, roles, edge colours,
        text nodes, legacy palette), hooks (`useAiSession`), environment variables (`CRON_SECRET`, model notes).
      - Contributing: spec index rows S1–S6 with their PRs; stack (`generateText` + `Output.object`, Vercel Cron),
        `lib/ai/` boundary, storage table row for AI chats, invariant 6 widened and invariant 9 added; the stale note
        about `project-overview.md` saying "filesystem" removed.
      - Roadmap: AI design sessions and chat sessions are `BETA`; known issues replace the fixed ones (no run
        timeout, conversation lost on reload, "filesystem" wording) with current ones (adds only, private sessions,
        free-tier quota, preview-model timeouts); five new architecture decisions; a 2026-09-15 → 16 history row.
    - `context/architecture-context.md`: new "AI Design Agent" section (turn = run, turn steps, code-enforced rules,
      settle on read, reliability, model config) and invariants 5–9.
    - `context/project-overview.md`: canvas snapshots are in Vercel Blob (was "filesystem"); AI section adds the
      chat cards and canvas-aware generation, and notes it does not edit or remove existing components.
    - `context/ui-context.md`: the AI sidebar session bar, saved-chat list, and chat cards follow the paper conventions.
    - `README.md`: "AI design agent (local)" setup — API key and model, migrations, running and restarting the worker,
      `CRON_SECRET` in production.
    - Validation:
      - A grep for stale references (`/api/ai/design` outside the token route, `useDesignAgent`, `generateObject`,
        "Diagram from prompt", "lost on reload", "filesystem") across `docs.md`, `README.md`, and the context files
        found one: the Collaboration → Thinking indicator paragraph, now describing AI turns and linking to
        "AI design sessions". The only other match is the intended legacy-palette row in Canvas types.
      - A check of every in-doc anchor link in `docs.md` against its headings: all resolve after that fix.
      - Section order after the splice: Getting started, Platform, AI, Authentication, Design system, Reference,
        Contributing, Roadmap.
      - No code changed, so lint, typecheck, and build were not re-run.
- Generate Spec, unit G1: Markdown technical spec from the canvas, with automatic download (2026-09-16, branch
  `feat/generate-spec`, based on `feat/ai-sessions-docs` because GitHub `main` is missing #25 and #26):
    - Data (migration `20260915195650_add_project_spec`, additive, applied): `TaskRunKind` enum (`DESIGN`, `SPEC`) and
      `TaskRun.kind` (default `DESIGN`, so existing rows are design runs) with a `(projectId, kind, createdAt)` index;
      `Project.specMdPath`, `specRunId`, `specGeneratedAt`, `specStats` (JSON).
    - Shared refactors: `lib/ai/model.ts` (model id, thinking level/budget, `withSchemaRetry`, `modelIdOf`) moved out of
      `design-agent-engine.ts`; `lib/ai/run-failure.ts` (`describeRunFailure` with generic, timeout and passthrough
      messages) used by `session-turns.ts` and the spec store; `lib/canvas-room.ts` (`readRoomSnapshot`) used by both
      tasks. No behaviour change for design turns.
    - `lib/spec/spec-graph.ts`: `buildSpecGraph` — drawn, labelled components (cap 200, total kept), connections
      between them (unknown endpoints and self loops dropped), groups of connected components via union-find in
      reading order (`g1`…) plus a `standalone` group, component refs (`c1`…) in group then position order, kinds from
      kicker or shape, and text notes attached to the nearest group within 600px (otherwise general notes).
    - `lib/spec/mermaid.ts`: `renderGroupMermaid` — `flowchart TD`, one node per component with shape mapping (pill
      `([ ])`, rectangle `[ ]`, cylinder `[( )]`, circle `(( ))`, diamond `{ }`, hexagon `{{ }}`), quoted labels with
      `#`, `"`, `<`, `>`, `|` escaped, arrows for forward / backward (reversed) / bidirectional / none, dashed for
      async and dotted edges, quoted edge labels.
    - `lib/spec/spec-schema.ts`: model output schema (overview, goals, group name/purpose/flow, component
      responsibilities, decisions with alternatives, trade-offs, component refs and source
      `recorded | stated | inferred`, risks with mitigations, open questions); `sanitizeSpecContent` trims to list
      limits, drops unknown groups/components/refs, and removes internal refs such as "(c1)" from prose (a live run
      showed flow steps like "Web Client (c1) sends…"); run result and status types; stage names; abort messages.
    - `lib/spec/spec-prompt.ts` + `spec-engine.ts`: one `generateText` + `Output.object` call with medium thinking, a
      180s timeout, and one schema retry. The prompt lists groups, refs, connections (direction, label, sync/async),
      notes, and recorded decisions, and asks for 3–6 decisions from the diagram in addition to recorded ones (the
      first live run returned only the recorded decision).
    - `lib/spec/render-markdown.ts`: title and generation line, contents, 1 Overview (goals, general notes), 2 Key
      decisions as `> [!IMPORTANT]` callouts (why, alternatives, trade-offs, components, source), 3 System diagrams
      (per group: purpose, Mermaid, component table, flow, notes; "Standalone components"), 4 Component reference
      (kind, diagram, responsibility, receives from / sends to / connected to), 5 Connections table, 6 Risks table and
      open-question checklist, footer with model and time. Table cells escape pipes; fallbacks when prose is missing.
    - `src/trigger/spec-agent.ts`: reads the room, aborts with a user-facing message on an empty canvas or more than 200
      components, generates the prose, renders, returns `{ markdown, stats }`. Single attempt, `maxDuration` 300s,
      stages `reading` → `writing` → `rendering` → `done`.
    - `lib/spec/spec-store.ts` (Trigger and Blob injectable for tests): `getSpecStatus` stores the latest finished SPEC
      run on read (upload to private Blob, update guarded on `specRunId`, delete the duplicate or previous blob) and
      reports pending runs and friendly failures; `loadRecordedDecisions` (the user's unexpired completed RESULT
      messages, newest first, one per title, max 12); `startSpecRun` (409 with the pending run, trigger, `TaskRun` kind
      SPEC); `readSpecMarkdown`.
    - Routes: `GET`/`POST /api/projects/[projectId]/spec` (status; start → 202 / 409 / 502) and
      `GET /api/projects/[projectId]/spec/markdown` (attachment `{project-slug}-spec.md`, via
      `lib/spec/spec-file-name.ts` because route files may only export handlers). Owner or collaborator access.
    - `hooks/use-spec-generator.ts` (mounted in `AiSidebar` so a run is followed while another tab is open): loads the
      status, starts runs (409 follows the existing run), Realtime stages via the existing token route plus 4s
      polling, and downloads automatically when the run the user started is stored.
    - `components/editor/spec-panel.tsx`: description, Generate / Regenerate button with spinner and stage text, error
      alert, latest-spec card (generated time, counts, **Download .md** link), empty and loading states. Replaces the
      placeholder Specs tab in `ai-sidebar.tsx`.
    - Context: `project-overview.md` Spec Generation describes the built behaviour; `architecture-context.md` gains a
      Spec Agent section and invariant 6 covers both tasks; `ui-context.md` lists the Specs tab. `docs.md` (local,
      gitignored) Spec generation page, reference tables, roadmap, decisions, and history updated.
    - Validation checks:
      - `pnpm typecheck` and `pnpm lint` passed (after `next typegen` for the new routes)
      - Offline spec checks (60, no model or DB): grouping, refs, kinds, dropped edges, note placement, 200 cap; Mermaid
        shapes, arrows, escaping; sanitising and limits; Markdown sections, callouts, tables, directions, notes,
        fallbacks, pipe escaping; prompt text; file names; all 13 starter templates rendered with a stub spec (one
        diagram per group, every component referenced, Mermaid line counts match)
      - Ref stripping checks (10): refs removed from every prose field, paragraph breaks kept, other parentheses kept
      - Spec store checks against the database with fake Trigger/Blob (22): empty, design runs ignored, pending, quota /
        abort / unknown / missing failures, invalid output rejected before upload, stored once with finish time and
        stats, not re-retrieved, failed newer run keeps the old spec, concurrent reads store once and delete the
        duplicate and previous blobs, recorded decisions deduplicated and scoped to the user's unexpired completed
        results
      - Live runs through the local Trigger worker on `gemini-3.5-flash-lite` with the Microservices template and a
        recorded decision (throwaway project, room, session, and blob removed): 202 → 409 for a second start → stored in
        about 11s with stats 8 / 8 / 1; Markdown in Blob with all sections, one Mermaid diagram, every component, the
        recorded decision tagged "Recorded during AI design". After the prompt change the second run also inferred an
        "API Gateway Entry Point" decision (2 decisions, 0 warnings).
      - Signed-out requests to the three spec routes are stopped by Clerk (307).
    - Not yet verified: the Specs tab in a signed-in browser (button, stages, auto-download, Download link), Mermaid
      rendering on GitHub, and the ref-stripping fix in a live run.

### Production fixes (2026-09-16)

- **Missing migrations in production:** project creation, AI sessions, and spec generation all failed with Prisma
  `P2022` (`Project.specMdPath` does not exist). The production database (Prisma Postgres) had only the first two
  migrations; `add_ai_sessions` and `add_project_spec` were applied with `prisma migrate deploy` (run manually).
  Nothing applies migrations on deploy yet — open follow-up (CI job or build step).
- **Design agent plan schema:** `designPlanSchema` required at least one component while the plan prompt tells the
  model to list only components to add, so "add to the existing canvas" turns failed with "response did not match
  schema" on both attempts. The model now fills `designPlanDraftSchema` (no non-empty rules); `sanitizePlanDraft`
  drops unnamed components and incomplete decisions, fills a missing role, responsibility, or summary, and returns
  null when nothing is left, which aborts the run with `PLAN_NOTHING_TO_ADD_MESSAGE` (shown to the user as is).
  `withSchemaRetry` now logs finish reason, validation cause, and the start of the response for both attempts.
- **Auth:** GitHub/Google SSO errors from `signIn.sso` / `signUp.sso` are now logged and shown on the card instead of
  being ignored. Production still runs on Clerk development keys (`pk_test_`) — a production instance needs a custom
  domain.
- `lib/prisma.ts` Accelerate URL check fixed (`prisma+postgres://`).
- Validation: `pnpm typecheck` and eslint on changed files passed; sanitizer checked on empty and partial drafts.
  Not yet verified: an "add components" AI turn in production after the Trigger.dev deploy.

### AI agent: text replies and unsupported edits (2026-09-16)

- Problem seen in production: "simplify the graph" and "what is my name?" both ended as a red error ("The plan didn't
  include any new components…"), because the analyze step could only ask, plan, or generate and the agent is add-only.
- `TURN_DECISIONS` gains `reply` (questions about the diagram or plan, greetings, off-topic) and `unsupported`
  (remove / merge / rename / move / restyle / simplify existing components, even mixed with additions).
  `enforceDecision` turns both into `plan` for `answers` and `skip` turns.
- New `reply` result action: the answer (or `UNSUPPORTED_EDIT_MESSAGE`, written in code) is stored as a `TEXT`
  message with no phase or brief change, so a proposed plan stays generatable. A plan with nothing to add now returns
  a `reply` instead of aborting, so it no longer shows as an error; the passthrough stays for runs on older task
  versions. These turns make no extra model call.
- Validation: `pnpm typecheck` and eslint passed; decision rules checked offline; live analyze on
  `gemini-3.5-flash-lite` with a 10-component CI/CD canvas classified all five test messages as expected
  (simplify → unsupported, name → reply, "why a separate CD Deployer" → reply, add Slack notifier → plan,
  remove + add → unsupported).
- Still to do: editing existing components (a separate feature) and layout quality.
