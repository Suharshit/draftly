# Architecture Context

## Stack

| Layer     | Technology                  | Role   |
| --------- | --------------------------- | ------ |
| Framework | Next.js + TypeScript        | App infrastructure and routing |
| UI        | Tailwind + shadcn/ui        | Visual components and styling |
| Auth      | Clerk                       | Authentication and session management |
| Database  | Prisma + PostgreSQL         | Persistent metadata and relational storage |
| Real-time | Liveblocks                  | Collaborative canvas synchronization |
| Canvas    | React Flow                  | Node-based visual graph management |

## System Boundaries

- `app/` — Route definitions, page layouts, and API handlers.
- `components/` — Reusable UI (foundation) and feature-specific logic (layers).
- `context/` — Source of truth for product and technical specifications.
- `public/` — Static assets and media.

## Storage Model

- **Database**: Stores project metadata, user ownership, collaborator links, and references to generated artifacts.
- **File System / Blob Storage**: Stores large generated artifacts including Markdown technical specs and canvas snapshots.

## Auth and Access Model

- Every user signs in via Clerk to establish identity.
- Every project has a single owner who created it.
- Only the owner or an explicitly added collaborator can mutate project resources or edit the canvas.

## Invariants

1. Request handlers do not run long-lived background work; use off-chain patterns for intensive tasks.
2. Metadata belongs in the database; large assets must be offloaded to blob/file storage.
3. API routes must validate authentication and resource ownership before any mutation.
4. Foundation components (`components/ui/*`) must remain generic and default.

