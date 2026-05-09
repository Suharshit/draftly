import { notFound } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";

import { EditorShell } from "@/components/editor/editor-shell";
import { canAccessProject, getProjectSidebarData } from "@/lib/project-data";

interface EditorWorkspacePageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function EditorWorkspacePage({ params }: EditorWorkspacePageProps) {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const { projectId } = await params;
  const user = await currentUser();
  const collaboratorEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  const hasAccess = await canAccessProject(userId, collaboratorEmail, projectId);

  if (!hasAccess) {
    notFound();
  }

  const projectSidebarData = await getProjectSidebarData(userId, collaboratorEmail);

  return <EditorShell ownedProjects={projectSidebarData.ownedProjects} sharedProjects={projectSidebarData.sharedProjects} />;
}
