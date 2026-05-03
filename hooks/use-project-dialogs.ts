"use client";

import { useMemo, useState } from "react";

export interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  isOwned: boolean;
}

type ActiveDialog = "create" | "rename" | "delete" | null;

export interface ProjectDialogsController {
  myProjects: ProjectItem[];
  sharedProjects: ProjectItem[];
  activeDialog: ActiveDialog;
  selectedProject: ProjectItem | null;
  projectName: string;
  projectSlugPreview: string;
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

const INITIAL_MY_PROJECTS: ProjectItem[] = [
  { id: "proj-1", name: "Payments Platform", slug: "payments-platform", isOwned: true },
  { id: "proj-2", name: "Search Pipeline", slug: "search-pipeline", isOwned: true },
];

const INITIAL_SHARED_PROJECTS: ProjectItem[] = [
  { id: "proj-3", name: "Observability Revamp", slug: "observability-revamp", isOwned: false },
  { id: "proj-4", name: "Realtime Presence", slug: "realtime-presence", isOwned: false },
];

function toSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function useProjectDialogs(): ProjectDialogsController {
  const [myProjects, setMyProjects] = useState<ProjectItem[]>(INITIAL_MY_PROJECTS);
  const [sharedProjects] = useState<ProjectItem[]>(INITIAL_SHARED_PROJECTS);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedProject = useMemo(
    () => myProjects.find((project) => project.id === selectedProjectId) ?? null,
    [myProjects, selectedProjectId]
  );

  const projectSlugPreview = toSlug(projectName);

  const openCreateDialog = () => {
    setProjectName("");
    setSelectedProjectId(null);
    setActiveDialog("create");
  };

  const openRenameDialog = (projectId: string) => {
    const project = myProjects.find((entry) => entry.id === projectId);
    if (!project || !project.isOwned) {
      return;
    }

    setSelectedProjectId(projectId);
    setProjectName(project.name);
    setActiveDialog("rename");
  };

  const openDeleteDialog = (projectId: string) => {
    const project = myProjects.find((entry) => entry.id === projectId);
    if (!project || !project.isOwned) {
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
    if (!nextName) {
      return;
    }

    setIsLoading(true);
    try {
      const nextSlug = toSlug(nextName) || "untitled-project";

      // Simulate async work (API call)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMyProjects((current) => [
        ...current,
        {
          id: `proj-${Date.now()}`,
          name: nextName,
          slug: nextSlug,
          isOwned: true,
        },
      ]);

      closeDialog();
    } finally {
      setIsLoading(false);
    }
  };

  const submitRename = async () => {
    if (!selectedProject) {
      return;
    }

    const nextName = projectName.trim();
    if (!nextName) {
      return;
    }

    setIsLoading(true);
    try {
      const nextSlug = toSlug(nextName) || selectedProject.slug;

      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 800));

      setMyProjects((current) =>
        current.map((project) =>
          project.id === selectedProject.id
            ? {
                ...project,
                name: nextName,
                slug: nextSlug,
              }
            : project
        )
      );

      closeDialog();
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
      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 800));

      setMyProjects((current) => current.filter((project) => project.id !== selectedProject.id));
      closeDialog();
    } finally {
      setIsLoading(false);
    }
  };

  return {
    myProjects,
    sharedProjects,
    activeDialog,
    selectedProject,
    projectName,
    projectSlugPreview,
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

