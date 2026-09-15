"use client";

import { useState } from "react";

import { AiSidebar } from "@/components/editor/ai-sidebar";
import { CanvasWrapper } from "@/components/editor/canvas-wrapper";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ShareDialog } from "@/components/editor/share-dialog";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave";
import type { SidebarProject } from "@/lib/project-data";

interface EditorWorkspaceShellProps {
  projectId: string;
  projectName: string;
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
  isOwner: boolean;
}

export function EditorWorkspaceShell({
  projectId,
  projectName,
  ownedProjects,
  sharedProjects,
  isOwner,
}: EditorWorkspaceShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("idle");
  const {
    activeDialog,
    selectedProject,
    projectName: draftProjectName,
    roomIdPreview,
    isLoading,
    setProjectName,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    submitCreate,
    submitRename,
    submitDelete,
  } = useProjectActions(ownedProjects, sharedProjects);

  return (
    <div className="flex h-screen flex-col bg-background">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        project={{ name: projectName, isOwner, saveStatus }}
        onShare={() => setIsShareDialogOpen(true)}
        isAiSidebarOpen={isAiSidebarOpen}
        onToggleAiSidebar={() => setIsAiSidebarOpen((prev) => !prev)}
      />

      <main className="flex min-h-0 flex-1">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          myProjects={ownedProjects}
          sharedProjects={sharedProjects}
          activeProjectId={projectId}
          docked={false}
          onCreateProject={openCreateDialog}
          onRenameProject={openRenameDialog}
          onDeleteProject={openDeleteDialog}
        />

        <section
          className="relative flex min-w-0 flex-1 overflow-hidden bg-paper-cream"
          aria-label="Collaborative canvas"
        >
          <CanvasWrapper
            roomId={projectId}
            canAutosave={isOwner}
            onSaveStatusChange={setSaveStatus}
            isSidebarOpen={isSidebarOpen}
            isAiSidebarOpen={isAiSidebarOpen}
          >
            <AiSidebar
              open={isAiSidebarOpen}
              onClose={() => setIsAiSidebarOpen(false)}
              projectId={projectId}
            />
          </CanvasWrapper>
        </section>
      </main>

      <ProjectDialogs
        activeDialog={activeDialog}
        projectName={draftProjectName}
        roomIdPreview={roomIdPreview}
        selectedProjectName={selectedProject?.name ?? null}
        isLoading={isLoading}
        onProjectNameChange={setProjectName}
        onClose={closeDialog}
        onCreate={submitCreate}
        onRename={submitRename}
        onDelete={submitDelete}
      />
      <ShareDialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen} projectId={projectId} />
    </div>
  );
}
