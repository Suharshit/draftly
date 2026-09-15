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
- **AI sessions (database, short-lived)**: Design agent chats live in `AiSession` / `AiMessage` (small text + JSON payloads).
  Sessions are private to the user who created them within a project, expire 7 days after last activity
  (`expiresAt` slides forward on activity), are capped at 10 per user per project and 60 messages each, and are
  removed by a daily Vercel Cron (`/api/cron/ai-sessions/cleanup`, `CRON_SECRET`). Reads ignore expired rows, so
  expiry holds even before cleanup runs. Deleting a project cascades to its sessions.

## AI Design Agent

- **One turn = one Trigger.dev run** (`design-agent`). Routes validate input and access, trigger the run, and
  return `202`; they never call the model.
- **A turn** reads the Liveblocks room read-only and summarises it (`lib/ai/canvas-summary.ts`), then analyzes the
  message (updates the requirements brief and decides ask / plan / generate), drafts or revises a plan, or
  generates the diagram for the approved plan, validates it (`lib/ai/graph-validation.ts`), makes at most one repair
  call, and writes it with `mutateFlow`.
- **Code enforces the rules** the model is asked to follow (question rounds, skip, no generating without a plan) and
  fills in everything render-related: node and edge types, sizes, fills from `NODE_ROLES`, dashed async edges,
  connection points, and layout. Existing components are referenced by `ex-N` refs; generated duplicates fold into
  existing nodes.
- **Turns settle on read.** The turns route stores a `PENDING` reply with the run id; reading the session retrieves
  the run, validates its output with zod, and stores `QUESTIONS`, `PLAN`, or `RESULT`. The task has no database
  access and never writes blobs.
- **Reliability:** per-call timeouts (analyze 90s, plan 150s, generate 120s), task `maxDuration` 300s, a single task
  attempt, one retry per call on a schema mismatch, list limits trimmed in code instead of `maxItems`, and friendly
  failure messages with raw provider errors kept in server logs.
- **Model:** `GOOGLE_GENERATIVE_AI_MODEL`, with a thinking level (Gemini 3+) or thinking budget (Gemini 2.x) per step.

## Auth and Access Model

- Every user signs in via Clerk to establish identity.
- Every project has a single owner who created it.
- Only the owner or an explicitly added collaborator can mutate project resources or edit the canvas.

## Invariants

1. Request handlers do not run long-lived background work; use off-chain patterns for intensive tasks.
2. Metadata belongs in the database; large assets must be offloaded to blob/file storage.
3. API routes must validate authentication and resource ownership before any mutation.
4. Foundation components (`components/ui/*`) must remain generic and default.
5. Generated canvas content reaches clients only through Liveblocks, never through an HTTP response.
6. The design task never writes to the database or blob storage; the session routes store AI turns.
7. A project's id is its Liveblocks room id.
8. Run tokens are minted only by `POST /api/ai/design/token`, after a `TaskRun` ownership check.
9. Model output is validated (zod) before it is stored or drawn.

