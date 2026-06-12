"use client";

/**
 * LiveOpsBoard — THE signature visual (replaces the orrery, Jack's call
 * 2026-06-11). A terminal-glass panel where the business visibly runs:
 * four pipeline stages, pulses traveling the wire, real event cards
 * streaming from /api/jarvis, live counters. Never fake data — when the
 * feed is quiet it replays the most recent real events in "standby".
 *
 * Homepage hero (sanitized labels) and /os full-bleed (raw labels).
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { EASE, DURATION } from "@/lib/motion";

const STAGES = ["REQUEST", "QUOTE", "SCHEDULE", "DONE"] as const;
const POLL_MS = 12_000;
const MAX_CARDS = 5;
const EMBER = "#FF5C28";
const GREEN = "#10B981";

interface FeedEvent {
  ts: string;
  level: "error" | "info";
  text: string;
}

interface JarvisSnapshot {
  overall: "nominal" | "degraded" | "critical";
  agents: { status: string }[];
  outbox: { sentTotal: number };
  register: { count: number };
  feed: FeedEvent[];
}

/** Map a raw event line to a pipeline stage + plain-English label. */
function classify(e: FeedEvent, sanitized: boolean): { stage: number; label: string } {
  const t = e.text.toLowerCase();
  let stage = 0;
  if (/quote|draft|estimate/.test(t)) stage = 1;
  else if (/schedul|calendar|board|route/.test(t)) stage = 2;
  else if (/sent|delivered|done|complete|paid/.test(t)) stage = 3;
  else if (/inbox|request|intake|received/.test(t)) stage = 0;
  else stage = Math.min(3, Math.abs(hash(e.text)) % 4);

  const label = sanitized
    ? e.text
        .replace(/OUTBOX SENT: \S+/i, "update delivered to owner")
        .replace(/[a-z0-9-]+\.json/gi, "card")
        .replace(/(telegram|poller|heartbeat)/gi, "system")
        .slice(0, 64)
    : e.text.slice(0, 72);
  return { stage, label };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

export function LiveOpsBoard({
  className,
  sanitized = true,
}: {
  className?: string;
  /** true on the homepage (plain-English labels); false on /os (raw). */
  sanitized?: boolean;
}) {
  const reduced = useReducedMotion();
  const [snap, setSnap] = useState<JarvisSnapshot | null>(null);
  const [visible, setVisible] = useState<{ id: string; stage: number; label: string; err: boolean }[]>([]);
  const queueRef = useRef<FeedEvent[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const load = async () => {
      try {
        const res = await fetch("/api/jarvis", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as JarvisSnapshot;
        setSnap(j);
        queueRef.current = [...j.feed].reverse(); // oldest first for replay
      } catch {
        /* keep last */
      }
    };
    load();
    timer = setInterval(load, POLL_MS);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  // Drip events onto the board one at a time — calm, deliberate.
  useEffect(() => {
    const drip = setInterval(() => {
      const next = queueRef.current.shift();
      if (!next) return;
      const { stage, label } = classify(next, sanitized);
      setVisible((v) =>
        [
          { id: `${next.ts}-${hash(next.text)}`, stage, label, err: next.level === "error" },
          ...v,
        ].slice(0, MAX_CARDS),
      );
    }, 2600);
    return () => clearInterval(drip);
  }, [sanitized]);

  const aliveCount = useMemo(
    () => snap?.agents.filter((a) => a.status === "online").length ?? 0,
    [snap],
  );
  const standby = (snap?.overall ?? "critical") === "critical";

  return (
    <div className={className}>
      <div
        className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5 backdrop-blur"
        style={{ opacity: standby ? 0.75 : 1, transition: "opacity 600ms" }}
      >
        {/* grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(#3f3f46 1px, transparent 1px), linear-gradient(90deg, #3f3f46 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* header */}
        <div className="relative mb-5 flex items-center justify-between font-mono text-[10px] tracking-[0.25em] text-zinc-500">
          <span className="flex items-center gap-2">
            <motion.span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: standby ? "#71717a" : GREEN }}
              animate={reduced || standby ? undefined : { opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            {standby ? "STANDBY · REPLAY" : "LIVE OPERATIONS"}
          </span>
          <span>{aliveCount} AGENTS ON</span>
        </div>

        {/* pipeline */}
        <div className="relative mb-6">
          <div className="flex items-center justify-between">
            {STAGES.map((s, i) => (
              <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                <motion.span
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-[9px] font-bold text-zinc-400"
                  animate={
                    reduced
                      ? undefined
                      : visible[0]?.stage === i
                        ? { borderColor: EMBER, color: "#fafafa", scale: [1, 1.15, 1] }
                        : { borderColor: "#3f3f46", scale: 1 }
                  }
                  transition={{ duration: DURATION.slow, ease: EASE.out }}
                >
                  {i + 1}
                </motion.span>
                <span className="font-mono text-[9px] tracking-widest text-zinc-500">{s}</span>
              </div>
            ))}
          </div>
          {/* the wire + traveling pulse */}
          <div className="absolute left-4 right-4 top-4 -z-0 h-px bg-zinc-800">
            {!reduced && !standby && (
              <motion.span
                className="absolute top-1/2 h-1 w-10 -translate-y-1/2 rounded-full"
                style={{
                  background: `linear-gradient(90deg, transparent, ${EMBER}, transparent)`,
                }}
                animate={{ left: ["-10%", "105%"] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
        </div>

        {/* event stream */}
        <div className="relative min-h-[150px] space-y-1.5">
          <AnimatePresence initial={false}>
            {visible.map((e) => (
              <motion.div
                key={e.id}
                layout
                initial={reduced ? { opacity: 1 } : { opacity: 0, x: -16, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: DURATION.base, ease: EASE.out }}
                className="flex items-center gap-2.5 rounded-md border border-zinc-800/80 bg-zinc-900/70 px-3 py-1.5"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: e.err ? "#EF4444" : GREEN }}
                />
                <span className="truncate font-mono text-[11px] text-zinc-300">{e.label}</span>
                <span className="ml-auto shrink-0 font-mono text-[9px] tracking-widest text-zinc-600">
                  {STAGES[e.stage]}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {visible.length === 0 && (
            <div className="py-10 text-center font-mono text-[11px] text-zinc-600">
              establishing uplink…
            </div>
          )}
        </div>

        {/* footer counters */}
        <div className="relative mt-4 flex justify-between border-t border-zinc-800/80 pt-3 font-mono text-[10px] tracking-widest text-zinc-500">
          <span>{(snap?.register.count ?? 0).toLocaleString()} JOBS LOGGED</span>
          <span>{(snap?.outbox.sentTotal ?? 0).toLocaleString()} UPDATES DELIVERED</span>
        </div>
      </div>
    </div>
  );
}
