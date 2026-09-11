Prepare the database schema for the Prisma-to-Supabase migration.

This is step 1 of the migration. Prisma is still the data layer after this change and stays
that way until a later step. The goal here is to make the schema survive without Prisma:
give the database real defaults for the columns Prisma currently fills client-side, and
rename tables and columns to snake_case so the Supabase client reads naturally later.

Application code must not change in this step. Prisma field names stay the same; only the
physical database names change, via `@map` and `@@map`.

## Context

- Database is Supabase Postgres, project `draftly` (ref `ffwgjnvchkfvysbcmmfx`).
- `Project`, `ProjectCollaborator`, and `TaskRun` all have zero rows. This is the cheapest
  possible moment to rename. Do it now.
- Models live in `prisma/models/project.prisma` and `prisma/models/task-run.prisma`.

## Two Constraints That Must Not Be Broken

1. **`id` stays `TEXT`. Do not convert it to `uuid`.**
   Project ids are human-readable slugs generated on the client. `hooks/use-project-actions.ts`
   builds `<slugified-name>-<6-char-suffix>` (for example `payment-system-k3f9x2`) and posts it
   as `id` when creating a project. That same value is the Liveblocks room id and appears in the
   `/editor/[projectId]` URL. A `uuid` column type would reject it and break project creation.
   The database default is only a fallback for the code path where no id is supplied.

2. **`prisma migrate dev` will not work here.**
   It requires a shadow database, which Supabase does not permit over the pooled connection,
   and there is no local Postgres or Docker available. Author the migration SQL by hand and
   apply it with `prisma migrate deploy`. See the Migration section.

## Rename Map

Tables:

| Current               | New                     |
| --------------------- | ----------------------- |
| `Project`             | `projects`              |
| `ProjectCollaborator` | `project_collaborators` |
| `TaskRun`             | `task_runs`             |

Enum type `ProjectStatus` becomes `project_status`. Keep its values as `DRAFT` and `ARCHIVED`.

Columns, on every table that has them:

| Current             | New                   |
| ------------------- | --------------------- |
| `ownerId`           | `owner_id`            |
| `canvasJsonPath`    | `canvas_json_path`    |
| `createdAt`         | `created_at`          |
| `updatedAt`         | `updated_at`          |
| `projectId`         | `project_id`          |
| `collaboratorEmail` | `collaborator_email`  |
| `runId`             | `run_id`              |
| `userId`            | `user_id`             |

`id`, `name`, `description`, and `status` keep their names.

Rename indexes, primary keys, unique constraints, and the foreign key to match the new table
names so nothing is left carrying the old PascalCase identifiers.

## Schema Changes

In `prisma/models/project.prisma` and `prisma/models/task-run.prisma`:

1. Add `@@map` to each model and `@map` to each renamed column, using the rename map above.
   Add `@@map("project_status")` to the `ProjectStatus` enum. Prisma-side field names stay
   unchanged, so no route or lib file needs editing.

2. Change every `id` field default from `cuid()` to
   `@default(dbgenerated("gen_random_uuid()::text"))`.
   The `::text` cast is required because the column is `TEXT`, not `uuid`. This puts the
   default in the database instead of in the Prisma client.

3. Add `@default(now())` to `Project.updatedAt`, keeping the existing `@updatedAt` attribute.
   `@updatedAt` only covers writes that go through Prisma; the default covers inserts, and the
   trigger below covers updates that do not.

## Migration

Create `prisma/migrations/<timestamp>_snake_case_schema_and_db_defaults/migration.sql`.

Write it as `ALTER TABLE ... RENAME` statements rather than drop-and-recreate. The tables are
empty so either would work today, but a rename keeps the migration safe to replay against an
environment that does have rows.

The migration must:

- rename the enum type, the three tables, and every column in the rename map
- rename the primary keys, indexes, unique constraint, and the `ProjectCollaborator` foreign key
- set the `id` default on all three tables to `gen_random_uuid()::text`
- set the `updated_at` default on `projects` to `now()`
- install the `updated_at` trigger:

```sql
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at
  before update on public.projects
  for each row
  execute procedure extensions.moddatetime(updated_at);
```

Apply with `pnpm prisma migrate deploy`, then `pnpm prisma generate`.

If the generated client and the database disagree afterwards, use
`pnpm prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/ --script`
to see the drift and correct the migration. Do not use `prisma db push`; it would skip
migration history.

## Scope Limits

- Do not install `@supabase/supabase-js` or add a Supabase client.
- Do not touch any route handler, `lib/prisma.ts`, `lib/project-access.ts`, or `lib/project-data.ts`.
- Do not remove Prisma, its dependencies, or `prisma generate` from the build.
- Do not enable RLS or write policies.
- Do not change `id` semantics or how the client generates project ids.
- Do not rename `status` enum values.

## Check When Done

- `pnpm prisma migrate deploy` applies cleanly and `pnpm prisma migrate status` reports no drift.
- Supabase shows `projects`, `project_collaborators`, and `task_runs`; no PascalCase tables remain.
- Inserting a `projects` row with no `id` and no `updated_at` succeeds, and both columns come back
  populated. This is the check that actually proves the step worked, because it is what an insert
  through the Supabase client will do in a later step.
- Updating that row changes `updated_at` without Prisma setting it.
- Delete the test row afterwards.
- The diff touches only `prisma/`, `app/generated/prisma/`, and this spec. No application code changed.
- `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass.
- Creating a project through the running app still works and the project id is still the slug
  shown in the create dialog.

## After Done

Update `context/progress-tracker.md`. Leave `context/architecture-context.md` alone; the data
layer is still Prisma until a later step changes it.
