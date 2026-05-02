"use client";

import { X, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed top-14 bottom-4 left-4 z-40 flex w-72 flex-col rounded-md border border-border bg-card shadow-lg transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"
      )}
      aria-hidden={!isOpen}
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

          <TabsContent
            value="my-projects"
            className="mt-3 flex flex-1 items-center justify-center rounded-sm border border-dashed border-border bg-background/40 px-3 text-center text-sm text-muted-foreground"
          >
            No projects yet.
          </TabsContent>

          <TabsContent
            value="shared"
            className="mt-3 flex flex-1 items-center justify-center rounded-sm border border-dashed border-border bg-background/40 px-3 text-center text-sm text-muted-foreground"
          >
            No shared projects yet.
          </TabsContent>
        </Tabs>
      </div>

      <div className="border-t border-border p-4">
        <Button type="button" className="w-full">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </aside>
  );
}

