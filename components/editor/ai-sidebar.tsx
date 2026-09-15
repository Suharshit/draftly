"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { ArrowRight, ChevronDown, History, Loader2, Plus, Sparkle, X } from "lucide-react";

import { PlanCard, QuestionsCard, ResultCard } from "@/components/editor/ai-chat-cards";
import { AiSessionHistory } from "@/components/editor/ai-session-history";
import { SpecPanel } from "@/components/editor/spec-panel";
import { useAiSession, type AiChatMessage } from "@/hooks/use-ai-session";
import { useSpecGenerator } from "@/hooks/use-spec-generator";
import {
  readAnswersPayload,
  readPlanPayload,
  readQuestionsPayload,
  readReplyPayload,
  readResultPayload,
} from "@/lib/ai/agent-schema";
import { cn } from "@/lib/utils";

interface AiSidebarProps {
  open: boolean;
  onClose: () => void;
  /** Room the generated design is written into. Also the project access check. */
  projectId: string;
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const;

const focusClass = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60";

const tabClass = cn(
  "relative flex h-12 cursor-pointer items-center font-brand text-sm text-ink-soft transition-colors hover:text-ink",
  "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-ink after:opacity-0",
  "data-active:font-semibold data-active:text-ink data-active:after:opacity-100",
  focusClass,
);

/**
 * The newest assistant reply that did not fail. The server treats questions
 * as open, and a plan as the one to draw, only while they are that reply.
 */
function latestAssistantReply(messages: readonly AiChatMessage[]): AiChatMessage | undefined {
  return messages.findLast((message) => message.role === "assistant" && !message.isError);
}

function SparkleMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-paper border border-ink bg-paper-bright text-ink", className)}
    >
      <Sparkle className="h-3.5 w-3.5 fill-current" />
    </span>
  );
}

