"use client";

import Link from "next/link";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SidebarProject } from "@/lib/project-data";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  myProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
  activeProjectId?: string;
  onCreateProject: () => void;
  onRenameProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
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
}: ProjectSidebarProps) {
  return (
    <>
      <button
        type="button"
        className={cn(
          "fixed inset-0 top-14 z-30 bg-background/65 transition-opacity md:hidden",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-label="Close project sidebar"
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed top-14 bottom-4 left-4 z-40 flex w-72 flex-col rounded-md border border-border bg-card shadow-lg transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"
        )}
        inert={!isOpen || undefined}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Projects</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close project sidebar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
          <Tabs defaultValue="my-projects" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-projects">My Projects</TabsTrigger>
              <TabsTrigger value="shared">Shared</TabsTrigger>
            </TabsList>

            <TabsContent value="my-projects" className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
              {myProjects.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-sm border border-dashed border-border bg-background/40 px-3 text-center text-sm text-muted-foreground">
                  No projects yet.
                </div>
              ) : (
                myProjects.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      "flex items-center justify-between rounded-sm border px-3 py-2 transition-colors",
                      activeProjectId === project.id
                        ? "border-accent-primary/60 bg-accent-primary/10"
                        : "border-border bg-background/50",
                    )}
                  >
                    <Link href={`/editor/${project.roomId}`} className="min-w-0 flex-1 pr-2">
                      <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                      <p className="truncate text-xs font-mono text-muted-foreground">{project.roomId}</p>
                    </Link>
                    {project.isOwned ? (
                      <div className="ml-2 flex items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Rename ${project.name}`}
                          onClick={() => onRenameProject(project.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${project.name}`}
                          onClick={() => onDeleteProject(project.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="shared" className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
              {sharedProjects.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-sm border border-dashed border-border bg-background/40 px-3 text-center text-sm text-muted-foreground">
                  No shared projects yet.
                </div>
              ) : (
                sharedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/editor/${project.roomId}`}
                    className={cn(
                      "block rounded-sm border px-3 py-2 transition-colors",
                      activeProjectId === project.id
                        ? "border-accent-primary/60 bg-accent-primary/10"
                        : "border-border bg-background/50",
                    )}
                  >
                    <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                    <p className="truncate text-xs font-mono text-muted-foreground">{project.roomId}</p>
                  </Link>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="border-t border-border p-4">
          <Button type="button" className="w-full" onClick={onCreateProject}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  );
}
