"use client";

/**
 * TintedCaseCard — wraps a case-study card with a brand-tinted aura that
 * makes each tenant visually distinct. Currently the landing's 3 case
 * cards are interchangeable white slabs; this gives each one its own
 * atmosphere without changing the underlying card structure.
 *
 * Each tenant gets a soft radial gradient behind the card content,
 * keyed to its brand mood:
 *   - alignmd      → cool blue (clinical, calm)
 *   - hot-flash-co → warm peach (D2C wellness)
 *   - life-loophole → editorial cream (finance, paper-feel)
 *   - day14        → ember (founder build vibe)
 *   - day14-realty → forest (Florida coast)
 *   - kennum-lawn-care → grass (literal — it's a lawn business)
 *
 * Hover: the aura intensifies + card lifts slightly. Reduced-motion gets
 * the static gradient with no hover transform.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Tint =
  | "alignmd"
  | "hot-flash-co"
  | "life-loophole"
  | "day14"
  | "day14-realty"
  | "kennum-lawn-care"
  | "neutral";

const TINTS: Record<Tint, { aura: string; ring: string }> = {
  alignmd: {
    aura: "radial-gradient(120% 80% at 50% 0%, rgba(59,130,246,0.10), rgba(59,130,246,0) 70%)",
    ring: "rgba(59,130,246,0.18)",
  },
  "hot-flash-co": {
    aura: "radial-gradient(120% 80% at 50% 0%, rgba(244,114,182,0.12), rgba(244,114,182,0) 70%)",
    ring: "rgba(244,114,182,0.20)",
  },
  "life-loophole": {
    aura: "radial-gradient(120% 80% at 50% 0%, rgba(202,138,4,0.10), rgba(202,138,4,0) 70%)",
    ring: "rgba(202,138,4,0.18)",
  },
  day14: {
    aura: "radial-gradient(120% 80% at 50% 0%, rgba(239,108,51,0.12), rgba(239,108,51,0) 70%)",
    ring: "rgba(239,108,51,0.20)",
  },
  "day14-realty": {
    aura: "radial-gradient(120% 80% at 50% 0%, rgba(20,128,90,0.10), rgba(20,128,90,0) 70%)",
    ring: "rgba(20,128,90,0.18)",
  },
  "kennum-lawn-care": {
    aura: "radial-gradient(120% 80% at 50% 0%, rgba(101,163,13,0.10), rgba(101,163,13,0) 70%)",
    ring: "rgba(101,163,13,0.18)",
  },
  neutral: {
    aura: "radial-gradient(120% 80% at 50% 0%, rgba(15,23,42,0.05), rgba(15,23,42,0) 70%)",
    ring: "rgba(15,23,42,0.12)",
  },
};

interface TintedCaseCardProps {
  tint: Tint;
  children: ReactNode;
  /** Optional className for the outer wrapper. */
  className?: string;
}

export function TintedCaseCard({ tint, children, className = "" }: TintedCaseCardProps) {
  const reduce = useReducedMotion();
  const palette = TINTS[tint] ?? TINTS.neutral;

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={className}
      style={{
        position: "relative",
        borderRadius: 12,
        background: palette.aura,
        boxShadow: `inset 0 0 0 1px ${palette.ring}`,
        padding: 2,
      }}
    >
      <div style={{ position: "relative", borderRadius: 10, background: "var(--paper, #ffffff)" }}>
        {children}
      </div>
    </motion.div>
  );
}
