"use client";

import Link from "next/link";
import { Bot, PanelLeftClose, PanelLeftOpen, Share2 } from "lucide-react";

import { UserMenuButton } from "@/components/editor/user-menu-button";
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave";
import { cn } from "@/lib/utils";

const outlineButtonClass = cn(
  "inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-paper border border-ink bg-transparent px-4",
  "font-brand text-sm font-medium text-ink outline-none transition-[translate,box-shadow,background-color] duration-(--duration-hover) ease-(--ease-hover)",
  "hover:-translate-y-px hover:bg-paper-bright hover:shadow-flat aria-pressed:bg-paper-bright",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60",
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:bg-transparent disabled:hover:shadow-none",
);

interface EditorNavbarProject {
  name: string;
  isOwner: boolean;
  saveStatus: CanvasSaveStatus;
}

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  /** The open project. Omit on the editor home, where no project is open. */
  project?: EditorNavbarProject;
  onShare?: () => void;
  isAiSidebarOpen?: boolean;
  onToggleAiSidebar?: () => void;
}

function getStatusLabel(project?: EditorNavbarProject) {
  if (!project) return "Ready";
  if (project.saveStatus === "saving") return "Saving…";
  if (project.saveStatus === "saved") return "Saved";
  if (project.saveStatus === "error") return "Save failed";
  return project.isOwner ? "Saved" : "View only";
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  project,
  onShare,
  isAiSidebarOpen,
  onToggleAiSidebar,
}: EditorNavbarProps) {
  return (
    <header className="h-16 shrink-0 border-b border-ink/15 bg-paper-cream text-ink scheme-light">
      <div className="flex h-full w-full items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? "Close project sidebar" : "Open project sidebar"}
            aria-expanded={isSidebarOpen}
            className={cn(
              "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-paper bg-ink text-paper-cream outline-none",
              "transition-[translate] duration-(--duration-press) active:translate-y-px",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60",
            )}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>

          <span aria-hidden className="h-8 w-px shrink-0 bg-ink/15" />

          <div className="flex min-w-0 items-baseline gap-2">
            <Link
              href="/editor"
              className="shrink-0 rounded-paper font-brand text-lg font-bold text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60"
            >
              Draftly
            </Link>
            <span aria-hidden className="font-brand text-sm text-ink-soft/60">
              /
            </span>
            {project ? (
              <p className="truncate font-brand text-sm font-medium text-ink">{project.name}</p>
            ) : (
              <p className="truncate font-brand text-sm text-ink-soft">No project open</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <p
            aria-live="polite"
            className={cn(
              "hidden font-mono text-chrome tracking-chrome uppercase sm:block",
              project?.saveStatus === "error" ? "text-paper-pin-red" : "text-ink-soft",
            )}
          >
            {getStatusLabel(project)}
          </p>

          {onToggleAiSidebar ? (
            <button
              type="button"
              onClick={onToggleAiSidebar}
              aria-pressed={isAiSidebarOpen}
              aria-label={isAiSidebarOpen ? "Hide AI sidebar" : "Show AI sidebar"}
              className={outlineButtonClass}
            >
              <Bot className="h-4 w-4" />
              AI
            </button>
          ) : null}

          <button
            type="button"
            onClick={onShare}
            disabled={!project || !onShare}
            title={project ? undefined : "Open a project to share it"}
            className={outlineButtonClass}
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>

          <UserMenuButton avatarSize="2.5rem" />
        </div>
      </div>
    </header>
  );
}
