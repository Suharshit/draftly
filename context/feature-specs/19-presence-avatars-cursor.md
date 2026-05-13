Show active room participants inside the editor canvas view,
without changing the editor home navbar.

## Implementation

1. Keep the existing navbar behavior as-is.
    - do not change the editor home navbar.
    - do not move or redesign the shared navbar component globally.
    - if the editor home and editor canvas use the same navbar component, make sure this presence UI only appears in the canvas/editor room view (e.g., by passing a `showPresence={true}` prop or checking if the route is within a specific project room).

2. Add the participant avatar group inside the editor canvas area.
    - position it in the top-right corner of the editor canvas view, overlaid on top of the React Flow canvas (absolute positioning with a high z-index).
    - keep it visually separate from the main navbar actions.
    - get the current user's ID from the active Clerk session using `useUser()`.
    - fetch the collaborators using Liveblocks `useOthers()`.
    - filter the Liveblocks presence list to exclude any entry whose user ID matches the current Clerk user ID.
    - render the filtered list as collaborator avatars only.
    - render the current user separately using the existing Clerk `<UserButton />` - do not render a second avatar for them from the Liveblocks presence list.
    - keep collaborator avatars and the Clerk UserButton the same size (e.g., `h-8 w-8`) so the group looks visually consistent.
    - collaborator avatars are display-only, not interactive.
    - show a vertical divider (`border-l` or `<Separator orientation="vertical" />`) between the collaborator avatars and the Clerk UserButton only when at least one collaborator exists.
    - if no collaborators are present, show only the Clerk UserButton with no divider.

3. Render collaborator avatars.
    - wrap them in a flex container with `-space-x-2` to create an overlapping stack effect.
    - use profile photos when available (passed via Liveblocks `UserMeta.info`).
    - fall back to initials using `shadcn/ui` Avatar fallback when there is no image.
    - show up to five collaborator avatars.
    - show a `+N` overflow chip when there are more than five (e.g., `+3`).
    - add a subtle ring (`ring-2 ring-background`) so avatars stay readable and isolated on the dark canvas.

4. Add live cursors to the canvas.
    - render cursors for other participants only using `useOthers()`, never the current user.
    - use the existing Liveblocks `useUpdateMyPresence()` state to broadcast cursor position.
    - **Crucial React Flow Detail**: update cursor position on React Flow's wrapper `onPointerMove` event. Wrap the canvas and capture the client X/Y. 
    - Use React Flow's `screenToFlowPosition({ x, y })` from `useReactFlow()` so that the cursors remain accurate regardless of canvas panning or zooming.
    - clear cursor to `null` on `onPointerLeave`.
    - show a small colored custom SVG pointer with a name badge attached.
    - match the pointer and badge color to the participant's assigned presence color (e.g., mapping connection IDs to a set of colors).

5. Define the shared presence type in `liveblocks.config.ts`.

    Presence should include:
    - `cursor`: `{ x: number; y: number } | null`
    - `thinking`: boolean

    UserMeta should include user information tied from Clerk:
    - `id`: string
    - `info`: `{ name: string; avatar: string; color: string }`

## Scope Limits

- don't add participant avatars to the shared navbar globally.
- don't remove existing navbar actions like Save, Import, Share, or AI.
- don't replace Clerk user/Profile/Logout behaviour.
- don't make collaborator avatars interactive.
- don't change canvas node or edge behavior.