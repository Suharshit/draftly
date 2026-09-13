import { cn } from "@/lib/utils"

/**
 * The two-face wordmark lockup: "Draft" in Archivo Bold, "ly" in Instrument
 * Serif Italic. Set as text rather than placed as an image so it stays crisp
 * at every density and inherits the current colour. Size it with a text-*
 * class on `className` — Instrument Serif is never set below 24px.
 */
function DraftlyWordmark({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("flex items-baseline text-[1.5rem] leading-none", className)}
      {...props}
    >
      <span className="font-brand font-bold tracking-brand-tight">Draft</span>
      <span className="-ml-px font-serif italic">ly</span>
    </span>
  )
}

export { DraftlyWordmark }
