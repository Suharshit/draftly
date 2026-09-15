"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const paperFocusClass =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60";

const paperButtonBaseClass = cn(
  "flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-paper border px-5 font-brand text-sm font-semibold",
  "transition-[translate,box-shadow] duration-(--duration-press) active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
  paperFocusClass,
);

export const paperSecondaryButtonClass = cn(paperButtonBaseClass, "border-ink bg-paper-bright text-ink hover:bg-paper-cream");

export const paperPrimaryButtonClass = cn(paperButtonBaseClass, "border-ink bg-ink text-paper-cream");

export const paperDestructiveButtonClass = cn(
  paperButtonBaseClass,
  "border-paper-pin-red bg-paper-pin-red text-paper-bright",
);

export const paperLabelClass = "block font-brand text-xs font-semibold tracking-[0.08em] text-ink uppercase";

export const paperInputClass = cn(
  "block h-12 w-full min-w-0 rounded-paper border border-ink bg-paper-bright px-3.5 font-brand text-base text-ink",
  "placeholder:text-ink-soft/60 disabled:cursor-not-allowed disabled:opacity-60",
  paperFocusClass,
);

interface PaperDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  /** Extra classes for the popup, e.g. a wider width. */
  contentClassName?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Brand-themed editor dialog: paper card with title, close button, body and a cream footer strip. */
export function PaperDialog({ open, onClose, title, description, contentClassName, children, footer }: PaperDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "gap-0 overflow-hidden rounded-(--radius-paper) border border-ink bg-paper-bright p-0 text-ink shadow-flat ring-0 scheme-light sm:max-w-136",
          contentClassName,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-7 pt-6">
          <div className="space-y-1.5">
            <DialogTitle className="font-brand text-xl leading-tight font-semibold text-ink">{title}</DialogTitle>
            <DialogDescription className="font-brand text-sm text-ink-soft">{description}</DialogDescription>
          </div>
          <DialogClose
            aria-label="Close dialog"
            className={cn(
              "-mr-2 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-paper text-ink transition-colors hover:bg-ink/5",
              paperFocusClass,
            )}
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </DialogClose>
        </div>

        {children ? <div className="min-h-0 px-7 pt-6 pb-7">{children}</div> : <div className="h-6" />}

        {footer ? (
          <div className="flex flex-col-reverse gap-3 border-t border-ink/15 bg-paper-cream px-7 py-5 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
