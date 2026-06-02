"use client";

/**
 * ScrollParallax — translates a block in Y as the user scrolls past it,
 * giving depth without committing to a 3D scene. Apple uses this on hero
 * imagery + product shots: text moves slower than the surrounding scroll,
 * which reads as the text being closer to the camera.
 *
 * Pair with `position: relative` parents — the parallax is applied as a
 * transform, not a top/bottom shift, so layout never moves.
 *
 * `range` is the px delta over a full viewport-height of scroll. Positive
 * = element moves down as you scroll down (slower than viewport). Negative
 * = element moves up (faster, more aggressive parallax). Default 60.
 *
 * Reduced motion: renders children with no transform.
 */

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode, type CSSProperties } from "react";

interface ScrollParallaxProps {
  children: ReactNode;
  /** Pixel delta over one viewport-height of scroll. Default 60. */
  range?: number;
  /** Wrapper className. */
  className?: string;
  /** Wrapper inline styles. */
  style?: CSSProperties;
}

export function ScrollParallax({
  children,
  range = 60,
  className,
  style,
}: ScrollParallaxProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [range, -range]);

  if (reduce) {
    return (
      <div className={className} style={style} ref={ref}>
        {children}
      </div>
    );
  }
  return (
    <motion.div ref={ref} className={className} style={{ ...style, y }}>
      {children}
    </motion.div>
  );
}
