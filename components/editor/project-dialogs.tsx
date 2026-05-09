"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditorDialogShell } from "@/components/editor/editor-dialog-shell";

interface ProjectDialogsProps {
  activeDialog: "create" | "rename" | "delete" | null;
  projectName: string;
  roomIdPreview: string;
  selectedProjectName: string | null;
  isLoading: boolean;
  onProjectNameChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => Promise<void>;
  onRename: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export function ProjectDialogs({
  activeDialog,
  projectName,
  roomIdPreview,
  selectedProjectName,
  isLoading,
  onProjectNameChange,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: ProjectDialogsProps) {
  const isCreateOpen = activeDialog === "create";
  const isRenameOpen = activeDialog === "rename";
  const isDeleteOpen = activeDialog === "delete";

  return (
    <>
      <EditorDialogShell
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Create Project"
        description="Name your project to create a new architecture workspace."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" form="create-project-form" disabled={isLoading}>
              Create
            </Button>
          </>
        }
      >
        <form
          id="create-project-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onCreate();
          }}
        >
          <div className="flex flex-col space-y-2">
            <label htmlFor="create-project-name" className="text-sm font-medium text-foreground">
              Project name
            </label>
            <Input
              id="create-project-name"
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              placeholder="e.g. Payment Gateway Modernization"
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Room ID preview: <span className="font-mono text-foreground">{roomIdPreview}</span>
          </p>
        </form>
      </EditorDialogShell>

      <EditorDialogShell
        open={isRenameOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Rename Project"
        description={
          selectedProjectName ? `Current project name: ${selectedProjectName}` : "Update the current project name."
        }
        footer={
          <>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" form="rename-project-form" disabled={isLoading || projectName.trim().length === 0}>
              Save
            </Button>
          </>
        }
      >
        <form
          id="rename-project-form"
          className="flex flex-col space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onRename();
          }}
        >
          <label htmlFor="rename-project-name" className="text-sm font-medium text-foreground">
            Project name
          </label>
          <Input
            id="rename-project-name"
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            autoFocus
          />
        </form>
      </EditorDialogShell>

      <EditorDialogShell
        open={isDeleteOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Delete Project"
        description={
          selectedProjectName
            ? `Delete "${selectedProjectName}" permanently? This action cannot be undone.`
            : "Delete this project permanently? This action cannot be undone."
        }
        footer={
          <>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void onDelete()} disabled={isLoading}>
              Delete Project
            </Button>
          </>
        }
      />
    </>
  );
}

