"use client";

/**
 * HeroParallaxWrap — wraps the landing-hero text block so it translates up
 * at half scroll-speed and fades out as the visitor leaves the hero. The
 * Apple-product-page pattern: the hero is a single fold, and the next
 * section "rises behind" it as you scroll.
 *
 * Pure presentation — no business logic. Layout-preserving: the wrapper is
 * a regular block-level div that respects its children's container layout
 * exactly.
 *
 * Reduced-motion: returns children with no motion at all. The hero still
 * works perfectly without the parallax.
 */

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

export function HeroParallaxWrap({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Translate up to 80px as the hero scrolls out, and fade to 0 by the time
  // the hero is fully out of view. Subtle by design — Apple's hero parallax
  // is closer to 0.5x scroll speed than 1x.
  const y = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const opacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 1, 0]);

  if (reduce) {
    return <div ref={ref}>{children}</div>;
  }

  return (
    <div ref={ref}>
      <motion.div style={{ y, opacity, willChange: "transform" }}>
        {children}
      </motion.div>
    </div>
  );
}
