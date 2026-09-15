"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { ArrowRight, Download, FileText, Loader2, Sparkle, X } from "lucide-react";

import { useDesignAgent } from "@/hooks/use-design-agent";
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
  const { messages, statusText, isRunning, sendPrompt } = useDesignAgent(projectId);

  const showEmptyState = messages.length === 0;

  const sendMessage = (text: string) => {
    if (!text.trim() || isRunning) {
      return;
    }

    sendPrompt(text);
    setInputValue("");
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
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
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

            {messages.map((message) => {
              if (message.role === "user") {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-paper bg-ink px-3.5 py-2.5 font-brand text-sm text-paper-cream">
                      {message.text}
                    </div>
                  </div>
                );
              }

              return (
                <div key={message.id} className="flex justify-start">
                  <div
                    className={cn(
                      "max-w-[90%] rounded-paper border border-ink/20 bg-paper-bright px-3.5 py-2.5 font-brand text-sm text-ink",
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
          </div>

          <form className="border-t border-ink/15 px-5 pt-4 pb-4" onSubmit={handleSubmit}>
            <textarea
              aria-label="Message Draftly AI"
              placeholder="Ask Draftly AI to design or refine your architecture..."
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
          <div className="flex flex-col gap-4">
            <button
              type="button"
              className={cn(
                "flex h-11 w-full cursor-pointer items-center justify-center rounded-paper border border-ink bg-ink",
                "font-brand text-sm font-semibold text-paper-cream shadow-flat",
                "active:translate-y-px active:shadow-none",
                focusClass,
              )}
            >
              Generate Spec
            </button>

            <div className="space-y-4 rounded-paper border border-ink/20 bg-paper-bright p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
                <div>
                  <p className="font-brand text-sm font-semibold text-ink">Realtime Chat Platform Spec</p>
                  <p className="mt-1 font-brand text-sm text-ink-soft">
                    Includes service boundaries, event flow, storage strategy, and deployment notes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled
                className="flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-paper border border-ink bg-transparent font-brand text-sm font-medium text-ink opacity-40"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        </TabsPrimitive.Panel>
      </TabsPrimitive.Root>
    </aside>
  );
}
