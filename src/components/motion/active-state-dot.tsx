"use client";

/**
 * ActiveStateDot — a small live indicator that breathes when the unit's
 * state is `active`. The Mission Control v2 crew page uses it inline next to
 * the state-chip on each card so the live operators visually pulse vs the
 * parked/planned/offline ones (which render as a static dot).
 *
 * Visual reference: Stripe / Linear status dots — small (8px), a soft halo
 * that fades in and out at ~1.2s cadence. Subtle, never demanding attention.
 *
 * Reduced motion: when the user opts out, the dot renders without the
 * pulse — same fill colour, no animation.
 */

import { motion, useReducedMotion } from "framer-motion";

type Status = "active" | "watch" | "parked" | "offline" | "planned";

const COLORS: Record<Status, string> = {
  active: "#16a34a",
  watch: "#d97706",
  parked: "#94a3b8",
  offline: "#dc2626",
  planned: "#2563eb",
};

export function ActiveStateDot({ status }: { status: Status }) {
  const reduce = useReducedMotion();
  const color = COLORS[status];
  const shouldPulse = !reduce && status === "active";

  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        display: "inline-block",
        width: 8,
        height: 8,
        verticalAlign: "middle",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: color,
        }}
      />
      {shouldPulse ? (
        <motion.span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: color,
          }}
          animate={{
            scale: [1, 2.4, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ) : null}
    </span>
  );
}
