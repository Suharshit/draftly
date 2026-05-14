"use client";

import { useState } from "react";
import { Bot, PanelLeftClose, PanelLeftOpen, Share2 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

import { AiSidebar } from "@/components/editor/ai-sidebar";
import { CanvasWrapper } from "@/components/editor/canvas-wrapper";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Button } from "@/components/ui/button";
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
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {saveStatus === "saving" && "Saving..."}
              {saveStatus === "saved" && "Saved"}
              {saveStatus === "error" && "Save failed"}
              {saveStatus === "idle" && (isOwner ? "Saved" : "View only")}
            </p>
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
          <CanvasWrapper
            roomId={projectId}
            canAutosave={isOwner}
            onSaveStatusChange={setSaveStatus}
            isSidebarOpen={isSidebarOpen}
          />
          <AiSidebar open={isAiSidebarOpen} onClose={() => setIsAiSidebarOpen(false)} />
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
