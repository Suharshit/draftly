"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

import { DraftlyWordmark } from "./draftly-wordmark"

const LOADER_WORDS = {
  craft: [
    "Sketching…",
    "Drafting…",
    "Cutting paper…",
    "Inking the lines…",
    "Connecting nodes…",
    "Pinning ideas…",
    "Taping notes down…",
    "Squaring up the mat…",
    "Arranging the canvas…",
    "Thinking it through…",
  ],
  plain: [
    "Loading…",
    "One moment…",
    "Getting things ready…",
    "Almost there…",
    "Warming up…",
    "Hang tight…",
  ],
} as const

type LoaderTone = keyof typeof LOADER_WORDS

const MIN_PACE_MS = 600

/** 22px notebook rule rhythm across the whole ground. */
const RULE_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent 0, transparent calc(var(--paper-rule-spacing) - 1px), var(--paper-cream-rule) calc(var(--paper-rule-spacing) - 1px), var(--paper-cream-rule) var(--paper-rule-spacing))",
}

/** Soft edge darkening so the sticky note sits in the middle of the sheet. */
const VIGNETTE_STYLE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(120% 90% at 50% 45%, transparent 55%, color-mix(in srgb, var(--paper-cream-rule) 55%, transparent) 100%)",
}

/** Dashed ink rule that crawls sideways under the dots. */
const CRAWL_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(90deg, color-mix(in srgb, var(--ink) 55%, transparent) 0 8px, transparent 8px 24px)",
}

const DOT_DELAYS_MS = [0, 180, 360]

type DraftlyLoaderProps = {
  /** Word set cycled on the sticky note. */
  tone?: LoaderTone
  /** Milliseconds between words (minimum 600). */
  pace?: number
  /** Chrome line under the wordmark. */
  caption?: string
  /** Fill the viewport; otherwise fill the parent container. */
  fullScreen?: boolean
  className?: string
}

/**
 * Brand loading screen: a swinging sticky note on notebook paper with a
 * rotating handwritten status word. Used for waits such as dashboard → editor
 * and connecting to the canvas.
 */
function DraftlyLoader({
  tone = "craft",
  pace = 1700,
  caption = "Setting up your canvas",
  fullScreen = true,
  className,
}: DraftlyLoaderProps) {
  const words = LOADER_WORDS[tone]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((current) => current + 1),
      Math.max(MIN_PACE_MS, pace)
    )
    return () => clearInterval(timer)
  }, [tone, pace])

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative isolate flex w-full flex-col items-center justify-center overflow-hidden",
        "bg-paper-cream px-(--space-4) py-(--space-6) text-ink",
        fullScreen ? "min-h-screen" : "h-full min-h-[480px]",
        className
      )}
    >
      <span className="sr-only">Loading. {caption}.</span>

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={RULE_STYLE} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[clamp(20px,7vw,88px)] -z-10 w-px bg-paper-accent-scrap-coral/70"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={VIGNETTE_STYLE} />

      {/* Sticky note */}
      <div
        aria-hidden
        className={cn(
          "relative flex w-[clamp(238px,26vw,308px)] min-h-[clamp(214px,23vw,278px)] flex-col items-center justify-center gap-4",
          "rounded-paper border border-ink/30 bg-paper-accent-marker-amber px-[26px] pt-[38px] pb-[26px] shadow-lifted",
          "rotate-[-3deg] motion-safe:animate-loader-swing"
        )}
      >
        {/* Tape strip */}
        <div className="absolute -top-[13px] left-1/2 h-[26px] w-[96px] -translate-x-1/2 rotate-[-3.5deg] border-x border-dashed border-ink/30 bg-paper-cream/80" />

        <p className="flex min-h-[2.3em] items-center text-center font-hand text-[clamp(26px,3.1vw,34px)] leading-[1.15] font-semibold text-pretty">
          {words[index % words.length]}
        </p>

        <div className="flex gap-[7px]">
          {DOT_DELAYS_MS.map((delay) => (
            <span
              key={delay}
              className="size-[7px] rounded-full bg-ink motion-safe:animate-loader-dot"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>

        <div className="h-[2px] w-[74%] motion-safe:animate-loader-crawl" style={CRAWL_STYLE} />
      </div>

      <DraftlyWordmark aria-hidden className="mt-[clamp(30px,4vw,46px)] text-[clamp(24px,2.4vw,28px)]" />

      <p
        aria-hidden
        className="mt-[10px] text-center font-mono text-(length:--text-chrome) tracking-[0.16em] text-ink-soft uppercase"
      >
        {caption}
      </p>

      <p
        aria-hidden
        className="absolute inset-x-0 bottom-[clamp(16px,3vw,26px)] text-center font-mono text-(length:--text-chrome) tracking-[0.14em] whitespace-nowrap text-ink-soft uppercase"
      >
        Draftly · AI canvas for system design
      </p>
    </div>
  )
}

export { DraftlyLoader, LOADER_WORDS }
export type { DraftlyLoaderProps, LoaderTone }
