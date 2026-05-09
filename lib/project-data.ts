import { prisma } from "@/lib/prisma";

export interface SidebarProject {
  id: string;
  name: string;
  roomId: string;
  isOwned: boolean;
}

export interface ProjectSidebarData {
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
}

export async function canAccessProject(
  userId: string,
  collaboratorEmail: string | null,
  projectId: string,
): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      ownerId: true,
      collaborators: collaboratorEmail
        ? {
            where: {
              collaboratorEmail: collaboratorEmail.toLowerCase(),
            },
            select: {
              id: true,
            },
            take: 1,
          }
        : false,
    },
  });

  if (!project) {
    return false;
  }

  if (project.ownerId === userId) {
    return true;
  }

  if (!collaboratorEmail) {
    return false;
  }

  return Array.isArray(project.collaborators) && project.collaborators.length > 0;
}

export async function getProjectSidebarData(
  userId: string,
  collaboratorEmail: string | null,
): Promise<ProjectSidebarData> {
  const ownedProjects = await prisma.project.findMany({
    where: {
      ownerId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  const sharedProjects = collaboratorEmail
    ? await prisma.project.findMany({
        where: {
          ownerId: {
            not: userId,
          },
          collaborators: {
            some: {
              collaboratorEmail: collaboratorEmail.toLowerCase(),
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
        },
      })
    : [];

  return {
    ownedProjects: ownedProjects.map((project) => ({
      id: project.id,
      name: project.name,
      roomId: project.id,
      isOwned: true,
    })),
    sharedProjects: sharedProjects.map((project) => ({
      id: project.id,
      name: project.name,
      roomId: project.id,
      isOwned: false,
    })),
  };
}
