# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes

## Current Phase

- In Progress

## Current Goal

- Complete `03-auth.md` with Clerk provider setup, route protection, and auth entry flows.

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

## In Progress

- None.

## Next Up

- Select and implement the next feature spec unit after `03-auth.md`.

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
