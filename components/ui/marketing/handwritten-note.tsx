import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

import { clampRotation } from "./rotation"

const noteVariants = cva(
  cn(
    "relative flex size-[128px] shrink-0 flex-col items-start justify-start overflow-hidden",
    "select-none rounded-paper border border-ink/20 shadow-flat",
    "p-[var(--space-3)]",
    "font-hand text-[length:var(--text-annotation-min)] leading-snug text-ink text-left",
    "transition-[translate,rotate,box-shadow] duration-[var(--duration-hover)] ease-[var(--ease-hover)]",
    "hover:-translate-y-[var(--hover-lift-translate)] hover:shadow-lifted"
  ),
  {
    variants: {
      tone: {
        amber: "bg-paper-accent-marker-amber",
        coral: "bg-paper-accent-scrap-coral",
        sage: "bg-paper-accent-cut-sage",
        cream: "bg-paper-cream",
      },
    },
    defaultVariants: {
      tone: "amber",
    },
  }
)

type HandwrittenNoteProps = React.ComponentProps<"div"> &
  VariantProps<typeof noteVariants> & {
    /** Tilt in degrees, clamped to ±8deg. */
    rotation?: number
  }

/** A torn sticky note carrying the human voice — decorative by default. */
function HandwrittenNote({
  className,
  tone,
  rotation = -4,
  children,
  ...props
}: HandwrittenNoteProps) {
  return (
    <div
      aria-hidden
      style={{ rotate: `${clampRotation(rotation)}deg` }}
      className={cn(noteVariants({ tone }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

type HandwrittenAnnotationProps = React.ComponentProps<"p"> & {
  rotation?: number
}

/** Margin handwriting straight on the mat — no paper behind it. */
function HandwrittenAnnotation({
  className,
  rotation = -3,
  children,
  ...props
}: HandwrittenAnnotationProps) {
  return (
    <p
      aria-hidden
      style={{ rotate: `${clampRotation(rotation)}deg` }}
      className={cn(
        "select-none font-hand text-(length:--text-annotation-min) leading-snug text-paper-cream/80",
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
}

export { HandwrittenNote, HandwrittenAnnotation, noteVariants }
