"use client";

import { FormEvent, useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import type { ClarifyAnswer, ClarifyQuestion, DesignPlan, DesignResultSummary } from "@/lib/ai/agent-schema";
import { cn } from "@/lib/utils";

// Assistant-side cards for the AI Architect chat: clarifying questions, a
// proposed plan, and a generation result. Only the newest open card is
// interactive; older ones render read-only as part of the transcript.

const focusClass = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60";

const kickerClass = "font-mono text-chrome tracking-chrome text-ink-soft uppercase";

const cardClass = "w-full space-y-3 rounded-paper border border-ink/20 bg-paper-bright px-3.5 py-3 font-brand text-sm text-ink";

const primaryButtonClass = cn(
  "flex h-9 cursor-pointer items-center justify-center rounded-paper bg-ink px-3.5 font-brand text-sm font-semibold text-paper-cream",
  "transition-[translate] duration-(--duration-press) active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40",
  focusClass,
);

/** Components listed before the rest are folded behind "Show all". */
const COMPONENTS_PREVIEW_COUNT = 6;

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

interface QuestionsCardProps {
  intro: string;
  questions: ClarifyQuestion[];
  /** Answers the user already sent for these questions, if any. */
  answers: ClarifyAnswer[] | null;
  /** True for the latest open questions while no reply is pending. */
  interactive: boolean;
  onSubmit: (answers: ClarifyAnswer[]) => void;
  onSkip: () => void;
}

export function QuestionsCard({ intro, questions, answers, interactive, onSubmit, onSkip }: QuestionsCardProps) {
  const idPrefix = useId();
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [typed, setTyped] = useState<Record<string, string>>({});

  // A typed answer wins over a picked option.
  const draftAnswers: ClarifyAnswer[] = questions.flatMap((question) => {
    const answer = (typed[question.id] ?? "").trim() || chosen[question.id];
    return answer ? [{ questionId: question.id, answer }] : [];
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (interactive && draftAnswers.length > 0) {
      onSubmit(draftAnswers);
    }
  };

  return (
    <form className={cardClass} onSubmit={handleSubmit}>
      <p className={kickerClass}>
        {questions.length === 1 ? "A quick question" : `${questions.length} quick questions`}
      </p>
      {intro ? <p className="whitespace-pre-wrap">{intro}</p> : null}

      <ol className="space-y-4">
        {questions.map((question, index) => {
          const labelId = `${idPrefix}-q${index}`;
          const sent = answers?.find((entry) => entry.questionId === question.id)?.answer;
          const selected = interactive ? (typed[question.id] ?? "").trim() ? undefined : chosen[question.id] : sent;
          const sentIsCustom = !interactive && sent !== undefined && !question.options.includes(sent);

          return (
            <li key={question.id} className="space-y-2">
              <div>
                <p id={labelId} className="font-semibold">
                  {index + 1}. {question.question}
                </p>
                {question.why ? <p className="mt-0.5 text-xs text-ink-soft">{question.why}</p> : null}
              </div>

              {question.options.length > 0 ? (
                <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
                  {question.options.map((option) => {
                    const active = selected === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={!interactive}
                        aria-pressed={active}
                        onClick={() =>
                          setChosen((previous) => ({
                            ...previous,
                            [question.id]: previous[question.id] === option ? "" : option,
                          }))
                        }
                        className={cn(
                          "inline-flex min-h-7 items-center gap-1 rounded-paper border px-2 py-1 text-left text-xs transition-colors",
                          active ? "border-ink bg-ink text-paper-cream" : "border-ink/20 text-ink",
                          interactive ? "cursor-pointer hover:border-ink" : "cursor-default",
                          !interactive && !active && "opacity-60",
                          focusClass,
                        )}
                      >
                        {active ? <Check className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {interactive ? (
                <input
                  type="text"
                  aria-labelledby={labelId}
                  placeholder="Or type your own answer"
                  value={typed[question.id] ?? ""}
                  onChange={(event) => setTyped((previous) => ({ ...previous, [question.id]: event.target.value }))}
                  className={cn(
                    "block h-8 w-full rounded-paper border border-ink/25 bg-paper-cream px-2.5 text-xs text-ink placeholder:text-ink-soft/70",
                    "focus-visible:border-ink",
                    focusClass,
                  )}
                />
              ) : null}

              {sentIsCustom ? <p className="text-xs text-ink">→ {sent}</p> : null}
            </li>
          );
        })}
      </ol>

      {interactive ? (
        <div className="flex items-center justify-between gap-3 border-t border-ink/10 pt-3">
          <button
            type="button"
            onClick={onSkip}
            className={cn("cursor-pointer text-xs text-ink-soft underline underline-offset-2 hover:text-ink", focusClass)}
          >
            Skip, plan with assumptions
          </button>
          <button type="submit" disabled={draftAnswers.length === 0} className={primaryButtonClass}>
            Send answers
          </button>
        </div>
      ) : null}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

interface PlanCardProps {
  intro: string;
  plan: DesignPlan;
  /** True for the latest plan while no reply is pending. */
  interactive: boolean;
  onGenerate: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className={kickerClass}>{title}</h3>
      {children}
    </section>
  );
}

export function PlanCard({ intro, plan, interactive, onGenerate }: PlanCardProps) {
  const [showAllComponents, setShowAllComponents] = useState(false);
  const hiddenComponents = Math.max(0, plan.components.length - COMPONENTS_PREVIEW_COUNT);
  const components = showAllComponents ? plan.components : plan.components.slice(0, COMPONENTS_PREVIEW_COUNT);

  return (
    <div className={cardClass}>
      <p className={kickerClass}>Proposed plan</p>
      {intro ? <p className="whitespace-pre-wrap">{intro}</p> : null}
      <p className="text-ink">{plan.summary}</p>

      {plan.decisions.length > 0 ? (
        <Section title={`Key decisions · ${plan.decisions.length}`}>
          <ul className="space-y-2">
            {plan.decisions.map((decision) => (
              <li
                key={decision.title}
                className="rounded-paper border border-ink/15 bg-paper-accent-marker-amber/45 px-3 py-2"
              >
                <p className="text-xs font-semibold text-ink-soft">{decision.title}</p>
                <p className="font-semibold text-ink">{decision.choice}</p>
                <p className="mt-0.5 text-xs text-ink">{decision.rationale}</p>
                {decision.alternatives.length > 0 ? (
                  <p className="mt-1 text-xs text-ink-soft">Considered: {decision.alternatives.join(" · ")}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title={`Components · ${plan.components.length}`}>
        <ul className="divide-y divide-ink/10 rounded-paper border border-ink/10">
          {components.map((component) => (
            <li key={component.name} className="px-2.5 py-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-ink">{component.name}</span>
                <span className={cn(kickerClass, "shrink-0")}>{component.role}</span>
              </div>
              <p className="text-xs text-ink-soft">{component.responsibility}</p>
            </li>
          ))}
        </ul>
        {hiddenComponents > 0 ? (
          <button
            type="button"
            onClick={() => setShowAllComponents((previous) => !previous)}
            aria-expanded={showAllComponents}
            className={cn("cursor-pointer text-xs text-ink-soft underline underline-offset-2 hover:text-ink", focusClass)}
          >
            {showAllComponents ? "Show fewer" : `Show all ${plan.components.length}`}
          </button>
        ) : null}
      </Section>

      {plan.flows.length > 0 ? (
        <Section title="Key flows">
          <ol className="list-decimal space-y-1 pl-4 text-xs text-ink">
            {plan.flows.map((flow) => (
              <li key={flow}>{flow}</li>
            ))}
          </ol>
        </Section>
      ) : null}

      {plan.assumptions.length > 0 ? (
        <Section title="Assumptions">
          <ul className="list-disc space-y-1 pl-4 text-xs text-ink-soft">
            {plan.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {interactive ? (
        <div className="space-y-2 border-t border-ink/10 pt-3">
          <button type="button" onClick={onGenerate} className={cn(primaryButtonClass, "w-full")}>
            Draw this plan
          </button>
          <p className={cn(kickerClass, "text-center")}>Or describe changes below</p>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

interface ResultCardProps {
  text: string;
  result: DesignResultSummary;
}

export function ResultCard({ text, result }: ResultCardProps) {
  return (
    <div className={cardClass}>
      <p className="flex items-start gap-2">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-mat-green" aria-hidden="true" />
        <span>{text}</span>
      </p>

      {result.decisions.length > 0 ? (
        <details className="group">
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center gap-1 marker:hidden [&::-webkit-details-marker]:hidden",
              kickerClass,
              focusClass,
            )}
          >
            Decisions · {result.decisions.length}
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ul className="mt-2 space-y-1 text-xs">
            {result.decisions.map((decision) => (
              <li key={decision.title}>
                <span className="text-ink-soft">{decision.title}:</span>{" "}
                <span className="font-medium text-ink">{decision.choice}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
