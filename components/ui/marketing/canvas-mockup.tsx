import { cn } from "@/lib/utils"

/** Nodes laid out in the 460 × 260 mockup coordinate space. */
const NODES = [
  { id: "a", x: 30, y: 60, w: 110, h: 46 },
  { id: "b", x: 250, y: 42, w: 110, h: 46 },
  { id: "c", x: 120, y: 150, w: 110, h: 42 },
] as const

const EDGES = [
  { id: "a-b", x1: 140, y1: 83, x2: 250, y2: 65 },
  { id: "a-c", x1: 85, y1: 106, x2: 175, y2: 150 },
] as const

const VIEW_W = 460
const VIEW_H = 260

function pct(value: number, total: number) {
  return `${(value / total) * 100}%`
}

/**
 * The mini-canvas: a paper object on the mat, never a screenshot.
 * Paper Bright ground, ink cards, Draft Blue connectors, one Amber
 * sticky and one Caveat label. Always tilted -2deg.
 */
function CanvasMockup({
  className,
  caption = "canvas",
  annotation = "link ’em",
  ...props
}: React.ComponentProps<"div"> & { caption?: string; annotation?: string }) {
  return (
    <div
      aria-hidden
      style={{ rotate: "-2deg" }}
      className={cn(
        "relative w-full max-w-[460px] select-none border border-ink/25 bg-paper-bright rounded-paper shadow-lifted",
        "p-[var(--space-3)]",
        className
      )}
      {...props}
    >
      <span className="font-mono text-chrome tracking-chrome uppercase text-ink-soft/70">
        {caption}
      </span>

      <div className="relative mt-[var(--space-2)] aspect-[460/260] w-full">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="absolute inset-0 size-full"
        >
          {EDGES.map((edge) => (
            <line
              key={edge.id}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke="var(--paper-accent-draft-blue)"
              strokeWidth={3}
            />
          ))}
          {EDGES.map((edge) => (
            <rect
              key={`${edge.id}-cap`}
              x={edge.x2 - 4}
              y={edge.y2 - 4}
              width={8}
              height={8}
              fill="var(--paper-accent-draft-blue)"
            />
          ))}
        </svg>

        {NODES.map((node) => (
          <div
            key={node.id}
            style={{
              left: pct(node.x, VIEW_W),
              top: pct(node.y, VIEW_H),
              width: pct(node.w, VIEW_W),
              height: pct(node.h, VIEW_H),
            }}
            className={cn(
              "absolute flex flex-col justify-center gap-[6px] border border-ink/70 bg-paper-bright rounded-paper",
              "px-[var(--space-2)]"
            )}
          >
            <span className="block h-[3px] w-3/4 bg-ink/70" />
            <span className="block h-[3px] w-1/2 bg-ink/35" />
          </div>
        ))}

        <div
          style={{ left: "66%", top: "55%", rotate: "6deg" }}
          className="absolute aspect-square w-[10%] border border-ink/20 bg-paper-accent-marker-amber rounded-paper shadow-flat"
        />
      </div>

      <span className="mt-[var(--space-1)] block text-right font-hand text-[length:var(--text-annotation-min)] leading-none text-ink-soft">
        {annotation}
      </span>
    </div>
  )
}

export { CanvasMockup }
