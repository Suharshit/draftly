# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes

## Current Phase

- In Progress

## Current Goal

- Complete the next feature spec unit after `10-liveblocks-setup.md`.

## Completed

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

## In Progress

- None.

## Next Up

- Select and implement the next feature spec unit after `10-liveblocks-setup.md`.

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
      - `pnpm lint` passed
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
