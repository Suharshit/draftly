"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { SidebarProject } from "@/lib/project-data";
import { cn } from "@/lib/utils";

const actionFocusClass = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60";

const solidActionClass = cn(
  "inline-flex h-12 cursor-pointer items-center gap-2 rounded-paper border border-ink bg-ink px-6",
  "font-brand text-sm font-semibold text-paper-cream shadow-flat",
  "transition-[translate,box-shadow] duration-(--duration-hover) ease-(--ease-hover) hover:-translate-y-(--hover-lift-translate) hover:shadow-lifted",
  "active:translate-y-(--press-translate) active:shadow-none active:duration-(--duration-press)",
  actionFocusClass,
);

const outlineActionClass = cn(
  "inline-flex h-12 cursor-pointer items-center rounded-paper border border-ink bg-transparent px-6",
  "font-brand text-sm font-medium text-ink",
  "transition-[translate,box-shadow,background-color] duration-(--duration-hover) ease-(--ease-hover) hover:-translate-y-px hover:bg-paper-bright hover:shadow-flat",
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:bg-transparent disabled:hover:shadow-none",
  actionFocusClass,
);

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

interface EditorShellProps {
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
}

export function EditorShell({ ownedProjects, sharedProjects }: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  // ISO timestamps sort correctly as strings.
  const mostRecentProject = [...ownedProjects, ...sharedProjects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )[0];

  // "N" opens the create dialog. Browsers reserve Ctrl/⌘+N for a new window, so it can't be used.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() !== "n" ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        activeDialog ||
        isEditableTarget(event.target)
      ) {
        return;
      }
      event.preventDefault();
      openCreateDialog();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDialog, openCreateDialog]);

  return (
    <div className="flex h-screen flex-col bg-paper-cream text-ink scheme-light">
      <EditorNavbar isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
      <main className="relative flex min-h-0 flex-1">
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
          className="flex min-w-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12 text-center"
          aria-labelledby="editor-home-title"
        >
          <svg aria-hidden width="72" height="56" viewBox="0 0 72 56" fill="none" className="text-ink">
            <rect x="0.5" y="0.5" width="32" height="22" stroke="currentColor" />
            <rect x="39.5" y="33.5" width="32" height="22" stroke="currentColor" />
            <path d="M27 21 45 35" stroke="currentColor" strokeWidth="2" />
          </svg>
          <h1 id="editor-home-title" className="mt-6 font-brand text-[1.75rem] leading-tight font-bold text-ink">
            Create a project or open an existing one
          </h1>
          <p className="mt-3 max-w-[46ch] font-brand text-base leading-relaxed text-ink-soft">
            Start a new architecture workspace, or choose a project from the sidebar.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button type="button" className={solidActionClass} onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              New project
            </button>
            {mostRecentProject ? (
              <Link href={`/editor/${mostRecentProject.roomId}`} className={outlineActionClass}>
                Open recent
              </Link>
            ) : (
              <button type="button" className={outlineActionClass} disabled>
                Open recent
              </button>
            )}
          </div>
          <p className="mt-5 font-mono text-chrome tracking-chrome text-ink-soft uppercase">
            or press <kbd className="font-mono text-ink">N</kbd>
          </p>
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
