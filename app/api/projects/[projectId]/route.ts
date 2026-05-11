import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

async function getOwnedProjectId(
  userId: string,
  projectId: string,
): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!project) {
    return null;
  }

  if (project.ownerId !== userId) {
    return null;
  }

  return project.id;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return unauthorizedResponse();
  }

  const { projectId } = await context.params;

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!project || project.ownerId !== userId) {
    return forbiddenResponse();
  }

  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const nextName =
    typeof payload === "object" &&
    payload !== null &&
    "name" in payload &&
    typeof payload.name === "string"
      ? payload.name.trim()
      : "";

  const updatedProject = await prisma.project.update({
    where: {
      id: project.id,
    },
    data: {
      name: nextName.length > 0 ? nextName : "Untitled Project",
    },
  });

  return Response.json({ project: updatedProject });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return unauthorizedResponse();
  }

  const { projectId } = await context.params;

  const ownedProjectId = await getOwnedProjectId(userId, projectId);

  if (!ownedProjectId) {
    return forbiddenResponse();
  }

  await prisma.project.delete({
    where: {
      id: ownedProjectId,
    },
  });

  return Response.json({ success: true });
}
