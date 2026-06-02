"use client";

/**
 * CrewCardLive — wraps a single CrewCard with hover lift + a subtle
 * accent-glow on hover. The hover affordance is what makes Mission Control
 * v2 feel like a real cockpit and not a static roster.
 *
 * Visual: 2px translateY + a soft accent shadow on hover. 180ms ease-out.
 * Cursor changes to default (these aren't buttons yet — wait until /api/
 * admin/crew-action lands).
 *
 * Reduced motion: no hover transform, no shadow, no transition — the static
 * card behaviour from the parent CSS rules wins.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function CrewCardLive({ children, isActive }: { children: ReactNode; isActive?: boolean }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <>{children}</>;
  }
  // The accent shadow gets a touch warmer on actively-running units —
  // visually rewards the "this thing is alive" state without being loud.
  const hoverShadow = isActive
    ? "0 8px 24px -8px rgba(22,163,74,0.22), 0 2px 6px -2px rgba(15,23,42,0.08)"
    : "0 8px 24px -8px rgba(15,23,42,0.15), 0 2px 6px -2px rgba(15,23,42,0.08)";
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: hoverShadow }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{ borderRadius: 8 }}
    >
      {children}
    </motion.div>
  );
}
