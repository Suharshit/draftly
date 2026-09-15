import { ApiError, runs, tasks } from "@trigger.dev/sdk/v3";
import { del, get, put } from "@vercel/blob";

import { readResultPayload } from "@/lib/ai/agent-schema";
import { describeRunFailure } from "@/lib/ai/run-failure";
import { prisma } from "@/lib/prisma";
import {
  RECORDED_DECISION_LIMIT,
  SPEC_EMPTY_CANVAS_MESSAGE,
  SPEC_TOO_LARGE_MESSAGE,
  specAgentResultSchema,
  specStatsSchema,
  type RecordedDecision,
  type SpecAgentPayload,
  type SpecStatus,
} from "@/lib/spec/spec-schema";
import type { specAgentTask } from "@/src/trigger/spec-agent";

// ---------------------------------------------------------------------------
// Spec storage
//
// One spec per project: the latest Markdown lives in private Vercel Blob
// storage, and the project row holds its URL, the run that produced it, when,
// and its counts. Like AI turns, a finished spec run is stored when the status
// is read, so the task never touches the database or blob storage and a spec
// is saved even if the tab closed mid-run.
// ---------------------------------------------------------------------------

export type RetrievedSpecRun =
  | { state: "running" }
  | { state: "missing" }
  | { state: "failed"; message?: string }
  | { state: "succeeded"; output: unknown; finishedAt: Date };

/** External calls, injectable so the storing logic can be tested without Trigger.dev or Blob. */
export interface SpecStoreDeps {
  retrieveRun: (runId: string) => Promise<RetrievedSpecRun>;
  uploadMarkdown: (projectId: string, markdown: string) => Promise<string>;
  deleteBlob: (url: string) => Promise<void>;
}

const CANCELLED_MESSAGE = "The spec run was cancelled.";

async function retrieveFromTrigger(runId: string): Promise<RetrievedSpecRun> {
  try {
    const run = await runs.retrieve<typeof specAgentTask>(runId);
    if (run.isSuccess) {
      return { state: "succeeded", output: run.output, finishedAt: run.finishedAt ?? new Date() };
    }
    if (run.isCancelled) {
      return { state: "failed", message: CANCELLED_MESSAGE };
    }
    if (run.isFailed) {
      return { state: "failed", message: run.error?.message };
    }
    return { state: "running" };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { state: "missing" };
    }
    console.error("[spec] failed to retrieve run", runId, error);
    return { state: "running" };
  }
}

const defaultDeps: SpecStoreDeps = {
  retrieveRun: retrieveFromTrigger,
  uploadMarkdown: async (projectId, markdown) => {
    const uploaded = await put(`spec-${projectId}.md`, markdown, {
      access: "private",
      addRandomSuffix: true,
      contentType: "text/markdown; charset=utf-8",
    });
    return uploaded.url;
  },
  deleteBlob: async (url) => {
    await del(url);
  },
};

const specSelect = {
  specMdPath: true,
  specRunId: true,
  specGeneratedAt: true,
  specStats: true,
} as const;

type ProjectSpecRow = {
  specMdPath: string | null;
  specRunId: string | null;
  specGeneratedAt: Date | null;
  specStats: unknown;
};

function toStatus(
  project: ProjectSpecRow | null,
  { pendingRunId = null, lastFailure = null }: { pendingRunId?: string | null; lastFailure?: string | null } = {},
): SpecStatus {
  const stats = specStatsSchema.safeParse(project?.specStats);
  const spec =
    project?.specMdPath && project.specRunId && project.specGeneratedAt
      ? {
          runId: project.specRunId,
          generatedAt: project.specGeneratedAt.toISOString(),
          stats: stats.success ? stats.data : null,
        }
      : null;
  return { spec, pendingRunId, lastFailure };
}

/**
 * The project's spec status. When the latest spec run finished after the
 * stored spec, its Markdown is uploaded and recorded first. The update is
 * guarded on the run id, so concurrent reads store a run only once.
 */
