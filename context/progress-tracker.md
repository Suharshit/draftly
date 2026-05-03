# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes

## Current Phase

- In Progress

## Current Goal

- Complete the next feature spec unit after `05-prisma.md`.

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

## In Progress

- None.

## Next Up

- Select and implement the next feature spec unit after `05-prisma.md`.

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
