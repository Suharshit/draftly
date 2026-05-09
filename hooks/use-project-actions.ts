"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { SidebarProject } from "@/lib/project-data";

type ActiveDialog = "create" | "rename" | "delete" | null;

interface CreateProjectResponse {
  project: {
    id: string;
    name: string;
  };
}

export interface ProjectActionsController {
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
  activeDialog: ActiveDialog;
  selectedProject: SidebarProject | null;
  projectName: string;
  roomIdPreview: string;
  isLoading: boolean;
  setProjectName: (value: string) => void;
  openCreateDialog: () => void;
  openRenameDialog: (projectId: string) => void;
  openDeleteDialog: (projectId: string) => void;
  closeDialog: () => void;
  submitCreate: () => Promise<void>;
  submitRename: () => Promise<void>;
  submitDelete: () => Promise<void>;
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createShortSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function getActiveWorkspaceProjectId(pathname: string) {
  const match = pathname.match(/^\/editor\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function useProjectActions(
  ownedProjects: SidebarProject[],
  sharedProjects: SidebarProject[],
): ProjectActionsController {
  const router = useRouter();
  const pathname = usePathname();

  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [createSuffix, setCreateSuffix] = useState(createShortSuffix);
  const [isLoading, setIsLoading] = useState(false);

  const selectedProject = useMemo(
    () => ownedProjects.find((project) => project.id === selectedProjectId) ?? null,
    [ownedProjects, selectedProjectId],
  );

  const roomIdPreview = useMemo(() => {
    const base = slugify(projectName) || "untitled-project";
    return `${base}-${createSuffix}`;
  }, [createSuffix, projectName]);

  const openCreateDialog = () => {
    setProjectName("");
    setCreateSuffix(createShortSuffix());
    setSelectedProjectId(null);
    setActiveDialog("create");
  };

  const openRenameDialog = (projectId: string) => {
    const project = ownedProjects.find((entry) => entry.id === projectId);
    if (!project) {
      return;
    }

    setSelectedProjectId(projectId);
    setProjectName(project.name);
    setActiveDialog("rename");
  };

  const openDeleteDialog = (projectId: string) => {
    const project = ownedProjects.find((entry) => entry.id === projectId);
    if (!project) {
      return;
    }

    setSelectedProjectId(projectId);
    setProjectName(project.name);
    setActiveDialog("delete");
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setIsLoading(false);
  };

  const submitCreate = async () => {
    const nextName = projectName.trim();
    const roomId = roomIdPreview;

    setIsLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: roomId,
          name: nextName,
        }),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as CreateProjectResponse;
      closeDialog();
      router.push(`/editor/${payload.project.id}`);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const submitRename = async () => {
    if (!selectedProject) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName.trim(),
        }),
      });

      if (!response.ok) {
        return;
      }

      closeDialog();
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const submitDelete = async () => {
    if (!selectedProject) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        return;
      }

      closeDialog();

      const activeWorkspaceProjectId = getActiveWorkspaceProjectId(pathname);
      if (activeWorkspaceProjectId === selectedProject.id) {
        router.push("/editor");
        router.refresh();
        return;
      }

      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return {
    ownedProjects,
    sharedProjects,
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
  };
}
