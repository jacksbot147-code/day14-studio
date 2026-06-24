"use client";

/**
 * cinematic/PriceScramble — the reveal-triggered price "scramble-in" (task 6/8).
 *
 * Port of the locked prototype's `.scramble` effect: when the price scrolls
 * ~80% into view, the characters churn through a digit/$/comma alphabet and
 * settle, left-to-right, onto the final price. The final string is passed in
 * (derived from SERVICE_TIERS in pricing.ts) — this component NEVER hard-codes
 * a number; it only animates whatever it's handed.
 *
 * Accessibility / motion:
 *  - prefers-reduced-motion (or no IntersectionObserver) → the final price is
 *    rendered immediately, no churn.
 *  - The churning glyphs are decorative; the live region always exposes the
 *    real final value to assistive tech (the visible churn is aria-hidden, a
 *    visually-hidden node carries the settled price), so a screen reader never
 *    reads gibberish.
 *
 * CLS: the span is inline and the final text is the widest state (digits are
 * tabular via the .cin-pr style), so the churn never reflows the card.
 */

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";

/** Glyph alphabet the churn samples from — matches the prototype ('0123456789$,'). */
const CHARS = "0123456789$,";
const TICK_MS = 40;
/** Characters "locked" per tick (prototype advances the lock index by 0.5/tick). */
const LOCK_PER_TICK = 0.5;

interface PriceScrambleProps {
  /** The settled price string, e.g. "$1,500". Comes from pricing.ts. */
  final: string;
}

export function PriceScramble({ final }: PriceScrambleProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // Start showing the final value so SSR / no-JS / reduced-motion all read true.
  const [display, setDisplay] = useState(final);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setDisplay(final);
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          obs.unobserve(entry.target);
          let locked = 0;
          interval = setInterval(() => {
            const lockIndex = Math.floor(locked);
            const churned = final
              .split("")
              .map((c, k) =>
                k < lockIndex
                  ? c
                  : CHARS[Math.floor(Math.random() * CHARS.length)],
              )
              .join("");
            setDisplay(churned);
            locked += LOCK_PER_TICK;
            if (locked >= final.length) {
              setDisplay(final);
              if (interval) clearInterval(interval);
            }
          }, TICK_MS);
        }
      },
      { threshold: 0.8 },
    );

    io.observe(node);
    return () => {
      io.disconnect();
      if (interval) clearInterval(interval);
    };
  }, [final]);

  return (
    <span className="cin-scramble" ref={ref}>
      <span aria-hidden="true">{display}</span>
      <span className="cin-sr-only">{final}</span>
    </span>
  );
}

export default PriceScramble;
