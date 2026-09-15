"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, Trash2 } from "lucide-react";

import {
  PaperDialog,
  paperFocusClass,
  paperInputClass,
  paperPrimaryButtonClass,
  paperSecondaryButtonClass,
} from "@/components/editor/paper-dialog";
import { cn } from "@/lib/utils";

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
    <PaperDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="Share project"
      description={canManage ? "Invite and manage collaborators for this workspace." : "Collaborators on this workspace."}
      footer={
        <>
          <button type="button" className={paperSecondaryButtonClass} onClick={() => onOpenChange(false)}>
            Close
          </button>
          <button type="button" className={paperSecondaryButtonClass} onClick={() => void copyLink()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {canManage ? (
          <form
            className="flex gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void inviteCollaborator();
            }}
          >
            <input
              aria-label="Collaborator email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="teammate@example.com"
              type="email"
              disabled={isSaving}
              className={paperInputClass}
            />
            <button type="submit" disabled={isSaving} className={cn(paperPrimaryButtonClass, "h-12")}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Invite
            </button>
          </form>
        ) : null}

        {error ? (
          <p role="alert" className="font-brand text-sm text-paper-pin-red">
            {error}
          </p>
        ) : null}

        <section aria-label="Collaborators" className="rounded-paper border border-ink/15 bg-paper-cream">
          <div className="flex items-center justify-between border-b border-ink/15 px-4 py-2.5 font-mono text-chrome tracking-chrome text-ink-soft uppercase">
            <span>Collaborators</span>
            <span>{isLoading ? "–" : collaborators.length}</span>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-8 font-brand text-sm text-ink-soft">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading collaborators…
              </div>
            ) : collaborators.length === 0 ? (
              <p className="p-8 text-center font-brand text-sm text-ink-soft">No collaborators yet.</p>
            ) : (
              <ul className="divide-y divide-ink/10">
                {collaborators.map((collaborator) => {
                  const label = collaborator.name ?? collaborator.email;
                  return (
                    <li key={collaborator.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {collaborator.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={collaborator.avatarUrl}
                            alt={label}
                            className="h-9 w-9 shrink-0 rounded-full border border-ink object-cover"
                          />
                        ) : (
                          <div
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink bg-paper-accent-marker-amber font-brand text-xs font-semibold text-ink"
                          >
                            {getInitials(label)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-brand text-sm font-semibold text-ink">{label}</p>
                          <p className="truncate font-brand text-xs text-ink-soft">{collaborator.email}</p>
                        </div>
                      </div>
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => void removeCollaborator(collaborator.id)}
                          disabled={isSaving}
                          aria-label={`Remove ${collaborator.email}`}
                          className={cn(
                            "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-paper text-ink-soft transition-colors",
                            "hover:bg-ink/5 hover:text-paper-pin-red disabled:cursor-not-allowed disabled:opacity-50",
                            paperFocusClass,
                          )}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </PaperDialog>
  );
}
