import { auth } from "@clerk/nextjs/server";
import { del, get, put } from "@vercel/blob";

import { prisma } from "@/lib/prisma";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

interface CanvasPayload {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

function badRequestResponse(error: string) {
  return Response.json({ error }, { status: 400 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidNode(value: unknown): value is CanvasNode {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;
  if (typeof value.type !== "string" || value.type.length === 0) return false;
  if (!isRecord(value.position)) return false;
  if (typeof value.position.x !== "number" || typeof value.position.y !== "number") return false;
  if (!isRecord(value.data)) return false;
  return true;
}

function isValidEdge(value: unknown): value is CanvasEdge {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;
  if (typeof value.source !== "string" || value.source.length === 0) return false;
  if (typeof value.target !== "string" || value.target.length === 0) return false;
  return true;
}

function parseCanvasPayload(value: unknown): CanvasPayload | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) return null;
  if (!value.nodes.every(isValidNode) || !value.edges.every(isValidEdge)) return null;
  return { nodes: value.nodes, edges: value.edges };
}

async function getAuthorizedProject(projectId: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: unauthorizedResponse() } as const;
  }

  const { primaryEmail } = await getCurrentIdentity();
  const project = await getAccessibleProject(userId, primaryEmail, projectId);
  if (!project) {
    return { error: forbiddenResponse() } as const;
  }

  return { project } as const;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const authResult = await getAuthorizedProject(projectId);
  if ("error" in authResult) {
    return authResult.error;
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body");
  }

  const parsed = parseCanvasPayload(payload);
  if (!parsed) {
    return badRequestResponse("Invalid canvas payload");
  }

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { canvasJsonPath: true },
  });

  const uploaded = await put(
    `canvas-${projectId}.json`,
    JSON.stringify(parsed),
    {
      access: "private",
      addRandomSuffix: true,
      contentType: "application/json",
    },
  );

  await prisma.project.update({
    where: { id: projectId },
    data: { canvasJsonPath: uploaded.url },
  });

  if (existing?.canvasJsonPath && existing.canvasJsonPath !== uploaded.url) {
    try {
      await del(existing.canvasJsonPath);
    } catch {
      // Best effort cleanup: save should not fail if old blob deletion fails.
    }
  }

  return Response.json({ success: true, canvasJsonPath: uploaded.url });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const authResult = await getAuthorizedProject(projectId);
  if ("error" in authResult) {
    return authResult.error;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { canvasJsonPath: true },
  });

  if (!project?.canvasJsonPath) {
    return Response.json({ nodes: [], edges: [] });
  }

  try {
    const blobResult = await get(project.canvasJsonPath, {
      access: "private",
      useCache: false,
    });

    if (!blobResult || blobResult.statusCode !== 200) {
      return Response.json({ nodes: [], edges: [] });
    }

    const payloadText = await new Response(blobResult.stream).text();
    const payload: unknown = JSON.parse(payloadText);
    const parsed = parseCanvasPayload(payload);
    if (!parsed) {
      return Response.json({ nodes: [], edges: [] });
    }

    return Response.json(parsed);
  } catch {
    return Response.json({ nodes: [], edges: [] });
  }
}
