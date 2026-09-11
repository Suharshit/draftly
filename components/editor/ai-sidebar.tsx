"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { Bot, Download, FileText, Loader2, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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

export function AiSidebar({ open, onClose, projectId }: AiSidebarProps) {
  const [inputValue, setInputValue] = useState("");
  const { messages, statusText, isRunning, sendPrompt } = useDesignAgent(projectId);

  const showEmptyState = useMemo(() => messages.length === 0, [messages.length]);

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
      className={cn(
        "pointer-events-auto absolute right-4 top-4 z-20 hidden h-[calc(100%-2rem)] w-80 rounded-lg border border-border bg-card shadow-xl transition-transform duration-300 ease-out lg:flex lg:flex-col",
        open ? "translate-x-0" : "translate-x-[120%]",
      )}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
            <Bot className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">AI Workspace</p>
            <p className="text-xs text-muted-foreground">Collaborate with Ghost AI</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close AI sidebar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="architect" className="min-h-0 flex-1 gap-3 px-3 pb-3 pt-3">
        <TabsList className="w-full">
          <TabsTrigger value="architect">AI Architect</TabsTrigger>
          <TabsTrigger value="specs">Specs</TabsTrigger>
        </TabsList>

        <TabsContent value="architect" className="min-h-0 flex-1">
          <div className="flex h-full min-h-0 flex-col rounded-md border border-border bg-background/50">
            <ScrollArea className="min-h-0 flex-1 px-3 py-3">
              <div className="space-y-4">
                {showEmptyState ? (
                  <div className="rounded-md border border-dashed border-border bg-muted/30 p-3">
                    <div className="mb-2 flex items-center gap-2 text-foreground">
                      <Bot className="h-4 w-4" />
                      <p className="text-sm">How can I help you design your architecture?</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {STARTER_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => sendMessage(prompt)}
                          disabled={isRunning}
                          className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
                        <div className="max-w-[85%] rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground">
                          {message.text}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={message.id} className="flex justify-start">
                      <div
                        className={cn(
                          "max-w-[90%] rounded-md px-3 py-2 text-xs",
                          message.isError
                            ? "border border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)]"
                            : "bg-muted text-foreground",
                        )}
                        role={message.isError ? "alert" : undefined}
                      >
                        {message.text}
                      </div>
                    </div>
                  );
                })}

                {statusText ? (
                  <div className="flex justify-start">
                    <div
                      className="flex max-w-[90%] items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground"
                      aria-live="polite"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      {statusText}
                    </div>
                  </div>
                ) : null}
              </div>
            </ScrollArea>

            <form className="border-t border-border p-3" onSubmit={handleSubmit}>
              <Textarea
                placeholder="Ask Ghost AI to design or refine your architecture..."
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRunning}
                className="max-h-36 min-h-24 resize-none bg-background pr-14 text-xs"
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  {isRunning ? "Generating your design..." : "Enter to send, Shift+Enter for a new line"}
                </p>
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  disabled={isRunning || inputValue.trim().length === 0}
                  aria-label="Send message"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="specs" className="min-h-0 flex-1">
          <div className="flex h-full flex-col gap-3">
            <Button type="button" className="w-full">
              Generate Spec
            </Button>

            <Card className="border border-border bg-card py-3">
              <CardContent className="space-y-3 px-3">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Realtime Chat Platform Spec</p>
                    <p className="text-xs text-muted-foreground">
                      Includes service boundaries, event flow, storage strategy, and deployment notes.
                    </p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" disabled className="w-full">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
