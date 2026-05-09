"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { SidebarProject } from "@/lib/project-data";
import { Button } from "@/components/ui/button";

interface EditorShellProps {
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
}

export function EditorShell({ ownedProjects, sharedProjects }: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    activeDialog,
    selectedProject,
    projectName,
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
    <div className="relative flex min-h-screen flex-col bg-background">
      <EditorNavbar isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
      <main className="relative flex-1">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          myProjects={ownedProjects}
          sharedProjects={sharedProjects}
          onCreateProject={openCreateDialog}
          onRenameProject={openRenameDialog}
          onDeleteProject={openDeleteDialog}
        />
        <section
          className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center border-t border-transparent bg-background px-6 text-center"
          aria-label="Editor canvas area"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create a project or open an existing one</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Start a new architecture workspace, or choose a project from the sidebar.
          </p>
          <Button type="button" className="mt-6" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </section>
      </main>
      <ProjectDialogs
        activeDialog={activeDialog}
        projectName={projectName}
        roomIdPreview={roomIdPreview}
        selectedProjectName={selectedProject?.name ?? null}
        isLoading={isLoading}
        onProjectNameChange={setProjectName}
        onClose={closeDialog}
        onCreate={submitCreate}
        onRename={submitRename}
        onDelete={submitDelete}
      />
    </div>
  );
}
