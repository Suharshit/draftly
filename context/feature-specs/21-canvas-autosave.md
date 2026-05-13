# Canvas Autosave and State Persistence

Add autosave and loading for the collaborative canvas so project state is persisted. This is critical before adding AI generation features. Canvas JSON should be stored in Vercel Blob, and the saved blob URL should be stored on the Prisma project record.

## What to Install

```bash
pnpm add @vercel/blob
```

## Existing Context & Constraints

- We already have a field `canvasJsonPath String?` on the `Project` model in `prisma/models/project.prisma`. Use this to store the blob URL.
- Prisma stores project metadata; Vercel Blob stores the actual canvas JSON payload (nodes and edges).
- Do not add large JSON payloads directly to the Prisma database. Keep the database lean.
- Use `pnpm` for any package installations.

## Implementation Steps

### 1. Canvas API Route (`app/api/projects/[projectId]/canvas/route.ts`)

**`PUT` (Save)**
- Must verify user authentication and confirm the user has access to the project.
- **Payload Validation**: Use Zod or a similar schema validator to ensure the parsed body contains valid `nodes` and `edges` arrays. This prevents saving corrupted state that could crash the editor on load.
- Receive the current canvas state (`{ nodes, edges }`) from the request body.
- Upload this JSON to Vercel Blob using `@vercel/blob`'s `put` method. Hint: `put(\`canvas-${projectId}.json\`, JSON.stringify(body), { access: 'public', addRandomSuffix: true })`.
- Update the Prisma `Project` record's `canvasJsonPath` to match the returned Vercel Blob URL.
- If a previous `canvasJsonPath` URL exists, you may optionally use `del` from Vercel Blob to clean it up before saving the new one (if the blob URL uses a random suffix) to save storage limits.
- Return success.

**`GET` (Load)**
- Must verify user authentication and access.
- Read the project's `canvasJsonPath` via Prisma.
- If `canvasJsonPath` is present, fetch the JSON directly from the blob URL and return it to the client.
- If missing, return an empty layout `{ nodes: [], edges: [] }`.

### 2. Autosave Hook (`hooks/use-canvas-autosave.ts`)

- Create a custom hook that watches the canvas nodes and edges.
- Debounce saves (e.g., 2-3 seconds) to avoid excessive writes during dragging or rapid typing.
- **Multiplayer Considerations**: Only trigger the autosave if the changes were made locally, or coordinate saves so that not every connected user uploads to Vercel Blob simultaneously. 
- **Page Unload**: Add a `beforeunload` listener to warn the user or attempt a synchronous `fetch` (with `keepalive: true`) if they try to close the tab with unsaved changes.
- Call the `PUT /api/projects/[projectId]/canvas` route with the debounced payload.
- Return the current sync status (`'idle' | 'saving' | 'saved' | 'error'`) to be consumed by the UI.
- Implement basic retry logic or notify the user explicitly if sync stays in `'error'` state.

### 3. Load Canvas State in the Editor

Modify the editor initialization logic (e.g., in `components/editor/canvas-wrapper.tsx` or `canvas-flow.tsx`):
- When the editor loads, check if the Liveblocks room already has nodes/edges present.
- **IMPORTANT**: If the room has data, skip loading the blob to avoid overwriting active collaboration state.
- If the room is empty, fetch the saved state from `GET /api/projects/[projectId]/canvas`.
- Populate React Flow / Liveblocks with the fetched data.

### 4. UI Indicators

Modify `components/editor/editor-navbar.tsx` or the top control bar:
- Add a small text or icon indicator for the save status, binding it to the hook's `saveStatus` output.
- Show "Saving..." when active, "Saved" when synced, and an error state if it fails.

## Storage Pattern

To summarize the system architecture for storage:
- **Prisma (Database)**: Stores only the relational data, project permissions, metadata (`name`, `status`), and the `canvasJsonPath` (a string URL). This ensures database queries remain fast and we don't hit database row-size limits.
- **Vercel Blob (Object Storage)**: Stores the actual unstructured JSON document representing the complete canvas state (`nodes` and `edges`). This is much more cost-effective and performant for larger payloads that do not require relational querying.