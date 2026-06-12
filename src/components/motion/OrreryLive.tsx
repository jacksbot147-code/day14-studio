"use client";

/**
 * OrreryLive — DEPRECATED 2026-06-11 (Jack killed the planets).
 * Superseded by LiveOpsBoard.tsx. Do NOT use on any page. Kept only as
 * reference for the live-data wiring pattern; safe to delete during the
 * overhaul QA night.
 */

import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { planetPulse } from "@/lib/motion";

interface AgentInfo {
  name: string;
  status: "online" | "degraded" | "offline";
  ageSec: number;
  core: boolean;
}

interface JarvisSnapshot {
  overall: "nominal" | "degraded" | "critical";
  agents: AgentInfo[];
  tenants: string[];
}

const PLANET_COLORS = ["#FF5C28", "#10B981", "#60A5FA", "#F472B6", "#FBBF24", "#A78BFA"];
const POLL_MS = 15_000;

export function OrreryLive({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState<JarvisSnapshot | null>(null);

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const sTiltX = useSpring(tiltX, { stiffness: 120, damping: 20 });
  const sTiltY = useSpring(tiltY, { stiffness: 120, damping: 20 });

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const load = async () => {
      try {
        const res = await fetch("/api/jarvis", { cache: "no-store" });
        if (res.ok) setSnap((await res.json()) as JarvisSnapshot);
      } catch {
        /* keep last snapshot */
      }
    };
    load();
    timer = setInterval(load, POLL_MS);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  function onMove(e: MouseEvent) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    tiltX.set(((e.clientX - rect.left) / rect.width - 0.5) * 12);
    tiltY.set(((e.clientY - rect.top) / rect.height - 0.5) * -12);
  }

  const tenants = snap?.tenants ?? [];
  const aliveCount = snap?.agents.filter((a) => a.status === "online").length ?? 0;
  const fleetAlive = (snap?.overall ?? "critical") !== "critical";

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={() => {
        tiltX.set(0);
        tiltY.set(0);
      }}
      style={{ perspective: 800 }}
    >
      <motion.div
        className="relative aspect-square w-full rounded-2xl bg-zinc-950 overflow-hidden"
        style={reduced ? undefined : { rotateY: sTiltX, rotateX: sTiltY }}
      >
        {/* star field */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 20% 30%, #fff8, transparent), radial-gradient(1px 1px at 70% 60%, #fff6, transparent), radial-gradient(1px 1px at 40% 80%, #fff7, transparent), radial-gradient(1px 1px at 85% 20%, #fff5, transparent)",
          }}
        />

        {/* sun = Day14 core, glows with fleet health */}
        <motion.div
          className="absolute left-1/2 top-1/2 -ml-8 -mt-8 flex h-16 w-16 items-center justify-center rounded-full text-[9px] font-bold tracking-widest text-zinc-950"
          style={{ backgroundColor: fleetAlive ? "#FF5C28" : "#52525b" }}
          animate={
            reduced
              ? undefined
              : {
                  boxShadow: fleetAlive
                    ? [
                        "0 0 24px 4px #FF5C2855",
                        "0 0 48px 10px #FF5C2888",
                        "0 0 24px 4px #FF5C2855",
                      ]
                    : "0 0 12px 2px #52525b44",
                }
          }
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          DAY14
        </motion.div>

        {/* tenant planets on orbits */}
        {tenants.slice(0, 6).map((tenant, i) => {
          const orbit = 80 + i * 34;
          const speed = 40 + i * 14;
          const color = PLANET_COLORS[i % PLANET_COLORS.length];
          return (
            <motion.div
              key={tenant}
              className="absolute left-1/2 top-1/2 rounded-full border border-zinc-800/60"
              style={{
                width: orbit * 2,
                height: orbit * 2,
                marginLeft: -orbit,
                marginTop: -orbit,
              }}
              animate={reduced ? undefined : { rotate: 360 }}
              transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
            >
              <motion.span
                title={tenant}
                className="absolute -top-1.5 left-1/2 h-3 w-3 -ml-1.5 rounded-full"
                style={{ backgroundColor: color }}
                animate={reduced ? undefined : planetPulse(fleetAlive)}
              />
            </motion.div>
          );
        })}

        {/* live status line */}
        <div className="absolute bottom-3 left-4 right-4 flex justify-between font-mono text-[10px] tracking-widest text-zinc-500">
          <span>THE EMPIRE · LIVE</span>
          <span>
            {snap ? `${aliveCount} AGENTS BREATHING` : "ESTABLISHING UPLINK…"}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
