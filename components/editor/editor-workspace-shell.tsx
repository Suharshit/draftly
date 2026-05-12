"use client";

import { useState } from "react";
import { Bot, PanelLeftClose, PanelLeftOpen, Share2 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

import { CanvasWrapper } from "@/components/editor/canvas-wrapper";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Button } from "@/components/ui/button";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { SidebarProject } from "@/lib/project-data";

interface EditorWorkspaceShellProps {
  projectId: string;
  projectName: string;
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
}

export function EditorWorkspaceShell({
  projectId,
  projectName,
  ownedProjects,
  sharedProjects,
}: EditorWorkspaceShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
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
      <header className="h-14 border-b border-border bg-background">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label={isSidebarOpen ? "Close project sidebar" : "Open project sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </Button>
            <p className="truncate text-sm font-semibold text-foreground">{projectName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsShareDialogOpen(true)}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAiSidebarOpen((prev) => !prev)}
              aria-label={isAiSidebarOpen ? "Hide AI sidebar" : "Show AI sidebar"}
            >
              <Bot className="h-4 w-4" />
              AI
            </Button>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          myProjects={ownedProjects}
          sharedProjects={sharedProjects}
          activeProjectId={projectId}
          onCreateProject={openCreateDialog}
          onRenameProject={openRenameDialog}
          onDeleteProject={openDeleteDialog}
        />

        <section
          className="relative flex min-w-0 flex-1 overflow-hidden border-l border-border bg-background"
          aria-label="Collaborative canvas"
        >
          <CanvasWrapper roomId={projectId} />
        </section>

        {isAiSidebarOpen ? (
          <aside className="hidden h-full w-80 shrink-0 border-l border-border bg-card/40 lg:flex lg:flex-col">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium text-foreground">AI Assistant</h2>
            </div>
            <div className="flex flex-1 items-center justify-center p-4 text-center">
              <p className="text-sm text-muted-foreground">AI chat sidebar placeholder.</p>
            </div>
          </aside>
        ) : null}
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
