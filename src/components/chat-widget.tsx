"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";

/**
 * ChatWidget — floating Day14 chatbot. Lives bottom-right of every page.
 *
 * Right now this is a UI-only demo that POSTs to `/api/chat`. The route
 * will return either a real Anthropic completion (when ANTHROPIC_API_KEY
 * is set in env) or a friendly canned "demo mode" message. Either way,
 * the experience proves the "Day14 ships AI chatbots" claim on the
 * customer's own site.
 */

type ChatMsg = { role: "user" | "assistant"; content: string };

const SUGGESTED: string[] = [
  "What's the deposit-back guarantee?",
  "Which SKU fits a pool service business?",
  "Do you build for restaurants?",
  "How is this different from Jobber?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: `Hi — I'm the ${SITE.brand} assistant. Ask me anything about pricing, the 14-day timeline, the deposit-back guarantee, or what we'd ship for your business. Or book a call at ${SITE.bookingUrl}.`,
    },
  ]);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom whenever messages change.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    const next: ChatMsg[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setBusy(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await r.json().catch(() => null)) as
        | { reply?: string; error?: string }
        | null;
      const reply =
        data?.reply ??
        "I'm in demo mode right now — set ANTHROPIC_API_KEY in the Day14 env to wire me up. In the meantime, hit the Book intro call button up top.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Couldn't reach the chat backend — try the Book intro call button up top, or email " +
            SITE.email +
            ".",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-paper shadow-lift transition hover:bg-ink-700 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:ring-offset-2 focus:ring-offset-paper",
        )}
      >
        <span className="relative inline-block h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-ember-500" />
          <span className="absolute -inset-1 animate-ping rounded-full bg-ember-500/40" />
        </span>
        {open ? "Close" : "Ask anything"}
      </button>

      {/* Panel */}
      <div
        aria-hidden={!open}
        className={cn(
          "fixed bottom-20 right-5 z-50 w-[min(380px,calc(100vw-2.5rem))] origin-bottom-right rounded-xl border border-ink-200 bg-paper shadow-lift transition",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded bg-ink text-paper text-[10px] font-extrabold tabular-nums">
              14
            </div>
            <div className="text-sm font-semibold text-ink">{SITE.brand} assistant</div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
            Demo
          </div>
        </div>

        <div
          ref={listRef}
          className="max-h-80 space-y-3 overflow-y-auto px-4 py-3 text-sm"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[88%] rounded-lg px-3 py-2 leading-snug",
                m.role === "assistant"
                  ? "bg-paper-100 text-ink-700"
                  : "ml-auto bg-ink text-paper",
              )}
            >
              {m.content}
            </div>
          ))}
          {busy ? (
            <div className="max-w-[88%] rounded-lg bg-paper-100 px-3 py-2 text-ink-400">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-300" />
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-300"
                  style={{ animationDelay: "120ms" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-300"
                  style={{ animationDelay: "240ms" }}
                />
              </span>
            </div>
          ) : null}
        </div>

        {/* Suggested prompts */}
        {messages.length <= 1 ? (
          <div className="flex flex-wrap gap-1.5 border-t border-ink-100 px-4 py-3">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded border border-ink-200 bg-paper px-2 py-1 text-xs text-ink-600 transition hover:border-ember-500 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 border-t border-ink-100 p-2"
        >
          <input
            type="text"
            placeholder="Ask anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            className="flex-1 rounded border border-ink-200 bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-400 focus:border-ember-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || input.trim().length === 0}
            className="rounded bg-ember-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ember-600 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}
