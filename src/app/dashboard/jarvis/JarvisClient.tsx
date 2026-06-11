"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

type AgentStatus = "online" | "degraded" | "offline";

interface AgentInfo {
  name: string;
  status: AgentStatus;
  ageSec: number;
  core: boolean;
}

interface Snapshot {
  generatedAt: string;
  overall: "nominal" | "degraded" | "critical";
  agents: AgentInfo[];
  outbox: {
    queued: { file: string; urgency: string; preview: string; queuedAt: string | null }[];
    dead: number;
    sentTotal: number;
  };
  feed: { ts: string; level: "error" | "info"; text: string }[];
  register: { count: number; recent: string[] };
  circuit: Record<string, unknown> | null;
  skills: number;
  tenants: string[];
}

const POLL_MS = 5000;

const STATUS_COLOR: Record<AgentStatus, string> = {
  online: "#10B981",
  degraded: "#F59E0B",
  offline: "#EF4444",
};

const OVERALL_META = {
  nominal: { color: "#10B981", label: "ALL SYSTEMS NOMINAL" },
  degraded: { color: "#F59E0B", label: "DEGRADED — ATTENTION NEEDED" },
  critical: { color: "#EF4444", label: "CRITICAL — CORE AGENT DOWN" },
} as const;

function fmtAge(sec: number): string {
  if (sec < 0) return "never";
  if (sec < 90) return `${sec}s`;
  if (sec < 5400) return `${Math.round(sec / 60)}m`;
  if (sec < 172800) return `${Math.round(sec / 3600)}h`;
  return `${Math.round(sec / 86400)}d`;
}

