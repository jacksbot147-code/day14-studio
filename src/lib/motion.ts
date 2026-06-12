/**
 * motion.ts — Day14 motion design tokens.
 *
 * Principle (WEBSITE-OVERHAUL-SPEC N6): 3 signature moments, quiet
 * competence everywhere else. Transform/opacity only. Everything respects
 * prefers-reduced-motion (use the `reduced` variants or framer's
 * useReducedMotion()). If it can't run at 60fps, it doesn't ship.
 */

export const EASE = {
  /** Default for entrances — confident, settles fast. */
  out: [0.16, 1, 0.3, 1] as const, // expo-out
  /** For hovers/magnetic effects — springy without wobble. */
  spring: { type: "spring", stiffness: 380, damping: 28 } as const,
  /** For the underline sweep + border-light — deliberate. */
  sweep: [0.65, 0, 0.35, 1] as const,
} as const;

export const DURATION = {
  fast: 0.15, // route fades, hover-offs
  base: 0.3, // quiet-layer reveals
  slow: 0.4, // signature entrances — the ceiling, nothing slower
} as const;

export const STAGGER = {
  words: 0.05, // hero headline word reveal
  cards: 0.06, // pricing cards rise
  grid: 0.03, // agent/feature grids
} as const;

/** Quiet layer: standard section reveal. Use with <motion.div variants={reveal}>. */
export const reveal = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE.out },
  },
} as const;

/** Container that staggers its children's `reveal`. */
export const revealStagger = (stagger: number = STAGGER.cards) =>
  ({
    hidden: {},
    visible: { transition: { staggerChildren: stagger } },
  }) as const;

/** Signature: hero word-by-word build. One play, no loop. */
export const heroWord = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE.out },
  },
} as const;

/** Pricing card hover — apply via whileHover. */
export const cardHover = {
  rotateX: 2,
  y: -4,
  transition: EASE.spring,
} as const;

/** Orrery planet pulse — scale keyframes driven by live heartbeat status. */
export const planetPulse = (alive: boolean) =>
  alive
    ? {
        scale: [1, 1.12, 1],
        transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
      }
    : { scale: 1, opacity: 0.45 };

/** Reduced-motion fallback: everything appears instantly. */
export const instant = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
} as const;
