"use client";

/**
 * StaggerCards — wraps a list of dashboard cards in a `motion.ul` that fades
 * each child in with a small upward rise, staggered by `staggerChildren`.
 *
 * Used for the MissionControl KPI grid on /admin (Day14 Command Center) so
 * the row of five cards reveals as a single quick wave on first paint rather
 * than slamming in all at once. Each card is a `motion.li`; the grid layout
 * (5 columns on the KPI grid, defined by the parent `.kpi-grid` CSS class)
 * stays exactly the same — the `ul`/`li` reset every browser margin/padding
 * inline so visual layout doesn't shift.
 *
 * Reduced motion: when the user has `prefers-reduced-motion`, both the
 * container and the items render with zero-duration transitions and start at
 * their final state, so screen-reader users (and anyone who's opted out of
 * motion) get the same content with no animation at all.
 *
 * Why a wrapper component instead of inlining `motion.ul` into the server
 * component: `/admin/page.tsx` is a Next server component (it `await`s
 * `loadEmpireState`). framer-motion is client-only — so the motion bits live
 * here, marked `"use client"`, and the server page just hands children in.
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Children, type CSSProperties, type ReactNode } from "react";

interface StaggerCardsProps {
  children: ReactNode;
  /** Stagger between each child enter, in seconds. Default 0.05 (50ms). */
  staggerChildren?: number;
  /** Per-child enter duration, in seconds. Default 0.2 (200ms). */
  childDuration?: number;
  /** Pixels each child rises from when entering. Default 8. */
  rise?: number;
  /** Inline styles forwarded to the outer `ul` (so callers can apply grid columns). */
  style?: CSSProperties;
  /** Additional className for the `ul`. The KPI grid passes `kpi-grid`. */
  className?: string;
}

const LIST_STYLE: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
};

export function StaggerCards({
  children,
  staggerChildren = 0.05,
  childDuration = 0.2,
  rise = 8,
  style,
  className,
}: StaggerCardsProps) {
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
    <motion.ul
      className={className}
      style={{ ...LIST_STYLE, ...style }}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {Children.map(children, (child, i) => (
        <motion.li key={i} variants={itemVariants} style={LIST_STYLE}>
          {child}
        </motion.li>
      ))}
    </motion.ul>
  );
}
