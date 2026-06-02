"use client";

/**
 * ScannerSweep — a brutalist accent-bar that sweeps once across the bottom
 * of the page header when the route mounts. Visual cue: the Mission Control
 * "cockpit" is initializing. Loops once, then idles.
 *
 * Matches the Russian-cosmodrome aesthetic of the crew page — radar /
 * launch-sequence vibe, not a marketing flourish. ~900ms duration, fades
 * out at the end so the page doesn't keep drawing attention to itself.
 *
 * Reduced motion: renders nothing.
 */

import { motion, useReducedMotion } from "framer-motion";

export function ScannerSweep({ color }: { color?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        height: 2,
        marginTop: 4,
        marginBottom: 16,
        overflow: "hidden",
        background: "linear-gradient(to right, transparent, var(--border) 40%, var(--border) 60%, transparent)",
      }}
    >
      <motion.div
        initial={{ x: "-30%", opacity: 0 }}
        animate={{ x: "130%", opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
        style={{
          position: "absolute",
          top: -1,
          height: 4,
          width: "30%",
          background: color ?? "var(--accent)",
          filter: "blur(2px)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}
