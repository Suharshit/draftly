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

## Spec Agent

- **One spec = one Trigger.dev run** (`spec-agent`). `POST /api/projects/[projectId]/spec` starts it (409 with the
  pending run id if one is already running) and records a `TaskRun` with `kind: SPEC`.
- **The run** reads the room read-only, builds the spec graph in code (`lib/spec/spec-graph.ts`: groups of connected
  components, refs, notes), makes one structured model call for the prose (`lib/spec/spec-engine.ts`, validated and
  sanitised against the graph), and renders the Markdown in code (`lib/spec/render-markdown.ts`, Mermaid from
  `lib/spec/mermaid.ts`). It aborts with a user-facing message on an empty canvas or more than 200 components.
- **Stored on read.** `GET /api/projects/[projectId]/spec` retrieves the latest spec run; when it has finished and is
  not yet stored, the Markdown is uploaded to private Vercel Blob storage and `Project.specMdPath`, `specRunId`,
  `specGeneratedAt`, and `specStats` are updated in a write guarded on the run id. The previous blob is deleted.
  `GET /api/projects/[projectId]/spec/markdown` serves the file as a download.
- **Recorded decisions** from the requesting user's unexpired AI sessions (their `RESULT` payloads) are passed to the
  run so the spec can highlight them.
- Model configuration, thinking settings, schema retry, and friendly failure messages are shared with the design agent
  (`lib/ai/model.ts`, `lib/ai/run-failure.ts`).

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
6. Background AI tasks (design and spec agents) never write to the database or blob storage; the session and spec
   routes store their results.
7. A project's id is its Liveblocks room id.
8. Run tokens are minted only by `POST /api/ai/design/token`, after a `TaskRun` ownership check.
9. Model output is validated (zod) before it is stored or drawn.

