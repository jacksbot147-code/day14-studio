"use client";

/**
 * HeroMissionClock — corner micro-detail on the landing hero. A small
 * monospace label + live tick that calls back to the mission clock in
 * /admin/mission-control. The continuity signal: this site and the admin
 * cockpit share the same DNA.
 *
 * Positioned absolutely in the top-right of the hero by the caller; this
 * component only renders the inline content. Reduced-motion: dot is static.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

function pad(n: number): string { return String(n).padStart(2, "0"); }
function fmt(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function HeroMissionClock({ label = "Mission clock" }: { label?: string }) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    setNow(fmt(new Date()));
    const id = window.setInterval(() => setNow(fmt(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontSize: 11,
        color: "#666",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      {reduce ? (
        <span
          aria-hidden
          style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef6c33" }}
        />
      ) : (
        <motion.span
          aria-hidden
          style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef6c33" }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span>{label}</span>
      <span aria-hidden style={{ opacity: 0.4 }}>·</span>
      <span suppressHydrationWarning style={{ fontVariantNumeric: "tabular-nums" }}>
        {now ?? "--:--:--"}
      </span>
    </div>
  );
}
