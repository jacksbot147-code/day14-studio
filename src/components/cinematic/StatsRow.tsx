"use client";

/**
 * cinematic/StatsRow — the "engine" count-up stats (task 5/8).
 *
 * Port of the locked prototype's `#stats` row: four figures that ramp from 0 to
 * their target the first time the row scrolls ~50% into view.
 *
 * Motion: one IntersectionObserver kicks the ramp. Faster (>5) figures tick
 * every frame; small figures tick more slowly so the count stays legible —
 * mirroring the prototype's two-speed cadence. Under prefers-reduced-motion (or
 * no IO support) the figures render at their final values immediately.
 *
 * CLS: the value cells reserve their height (they always render a number, from
 * "0" up) and use tabular-nums so digit width never jitters the layout as the
 * count climbs — no layout shift.
 */

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";

interface Stat {
  to: number;
  label: string;
}

const STATS: readonly Stat[] = [
  { to: 14, label: "days to live" },
  { to: 3, label: "verticals proven" },
  { to: 24, label: "agents working / day" },
  { to: 1, label: "platform behind it all" },
];

const TICK_MS = 34;
/** Small figures (<= this) advance once every SLOW_EVERY ticks so they read. */
const SLOW_MAX = 5;
const SLOW_EVERY = 4;

export function StatsRow() {
  const rowRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<number[]>(() => STATS.map(() => 0));

  useEffect(() => {
    const node = rowRef.current;
    if (!node) return;

    const finals = STATS.map((s) => s.to);

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setValues(finals);
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;
    let tick = 0;

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          obs.unobserve(entry.target);
          interval = setInterval(() => {
            tick += 1;
            setValues((prev) => {
              let allDone = true;
              const next = STATS.map((stat, i) => {
                const v = prev[i] ?? 0;
                const target = stat.to;
                if (v >= target) return target;
                const slow = target <= SLOW_MAX && tick % SLOW_EVERY !== 0;
                if (slow) {
                  allDone = false;
                  return v;
                }
                const bumped = Math.min(target, v + 1);
                if (bumped < target) allDone = false;
                return bumped;
              });
              if (allDone && interval) clearInterval(interval);
              return next;
            });
          }, TICK_MS);
        }
      },
      { threshold: 0.5 },
    );

    io.observe(node);
    return () => {
      io.disconnect();
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <div className="cin-stats" ref={rowRef}>
      {STATS.map((stat, i) => (
        <div className="cin-stat" key={stat.label}>
          <div className="cin-stat-v">{values[i]}</div>
          <div className="cin-stat-l">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export default StatsRow;
