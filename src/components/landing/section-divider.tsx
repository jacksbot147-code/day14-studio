"use client";

/**
 * SectionDivider — a slim accent rule that draws horizontally when scrolled
 * into view. Rhythm device between landing sections: each chapter break is
 * announced rather than just appearing. The rule is hairline + accent-tinted
 * so it never feels heavy.
 *
 * Use between major landing sections, OR above a section header for a
 * cinematic "the next thing starts here" beat.
 *
 * Reduced motion: rendered as a static 100%-wide rule, no draw animation.
 */

import { motion, useReducedMotion } from "framer-motion";

export function SectionDivider({ color }: { color?: string }) {
  const reduce = useReducedMotion();
  const stroke = color ?? "var(--accent, #ef6c33)";
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        height: 1,
        background: "var(--ink-100, rgba(15,23,42,0.08))",
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={reduce ? false : { scaleX: 0, transformOrigin: "left" }}
        whileInView={reduce ? undefined : { scaleX: 1 }}
        transition={reduce ? undefined : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: "-40px" }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: stroke,
          transformOrigin: "left",
          mixBlendMode: "multiply",
          opacity: reduce ? 0.6 : undefined,
        }}
      />
    </div>
  );
}
