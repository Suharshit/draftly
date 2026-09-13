import { cn } from "@/lib/utils"

/** Cutting-mat grid: minor rule at 32px, major rule at 128px. */
const MAT_GRID_STYLE: React.CSSProperties = {
  backgroundImage: [
    "linear-gradient(to right, rgba(255,255,255,0.16) 1px, transparent 1px)",
    "linear-gradient(to bottom, rgba(255,255,255,0.16) 1px, transparent 1px)",
    "linear-gradient(to right, rgba(255,255,255,0.09) 1px, transparent 1px)",
    "linear-gradient(to bottom, rgba(255,255,255,0.09) 1px, transparent 1px)",
  ].join(","),
  backgroundSize: [
    "var(--mat-grid-major) var(--mat-grid-major)",
    "var(--mat-grid-major) var(--mat-grid-major)",
    "var(--mat-grid-minor) var(--mat-grid-minor)",
    "var(--mat-grid-minor) var(--mat-grid-minor)",
  ].join(","),
}

/** Decorative grid overlay; place inside a positioned mat-green ground. */
function MatGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={MAT_GRID_STYLE}
    />
  )
}

export { MatGrid }
