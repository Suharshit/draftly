import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

import { clampRotation } from "./rotation"

const skillPillVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center select-none",
    "border border-ink/25 rounded-paper shadow-flat",
    "px-[var(--space-4)] py-[var(--space-2)]",
    "font-brand text-[length:var(--text-ui-label)] font-semibold text-ink",
    "transition-[translate,rotate,box-shadow] duration-[var(--duration-hover)] ease-[var(--ease-hover)]",
    "hover:-translate-y-[var(--hover-lift-translate)] hover:shadow-lifted"
  ),
  {
    variants: {
      tone: {
        amber: "bg-paper-accent-marker-amber",
        coral: "bg-paper-accent-scrap-coral",
        sage: "bg-paper-accent-cut-sage",
        blue: "bg-paper-accent-draft-blue",
        cream: "bg-paper-cream",
      },
    },
    defaultVariants: {
      tone: "amber",
    },
  }
)

type SkillPillProps = React.ComponentProps<"li"> &
  VariantProps<typeof skillPillVariants> & {
    /** Tilt in degrees, clamped to ±8deg. */
    rotation?: number
  }

/**
 * A hand-cut strip of accent paper carrying one skill label. Accents are
 * backgrounds for ink only — the label is never the accent color.
 */
function SkillPill({
  className,
  tone,
  rotation = 0,
  children,
  ...props
}: SkillPillProps) {
  return (
    <li
      style={{ rotate: `${clampRotation(rotation)}deg` }}
      className={cn(skillPillVariants({ tone }), className)}
      {...props}
    >
      {children}
    </li>
  )
}

export { SkillPill, skillPillVariants }
