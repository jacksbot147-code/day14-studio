"use client";

/**
 * Reveal — the quiet layer. Wrap any section/child for the standard
 * scroll-triggered entrance. Respects prefers-reduced-motion.
 *
 *   <Reveal><section>…</section></Reveal>
 *   <Reveal stagger>…children each get the reveal…</Reveal>
 */

import { motion, useReducedMotion } from "framer-motion";
import { reveal, revealStagger, instant, STAGGER } from "@/lib/motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Stagger direct children instead of revealing as one block. */
  stagger?: boolean;
  /** Custom stagger seconds (defaults to STAGGER.cards). */
  staggerBy?: number;
  /** Extra classes passed through. */
  className?: string;
  /** Re-animate every time it enters the viewport (default: once). */
  repeat?: boolean;
}

export function Reveal({
  children,
  stagger = false,
  staggerBy = STAGGER.cards,
  className,
  repeat = false,
}: RevealProps) {
  const reduced = useReducedMotion();
  const variants = reduced ? instant : stagger ? revealStagger(staggerBy) : reveal;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: !repeat, amount: 0.25 }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

/** Child item for use inside <Reveal stagger>. */
export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} variants={reduced ? instant : reveal}>
      {children}
    </motion.div>
  );
}
