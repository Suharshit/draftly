"use client"

import Link from "next/link"
import { Menu } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"

type NavLink = {
  label: string
  href: string
}

const MENU_LINKS: NavLink[] = [
  { label: "Docs", href: "/docs" },
  { label: "Login", href: "/sign-in" },
]

/**
 * Floating paper card that sits on the craft mat: menu on the left,
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
      <Menu.Root>
        <Menu.Trigger
          aria-label="Open menu"
          className={cn(
            "flex size-11 shrink-0 cursor-pointer flex-col items-center justify-center gap-[3px]",
            "-my-[var(--space-2)] -ml-[var(--space-2)] outline-none",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60"
          )}
        >
          <span aria-hidden className="block h-px w-4 bg-ink" />
          <span aria-hidden className="block h-px w-4 bg-ink" />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner align="start" side="bottom" sideOffset={10}>
            <Menu.Popup
              className={cn(
                "min-w-[168px] border border-ink/25 bg-paper-cream rounded-paper shadow-lifted",
                "p-[var(--space-1)] outline-none"
              )}
            >
              {MENU_LINKS.map((link) => (
                <Menu.LinkItem
                  key={link.href}
                  closeOnClick
                  render={<Link href={link.href} />}
                  className={cn(
                    "flex cursor-pointer items-center rounded-paper px-[var(--space-3)] py-[var(--space-2)]",
                    "font-brand text-[length:var(--text-ui-label)] font-semibold text-ink outline-none",
                    "data-[highlighted]:bg-paper-accent-marker-amber"
                  )}
                >
                  {link.label}
                </Menu.LinkItem>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Link
        href="/landing"
        className="font-brand text-[1.25rem] leading-none font-bold tracking-brand-tight text-ink"
      >
        Draftly
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
