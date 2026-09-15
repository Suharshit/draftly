import {
  AuthorPhoto,
  CanvasMockup,
  HandwrittenAnnotation,
  HandwrittenNote,
  MarketingButton,
  MarketingNavbar,
  MatGrid,
  PaperSection,
  PinnedPhoto,
  SkillPill,
} from "@/components/ui/marketing"

const SKILLS = [
  { label: "AI drafts", tone: "amber", rotation: -2 },
  { label: "Live canvas", tone: "sage", rotation: 2 },
  { label: "Starter systems", tone: "coral", rotation: -1 },
  { label: "Team cursors", tone: "blue", rotation: 3 },
  { label: "Markdown specs", tone: "cream", rotation: -3 },
] as const

const CONTACT_LINKS = [
  { label: "GitHub", href: "https://github.com" },
  { label: "Docs", href: "/docs" },
  { label: "Email", href: "mailto:hello@draftly.app" },
]

export default function LandingPage() {
  return (
    <main className="relative bg-paper-cream">
      <section className="relative z-10 overflow-hidden bg-mat-green">
        <MatGrid />

        <div className="relative mx-auto w-full max-w-(--content-max) px-(--space-4) pt-(--space-5) pb-(--space-7)">
          <MarketingNavbar />

          <section className="relative mt-(--space-6) flex flex-col items-center">
            {/* Craft objects live outside the centre column so the headline never competes. */}
            <HandwrittenNote
              rotation={-5}
              className="absolute -top-(--space-3) left-0 hidden md:block"
            >
              note
            </HandwrittenNote>

            <PinnedPhoto
              rotation={5}
              className="absolute top-(--space-2) right-0 hidden md:block"
            />

            <h1 className="max-w-(--text-col-max) text-center text-paper-cream">
              <span className="block font-brand text-hero-1 leading-[0.95] font-bold tracking-hero">
                Your Idea,
              </span>
              <span className="mt-(--space-2) block font-serif text-hero-2 leading-[1.05] italic">
                beautifully structured
              </span>
            </h1>

            <span
              aria-hidden
              className="mt-(--space-5) block h-[3px] w-[180px] bg-paper-cream/35"
            />

            <p className="mt-(--space-4) max-w-[46ch] text-center font-brand text-sub text-paper-cream/80">
              Describe a system in plain English and watch it land on a shared
              canvas your whole team can redraw.
            </p>

            <div className="mt-(--space-5) flex flex-wrap items-center justify-center gap-(--space-5)">
              <MarketingButton href="/editor">Start creating</MarketingButton>
              <MarketingButton href="/docs" variant="quiet">
                see how it works
              </MarketingButton>
            </div>
          </section>

          <footer className="mt-(--space-7) flex items-end justify-between">
            <span aria-hidden className="flex items-end gap-(--space-1)">
              <span className="block size-[10px] bg-paper-cream/35" />
              <span className="block size-[7px] bg-paper-cream/25" />
              <span className="block size-[5px] bg-paper-cream/20" />
            </span>
            <span className="font-mono text-chrome tracking-chrome uppercase text-paper-cream/40">
              0 &middot; 65% vh
            </span>
          </footer>
        </div>
      </section>

      <PaperSection id="about" className="z-20 border-dashed border-ink/30">
        {/* The mini-canvas bridges both grounds: pulled up over the mat, it hands
            off to the about section exactly where it ends. It sits in its own
            full-width row so the about column's left margin never pulls it
            off-centre, and the annotation is absolute for the same reason. */}
        <div className="relative mx-auto -mt-[60px] flex w-full max-w-(--content-max) justify-center px-(--space-2) md:-mt-[140px]">
          <HandwrittenAnnotation
            rotation={-3}
            className="absolute top-(--space-5) left-[170px] hidden text-paper-cream lg:block"
          >
            tiny live canvas &#8600;
          </HandwrittenAnnotation>

          <CanvasMockup />
        </div>

        <div className="mx-auto w-full max-w-(--content-max) px-(--space-4) pt-(--space-5) pb-(--space-7) md:pl-(--space-7)">
          <h2 className="mt-(--space-5) font-hand text-4xl leading-none text-ink">
            About Me.
          </h2>

          <div className="mt-(--space-3) flex flex-col gap-(--space-6) md:flex-row md:items-start md:justify-between">
            <div className="max-w-(--text-col-max) text-right md:ml-auto mt-4">
              <span className="inline-block border border-ink/30 bg-paper-bright rounded-paper px-(--space-4) py-(--space-2) font-serif text-[1.5rem] leading-none italic text-ink shadow-flat">
                what&rsquo;s up
              </span>

              <p className="mt-(--space-4) ml-auto max-w-[24ch] font-serif text-[1.75rem] leading-[1.25] italic text-ink">
                Hi, I&rsquo;m Suharshit &mdash; a full-stack developer.
              </p>

              <p className="mt-(--space-3) ml-auto max-w-[52ch] font-brand text-(length:--text-body) leading-[1.65] text-ink-soft">
                I build tools that take the friction out of thinking on a
                screen. <span className="font-semibold text-ink">Draftly</span>{" "}
                is the one I reach for most: describe a system in plain
                English, watch it land as a real diagram, redraw it live with
                your team, and take the spec back out as Markdown.
              </p>
            </div>

            <AuthorPhoto
              src="https://drive.google.com/thumbnail?id=1OaLm8j6OyIy04QjGYk5XQ634onFjsDad&sz=w600"
              alt="Portrait of the maker of Draftly"
              rotation={3}
              className="self-center md:mr-(--space-5) md:self-start mt-(--space-6)"
            />
          </div>

          <div className="mt-0">
            <HandwrittenAnnotation rotation={-2} className="text-ink-soft mb-(--space-5) block">
              what&rsquo;s inside
            </HandwrittenAnnotation>

            <ul className="mt-(--space-3) flex flex-wrap items-center gap-(--space-5)">
              {SKILLS.map((skill) => (
                <SkillPill
                  key={skill.label}
                  tone={skill.tone}
                  rotation={skill.rotation}
                >
                  {skill.label}
                </SkillPill>
              ))}
            </ul>
          </div>

          <div className="relative mt-(--space-7) flex flex-wrap items-center gap-(--space-4)">
            {CONTACT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-hand text-(length:--text-annotation-min) leading-none text-ink underline decoration-ink/40 underline-offset-[6px] transition-colors hover:decoration-paper-pin-red"
              >
                {link.label}
              </a>
            ))}

            {/* The section's single point of signal red. */}
            <span
              aria-hidden
              className="absolute right-0 bottom-(--space-1) size-[11px] rounded-full bg-paper-pin-red"
            />
          </div>
        </div>
      </PaperSection>
    </main>
  )
}
