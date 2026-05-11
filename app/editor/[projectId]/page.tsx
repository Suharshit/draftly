import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
import { EditorWorkspaceShell } from "@/components/editor/editor-workspace-shell";
import { getProjectSidebarData } from "@/lib/project-data";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";

interface EditorWorkspacePageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function EditorWorkspacePage({ params }: EditorWorkspacePageProps) {
  const identity = await getCurrentIdentity();

  if (!identity.userId) {
    redirect("/sign-in");
  }

  const { projectId: roomId } = await params;
  const project = await getAccessibleProject(identity.userId, identity.primaryEmail, roomId);

  if (!project) {
    return <AccessDenied />;
  }

  const projectSidebarData = await getProjectSidebarData(identity.userId, identity.primaryEmail);

  return (
    <EditorWorkspaceShell
      projectId={project.id}
      projectName={project.name}
      ownedProjects={projectSidebarData.ownedProjects}
      sharedProjects={projectSidebarData.sharedProjects}
    />
  );
}
