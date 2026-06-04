"use client";

/**
 * BuildReveal — clean fade-up reveal on viewport entry.
 *
 * Wraps a section's children and animates them on first viewport entry:
 *   - Starts: opacity 0, translated 12px down
 *   - Resolves: opacity 1, y 0
 *
 * Blur and scale were intentionally removed — they made the page feel hazy.
 *
 * SSR-safe: server renders the resolved state so the page is readable
 * without JS. Client takes over on mount.
 *
 * Reduced motion: instant fade-in only, no translate.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface BuildRevealProps {
  children: ReactNode;
  /** How much of the element must be in view before triggering. Default 0.15 */
  amount?: number;
  /** Animation duration in seconds. Default 0.7 */
  duration?: number;
  /** Stagger delay between direct children, in seconds. Default 0 (single block reveal). */
  stagger?: number;
  /** Optional className passed through to the wrapper. */
  className?: string;
}

export function BuildReveal({
  children,
  amount = 0.15,
  duration = 0.7,
  stagger = 0,
  className,
}: BuildRevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{
        duration,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: stagger,
      }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
