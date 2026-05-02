"use client";

import { useState } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectSidebar } from "@/components/editor/project-sidebar";

export function EditorShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <EditorNavbar isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
      <main className="relative flex-1">
        <ProjectSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <section className="h-full border-t border-transparent bg-background" aria-label="Editor canvas area" />
      </main>
    </div>
  );
}

