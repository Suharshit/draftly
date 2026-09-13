import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

import { DraftlyWordmark } from "./draftly-wordmark"

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

      <Link href="/landing" aria-label="Draftly" className="text-ink">
        <DraftlyWordmark />
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
