"use client";

/**
 * SplitWords — Apple-style per-word headline reveal. Wraps a single string
 * and animates each word in with a soft rise + fade, staggered by 30-50ms.
 *
 * The visual pattern Apple uses across product pages: a massive headline
 * appears to *land* word-by-word as if it's being typed by something
 * deliberate and confident. We use it for landing-hero H1s and section
 * openers.
 *
 * Layout-preserving: words wrap naturally (each is an inline-block span);
 * line-height + letter-spacing are inherited from the parent. The motion
 * sits on opacity + a 12px Y-rise so we don't push the page around.
 *
 * Reduced motion: renders the static text with no animation at all.
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { CSSProperties } from "react";

interface SplitWordsProps {
  /** The headline text. Words are split on whitespace. */
  text: string;
  /** Tag to render the wrapper as. Default `span`. */
  as?: "h1" | "h2" | "h3" | "span" | "p";
  /** Stagger between each word, in seconds. Default 0.04. */
  stagger?: number;
  /** Per-word duration, in seconds. Default 0.5. */
  duration?: number;
  /** Optional className for the wrapper element. */
  className?: string;
  /** Inline styles forwarded to the wrapper. */
  style?: CSSProperties;
}

const wordStyle: CSSProperties = {
  display: "inline-block",
  whiteSpace: "pre",
};

export function SplitWords({
  text,
  as = "span",
  stagger = 0.04,
  duration = 0.5,
  className,
  style,
}: SplitWordsProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Tag = as as keyof JSX.IntrinsicElements;
    return (
      <Tag className={className} style={style}>
        {text}
      </Tag>
    );
  }

  const words = text.split(/(\s+)/); // keep whitespace tokens so layout is preserved

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
  };
  const word: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: [0.16, 1, 0.3, 1] }, // expo-out — Apple's signature curve
    },
  };

  const MotionTag =
    as === "h1"
      ? motion.h1
      : as === "h2"
      ? motion.h2
      : as === "h3"
      ? motion.h3
      : as === "p"
      ? motion.p
      : motion.span;

  return (
    <MotionTag
      className={className}
      style={style}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          <span key={i} style={wordStyle}>
            {w}
          </span>
        ) : (
          <motion.span key={i} style={wordStyle} variants={word}>
            {w}
          </motion.span>
        ),
      )}
    </MotionTag>
  );
}
