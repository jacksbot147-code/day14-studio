"use client";

/**
 * TerminalSnippet — an animated terminal block that types out commands
 * line-by-line with a blinking cursor, then idles. Vercel / Cursor / v0
 * pattern: shows real product behavior as a visual proof.
 *
 * Designed for the "How it works" section — three terminals, one per step:
 *   01. Add a tenant       → `npx day14 new-tenant my-brand`
 *   02. Schedule agents    → `day14 schedule daily-briefing 07:30`
 *   03. Live in the inbox  → `open day14.us/admin/inbox`
 *
 * Each line types at ~30ms/char with a 250ms pause after each line. After
 * the last line completes, the cursor keeps blinking on the prompt below.
 * Only fires when scrolled into view (IntersectionObserver).
 *
 * Reduced motion: renders all lines instantly, no typing animation.
 *
 * SSR-safe: server renders the static "final state" so first paint isn't
 * an empty terminal block.
 */

import { useEffect, useRef, useState } from "react";

interface TerminalLine {
  /** Prompt prefix shown before the typed command. Default `$`. */
  prompt?: string;
  /** The command text being typed. */
  text: string;
  /** Optional output line shown after the command finishes typing. */
  output?: string;
}

interface TerminalSnippetProps {
  title?: string;
  lines: TerminalLine[];
  /** Characters per second. Default 33 (~30ms/char). */
  cps?: number;
  /**
   * Visual variant.
   *   - "dark"  (default): near-black surface, slate type, ember accents.
   *   - "light": cream surface, ink type, ember accents — sits cleanly on
   *     paper-cream sections (e.g. the Apple-style How-it-works staircase).
   */
  variant?: "dark" | "light";
}

export function TerminalSnippet({
  title,
  lines,
  cps = 33,
  variant = "dark",
}: TerminalSnippetProps) {
  // Variant-scoped palette. The dark variant matches the original brutalist
  // terminal; the light variant blends with paper-cream sections and uses
  // ink for command text + a softer warm-gray for output/chrome.
  const palette =
    variant === "light"
      ? {
          surface: "#fafaf7", // paper-cream
          chromeBg: "rgba(15,23,42,0.04)",
          chromeBorder: "1px solid rgba(15,23,42,0.08)",
          chromeLabel: "#8a8579", // warm-gray-400
          text: "#0a0a0a", // ink
          output: "#8a8579", // warm-gray-400
          accent: "#ef6c33", // ember
          boxShadow:
            "0 24px 60px -20px rgba(239,108,51,0.10), 0 8px 24px -8px rgba(15,23,42,0.06), inset 0 0 0 1px rgba(15,23,42,0.06)",
        }
      : {
          surface: "#0a0e14",
          chromeBg: "rgba(255,255,255,0.03)",
          chromeBorder: "1px solid rgba(255,255,255,0.06)",
          chromeLabel: "#64748b",
          text: "#e2e8f0",
          output: "#64748b",
          accent: "#ef6c33",
          boxShadow:
            "0 24px 60px -20px rgba(15,23,42,0.35), inset 0 0 0 1px rgba(255,255,255,0.06)",
        };
  const ref = useRef<HTMLDivElement | null>(null);
  // `step` tracks how many full lines have rendered + how many chars of the
  // current line have typed. Server + JS-disabled show all lines complete.
  const [progress, setProgress] = useState<{ lineIdx: number; charIdx: number }>(
    { lineIdx: lines.length, charIdx: 0 },
  );

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const node = ref.current;
    if (!node) return;

    // Only animate when first scrolled into view. Above-the-fold elements
    // skip the typing and just show the final state (avoid feeling jumpy).
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    setProgress({ lineIdx: 0, charIdx: 0 });
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.disconnect();
          run();
          break;
        }
      },
      { threshold: 0.5 },
    );
    io.observe(node);
    return () => { cancelled = true; io.disconnect(); };

    function run() {
      let lineIdx = 0;
      let charIdx = 0;
      const charMs = 1000 / cps;
      const lineGapMs = 250;
      const tick = () => {
        if (cancelled) return;
        if (lineIdx >= lines.length) return;
        const cur = lines[lineIdx];
        if (!cur) return;
        if (charIdx < cur.text.length) {
          charIdx++;
          setProgress({ lineIdx, charIdx });
          setTimeout(tick, charMs);
        } else {
          lineIdx++;
          charIdx = 0;
          setProgress({ lineIdx, charIdx });
          if (lineIdx < lines.length) {
            setTimeout(tick, lineGapMs);
          }
        }
      };
      setTimeout(tick, 200);
    }
  }, [lines, cps]);

  return (
    <div
      ref={ref}
      style={{
        borderRadius: 12,
        background: palette.surface,
        boxShadow: palette.boxShadow,
        overflow: "hidden",
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontSize: 13,
        color: palette.text,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: palette.chromeBg,
          borderBottom: palette.chromeBorder,
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
        {title && (
          <span style={{ marginLeft: 10, fontSize: 11, color: palette.chromeLabel, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
            {title}
          </span>
        )}
      </div>
      <div style={{ padding: "16px 18px", lineHeight: 1.65, minHeight: 130 }}>
        {lines.map((line, i) => {
          const isCurrent = i === progress.lineIdx;
          const isPast = i < progress.lineIdx;
          if (!isCurrent && !isPast) return null;
          const visibleText = isPast
            ? line.text
            : line.text.slice(0, progress.charIdx);
          return (
            <div key={i} style={{ marginBottom: 6 }}>
              <div>
                <span style={{ color: palette.accent, marginRight: 8 }}>{line.prompt ?? "$"}</span>
                <span style={{ color: palette.text }}>{visibleText}</span>
                {isCurrent && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 14,
                      background: palette.accent,
                      marginLeft: 2,
                      verticalAlign: "text-bottom",
                      animation: "term-blink 1s steps(2) infinite",
                    }}
                  />
                )}
              </div>
              {line.output && isPast && (
                <div style={{ color: palette.output, paddingLeft: 18 }}>{line.output}</div>
              )}
            </div>
          );
        })}
        {progress.lineIdx >= lines.length && (
          <div>
            <span style={{ color: palette.accent, marginRight: 8 }}>$</span>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 14,
                background: palette.accent,
                verticalAlign: "text-bottom",
                animation: "term-blink 1s steps(2) infinite",
              }}
            />
          </div>
        )}
      </div>
      <style>{`@keyframes term-blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}
