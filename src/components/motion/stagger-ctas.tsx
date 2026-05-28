"use client";

/**
 * StaggerCtas — fades each child in with a small upward rise, staggered by
 * `staggerChildren` (default 100ms). Designed for hero CTA clusters where the
 * "list" is really just two or three buttons inside a flex row, not a
 * semantic list — so this renders as `motion.div` containers (no `<ul>`/`<li>`)
 * to keep the existing flex layout, gap utilities, and HTML semantics intact.
 *
 * Used on the brand-site landings (day14 root, life-loophole, etc.) so the
 * primary + secondary CTA appear with a gentle wave rather than slamming in
 * with the rest of the hero copy.
 *
 * Reduced motion: when the user has `prefers-reduced-motion`, the container
 * and each item render at their final state with zero duration — same DOM,
 * no animation.
 *
 * Sibling to `StaggerCards`, which uses `ul`/`li` for the MissionControl KPI
 * grid. Both share the same fade+rise vocabulary; the difference is the
 * underlying element (semantic list vs. plain flex row) and the default
 * stagger timing.
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Children, type CSSProperties, type ReactNode } from "react";

interface StaggerCtasProps {
  children: ReactNode;
  /** Stagger between each child enter, in seconds. Default 0.1 (100ms). */
  staggerChildren?: number;
  /** Per-child enter duration, in seconds. Default 0.2 (200ms). */
  childDuration?: number;
  /** Pixels each child rises from when entering. Default 8. */
  rise?: number;
  /** Inline styles forwarded to the outer `div` so callers can preserve layout. */
  style?: CSSProperties;
  /** className for the outer `div` — pass the same flex/utility classes the original wrapper had. */
  className?: string;
}

export function StaggerCtas({
  children,
  staggerChildren = 0.1,
  childDuration = 0.2,
  rise = 8,
  style,
  className,
}: StaggerCtasProps) {
  const reduce = useReducedMotion();

  const containerVariants: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : staggerChildren,
        delayChildren: 0,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: rise },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : childDuration, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      className={className}
      style={style}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {Children.map(children, (child, i) => (
        // Each child becomes a flex item itself — the outer container's flex
        // gap distributes these `motion.div` wrappers exactly the way it would
        // have distributed the raw buttons. We avoid `display: contents` here
        // because framer-motion's transform animations don't render on an
        // element that doesn't generate a layout box.
        <motion.div key={i} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
