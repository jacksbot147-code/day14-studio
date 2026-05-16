"use client";

import { useEffect, useState } from "react";

/**
 * CyclingWord — rotates through a list of words with a fade. Used inside
 * the hero headline to demonstrate the breadth of what Day14 builds.
 *
 * The container needs a minimum width or the layout shifts on each
 * rotation. We compute it from the longest word in `words` and lock the
 * `<span>` to that inline-size. Pass `minWidthCh` if you need a manual override.
 */
export function CyclingWord({
  words,
  intervalMs = 2200,
  className = "",
  minWidthCh,
}: {
  words: string[];
  intervalMs?: number;
  className?: string;
  minWidthCh?: number;
}) {
  const safeWords = words.length > 0 ? words : ["…"];
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // freeze on the first word

    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setI((prev) => (prev + 1) % safeWords.length);
        setVisible(true);
      }, 240);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, safeWords.length]);

  const longest = Math.max(...safeWords.map((w) => w.length));
  const ch = minWidthCh ?? longest;
  const current = safeWords[i] ?? safeWords[0] ?? "";

  return (
    <span
      className={`inline-block whitespace-nowrap align-baseline transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
      style={{ minInlineSize: `${ch}ch` }}
      aria-live="polite"
    >
      {current}
    </span>
  );
}
