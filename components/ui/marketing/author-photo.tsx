import Image from "next/image"

import { cn } from "@/lib/utils"

import { clampRotation } from "./rotation"

type AuthorPhotoProps = Omit<React.ComponentProps<"figure">, "children"> & {
  /** Photo source. Omit to render the hatched placeholder plate. */
  src?: string
  alt?: string
  /** Caption written under the plate, in Caveat. */
  caption?: string
  /** Tilt in degrees, clamped to ±8deg. */
  rotation?: number
  /** Strip of marker-amber tape across the top edge. */
  taped?: boolean
}

const PHOTO_W = 148
const PHOTO_H = 168

/**
 * The author plate for the about section: a Paper Bright border, the photo,
 * and a handwritten caption — held down by a strip of tape rather than a pin,
 * since it sits on paper, not on the mat.
 */
function AuthorPhoto({
  className,
  src,
  alt = "",
  caption = "that's me",
  rotation = 3,
  taped = true,
  ...props
}: AuthorPhotoProps) {
  return (
    <figure
      style={{ rotate: `${clampRotation(rotation)}deg` }}
      className={cn(
        "relative inline-block shrink-0 border border-ink/25 bg-paper-bright rounded-paper shadow-flat",
        "p-[var(--space-2)] pb-[var(--space-1)]",
        "transition-[translate,box-shadow] duration-[var(--duration-hover)] ease-[var(--ease-hover)]",
        "hover:-translate-y-[var(--hover-lift-translate)] hover:shadow-lifted",
        className
      )}
      {...props}
    >
      {taped ? (
        <span
          aria-hidden
          style={{ rotate: "-6deg" }}
          className="absolute -top-[10px] left-1/2 h-[26px] w-[76px] -translate-x-1/2 bg-paper-accent-marker-amber/85 shadow-flat"
        />
      ) : null}

      {src ? (
        <Image
          src={src}
          alt={alt}
          width={PHOTO_W}
          height={PHOTO_H}
          className="block h-auto w-[148px] border border-ink/20 object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="h-[168px] w-[148px] border border-ink/20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, var(--ink-soft) 0 1px, transparent 1px 9px)",
            opacity: 0.65,
          }}
        />
      )}

      <figcaption className="mt-[var(--space-2)] block text-center font-hand text-[length:var(--text-annotation-min)] leading-none text-ink-soft">
        {caption}
      </figcaption>
    </figure>
  )
}

export { AuthorPhoto }
