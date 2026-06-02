"use client";

/**
 * SectionNumeral — massive ghost numeral (01, 02, 03…) that anchors each
 * landing section as a "chapter." Linear changelog / Stripe product-page
 * pattern. The numeral fades in from the left when the section enters view
 * and stays as a quiet visual marker.
 *
 * Visual weight: ~10rem at desktop, ultra-thin/extrabold split (we use
 * extrabold matching the brand voice). Low opacity (0.06) so it never
 * competes with the section headline — it's chapter chrome, not content.
 *
 * Mobile: scales down to ~5rem and sits above the headline rather than
 * beside it (the parent SectionHeader handles position).
 */

import { motion, useReducedMotion } from "framer-motion";

interface SectionNumeralProps {
  n: number | string;
  /** Override opacity (default 0.06). Higher numbers look louder. */
  opacity?: number;
  className?: string;
}

export function SectionNumeral({ n, opacity = 0.06, className = "" }: SectionNumeralProps) {
  const reduce = useReducedMotion();
  const text = typeof n === "number" ? String(n).padStart(2, "0") : n;
  return (
    <motion.div
      aria-hidden
      initial={reduce ? false : { opacity: 0, x: -16 }}
      whileInView={reduce ? undefined : { opacity, x: 0 }}
      transition={reduce ? undefined : { duration: 0.5, ease: "easeOut" }}
      viewport={{ once: true, margin: "-80px" }}
      className={className}
      style={{
        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
        fontSize: "clamp(5rem, 14vw, 11rem)",
        lineHeight: 0.9,
        fontWeight: 800,
        letterSpacing: "-0.04em",
        color: "var(--ink, #0f172a)",
        opacity: reduce ? opacity : undefined,
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      {text}
    </motion.div>
  );
}
