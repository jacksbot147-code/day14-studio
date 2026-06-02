"use client";

/**
 * MeshGradient — animated multi-blob mesh gradient. The Linear / Vercel /
 * Cursor / v0.dev hero pattern. Four soft color blobs drift slowly on offset
 * timings, creating an "alive" background that never repeats. Heavy blur
 * smooths them into a continuous mesh.
 *
 * Defaults to subtle (low saturation, slow drift). Tunable via props if you
 * want louder or different palette. Renders behind everything via
 * `position: absolute; inset: 0` — caller wraps it in a relative section.
 *
 * Performance: 4 motion divs with `transform`+`opacity` only (compositor
 * layer). Single 80px blur filter. ~16fps idle, GPU-cheap.
 *
 * Reduced motion: blobs settle at their initial positions, no drift.
 */

import { motion, useReducedMotion } from "framer-motion";

interface MeshGradientProps {
  /** Tailwind/CSS color tokens for each of the 4 blobs. */
  colors?: [string, string, string, string];
  /** Base opacity of the whole mesh (0-1). Default 0.45. */
  opacity?: number;
  /** Blur radius in px. Higher = softer mesh. Default 80. */
  blur?: number;
}

const DEFAULT_COLORS: [string, string, string, string] = [
  "#ef6c33", // ember
  "#3b82f6", // electric blue
  "#a855f7", // violet
  "#10b981", // emerald
];

export function MeshGradient({
  colors = DEFAULT_COLORS,
  opacity = 0.45,
  blur = 80,
}: MeshGradientProps) {
  const reduce = useReducedMotion();

  // Each blob has its own slow drift loop. Different durations + paths so
  // they never sync — the mesh never repeats exactly.
  const blobs = [
    { color: colors[0], from: { x: "-10%", y: "-10%" }, to: { x: "20%", y: "30%" }, dur: 18 },
    { color: colors[1], from: { x: "60%", y: "10%" },   to: { x: "30%", y: "60%" }, dur: 22 },
    { color: colors[2], from: { x: "20%", y: "70%" },   to: { x: "70%", y: "20%" }, dur: 26 },
    { color: colors[3], from: { x: "70%", y: "60%" },   to: { x: "10%", y: "80%" }, dur: 24 },
  ];

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        opacity,
        filter: `blur(${blur}px)`,
      }}
    >
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          initial={{ x: b.from.x, y: b.from.y }}
          animate={
            reduce
              ? undefined
              : {
                  x: [b.from.x, b.to.x, b.from.x],
                  y: [b.from.y, b.to.y, b.from.y],
                }
          }
          transition={
            reduce
              ? undefined
              : { duration: b.dur, repeat: Infinity, ease: "easeInOut" }
          }
          style={{
            position: "absolute",
            width: "55vw",
            height: "55vw",
            maxWidth: 720,
            maxHeight: 720,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${b.color} 0%, transparent 65%)`,
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}
