"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { useProjectDialogs } from "@/hooks/use-project-dialogs";
import { Button } from "@/components/ui/button";

export function EditorShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    myProjects,
    sharedProjects,
    activeDialog,
    selectedProject,
    projectName,
    projectSlugPreview,
    isLoading,
    setProjectName,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    submitCreate,
    submitRename,
    submitDelete,
  } = useProjectDialogs();

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <EditorNavbar isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
      <main className="relative flex-1">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          myProjects={myProjects}
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
        projectSlugPreview={projectSlugPreview}
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
