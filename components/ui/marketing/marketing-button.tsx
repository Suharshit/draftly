import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const marketingButtonVariants = cva(
  cn(
    "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-[var(--space-2)] rounded-paper",
    "whitespace-nowrap outline-none select-none",
    "transition-[translate,box-shadow,background-color] duration-[var(--duration-hover)] ease-[var(--ease-hover)]",
    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper-cream"
  ),
  {
    variants: {
      variant: {
        /** Ink slab CTA — presses 2px into the mat. */
        solid: cn(
          "border border-ink bg-ink px-[var(--space-5)] py-[var(--space-3)] shadow-flat",
          "font-brand text-[length:var(--text-ui-label)] font-semibold text-paper-cream",
          "hover:-translate-y-[var(--hover-lift-translate)] hover:shadow-lifted",
          "active:translate-y-[var(--press-translate)] active:shadow-none active:duration-[var(--duration-press)]"
        ),
        /** The quiet second action — mono chrome with a single hand rule. */
        quiet: cn(
          "px-[var(--space-2)] font-mono text-chrome tracking-chrome uppercase text-paper-cream/70",
          "underline decoration-paper-pin-red decoration-2 underline-offset-[6px]",
          "hover:text-paper-cream"
        ),
      },
    },
    defaultVariants: {
      variant: "solid",
    },
  }
)

type MarketingButtonProps = React.ComponentProps<typeof Link> &
  VariantProps<typeof marketingButtonVariants>

/** Marketing CTA. Always a link — the landing page has no in-place actions. */
function MarketingButton({
  className,
  variant,
  ...props
}: MarketingButtonProps) {
  return (
    <Link
      className={cn(marketingButtonVariants({ variant }), className)}
      {...props}
    />
  )
}

export { MarketingButton, marketingButtonVariants }
