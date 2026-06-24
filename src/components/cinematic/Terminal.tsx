"use client";

/**
 * cinematic/Terminal — the "engine" typing terminal (task 5/8).
 *
 * Port of the locked prototype's `#termtext` typewriter: types the day14 deploy
 * lines character-by-character once the terminal scrolls ~50% into view, with a
 * blinking caret at the head. Each line keeps its prototype tone:
 *   prompt (faint) · cmd (accent) · ok (cyan).
 *
 * Motion: a single IntersectionObserver kicks the type loop the first time the
 * terminal is visible. Under prefers-reduced-motion (or no IO support) we SKIP
 * the typing entirely and render the FINAL text immediately — content is never
 * gated behind an animation users can't see.
 *
 * CLS: the `<pre>` reserves its full height up front (`min-height`), so the box
 * never grows as characters stream in — no layout shift.
 *
 * A11y: the animated `<pre>` is decorative (`aria-hidden`) so screen readers
 * don't narrate jittery partial updates; a complete, readable transcript is
 * exposed via a visually-hidden sibling.
 */

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";

type Tone = "prompt" | "cmd" | "ok";

interface Segment {
  tone: Tone;
  text: string;
}

/** The deploy lines, faithful to the prototype (tones: m→prompt, b→cmd, g→ok). */
const LINES: readonly Segment[] = [
  { tone: "prompt", text: "$ " },
  { tone: "cmd", text: "day14 new-tenant any-service-biz\n" },
  { tone: "prompt", text: "  → site · booking · portal · payments · admin\n" },
  { tone: "ok", text: "  ✓ live in 14 days  ·  one bill\n\n" },
  { tone: "prompt", text: "$ " },
  { tone: "cmd", text: "day14 schedule follow-ups 18:00\n" },
  { tone: "ok", text: "  ✓ agent live · nothing slips" },
];

const FULL_LEN = LINES.reduce((n, l) => n + l.text.length, 0);

/** Per-segment start offset in the flattened character stream. */
const STARTS: readonly number[] = (() => {
  const out: number[] = [];
  let acc = 0;
  for (const seg of LINES) {
    out.push(acc);
    acc += seg.text.length;
  }
  return out;
})();

/** Readable, screen-reader-only transcript of the terminal session. */
const TRANSCRIPT =
  "Terminal session. Command: day14 new-tenant any-service-biz. " +
  "Provisions site, booking, portal, payments, and admin. " +
  "Result: live in 14 days, one bill. " +
  "Command: day14 schedule follow-ups at 18:00. " +
  "Result: agent live, nothing slips.";

const TYPE_MS = 16;

export function Terminal() {
  const preRef = useRef<HTMLPreElement>(null);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const node = preRef.current;
    if (!node) return;

    // Reduced motion (or no IO): render the final text immediately.
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setCount(FULL_LEN);
      setDone(true);
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          obs.unobserve(entry.target);
          interval = setInterval(() => {
            setCount((c) => {
              if (c >= FULL_LEN) {
                if (interval) clearInterval(interval);
                setDone(true);
                return FULL_LEN;
              }
              return c + 1;
            });
          }, TYPE_MS);
        }
      },
      { threshold: 0.5 },
    );

    io.observe(node);
    return () => {
      io.disconnect();
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <div className="cin-term">
      <div className="cin-term-bar" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <pre className="cin-term-pre" ref={preRef} aria-hidden="true">
        {LINES.map((seg, i) => {
          const visible = Math.max(
            0,
            Math.min(seg.text.length, count - (STARTS[i] ?? 0)),
          );
          return (
            <span key={i} className={`cin-term-${seg.tone}`}>
              {seg.text.slice(0, visible)}
            </span>
          );
        })}
        <span
          className={`cin-term-caret${done ? " cin-term-caret-blink" : ""}`}
          aria-hidden="true"
        />
      </pre>
      <p className="cin-sr-only">{TRANSCRIPT}</p>
    </div>
  );
}

export default Terminal;
