"use client";

import {
  PaperDialog,
  paperDestructiveButtonClass,
  paperInputClass,
  paperLabelClass,
  paperPrimaryButtonClass,
  paperSecondaryButtonClass,
} from "@/components/editor/paper-dialog";

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
      <PaperDialog
        open={isCreateOpen}
        onClose={onClose}
        title="Create project"
        description="Name your project to create a new architecture workspace."
        footer={
          <>
            <button type="button" className={paperSecondaryButtonClass} onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" form="create-project-form" className={paperPrimaryButtonClass} disabled={isLoading}>
              Create project
            </button>
          </>
        }
      >
        <form
          id="create-project-form"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onCreate();
          }}
        >
          <label htmlFor="create-project-name" className={paperLabelClass}>
            Project name
          </label>
          <input
            id="create-project-name"
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="e.g. Payment Gateway Modernization"
            className={paperInputClass}
            autoFocus
          />
          <p className="flex flex-wrap items-baseline gap-x-2.5 font-mono text-xs">
            <span className="tracking-chrome text-ink-soft uppercase">Room ID</span>
            <span className="text-ink">{roomIdPreview}</span>
          </p>
        </form>
      </PaperDialog>

      <PaperDialog
        open={isRenameOpen}
        onClose={onClose}
        title="Rename project"
        description={
          selectedProjectName ? `Current project name: ${selectedProjectName}` : "Update the current project name."
        }
        footer={
          <>
            <button type="button" className={paperSecondaryButtonClass} onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button
              type="submit"
              form="rename-project-form"
              className={paperPrimaryButtonClass}
              disabled={isLoading || projectName.trim().length === 0}
            >
              Save
            </button>
          </>
        }
      >
        <form
          id="rename-project-form"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onRename();
          }}
        >
          <label htmlFor="rename-project-name" className={paperLabelClass}>
            Project name
          </label>
          <input
            id="rename-project-name"
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            className={paperInputClass}
            autoFocus
          />
        </form>
      </PaperDialog>

      <PaperDialog
        open={isDeleteOpen}
        onClose={onClose}
        title="Delete project"
        description={
          selectedProjectName
            ? `Delete "${selectedProjectName}" permanently? This action cannot be undone.`
            : "Delete this project permanently? This action cannot be undone."
        }
        footer={
          <>
            <button type="button" className={paperSecondaryButtonClass} onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button
              type="button"
              className={paperDestructiveButtonClass}
              onClick={() => void onDelete()}
              disabled={isLoading}
            >
              Delete project
            </button>
          </>
        }
      />
    </>
  );
}
