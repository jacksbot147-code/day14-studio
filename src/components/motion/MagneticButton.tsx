"use client";

/**
 * MagneticButton — CTA with a 4px magnetic pull toward the cursor and a
 * spring settle. Wrap your existing button/anchor styling via className.
 */

import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode, type MouseEvent } from "react";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  /** Max pull in px. Keep subtle. */
  strength?: number;
}

export function MagneticButton({
  children,
  className,
  href,
  onClick,
  strength = 4,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 380, damping: 28 });
  const sy = useSpring(y, { stiffness: 380, damping: 28 });

  function onMove(e: MouseEvent) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const py = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    x.set(px * strength);
    y.set(py * strength);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  const inner = href ? (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  ) : (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy, display: "inline-block" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileTap={reduced ? undefined : { scale: 0.97 }}
    >
      {inner}
    </motion.div>
  );
}
