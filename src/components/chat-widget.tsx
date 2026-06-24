"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";
import { track } from "@/lib/analytics";

/**
 * ChatWidget — floating Day14 assistant, bottom-right on every page.
 *
 * Restyled to the cinematic system (task 7/8): a dark "glass" panel keyed off
 * the --cin-* tokens (see cinematic.css) with a cyan/blue accent, so it reads
 * as premium on both the cinematic dark homepage and the light marketing
 * pages. Logic is unchanged: POSTs to /api/chat, which derives every price
 * from src/lib/pricing.ts (verified, not regressed) and falls back to a
 * friendly demo message when ANTHROPIC_API_KEY is absent.
 *
 * A11y: the trigger announces open/closed; the transcript is an aria-live
 * log so screen readers hear new replies; the "thinking" state sets
 * aria-busy. Custom events go through @/lib/analytics (DNT/GPC respected).
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

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next) track("chat_opened");
      return next;
    });
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    const next: ChatMsg[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setBusy(true);
    track("chat_message_sent");

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
      {/* Trigger — dark glass pill, cyan live dot */}
      <button
        type="button"
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "group fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-[var(--cin-ink)]",
          "border border-[var(--cin-line)] bg-[var(--cin-bg)]/80 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.45)]",
          "transition hover:border-[var(--cin-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cin-accent)]",
        )}
      >
        <span className="relative inline-block h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-[var(--cin-cyan)]" />
          <span className="absolute -inset-1 animate-ping rounded-full bg-[var(--cin-cyan)]/40" />
        </span>
        {open ? "Close" : "Ask anything"}
      </button>

      {/* Panel — dark glass */}
      <div
        aria-hidden={!open}
        className={cn(
          "fixed bottom-20 right-5 z-50 w-[min(380px,calc(100vw-2.5rem))] origin-bottom-right overflow-hidden rounded-2xl",
          "border border-[var(--cin-line)] bg-[var(--cin-bg)]/95 text-[var(--cin-ink)] backdrop-blur-xl",
          "shadow-[0_24px_60px_rgba(0,0,0,0.55)] transition duration-300",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--cin-line)] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded bg-[var(--cin-accent)] text-[10px] font-semibold tabular-nums text-[var(--cin-bg)]">
              14
            </div>
            <div className="text-sm font-medium">{SITE.brand} assistant</div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--cin-faint)]">
            Live
          </div>
        </div>

        <div
          ref={listRef}
          role="log"
          aria-live="polite"
          aria-busy={busy}
          aria-label={`${SITE.brand} assistant conversation`}
          className="max-h-80 space-y-3 overflow-y-auto px-4 py-3 text-sm"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[88%] rounded-xl px-3 py-2 leading-snug",
                m.role === "assistant"
                  ? "border border-[var(--cin-line)] bg-white/[0.04] text-[var(--cin-ink)]"
                  : "ml-auto bg-[var(--cin-accent)] text-[var(--cin-bg)]",
              )}
            >
              {m.content}
            </div>
          ))}
          {busy ? (
            <div className="max-w-[88%] rounded-xl border border-[var(--cin-line)] bg-white/[0.04] px-3 py-2">
              <span className="sr-only">Assistant is typing…</span>
              <span aria-hidden="true" className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--cin-mut)]" />
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--cin-mut)]"
                  style={{ animationDelay: "120ms" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--cin-mut)]"
                  style={{ animationDelay: "240ms" }}
                />
              </span>
            </div>
          ) : null}
        </div>

        {/* Suggested prompts */}
        {messages.length <= 1 ? (
          <div className="flex flex-wrap gap-1.5 border-t border-[var(--cin-line)] px-4 py-3">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-md border border-[var(--cin-line)] bg-white/[0.03] px-2.5 py-1 text-xs text-[var(--cin-mut)] transition-colors duration-150 hover:border-[var(--cin-accent)] hover:text-[var(--cin-ink)]"
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
          className="flex items-center gap-2 border-t border-[var(--cin-line)] p-2"
        >
          <label htmlFor="day14-chat-input" className="sr-only">
            Ask the {SITE.brand} assistant a question
          </label>
          <input
            id="day14-chat-input"
            type="text"
            placeholder="Ask anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            className="flex-1 rounded-md border border-[var(--cin-line)] bg-white/[0.04] px-3 py-2 text-sm text-[var(--cin-ink)] placeholder:text-[var(--cin-faint)] focus:border-[var(--cin-accent)] focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || input.trim().length === 0}
            className="rounded-md bg-[var(--cin-accent)] px-3.5 py-2 text-sm font-medium text-[var(--cin-bg)] transition-opacity duration-150 hover:opacity-90 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}
