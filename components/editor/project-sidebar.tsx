"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import type { SidebarProject } from "@/lib/project-data";
import { cn } from "@/lib/utils";

const RECENT_PROJECT_COUNT = 3;

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  myProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
  activeProjectId?: string;
  onCreateProject: () => void;
  onRenameProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  /**
   * Docked (default): on md+ the sidebar takes layout space and pushes content aside.
   * Undocked: it floats over the content at every width, so the canvas never resizes or shifts.
   */
  docked?: boolean;
}

function formatRelativeTime(isoDate: string, now: number) {
  const minutes = Math.floor(Math.max(0, now - new Date(isoDate).getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

function getInitials(label: string) {
  return label
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

// ISO timestamps sort correctly as strings.
function byMostRecent(a: SidebarProject, b: SidebarProject) {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function ProjectSidebar({
  isOpen,
  onClose,
  myProjects,
  sharedProjects,
  activeProjectId,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  docked = true,
}: ProjectSidebarProps) {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [now] = useState(() => Date.now());

  const query = search.trim().toLowerCase();
  const matchesQuery = (project: SidebarProject) => !query || project.name.toLowerCase().includes(query);

  const recentProjects = [...myProjects, ...sharedProjects].sort(byMostRecent).slice(0, RECENT_PROJECT_COUNT);
  const recentIds = new Set(recentProjects.map((project) => project.id));
  const totalProjects = myProjects.length + sharedProjects.length;

  const sections = [
    { id: "recent", label: "Recent", projects: recentProjects.filter(matchesQuery) },
    {
      id: "all",
      label: "All projects",
      projects: myProjects.filter((project) => !recentIds.has(project.id) && matchesQuery(project)),
    },
    {
      id: "shared",
      label: "Shared with you",
      projects: sharedProjects.filter((project) => !recentIds.has(project.id) && matchesQuery(project)),
    },
  ].filter((section) => section.projects.length > 0);

  const userLabel = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <>
      <button
        type="button"
        className={cn(
          "fixed inset-0 top-16 z-30 bg-ink/30 transition-opacity md:hidden",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-label="Close project sidebar"
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
      />

      <aside
        aria-label="Project sidebar"
        inert={!isOpen || undefined}
        className={cn(
          "fixed top-16 bottom-0 left-0 z-40 shrink-0 overflow-hidden border-ink/15 bg-paper-cream text-ink scheme-light",
          "transition-[translate,width] duration-200 ease-out",
          docked
            ? [
                "md:relative md:top-auto md:bottom-auto md:left-auto md:z-auto",
                isOpen ? "w-72 translate-x-0 border-r" : "w-72 -translate-x-full md:w-0 md:translate-x-0",
              ]
            : ["w-72 border-r", isOpen ? "translate-x-0" : "-translate-x-full"],
        )}
      >
        <div className="flex h-full w-72 flex-col bg-ink/[0.035]">
          <div className="space-y-3 px-4 pt-4">
            <button
              type="button"
              onClick={onCreateProject}
              className={cn(
                "flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-paper border border-ink bg-ink",
                "font-brand text-sm font-semibold text-paper-cream shadow-flat outline-none",
                "transition-[translate,box-shadow] duration-(--duration-hover) ease-(--ease-hover) hover:-translate-y-px",
                "active:translate-y-px active:shadow-none active:duration-(--duration-press)",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60",
              )}
            >
              <Plus className="h-4 w-4" />
              New project
            </button>

            <label className="flex h-10 items-center gap-2 rounded-paper border border-ink/20 bg-paper-bright px-3 transition-colors focus-within:border-ink">
              <Search aria-hidden className="h-4 w-4 shrink-0 text-ink-soft" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search projects"
                aria-label="Search projects"
                className="min-w-0 flex-1 bg-transparent font-brand text-sm text-ink outline-none placeholder:text-ink-soft/70"
              />
            </label>
          </div>

          <nav aria-label="Projects" className="min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-4">
            {sections.length === 0 ? (
              <p className="px-2 pt-6 text-center font-brand text-sm text-ink-soft">
                {totalProjects === 0 ? "No projects yet." : `No projects match “${search.trim()}”.`}
              </p>
            ) : (
              sections.map((section) => (
                <section key={section.id} aria-labelledby={`project-section-${section.id}`}>
                  <h2
                    id={`project-section-${section.id}`}
                    className="px-2 pt-4 pb-1.5 font-mono text-chrome tracking-[0.14em] text-ink-soft uppercase"
                  >
                    {section.label}
                  </h2>
                  <ul>
                    {section.projects.map((project) => {
                      const isActive = activeProjectId === project.id;

                      return (
                        <li key={project.id} className="group relative">
                          <Link
                            href={`/editor/${project.roomId}`}
                            aria-current={isActive ? "page" : undefined}
                            title={project.isOwned ? project.name : `${project.name} (shared with you)`}
                            className={cn(
                              "flex h-9 items-center gap-3 rounded-paper px-2 font-brand text-sm text-ink outline-none transition-colors",
                              "hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink/60",
                              isActive && "bg-ink/[0.07] font-medium",
                              // Owned rows reserve room for the rename/delete buttons while they show.
                              project.isOwned && "group-focus-within:pr-17 group-hover:pr-17",
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn("size-1.5 shrink-0 rounded-full", isActive ? "bg-ink" : "bg-ink/25")}
                            />
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate",
                                // Swap the ellipsis for a fade into the buttons.
                                project.isOwned &&
                                  "group-focus-within:text-clip group-focus-within:mask-[linear-gradient(to_right,black_calc(100%-2rem),transparent)] group-hover:text-clip group-hover:mask-[linear-gradient(to_right,black_calc(100%-2rem),transparent)]",
                              )}
                            >
                              {project.name}
                            </span>
                            <time
                              dateTime={project.updatedAt}
                              suppressHydrationWarning
                              className={cn(
                                "shrink-0 font-mono text-chrome text-ink-soft",
                                project.isOwned && "group-focus-within:hidden group-hover:hidden",
                              )}
                            >
                              {formatRelativeTime(project.updatedAt, now)}
                            </time>
                          </Link>

                          {project.isOwned ? (
                            <div className="absolute inset-y-0 right-1 flex items-center gap-0.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                              <button
                                type="button"
                                aria-label={`Rename ${project.name}`}
                                onClick={() => onRenameProject(project.id)}
                                className="flex size-7 cursor-pointer items-center justify-center rounded-paper text-ink-soft outline-none hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink/60"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${project.name}`}
                                onClick={() => onDeleteProject(project.id)}
                                className="flex size-7 cursor-pointer items-center justify-center rounded-paper text-ink-soft outline-none hover:bg-ink/10 hover:text-paper-pin-red focus-visible:outline-2 focus-visible:outline-ink/60"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </nav>

          <div className="flex items-center gap-3 border-t border-ink/15 px-4 py-3">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-ink/40 bg-paper-bright font-brand text-xs font-semibold text-ink"
            >
              {getInitials(userLabel)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-brand text-sm font-medium text-ink">{userLabel}</p>
              <p className="font-mono text-chrome tracking-chrome text-ink-soft uppercase">
                {totalProjects} {totalProjects === 1 ? "project" : "projects"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
