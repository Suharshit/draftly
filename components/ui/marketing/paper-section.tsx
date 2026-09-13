import { cn } from "@/lib/utils"

/**
 * 22px notebook rule rhythm, masked to fade out at the top and bottom edges
 * of the sheet so the ruling never collides with the cut edge.
 */
const RULE_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent 0, transparent calc(var(--paper-rule-spacing) - 1px), var(--paper-cream-rule) calc(var(--paper-rule-spacing) - 1px), var(--paper-cream-rule) var(--paper-rule-spacing))",
  maskImage:
    "linear-gradient(to bottom, transparent 0, #000 var(--space-7), #000 calc(100% - var(--space-7)), transparent 100%)",
}

/** 3% grain, so the sheet reads as paper rather than a flat fill. */
const GRAIN_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23g)'/%3E%3C/svg%3E\")",
  opacity: 0.03,
}

/**
 * A sheet of notebook paper, the ground that runs underneath the craft mat.
 *
 * The mat and this sheet are the only two grounds in the brand system, so the
 * hand-off between them is a cut edge — a hairline, never a gradient or a fade.
 * The sheet only carries the hairline: the mat lies on top of it, so the hard
 * offset shadow along the seam belongs to the mat section and is cast downward
 * onto this sheet. The dashed rule at the foot of the hero is ruler chrome on
 * the mat, not the seam.
 */
function PaperSection({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "relative isolate w-full bg-paper-cream text-ink",
        "border-t border-ink/25",
        className
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={RULE_STYLE}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={GRAIN_STYLE}
      />
      {/* The single coral margin line, sitting on the mat grid's 32px rhythm. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[var(--space-6)] -z-10 hidden w-px bg-paper-accent-scrap-coral md:block"
      />

      {children}
    </section>
  )
}

export { PaperSection }
