import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export interface CurrentIdentity {
  userId: string | null;
  primaryEmail: string | null;
}

export interface AccessibleProject {
  id: string;
  name: string;
  isOwner: boolean;
}

export async function getCurrentIdentity(): Promise<CurrentIdentity> {
  const { userId } = await auth();

  if (!userId) {
    return { userId: null, primaryEmail: null };
  }

  const user = await currentUser();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;

  return { userId, primaryEmail };
}

export async function getAccessibleProject(
  userId: string,
  primaryEmail: string | null,
  projectId: string,
): Promise<AccessibleProject | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      collaborators: primaryEmail
        ? {
            where: { collaboratorEmail: primaryEmail },
            select: { id: true },
            take: 1,
          }
        : false,
    },
  });

  if (!project) {
    return null;
  }

  if (project.ownerId === userId) {
    return { id: project.id, name: project.name, isOwner: true };
  }

  if (!primaryEmail) {
    return null;
  }

  if (Array.isArray(project.collaborators) && project.collaborators.length > 0) {
    return { id: project.id, name: project.name, isOwner: false };
  }

  return null;
}
