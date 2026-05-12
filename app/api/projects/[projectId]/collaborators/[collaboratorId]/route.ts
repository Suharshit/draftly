import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function getCurrentIdentity() {
  const { userId } = await auth();

  if (!userId) {
    return { userId: null, primaryEmail: null };
  }

  const user = await currentUser();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress
    ? normalizeEmail(user.primaryEmailAddress.emailAddress)
    : null;

  return { userId, primaryEmail };
}

async function isOwner(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  return Boolean(project && project.ownerId === userId);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string; collaboratorId: string }> },
) {
  const identity = await getCurrentIdentity();
  if (!identity.userId) {
    return unauthorizedResponse();
  }

  const { projectId, collaboratorId } = await context.params;
  const owner = await isOwner(identity.userId, projectId);
  if (!owner) {
    return forbiddenResponse();
  }

  const collaborator = await prisma.projectCollaborator.findUnique({
    where: { id: collaboratorId },
    select: { id: true, projectId: true },
  });

  if (!collaborator || collaborator.projectId !== projectId) {
    return forbiddenResponse();
  }

  await prisma.projectCollaborator.delete({
    where: { id: collaboratorId },
  });

  return Response.json({ success: true });
}
