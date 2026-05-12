"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Trash2, UserPlus } from "lucide-react";

import { EditorDialogShell } from "@/components/editor/editor-dialog-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ShareCollaborator {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface CollaboratorsResponse {
  canManage: boolean;
  collaborators: Array<{
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    createdAt: string;
  }>;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getInitials(nameOrEmail: string) {
  const segments = nameOrEmail.trim().split(/\s+/);
  if (segments.length >= 2) {
    return `${segments[0][0] ?? ""}${segments[1][0] ?? ""}`.toUpperCase();
  }
  return (segments[0]?.slice(0, 2) ?? "U").toUpperCase();
}

export function ShareDialog({ open, onOpenChange, projectId }: ShareDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [collaborators, setCollaborators] = useState<ShareCollaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectLink = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/editor/${projectId}`;
  }, [projectId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isCancelled = false;

    async function loadCollaborators() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}/collaborators`);
        if (!response.ok) {
          if (!isCancelled) {
            setError("Unable to load collaborators.");
          }
          return;
        }

        const payload = (await response.json()) as CollaboratorsResponse;
        if (isCancelled) {
          return;
        }

        setCanManage(payload.canManage);
        setCollaborators(
          payload.collaborators.map((entry) => ({
            id: entry.id,
            email: entry.email,
            name: entry.name,
            avatarUrl: entry.avatarUrl,
          })),
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCollaborators();

    return () => {
      isCancelled = true;
    };
  }, [open, projectId]);

  const copyLink = async () => {
    if (!projectLink) {
      return;
    }

    await navigator.clipboard.writeText(projectLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const inviteCollaborator = async () => {
    const email = normalizeEmail(inviteEmail);
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Unable to invite collaborator.");
        return;
      }

      setInviteEmail("");

      const refreshResponse = await fetch(`/api/projects/${projectId}/collaborators`);
      if (!refreshResponse.ok) {
        return;
      }

      const refreshPayload = (await refreshResponse.json()) as CollaboratorsResponse;
      setCanManage(refreshPayload.canManage);
      setCollaborators(
        refreshPayload.collaborators.map((entry) => ({
          id: entry.id,
          email: entry.email,
          name: entry.name,
          avatarUrl: entry.avatarUrl,
        })),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators/${collaboratorId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Unable to remove collaborator.");
        return;
      }

      setCollaborators((previous) => previous.filter((entry) => entry.id !== collaboratorId));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EditorDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Share Project"
      description={canManage ? "Invite and manage collaborators for this workspace." : "Collaborators on this workspace."}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" variant="outline" onClick={() => void copyLink()}>
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {canManage ? (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void inviteCollaborator();
            }}
          >
            <Input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="teammate@example.com"
              type="email"
              disabled={isSaving}
            />
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Invite
            </Button>
          </form>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="max-h-72 overflow-y-auto rounded-md border border-border">
          {isLoading ? (
            <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">Loading collaborators...</div>
          ) : collaborators.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No collaborators yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {collaborators.map((collaborator) => {
                const label = collaborator.name ?? collaborator.email;
                return (
                  <li key={collaborator.id} className="flex items-center justify-between px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      {collaborator.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={collaborator.avatarUrl} alt={label} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-xs font-medium text-foreground">
                          {getInitials(label)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{label}</p>
                        <p className="truncate text-xs text-muted-foreground">{collaborator.email}</p>
                      </div>
                    </div>
                    {canManage ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => void removeCollaborator(collaborator.id)}
                        disabled={isSaving}
                        aria-label={`Remove ${collaborator.email}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </EditorDialogShell>
  );
}
