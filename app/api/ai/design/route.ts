import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk/v3";

import { prisma } from "@/lib/prisma";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import type { designAgentTask } from "@/src/trigger/design-agent";

interface DesignRequestBody {
  prompt: string;
  roomId: string;
  projectId: string;
}

function parseRequestBody(value: unknown): DesignRequestBody | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.prompt !== "string" ||
    typeof candidate.roomId !== "string" ||
    typeof candidate.projectId !== "string"
  ) {
    return null;
  }

  const prompt = candidate.prompt.trim();
  const roomId = candidate.roomId.trim();
  const projectId = candidate.projectId.trim();

  if (!prompt || !roomId || !projectId) {
    return null;
  }

  return { prompt, roomId, projectId };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsedBody = parseRequestBody(body);
  if (!parsedBody) {
    return Response.json(
      { error: "prompt, roomId, and projectId are required" },
      { status: 400 },
    );
  }

  const { primaryEmail } = await getCurrentIdentity();
  const project = await getAccessibleProject(userId, primaryEmail, parsedBody.projectId);
  if (!project) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsedBody.roomId !== parsedBody.projectId) {
    return Response.json({ error: "roomId must match projectId" }, { status: 400 });
  }

  let handle: Awaited<ReturnType<typeof tasks.trigger<typeof designAgentTask>>>;
  try {
    handle = await tasks.trigger<typeof designAgentTask>("design-agent", {
      prompt: parsedBody.prompt,
      roomId: parsedBody.roomId,
    });
  } catch (error) {
    // wrong-environment TRIGGER_SECRET_KEY, a branch env that does not exist, or
    // no deployed version of the task. Surface it as 502 so the client does not
    // mistake it for an expired session, and log the cause for the server side.
    console.error("[api/ai/design] failed to trigger design-agent", error);
    return Response.json({ error: "Design service unavailable" }, { status: 502 });
  }

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId: parsedBody.projectId,
      userId,
    },
  });

  return Response.json({ runId: handle.id }, { status: 202 });
}
