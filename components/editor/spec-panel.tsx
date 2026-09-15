"use client";

import { Download, FileText, Loader2 } from "lucide-react";

import type { UseSpecGeneratorResult } from "@/hooks/use-spec-generator";
import { cn } from "@/lib/utils";

const focusClass = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60";

const kickerClass = "font-mono text-chrome tracking-chrome text-ink-soft uppercase";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** The AI sidebar's Specs tab: generate a Markdown spec from the canvas and download it. */
export function SpecPanel({ spec, isLoading, isRunning, statusText, error, downloadHref, generate }: UseSpecGeneratorResult) {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-brand text-sm text-ink-soft">
        Turn the current canvas into a Markdown technical spec: diagrams, key decisions, components, connections, and
        risks.
      </p>

      <button
        type="button"
        onClick={generate}
        disabled={isRunning}
        aria-busy={isRunning || undefined}
        className={cn(
          "flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-paper border border-ink bg-ink",
          "font-brand text-sm font-semibold text-paper-cream shadow-flat",
          "active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-70 disabled:active:translate-y-0",
          focusClass,
        )}
      >
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {isRunning ? "Generating spec…" : spec ? "Regenerate spec" : "Generate spec"}
      </button>

      {isRunning ? (
        <p className={cn(kickerClass, "flex items-center gap-2")} aria-live="polite">
          {statusText}
        </p>
      ) : (
        <p className={kickerClass}>Downloads automatically when ready</p>
      )}

      {error ? (
        <div
          role="alert"
          className="rounded-paper border border-ink/20 border-l-2 border-l-paper-pin-red bg-paper-bright px-3.5 py-3 font-brand text-sm text-ink"
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <p className={cn(kickerClass, "flex items-center gap-2")} aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Loading spec…
        </p>
      ) : spec ? (
        <div className="space-y-3 rounded-paper border border-ink/20 bg-paper-bright p-4">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-brand text-sm font-semibold text-ink">Technical spec</p>
              <p className={cn(kickerClass, "mt-1")}>Generated {dateFormatter.format(new Date(spec.generatedAt))}</p>
              {spec.stats ? (
                <p className="mt-1 font-brand text-sm text-ink-soft">
                  {plural(spec.stats.components, "component")} · {plural(spec.stats.connections, "connection")} ·{" "}
                  {plural(spec.stats.diagrams, "diagram")} · {plural(spec.stats.decisions, "key decision")}
                </p>
              ) : null}
            </div>
          </div>
          <a
            href={downloadHref}
            download
            className={cn(
              "flex h-10 w-full items-center justify-center gap-2 rounded-paper border border-ink bg-transparent",
              "font-brand text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper-cream",
              focusClass,
            )}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download .md
          </a>
        </div>
      ) : (
        <p className="rounded-paper border border-dashed border-ink/25 px-3.5 py-4 font-brand text-sm text-ink-soft">
          No spec yet. Generate one from the current canvas.
        </p>
      )}
    </div>
  );
}
