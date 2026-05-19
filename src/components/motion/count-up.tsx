"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CountUp — animates a number from 0 to `to` when it scrolls into view.
 * Suffix/prefix render unchanged on either side. Honors reduced-motion
 * (shows the final value immediately).
 *
 * Numbers use tabular-nums to prevent layout shift mid-tween. Pair with
 * the `.tnum` utility class on the parent.
 *
 * Server-render + JS-disabled behavior: shows the final value (`to`).
 * Once the client mounts AND the node is below the fold AND reduced-motion
 * is off, we reset to 0 and animate up on intersection. Above-the-fold
 * elements (where the user is already looking when the page paints) stay
 * at the final value — no awkward "0 days" first-paint flash for SSR
 * crawlers, social-share preview generators, or JS-disabled visitors.
 */
export function CountUp({
  to,
  durationMs = 1200,
  prefix = "",
  suffix = "",
}: {
  to: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  // Default to the final value so SSR + no-JS show the real number.
  const [value, setValue] = useState(to);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // leave at final value

    const node = ref.current;
    if (!node) return;

    // If the element is already in viewport at mount, leave it at `to` —
    // animating now would feel jumpy because the user is already looking.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    // Below fold: reset to 0 and watch for intersection to count up.
    setValue(0);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            io.disconnect();
            const start = performance.now();
            const step = (now: number) => {
              const elapsed = now - start;
              const t = Math.min(1, elapsed / durationMs);
              const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
              setValue(Math.round(to * eased));
              if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
            break;
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [to, durationMs]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}
