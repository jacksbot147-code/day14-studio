"use client";

/**
 * CursorSpotlight — subtle radial-gradient spotlight that follows the
 * cursor across the hero section. The Linear / Cursor.com pattern. Small
 * effect, big difference: makes the page feel responsive to the visitor.
 *
 * Implementation notes:
 *  - Positioned absolute inside the hero section, behind content (`z-0`).
 *  - Listens to `mousemove` on `window` and stores normalized coords in
 *    framer-motion `MotionValue`s, then drives a `radial-gradient`
 *    background. No React re-renders per frame.
 *  - On touch devices (no fine pointer), the spotlight settles at the
 *    centre and doesn't follow — looks like a deliberate ambient glow.
 *  - Reduced motion: spotlight is rendered statically (no follow).
 *
 * Tuning: 600px radius, 14% opacity at center fading to 0. Subtle enough
 * to never compete with content; visible enough that visitors who notice
 * it think the page feels alive.
 */

import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

export function CursorSpotlight({ color = "#ef6c33" }: { color?: string }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(50);
  const my = useMotionValue(40);

  useEffect(() => {
    if (reduce) return;
    if (typeof window === "undefined") return;
    const hasFinePointer = window.matchMedia?.("(pointer: fine)").matches ?? false;
    if (!hasFinePointer) return;
    const onMove = (e: MouseEvent) => {
      mx.set((e.clientX / window.innerWidth) * 100);
      my.set((e.clientY / window.innerHeight) * 100);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my, reduce]);

  const background = useMotionTemplate`radial-gradient(600px circle at ${mx}% ${my}%, ${color}24, transparent 60%)`;

  if (reduce) {
    return (
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: `radial-gradient(600px circle at 50% 40%, ${color}14, transparent 60%)`,
          mixBlendMode: "screen",
        }}
      />
    );
  }

  return (
    <motion.div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background,
        mixBlendMode: "screen",
      }}
    />
  );
}