export async function getSpecStatus(projectId: string, deps: SpecStoreDeps = defaultDeps): Promise<SpecStatus> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: specSelect });
  if (!project) {
    return toStatus(null);
  }

  const latestRun = await prisma.taskRun.findFirst({
    where: { projectId, kind: "SPEC" },
    orderBy: { createdAt: "desc" },
    select: { runId: true },
  });
  if (!latestRun || latestRun.runId === project.specRunId) {
    return toStatus(project);
  }

  const run = await deps.retrieveRun(latestRun.runId);
  if (run.state === "running") {
    return toStatus(project, { pendingRunId: latestRun.runId });
  }
  if (run.state === "missing") {
    return toStatus(project, { lastFailure: "The spec run could not be found. Try again." });
  }
  if (run.state === "failed") {
    console.error("[spec] spec-agent run failed", latestRun.runId, run.message);
    return toStatus(project, {
      lastFailure: describeRunFailure(run.message, {
        generic: "Something went wrong generating the spec. Try again.",
        timeout: "Spec generation took too long. Try again.",
        passthrough: [SPEC_EMPTY_CANVAS_MESSAGE, SPEC_TOO_LARGE_MESSAGE, CANCELLED_MESSAGE],
      }),
    });
  }

  const parsed = specAgentResultSchema.safeParse(run.output);
  if (!parsed.success) {
    console.error("[spec] unexpected spec-agent output", latestRun.runId, parsed.error.issues);
    return toStatus(project, { lastFailure: "Spec generation returned an unexpected result. Try again." });
  }

  const url = await deps.uploadMarkdown(projectId, parsed.data.markdown);
  const { count } = await prisma.project.updateMany({
    where: { id: projectId, OR: [{ specRunId: null }, { specRunId: { not: latestRun.runId } }] },
    data: {
      specMdPath: url,
      specRunId: latestRun.runId,
      specGeneratedAt: run.finishedAt,
      specStats: parsed.data.stats,
    },
  });

  if (count === 0) {
    // A concurrent read stored this run first; drop the duplicate upload.
    await deps.deleteBlob(url).catch(() => undefined);
  } else if (project.specMdPath && project.specMdPath !== url) {
    await deps.deleteBlob(project.specMdPath).catch(() => undefined);
  }

  return toStatus(await prisma.project.findUnique({ where: { id: projectId }, select: specSelect }));
}

/** Decisions from the user's unexpired AI design sessions in this project, newest first, one per title. */
export async function loadRecordedDecisions(projectId: string, userId: string): Promise<RecordedDecision[]> {
  const messages = await prisma.aiMessage.findMany({
    where: {
      kind: "RESULT",
      status: "COMPLETE",
      session: { projectId, userId, expiresAt: { gt: new Date() } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { payload: true },
  });

  const seen = new Set<string>();
  const decisions: RecordedDecision[] = [];
  for (const message of messages) {
    for (const decision of readResultPayload(message.payload)?.decisions ?? []) {
      const key = decision.title.trim().toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      decisions.push({
        title: decision.title,
        choice: decision.choice,
        rationale: decision.rationale,
        alternatives: decision.alternatives,
      });
    }
  }
  return decisions.slice(0, RECORDED_DECISION_LIMIT);
}

export type StartSpecResult =
  | { ok: true; runId: string }
  | { ok: false; status: 409; runId: string; error: string }
  | { ok: false; status: 502; error: string };

/** Starts a spec run for the project, unless one is already in progress. */
export async function startSpecRun({
  projectId,
  userId,
  projectName,
}: {
  projectId: string;
  userId: string;
  projectName: string;
}): Promise<StartSpecResult> {
  const current = await getSpecStatus(projectId);
  if (current.pendingRunId) {
    return { ok: false, status: 409, runId: current.pendingRunId, error: "A spec is already being generated" };
  }

  const payload: SpecAgentPayload = {
    roomId: projectId,
    projectName,
    recordedDecisions: await loadRecordedDecisions(projectId, userId),
  };

  let runId: string;
  try {
    const handle = await tasks.trigger<typeof specAgentTask>("spec-agent", payload);
    runId = handle.id;
  } catch (error) {
    console.error("[spec] failed to trigger spec-agent", error);
    return { ok: false, status: 502, error: "Spec service unavailable" };
  }

  await prisma.taskRun.create({ data: { runId, projectId, userId, kind: "SPEC" } });
  return { ok: true, runId };
}

/** The stored spec's Markdown, or null when there is none or it cannot be read. */
export async function readSpecMarkdown(projectId: string): Promise<string | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { specMdPath: true } });
  if (!project?.specMdPath) {
    return null;
  }

  try {
    const result = await get(project.specMdPath, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) {
      return null;
    }
    return await new Response(result.stream).text();
  } catch (error) {
    console.error("[spec] failed to read spec blob", projectId, error);
    return null;
  }
}