export function AiSidebar({ open, onClose, projectId }: AiSidebarProps) {
  const [inputValue, setInputValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const {
    sessions,
    activeSessionId,
    activeSessionTitle,
    messages,
    statusText,
    isRunning,
    canSwitchSession,
    isLoadingSession,
    sessionLoadFailed,
    sendTurn,
    sendPrompt,
    startNewChat,
    selectSession,
    removeSession,
    retryLoadSession,
  } = useAiSession(projectId);
  // Lives here rather than in the Specs panel so a run keeps being followed (and downloads) while another tab is open.
  const specGenerator = useSpecGenerator(projectId);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const showEmptyState = messages.length === 0 && !isLoadingSession && !sessionLoadFailed;

  const latestReply = latestAssistantReply(messages);
  const openKind = !isRunning && latestReply ? latestReply.kind : null;
  const composerPlaceholder =
    openKind === "QUESTIONS"
      ? "Or answer in your own words..."
      : openKind === "PLAN"
        ? "Describe changes to the plan..."
        : "Ask Draftly AI to design or refine your architecture...";

  // Keep the latest message in view, including when a saved chat opens.
  useEffect(() => {
    if (!showHistory) {
      transcriptEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages.length, showHistory, statusText]);

  const sendMessage = (text: string) => {
    if (!text.trim() || isRunning) {
      return;
    }

    sendPrompt(text);
    setInputValue("");
    setShowHistory(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleNewChat = () => {
    startNewChat();
    setShowHistory(false);
  };

  const handleSelectSession = (sessionId: string) => {
    selectSession(sessionId);
    setShowHistory(false);
  };

  return (
    <aside
      aria-label="AI workspace"
      inert={!open || undefined}
      className={cn(
        "pointer-events-auto absolute inset-y-0 right-0 z-20 hidden w-94 border-l border-ink/15 bg-paper-cream text-ink scheme-light",
        "transition-transform duration-300 ease-out lg:flex lg:flex-col",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-ink/15 px-5 py-4">
        <div className="flex items-center gap-3">
          <SparkleMark className="size-9" />
          <div>
            <p className="font-brand text-base font-semibold text-ink">AI Workspace</p>
            <p className="font-brand text-sm text-ink-soft">Collaborate with Draftly AI</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI sidebar"
          className={cn(
            "flex size-8 cursor-pointer items-center justify-center rounded-paper text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink",
            focusClass,
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <TabsPrimitive.Root defaultValue="architect" className="flex min-h-0 flex-1 flex-col">
        <TabsPrimitive.List className="flex gap-7 border-b border-ink/15 px-5">
          <TabsPrimitive.Tab value="architect" className={tabClass}>
            AI Architect
          </TabsPrimitive.Tab>
          <TabsPrimitive.Tab value="specs" className={tabClass}>
            Specs
          </TabsPrimitive.Tab>
        </TabsPrimitive.List>

        <TabsPrimitive.Panel value="architect" className="flex min-h-0 flex-1 flex-col outline-none">
          <div className="flex items-center gap-2 border-b border-ink/15 px-5 py-2">
            <button
              type="button"
              onClick={() => setShowHistory((previous) => !previous)}
              aria-expanded={showHistory}
              aria-label={showHistory ? "Hide saved chats" : "Show saved chats"}
              className={cn(
                "-ml-2 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-paper px-2 py-1.5 text-left transition-colors hover:bg-ink/5",
                focusClass,
              )}
            >
              <History className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
              <span className="truncate font-brand text-sm font-medium text-ink">
                {activeSessionTitle ?? "New chat"}
              </span>
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 text-ink-soft transition-transform", showHistory && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              disabled={!canSwitchSession}
              className={cn(
                "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-paper border border-ink px-2.5 font-brand text-xs font-medium text-ink",
                "transition-colors hover:bg-ink hover:text-paper-cream disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink",
                focusClass,
              )}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New chat
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {showHistory ? (
              <AiSessionHistory
                sessions={sessions}
                activeSessionId={activeSessionId}
                canSwitch={canSwitchSession}
                onSelect={handleSelectSession}
                onDelete={removeSession}
              />
            ) : (
              <>
                {isLoadingSession ? (
                  <div
                    className="flex items-center gap-2 font-mono text-chrome tracking-chrome text-ink-soft uppercase"
                    aria-live="polite"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Loading chat…
                  </div>
                ) : null}

                {sessionLoadFailed ? (
                  <div
                    role="alert"
                    className="rounded-paper border border-ink/20 border-l-2 border-l-paper-pin-red bg-paper-bright px-3.5 py-3 font-brand text-sm text-ink"
                  >
                    <p>This chat could not be loaded.</p>
                    <button
                      type="button"
                      onClick={retryLoadSession}
                      className={cn("mt-2 cursor-pointer font-medium underline underline-offset-2", focusClass)}
                    >
                      Try again
                    </button>
                  </div>
                ) : null}

                {showEmptyState ? (
                  <div className="border border-ink bg-paper-bright p-5 rounded-paper">
                    <div className="mb-4 flex items-start gap-3">
                      <SparkleMark className="mt-0.5 size-7" />
                      <p className="font-brand text-base leading-snug font-semibold text-ink">
                        How can I help you design your architecture?
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      {STARTER_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => sendMessage(prompt)}
                          disabled={isRunning}
                          className={cn(
                            "block w-full cursor-pointer rounded-paper border border-ink/20 bg-paper-cream px-3.5 py-2.5 text-left font-brand text-sm text-ink",
                            "transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink/20",
                            focusClass,
                          )}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {messages.map((message, index) => {
                  if (message.role === "user") {
                    return (
                      <div key={message.id} className="flex justify-end">
                        <div className="max-w-[85%] rounded-paper bg-ink px-3.5 py-2.5 font-brand text-sm whitespace-pre-wrap text-paper-cream">
                          {message.text}
                        </div>
                      </div>
                    );
                  }

                  const isLatestReply = message.id === latestReply?.id && !isRunning;

                  if (!message.isError && message.kind === "QUESTIONS") {
                    const questions = readQuestionsPayload(message.payload);
                    if (questions && questions.length > 0) {
                      const next = messages[index + 1];
                      return (
                        <QuestionsCard
                          key={message.id}
                          intro={readReplyPayload(message.payload)}
                          questions={questions}
                          answers={next?.kind === "ANSWERS" ? readAnswersPayload(next.payload) : null}
                          interactive={isLatestReply}
                          onSubmit={(answers) => sendTurn({ type: "answers", answers })}
                          onSkip={() => sendTurn({ type: "skip" })}
                        />
                      );
                    }
                  }

                  if (!message.isError && message.kind === "PLAN") {
                    const plan = readPlanPayload(message.payload);
                    if (plan) {
                      return (
                        <PlanCard
                          key={message.id}
                          intro={readReplyPayload(message.payload)}
                          plan={plan}
                          interactive={isLatestReply}
                          onGenerate={() => sendTurn({ type: "generate" })}
                        />
                      );
                    }
                  }

                  if (!message.isError && message.kind === "RESULT") {
                    const result = readResultPayload(message.payload);
                    if (result) {
                      return <ResultCard key={message.id} text={message.text} result={result} />;
                    }
                  }

                  return (
                    <div key={message.id} className="flex justify-start">
                      <div
                        className={cn(
                          "max-w-[90%] rounded-paper border border-ink/20 bg-paper-bright px-3.5 py-2.5 font-brand text-sm whitespace-pre-wrap text-ink",
                          message.isError && "border-l-2 border-l-paper-pin-red",
                        )}
                        role={message.isError ? "alert" : undefined}
                      >
                        {message.text}
                      </div>
                    </div>
                  );
                })}

                {statusText ? (
                  <div
                    className="flex items-center gap-2 font-mono text-chrome tracking-chrome text-ink-soft uppercase"
                    aria-live="polite"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    {statusText}
                  </div>
                ) : null}

                <div ref={transcriptEndRef} />
              </>
            )}
          </div>

          <form className="border-t border-ink/15 px-5 pt-4 pb-4" onSubmit={handleSubmit}>
            <textarea
              aria-label="Message Draftly AI"
              placeholder={composerPlaceholder}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRunning}
              className={cn(
                "block max-h-40 min-h-28 w-full resize-none rounded-paper border border-ink bg-paper-bright px-3.5 py-3",
                "font-brand text-sm text-ink placeholder:text-ink-soft/70 disabled:cursor-not-allowed disabled:opacity-60",
                "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/60",
              )}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="font-mono text-chrome tracking-chrome text-ink-soft uppercase">
                {isRunning ? "Generating your design…" : "Enter to send · Shift+Enter new line"}
              </p>
              <button
                type="submit"
                disabled={isRunning || inputValue.trim().length === 0}
                aria-label="Send message"
                className={cn(
                  "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-paper bg-ink text-paper-cream",
                  "transition-[translate] duration-(--duration-press) active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40",
                  focusClass,
                )}
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
              </button>
            </div>
          </form>
        </TabsPrimitive.Panel>

        <TabsPrimitive.Panel value="specs" className="min-h-0 flex-1 overflow-y-auto px-5 py-5 outline-none">
          <SpecPanel {...specGenerator} />
        </TabsPrimitive.Panel>
      </TabsPrimitive.Root>
    </aside>
  );
}
