"use client";

import { UserButton } from "@clerk/nextjs";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function EditorNavbar({ isSidebarOpen, onToggleSidebar }: EditorNavbarProps) {
  return (
    <header className="h-14 border-b border-border bg-background">
      <div className="mx-auto flex h-full w-full items-center justify-between px-4">
        <div className="flex flex-1 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? "Close project sidebar" : "Open project sidebar"}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center" />
        <div className="flex flex-1 items-center justify-end">
          <UserButton />
        </div>
      </div>
    </header>
  );
}

