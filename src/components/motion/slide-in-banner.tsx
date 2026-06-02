"use client";

/**
 * SlideInBanner — wraps a callout/banner so it slides in from the top with
 * a soft fade when the page mounts. Used for the inbox bulk-signoff callout
 * so a freshly accumulated queue feels like *new information arriving* —
 * not a static label.
 *
 * Layout-preserving: no opinion on inner content. Single-shot animation
 * (initial → animate), no exit choreography — re-renders don't re-trigger.
 *
 * Reduced motion: renders children straight through.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function SlideInBanner({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut", delay: 0.15 }}
    >
      {children}
    </motion.div>
  );
}
