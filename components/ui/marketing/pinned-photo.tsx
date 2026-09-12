import { cn } from "@/lib/utils"

import { clampRotation } from "./rotation"

type PinnedPhotoProps = React.ComponentProps<"div"> & {
  /** Tilt in degrees, clamped to ±8deg. */
  rotation?: number
  /** Caption written under the hatched plate, in Caveat. */
  caption?: string
}

/**
 * A hatched paper plate held down by a single push-pin — the one place
 * Paper Pin Red is allowed on the mat.
 */
function PinnedPhoto({
  className,
  rotation = 5,
  caption,
  ...props
}: PinnedPhotoProps) {
  const tilt = clampRotation(rotation)

  return (
    <div
      aria-hidden
      style={{ rotate: `${tilt}deg` }}
      className={cn(
        "relative inline-block select-none border border-ink/25 bg-paper-bright rounded-paper shadow-flat",
        "p-[var(--space-2)] transition-[translate,box-shadow] duration-[var(--duration-hover)] ease-[var(--ease-hover)]",
        "hover:-translate-y-[var(--hover-lift-translate)] hover:shadow-lifted",
        className
      )}
      {...props}
    >
      <span
        className="absolute -top-[7px] left-1/2 size-[13px] -translate-x-1/2 rounded-full bg-paper-pin-red shadow-flat"
      />
      <div
        className="h-[86px] w-[128px] border border-ink/20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--ink-soft) 0 1px, transparent 1px 9px)",
          opacity: 0.65,
        }}
      />
      {caption ? (
        <span className="mt-[var(--space-2)] block text-center font-hand text-[length:var(--text-annotation-min)] leading-none text-ink-soft">
          {caption}
        </span>
      ) : null}
    </div>
  )
}

export { PinnedPhoto }
