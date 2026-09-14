import type { ReactNode } from "react";
import Link from "next/link";

import { CanvasMockup, DraftlyWordmark, MatGrid } from "@/components/ui/marketing";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-mat-green">
      <MatGrid />

      <div className="relative mx-auto grid min-h-screen w-full max-w-(--content-max) grid-cols-1 gap-(--space-6) px-(--space-4) py-(--space-6) lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-(--space-7)">
        {/* Brand column: wordmark + tagline up top, the mini-canvas pinned to the bottom. */}
        <section className="flex flex-col justify-between gap-(--space-6)">
          <div>
            <Link href="/" aria-label="Draftly home" className="relative inline-block text-paper-cream">
              <DraftlyWordmark className="text-[clamp(2.5rem,5vw,4rem)]" />
            </Link>

            <p className="mt-(--space-4) max-w-[34ch] font-brand text-[clamp(1.125rem,1.8vw,1.5rem)] leading-[1.45] text-paper-cream/85">
              Draw the system, argue on the canvas, leave with a decision.
            </p>

            <p className="mt-(--space-4) font-mono text-chrome tracking-[0.3em] uppercase text-paper-cream/40">
              AI canvas for system design
            </p>
          </div>

          <CanvasMockup
            caption="payments · v3"
            annotation="retry here?"
            className="hidden max-w-[400px] lg:block"
          />
        </section>

        {/* Auth column: the sign-in / sign-up content drops in here. */}
        <section className="flex items-center justify-center">
          <div className="w-full max-w-[520px]">{children}</div>
        </section>
      </div>
    </main>
  );
}
