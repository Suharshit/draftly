import { prisma } from "@/lib/prisma";

export interface SidebarProject {
  id: string;
  name: string;
  roomId: string;
  isOwned: boolean;
  /** ISO timestamp of the last change to the project. */
  updatedAt: string;
}

export interface ProjectSidebarData {
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
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
      updatedAt: "desc",
    },
    select: {
      id: true,
      name: true,
      updatedAt: true,
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
          updatedAt: "desc",
        },
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
      })
    : [];

  return {
    ownedProjects: ownedProjects.map((project) => ({
      id: project.id,
      name: project.name,
      roomId: project.id,
      isOwned: true,
      updatedAt: project.updatedAt.toISOString(),
    })),
    sharedProjects: sharedProjects.map((project) => ({
      id: project.id,
      name: project.name,
      roomId: project.id,
      isOwned: false,
      updatedAt: project.updatedAt.toISOString(),
    })),
  };
}
