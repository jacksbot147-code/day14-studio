"use client";

/**
 * LiveClock — a tiny brutalist-tech time display for Mission Control v2.
 * Renders the current local time as `HH:MM:SS UTC±OFFSET` with a pulsing
 * accent dot beside it; ticks every 1s. Conceptually the cockpit clock
 * you'd see on a NASA console — small, mono, glanceable, always-on.
 *
 * SSR-safe: renders a stable placeholder until the client mounts (avoids
 * hydration mismatch from `new Date()` differing between server and client).
 *
 * Reduced motion: pulse dot becomes static; time still ticks (the time
 * itself isn't motion, it's information).
 */

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

function fmt(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const offMin = -d.getTimezoneOffset();
  const sign = offMin >= 0 ? "+" : "-";
  const offH = String(Math.floor(Math.abs(offMin) / 60)).padStart(2, "0");
  return `${hh}:${mm}:${ss} UTC${sign}${offH}`;
}

export function LiveClock() {
  const reduce = useReducedMotion();
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    setNow(fmt(new Date()));
    const id = window.setInterval(() => setNow(fmt(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      aria-label="Mission clock"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontSize: 11,
        color: "var(--ink-500)",
        letterSpacing: "0.06em",
      }}
    >
      {reduce ? (
        <span
          aria-hidden
          style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }}
        />
      ) : (
        <motion.span
          aria-hidden
          style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span suppressHydrationWarning>{now ?? "--:--:-- UTC"}</span>
    </div>
  );
}
