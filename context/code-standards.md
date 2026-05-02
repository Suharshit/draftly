# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes, do not layer workarounds.
- Do not mix unrelated concerns in one component or route.

## TypeScript

- Strict mode is required throughout the project.
- Avoid any — use explicit interfaces or narrowly scoped types.
- Validate unknown external input at system boundaries before trusting it.

## Next.js

- Default to server components.
- Add use client only when browser interactivity requires it.
- Keep route handlers focused on a single responsibility.

## Styling

- Use CSS custom property tokens — no hardcoded hex values.
- Follow the border radius scale defined in ui-context.md.

## API Routes

- Validate and parse request input before any logic runs.
- Enforce auth and ownership before any mutation.
- Return consistent, predictable response shapes.

## Data and Storage

- Metadata belongs in the database.
- Large generated content belongs in file or blob storage.
- Do not store large content directly in the database.

## File Organization

- `app/` — Next.js App Router folders and routes.
- `context/` — Product and technical specification files.
- `components/` — Shared UI or feature-specific components.
- `public/` — Static assets.

