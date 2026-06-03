"use client";

/**
 * SectionDivider — Phase B move 2: an ember "comet" that draws itself
 * across the viewport as the section enters view.
 *
 * Visual: a hairline accent rule, plus a brighter ember dot with a glow
 * halo that travels left-to-right along the rule from 0% to 100% over
 * ~1.1s. The dot fades on arrival. The line stays.
 *
 * Use between major landing sections, OR above a section header for a
 * cinematic "the next thing starts here" beat. Same API as before — just
 * a more dramatic execution.
 *
 * Reduced motion: rendered as a static 100%-wide rule, no draw, no comet.
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
        height: 8,
        marginTop: -4,
        marginBottom: -4,
        background: "transparent",
        overflow: "visible",
      }}
    >
      {/* Base hairline */}
      <div
        style={{
          position: "absolute",
          top: 3.5,
          left: 0,
          right: 0,
          height: 1,
          background: "var(--ink-100, rgba(15,23,42,0.08))",
        }}
      />
      {/* Drawing ember line */}
      <motion.div
        initial={reduce ? false : { scaleX: 0, transformOrigin: "left" }}
        whileInView={reduce ? undefined : { scaleX: 1 }}
        transition={reduce ? undefined : { duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: "-40px" }}
        style={{
          position: "absolute",
          top: 3.5,
          left: 0,
          right: 0,
          height: 1,
          background: stroke,
          transformOrigin: "left",
          opacity: reduce ? 0.6 : 0.85,
        }}
      />
      {/* Ember comet — bright dot with a glow halo that races along the line */}
      {!reduce && (
        <motion.div
          initial={{ left: "0%", opacity: 0 }}
          whileInView={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 1.1,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.1, 0.9, 1],
          }}
          viewport={{ once: true, margin: "-40px" }}
          style={{
            position: "absolute",
            top: 0,
            width: 8,
            height: 8,
            marginLeft: -4,
            borderRadius: "50%",
            background: stroke,
            boxShadow: `0 0 14px 3px ${stroke}, 0 0 30px 6px ${stroke}`,
          }}
        />
      )}
    </div>
  );
}
