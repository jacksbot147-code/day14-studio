"use client";

/**
 * BuildReveal — Phase B move 1: the section builds itself as you arrive.
 *
 * Wraps a section's children and animates them on first viewport entry:
 *   - Starts: opacity 0, scale 0.96, blur 8px (looks like a wireframe — the
 *     content is "under construction")
 *   - Resolves: opacity 1, scale 1, blur 0 — content snaps into focus
 *
 * Combined with a stagger across direct children (40ms each), the whole
 * section "builds itself" in a satisfying ~700ms sequence as you scroll
 * into it. The signature Apple-product-page reveal pattern.
 *
 * SSR-safe: server renders the resolved state (no blur, no scale) so the
 * page is readable without JS. Client takes over on mount.
 *
 * Reduced motion: instant fade-in only, no blur or scale.
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
      initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount }}
      transition={{
        duration,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: stagger,
      }}
      style={{ willChange: "transform, filter, opacity" }}
    >
      {children}
    </motion.div>
  );
}
