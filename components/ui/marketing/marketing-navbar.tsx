import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

const MARK_SIZE = 168

/**
 * Floating paper card that sits on the craft mat: the D mark on the left,
 * brand in the centre, one mono chrome link on the right.
 */
function MarketingNavbar({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        "mx-auto flex w-full max-w-[560px] items-center justify-between gap-[var(--space-4)]",
        "border border-ink/25 bg-paper-bright rounded-paper shadow-flat",
        "px-[var(--space-4)] py-[var(--space-3)]",
        className
      )}
    >
      <Link
        href="/landing"
        aria-label="Draftly home"
        className={cn(
          "-my-[var(--space-2)] -ml-[var(--space-2)] block shrink-0 rounded-paper outline-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60"
        )}
      >
        <Image
          src="/Draftly Wordmark-selection (1).png"
          alt=""
          width={MARK_SIZE}
          height={MARK_SIZE}
          priority
          className="block size-11 rounded-paper object-contain"
        />
      </Link>

      {/* The wordmark is set, not placed: the brand sheet's only logo asset is a
          framed board with a "PRIMARY" caption baked in, and Archivo Bold +
          Instrument Serif Italic are the two faces it is drawn from anyway. As
          text it stays crisp at every density and inherits ink. */}
      <Link
        href="/landing"
        aria-label="Draftly"
        className="flex items-baseline text-[1.5rem] leading-none text-ink"
      >
        <span className="font-brand font-bold tracking-brand-tight">Draft</span>
        {/* Instrument Serif is never set below 24px, which sets the lockup's size. */}
        <span className="-ml-px font-serif italic">ly</span>
      </Link>

      <Link
        href="#about"
        className={cn(
          "flex h-11 items-center font-mono text-chrome tracking-chrome uppercase text-ink-soft",
          "-my-[var(--space-2)] -mr-[var(--space-2)] transition-colors hover:text-ink"
        )}
      >
        About
      </Link>
    </nav>
  )
}

export { MarketingNavbar }
