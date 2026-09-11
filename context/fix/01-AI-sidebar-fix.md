Wire the AI sidebar to the design agent so a prompt typed in the sidebar produces nodes and
edges on the canvas.

The sidebar is finished UI with no backend connection, and the design task is a stub. The
backend contract between them was built in `context/feature-specs/22-design-agent-api.md` and
is correct — this unit fills in the two ends and leaves that contract untouched.

## Context

What is broken:

- `components/editor/ai-sidebar.tsx` is local state only. `sendMessage` pushes a `ChatMessage`
  into `useState` and clears the input. Every message it can construct is `role: "user"`; there
  is no code path that produces an assistant reply, and nothing calls `/api/ai/design`.
- `src/trigger/design-agent.ts` logs its payload and echoes it back. No AI call, no canvas write.
- `@trigger.dev/react-hooks` is installed and imported nowhere.
- `ai` and `@ai-sdk/google` are installed and imported nowhere.

What already exists and must be reused rather than rebuilt:

- `POST /api/ai/design` — Clerk auth, `getAccessibleProject` check, triggers the task, writes a
  `TaskRun` row, returns `202 { runId }`.
- `POST /api/ai/design/token` — looks up `TaskRun` by `(runId, userId)` and mints a Trigger
  public token scoped to `read: { runs: runId }`. This is the ownership gate; without the
  `TaskRun` row any signed-in user could request a token for any run.
- `getLiveblocksClient()` in `lib/liveblocks.ts` — cached `@liveblocks/node` client.
- `CanvasNode`, `CanvasEdge`, `CANVAS_NODE_TYPE` (`"canvasNode"`), `CANVAS_EDGE_TYPE`
  (`"canvasEdge"`), `SHAPE_DEFAULTS`, and `NODE_COLOR_PALETTE` in `types/canvas.ts`.
- `projectId` is already in scope in `components/editor/editor-workspace-shell.tsx`; it is
  simply not passed to `AiSidebar` at the render site.
- The `thinking: boolean` field in the `Presence` type (`liveblocks.config.ts`) is initialised
  in `canvas-wrapper.tsx` and never set anywhere. It is reserved for this feature.

## Prerequisites

1. `zod` is **not installed**. The `ai` package declares it as a peer dependency
   (`^3.25.76 || ^4.1.8`) and `generateObject` needs it. Install it pinned to an exact version.

2. `GOOGLE_GENERATIVE_AI_API_KEY` is present in `.env.example` but **not set in `.env.local`**.
   Nothing will run without it. Add it, and document it in the same style as the existing
   entries. It is server-only: it must never take a `NEXT_PUBLIC_` prefix.

## Implementation

1. Define the generation schema.

   Create a Zod schema describing what the model must return: a list of nodes and a list of
   edges. Put it where both the task and any future caller can import it.

   Constrain it to what the canvas can actually render:
   - node: `id`, `label`, `position: { x, y }`, and a `shape` drawn from `CanvasShape`
   - edge: `id`, `source`, `target`, optional `label`, and an `arrowDirection` from
     `CanvasEdgeData`
   - do not let the model invent colors as free strings; if colors are generated at all, they
     must come from `NODE_COLOR_PALETTE` ids

   Map the model output into `CanvasNode` / `CanvasEdge` in code, not in the prompt. The node
   `type` must be `CANVAS_NODE_TYPE` and the edge `type` must be `CANVAS_EDGE_TYPE`, and sizes
   should come from `SHAPE_DEFAULTS` rather than from the model.

2. Implement the design task in `src/trigger/design-agent.ts`.

   Keep the existing task id (`design-agent`) and payload (`prompt`, `roomId`) — the route
   triggers it by that id and the `TaskRun` row is already keyed to it.

   The task should:
   - call `generateObject` with `@ai-sdk/google` and the schema from step 1
   - lay the nodes out with non-overlapping positions before writing them
   - write them into the Liveblocks room with `mutateFlow` from `@liveblocks/react-flow/node`,
     passing the client from `getLiveblocksClient()`:

     ```ts
     await mutateFlow({ client, roomId }, (flow) => {
       flow.addNodes(nodes);
       flow.addEdges(edges);
     });
     ```

   - report progress with the `metadata` API from `@trigger.dev/sdk/v3` so the sidebar can show
     stages rather than a spinner

   Do not override `storageKey`. The client calls `useLiveblocksFlow` in
   `components/editor/canvas-flow.tsx` without one, so the server side must use the default or
   the two will write to different stores.

3. Pass `projectId` into the sidebar.

   `AiSidebar` currently takes only `open` and `onClose`. Add `projectId` and pass it from
   `editor-workspace-shell.tsx`, where it is already available.

4. Call the API from `sendMessage`.

   POST to `/api/ai/design` with `{ prompt, roomId: projectId, projectId }`. The route rejects
   the request unless `roomId === projectId`, so send the same value for both.

   Handle the states the route actually returns: `202` with a `runId`, `400` for a malformed
   body, `401` unauthenticated, `403` when the user cannot access the project. Keep the input
   disabled while a run is in flight.

5. Subscribe to the run.

   POST the `runId` to `/api/ai/design/token`, then pass the returned token and the run id to
   `useRealtimeRun` from `@trigger.dev/react-hooks`.

   Render run status as an assistant-side message. The message list currently has no `assistant`
   branch, so add one. Surface failures — a failed run must not leave the sidebar sitting on a
   spinner.

   Set the `thinking` presence flag while a run is active so collaborators in the room see that
   a generation is in progress, and clear it when the run settles.

## Constraints That Must Not Be Broken

1. **The generated canvas must arrive through Liveblocks, not through the HTTP response.**
   The task writes into the room; every viewer sees the result, and the existing autosave in
   `hooks/use-canvas-autosave.ts` persists it. Returning nodes from the route and applying them
   locally would desync every other collaborator.

2. **The token route is an authorization boundary.** Do not relax the `TaskRun` lookup, widen
   the token scope beyond the single run, or mint tokens anywhere else.

3. **Secrets stay on the server.** The Google API key and the Liveblocks secret are used only
   inside the task and route handlers. The browser gets the run-scoped public token and nothing
   else.

4. **Do not write canvas JSON to blob storage from the task.** Persistence is the canvas
   autosave path's job. Two writers to the same artifact will race.

## Scope Limits

- Do not implement the Specs tab. "Generate Spec" and its download stay inert; that is a
  separate unit.
- Do not change `POST /api/ai/design` or `POST /api/ai/design/token` beyond what steps 4 and 5
  consume. They are already correct.
- Do not change the `TaskRun` model, `lib/project-access.ts`, or `lib/prisma.ts`.
- Do not change the Liveblocks auth route or the room/project id convention.
- Do not add streaming token-by-token chat. Structured output plus run status is the target.
- Do not add a second AI provider or an abstraction layer over providers.

## Check When Done

- Typing a prompt in the sidebar creates a run and the nodes appear on the canvas without a
  page reload.
- A second browser signed in as a collaborator sees the same nodes appear, and sees the
  `thinking` indicator while the run is active.
- The generated nodes are editable, movable, and survive a reload (the autosave path picked
  them up).
- A prompt sent for a project the user cannot access returns 403 and is surfaced in the UI.
- A failed run shows an error in the sidebar rather than an indefinite loading state.
- `GOOGLE_GENERATIVE_AI_API_KEY` is set locally and carries no `NEXT_PUBLIC_` prefix.
- `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass.

## After Done

Update `context/progress-tracker.md`. If the shape of the AI flow ends up differing from what
`context/architecture-context.md` describes, update that file too — otherwise leave it alone.
