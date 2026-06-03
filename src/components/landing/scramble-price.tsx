"use client";

/**
 * ScramblePrice — sibling to ScrambleNumber for hover-triggered digit
 * scrambling on string prices like "$1,500", "$9,000", "$24,000".
 *
 * On hover (or focus): each digit position cycles through random digits for
 * ~350ms, then resolves back to the real value. Non-digit characters ($,
 * commas, spaces, "Talk to us" text) stay constant. The effect makes the
 * price feel "live, refreshing from the OS" instead of carved in stone.
 *
 * Reduced motion: renders the static string. No hover behavior.
 *
 * SSR-safe: server renders the price as static text.
 */

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface ScramblePriceProps {
  price: string;
  /** Duration of the scramble in ms. Default 350. */
  durationMs?: number;
  className?: string;
}

export function ScramblePrice({
  price,
  durationMs = 350,
  className,
}: ScramblePriceProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(price);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  // Reset display when the price prop changes
  useEffect(() => {
    setDisplay(price);
  }, [price]);

  function runScramble() {
    if (reduce) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    startRef.current = performance.now();

    const step = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      if (t >= 1) {
        setDisplay(price);
        rafRef.current = null;
        return;
      }
      // Each digit position settles left-to-right as t advances.
      const out = price
        .split("")
        .map((ch, i) => {
          if (ch < "0" || ch > "9") return ch;
          const charT = Math.min(1, Math.max(0, (t - i * 0.04) / 0.6));
          if (charT >= 1) return ch;
          return String(Math.floor(Math.random() * 10));
        })
        .join("");
      setDisplay(out);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <span
      className={className}
      style={{ fontVariantNumeric: "tabular-nums", cursor: "default" }}
      onMouseEnter={runScramble}
      onFocus={runScramble}
      tabIndex={-1}
    >
      {display}
    </span>
  );
}
