"use client";

/**
 * ScrambleNumber — replaces CountUp on the hero proof strip with a
 * brief terminal-style digital scramble that settles into the final value.
 * Vibe: data is decrypting in front of you. Brutalist tech aesthetic, not
 * children's confetti.
 *
 * Each "frame" of the scramble shows a random integer of the same
 * character-length as the target. The scramble runs for ~400ms then
 * resolves to the actual number. Honors `prefers-reduced-motion` —
 * renders the target value directly.
 *
 * SSR-safe: server renders the final value. Below-the-fold elements
 * trigger their scramble on intersection; above-the-fold elements stay
 * stable so social-share previews + JS-disabled crawlers see real numbers.
 */

import { useEffect, useRef, useState } from "react";

export function ScrambleNumber({
  to,
  durationMs = 380,
  prefix = "",
  suffix = "",
}: {
  to: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  // SSR + no-JS default: the real target value.
  const [display, setDisplay] = useState<string>(String(to));

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const node = ref.current;
    if (!node) return;

    // Above-the-fold? Skip the scramble so first-paint is the real value.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      runScramble();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io.disconnect();
            runScramble();
            break;
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(node);
    return () => io.disconnect();

    function runScramble() {
      const targetStr = String(to);
      const maxDigit = 9;
      const start = performance.now();
      let raf = 0;
      const step = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / durationMs);
        if (t >= 1) {
          setDisplay(targetStr);
          return;
        }
        // Each digit settles one-by-one from left to right as t advances.
        const settledCount = Math.floor(targetStr.length * t);
        const out = targetStr
          .split("")
          .map((ch, i) => {
            if (i < settledCount) return ch;
            if (ch < "0" || ch > "9") return ch;
            return String(Math.floor(Math.random() * (maxDigit + 1)));
          })
          .join("");
        setDisplay(out);
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      // No explicit cleanup — animation is short enough to complete.
      return () => cancelAnimationFrame(raf);
    }
  }, [to, durationMs]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