function ArcReactor({ overall }: { overall: Snapshot["overall"] }) {
  const { color } = OVERALL_META[overall];
  return (
    <div className="relative h-36 w-36 shrink-0" aria-hidden>
      {[56, 44, 32].map((r, i) => (
        <motion.span
          key={r}
          className="absolute inset-0 m-auto rounded-full border"
          style={{
            width: r * 2,
            height: r * 2,
            borderColor: color,
            opacity: 0.25 + i * 0.2,
            borderTopColor: "transparent",
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 8 - i * 2.5, repeat: Infinity, ease: "linear" }}
        />
      ))}
      <motion.span
        className="absolute inset-0 m-auto h-10 w-10 rounded-full"
        style={{ backgroundColor: color }}
        animate={{ opacity: [0.5, 1, 0.5], scale: [0.92, 1.05, 0.92] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute inset-0 m-auto h-10 w-10 rounded-full blur-xl"
        style={{ backgroundColor: color }}
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function PulseDot({ status }: { status: AgentStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {status === "online" && (
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 backdrop-blur"
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: accent ?? "#fafafa" }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-zinc-500">{sub}</div>}
    </motion.div>
  );
}

export default function JarvisClient() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/jarvis", { cache: "no-store" });
      if (!res.ok) throw new Error(`api ${res.status}`);
      setSnap(await res.json());
      setError(null);
      setLastFetch(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const meta = OVERALL_META[snap?.overall ?? "critical"];
  const agents = snap?.agents ?? [];
  const online = agents.filter((a) => a.status === "online").length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 p-6 text-zinc-100 md:p-10">
      {/* ambient grid + scanline */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(#3f3f46 1px, transparent 1px), linear-gradient(90deg, #3f3f46 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 h-24"
        style={{ background: `linear-gradient(180deg, transparent, ${meta.color}11, transparent)` }}
        animate={{ top: ["-10%", "110%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative">
        {/* header */}
        <header className="mb-8 flex flex-wrap items-center gap-6">
          <ArcReactor overall={snap?.overall ?? "critical"} />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Day14 OS — Mission Control
            </div>
            <h1 className="mt-1 text-4xl font-black tracking-tight">JARVIS</h1>
            <motion.div
              key={meta.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-wider"
              style={{ borderColor: meta.color, color: meta.color }}
            >
              <PulseDot status={snap?.overall === "nominal" ? "online" : snap?.overall === "degraded" ? "degraded" : "offline"} />
              {meta.label}
            </motion.div>
            <div className="mt-2 text-[11px] text-zinc-600">
              {error
                ? `feed error: ${error}`
                : snap
                  ? `snapshot ${new Date(snap.generatedAt).toLocaleTimeString()} · polling every ${POLL_MS / 1000}s · verdicts from file mtime, not log contents`
                  : "establishing uplink…"}
            </div>
          </div>
        </header>

        {/* stat tiles */}
        <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Tile label="Agents online" value={`${online}/${agents.length}`} accent={online === agents.length && agents.length > 0 ? "#10B981" : "#F59E0B"} />
          <Tile label="Outbox queued" value={snap?.outbox.queued.length ?? "—"} sub={`${snap?.outbox.dead ?? 0} dead-lettered`} />
          <Tile label="Cards sent" value={snap?.outbox.sentTotal ?? "—"} sub="lifetime" />
          <Tile label="Work register" value={snap?.register.count ?? "—"} sub="entries" />
          <Tile label="Skills" value={snap?.skills ?? "—"} sub="in registry" />
          <Tile label="Tenants" value={snap?.tenants.length ?? "—"} sub={snap?.tenants.slice(0, 3).join(", ")} />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* agent grid */}
          <section className="xl:col-span-2">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Agent fleet — heartbeat freshness
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {agents.map((a, i) => (
                  <motion.div
                    key={a.name}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.03, 0.6) }}
                    className="flex items-center justify-between rounded-lg border bg-zinc-900/70 px-3 py-2.5"
                    style={{
                      borderColor: a.status === "offline" ? "#EF444455" : a.core ? "#10B98133" : "#27272a",
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <PulseDot status={a.status} />
                      <span className="truncate text-sm font-medium text-zinc-200">
                        {a.name}
                        {a.core && <span className="ml-1.5 text-[9px] font-bold uppercase text-emerald-500">core</span>}
                      </span>
                    </div>
                    <span className="ml-2 shrink-0 text-[11px] tabular-nums" style={{ color: STATUS_COLOR[a.status] }}>
                      {fmtAge(a.ageSec)}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

          {/* right column: feed + outbox */}
          <section className="space-y-6">
            <div>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Live feed</h2>
              <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 font-mono text-[11px]">
                <AnimatePresence initial={false}>
                  {(snap?.feed ?? []).map((e, i) => (
                    <motion.div
                      key={`${e.ts}-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2"
                    >
                      <span className="shrink-0 text-zinc-600">{e.ts.slice(11, 19)}</span>
                      <span className={e.level === "error" ? "text-red-400" : "text-zinc-400"}>{e.text}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {snap && snap.feed.length === 0 && <div className="text-zinc-600">no recent events</div>}
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Outbox — awaiting delivery
              </h2>
              <div className="space-y-2">
                <AnimatePresence>
                  {(snap?.outbox.queued ?? []).map((c) => (
                    <motion.div
                      key={c.file}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                          {c.urgency}
                        </span>
                        <span className="text-[10px] text-zinc-600">{c.file.slice(0, 28)}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs text-zinc-400">{c.preview}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {snap && snap.outbox.queued.length === 0 && (
                  <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3 text-xs text-emerald-400">
                    outbox clear — all cards delivered
                  </div>
                )}
              </div>
            </div>

            {snap?.circuit != null && (
              <div>
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  Growth circuit breaker
                </h2>
                <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 text-[10px] text-zinc-400">
                  {JSON.stringify(snap.circuit, null, 2)}
                </pre>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-10 flex gap-4 border-t border-zinc-800 pt-6 text-xs text-zinc-500">
          <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300">
            ← command center
          </Link>
          <Link href="/dashboard/system" className="text-emerald-400 hover:text-emerald-300">
            system health
          </Link>
          <Link href="/dashboard/graph" className="text-emerald-400 hover:text-emerald-300">
            skill graph
          </Link>
          <span className="ml-auto text-zinc-700">
            {lastFetch ? `uplink ${Math.round((Date.now() - lastFetch) / 1000)}s ago` : ""}
          </span>
        </footer>
      </div>
    </main>
  );
}
