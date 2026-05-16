"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CountUp — animates a number from 0 to `to` when it scrolls into view.
 * Suffix/prefix render unchanged on either side. Honors reduced-motion
 * (shows the final value immediately).
 *
 * Numbers use tabular-nums to prevent layout shift mid-tween. Pair with
 * the `.tnum` utility class on the parent.
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
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(to);
      setDone(true);
      return;
    }

    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !done) {
            io.disconnect();
            const start = performance.now();
            const step = (now: number) => {
              const elapsed = now - start;
              const t = Math.min(1, elapsed / durationMs);
              // ease-out cubic
              const eased = 1 - Math.pow(1 - t, 3);
              setValue(Math.round(to * eased));
              if (t < 1) requestAnimationFrame(step);
              else setDone(true);
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
  }, [to, durationMs, done]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}
