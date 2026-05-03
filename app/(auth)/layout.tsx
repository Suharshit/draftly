import type { ReactNode } from "react";
import { Ghost } from "lucide-react";

const FEATURE_POINTS = [
  "Real-time architecture canvas collaboration",
  "AI-assisted system diagram generation",
  "Spec generation from architecture graphs",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 px-4 py-8 lg:grid-cols-2 lg:gap-0 lg:px-8">
        <section className="relative hidden h-full w-full overflow-hidden rounded-l-lg border border-border bg-card p-8 lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 75% 65%, color-mix(in srgb, var(--accent-primary) 38%, transparent) 0%, transparent 50%), radial-gradient(circle at 20% 30%, color-mix(in srgb, var(--state-success) 30%, transparent) 0%, transparent 45%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center space-x-1">
              <Ghost className="h-8 w-8 text-muted-foreground" />
              <p className="text-lg font-semibold uppercase tracking-wide text-muted-foreground">Ghost AI</p>
            </div>
          </div>
          <div className="relative space-y-8">
            <div className="flex flex-col items-start space-y-1">
              <h1 className="max-w-md text-3xl font-semibold leading-tight text-foreground">Design Better Systems Faster</h1>
              <p className="max-w-md text-md leading-relaxed text-muted-foreground">
                Sign in or create an account to open your collaborative workspace and continue building architecture specs
                with your team.
              </p>
            </div>
            <ul className="grid grid-cols-3 gap-3">
              {FEATURE_POINTS.map((point, index) => (
                <li
                  key={point}
                  className="rounded-md border border-border bg-card/80 p-4 backdrop-blur-sm transition-colors first:bg-background"
                >
                  <span className="mb-6 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-5 text-foreground">{point}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="flex h-full w-full items-center justify-center rounded-r-lg border border-l-0 border-border bg-background p-8">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  );
}
