"use client";

/**
 * MagneticCard — wraps any block element to give it a subtle magnetic
 * "pull-toward-cursor" effect on hover. The Apple-store interactive
 * product cards use this exact pattern: the card translates a few pixels
 * toward the cursor as it approaches, snaps back on leave.
 *
 * The pull is small (max 6px on either axis) and dampened — meant to
 * register subconsciously, not draw attention. Combined with a soft
 * shadow it gives premium-tier surfaces a tactile feel.
 *
 * Layout-preserving: only affects transform on the wrapper, no
 * margin/padding shifts. The inner children render unchanged.
 *
 * Reduced motion: renders children straight through, no listeners attached.
 */

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useRef, type ReactNode, type CSSProperties } from "react";

interface MagneticCardProps {
  children: ReactNode;
  /** Max pull distance in pixels. Default 6. */
  strength?: number;
  /** Wrapper className. */
  className?: string;
  /** Wrapper inline styles. */
  style?: CSSProperties;
}

export function MagneticCard({
  children,
  strength = 6,
  className,
  style,
}: MagneticCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Springs dampen the snap-back so it feels weighted, not jerky.
  const sx = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const sy = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    // Normalize cursor position to [-1, 1] within the element.
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    x.set(nx * strength);
    y.set(ny * strength);
  }
  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ...style, x: sx, y: sy }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </motion.div>
  );
}
