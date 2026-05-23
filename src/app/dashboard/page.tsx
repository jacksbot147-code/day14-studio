/**
 * /dashboard — the Empire command center.
 *
 * Live, server-rendered. Reads from the filesystem at every request:
 *   - skill registry (compile-time import)
 *   - work-register.jsonl (recent invocations)
 *   - growth-log.md (recent detections)
 *   - meta-gaps.md (recursive layer events)
 *   - meta-circuit-state.json (throttle status)
 *   - heartbeat logs (poller health)
 *   - telegram outbox (unsent cards)
 *   - drafts/ + drafts/_meta/ (pending review)
 *
 * Refreshes every 30s via a meta refresh tag. Designed for
 * morning + EOD glance — single pane, no clicking around.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import {
  SKILL_COUNT,
  META_SKILL_COUNT,
  DOMAIN_SKILL_COUNT,
  SKILLS,
} from "@/lib/skill-registry.generated";
import {
  DraftActions,
  CardActions,
  ResetCircuitButton,
  EnergyCheckinForm,
} from "./draft-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SHARED = path.join(homedir(), "Documents/businesses/_shared");
const SEEDS = path.join(homedir(), "Documents/studio/docs/seeds/skills");
const DRAFTS = path.join(SEEDS, "_drafts");
const META_DRAFTS = path.join(DRAFTS, "_meta");

async function readSafe(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function lsSafe(p: string): Promise<string[]> {
  try {
    return await fs.readdir(p);
  } catch {
    return [];
  }
}

async function gatherStats() {
  // work-register
  const regText = (await readSafe(path.join(SHARED, "growth/work-register.jsonl"))) || "";
  const regEntries = regText.split("\n").filter(Boolean).length;

  // growth-log
  const growthText = (await readSafe(path.join(SHARED, "growth/growth-log.md"))) || "";
  const growthEntries = (growthText.match(/^## /gm) || []).length;

  // meta-gaps
  const metaText = (await readSafe(path.join(SHARED, "growth/meta-gaps.md"))) || "";
  const metaEntries = (metaText.match(/^## /gm) || []).length;

  // circuit
  let circuit: { open: boolean; reason?: string | null; since?: string | null } = { open: false };
  const circuitText = await readSafe(path.join(SHARED, "growth/meta-circuit-state.json"));
  if (circuitText) {
    try {
      circuit = JSON.parse(circuitText);
    } catch {
      // ignore
    }
  }

  // drafts
  const domainDrafts: string[] = [];
  for (const name of await lsSafe(DRAFTS)) {
    if (name.startsWith("_")) continue;
    if (existsSync(path.join(DRAFTS, name, "SKILL.md"))) {
      domainDrafts.push(name);
    }
  }

  const metaDrafts: Array<{ name: string; risk: number }> = [];
  for (const name of await lsSafe(META_DRAFTS)) {
    const p = path.join(META_DRAFTS, name, "SKILL.md");
    if (!existsSync(p)) continue;
    const text = (await readSafe(p)) || "";
    const m = text.match(/recurrence_risk:\s*([\d.]+)/);
    metaDrafts.push({ name, risk: m && m[1] ? parseFloat(m[1]) : 0 });
  }

  // heartbeats
  const heartbeats: Array<{ name: string; ageMin: number; stale: boolean }> = [];
  for (const f of await lsSafe(path.join(SHARED, "poller"))) {
    if (!f.endsWith("-heartbeat.log")) continue;
    const text = (await readSafe(path.join(SHARED, "poller", f))) || "";
    const lines = text.trim().split("\n").filter(Boolean);
    const last = lines[lines.length - 1];
    let ageMin = Infinity;
    if (last) {
      const m = last.match(/^(\S+)/);
      if (m && m[1]) ageMin = Math.round((Date.now() - new Date(m[1]).getTime()) / 60000);
    }
    heartbeats.push({
      name: f.replace("-heartbeat.log", ""),
      ageMin,
      stale: ageMin > 10,
    });
  }

  // unsent telegram
  const unsent: Array<{ filename: string; urgency: string; preview: string }> = [];
  for (const f of await lsSafe(path.join(SHARED, "telegram/outbox"))) {
    if (!f.endsWith(".json")) continue;
    const text = await readSafe(path.join(SHARED, "telegram/outbox", f));
    if (!text) continue;
    try {
      const data = JSON.parse(text);
      if (data.sent_at) continue;
      unsent.push({
        filename: f,
        urgency: data.urgency || "P3",
        preview: (data.text || "").slice(0, 80),
      });
    } catch {
      // ignore
    }
  }
  unsent.sort((a, b) => a.urgency.localeCompare(b.urgency));

  // energy (last 7)
  const energyText = (await readSafe(path.join(SHARED, "founder-ops/energy-log.jsonl"))) || "";
  const energy = energyText
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l) as { date: string; energy: number; mood: number; note?: string };
      } catch {
        return null;
      }
    })
    .filter((x): x is { date: string; energy: number; mood: number; note?: string } => x !== null)
    .slice(-7);

  // recent invocations from work-register (last 10)
  const recentInvocations = regText
    .split("\n")
    .filter(Boolean)
    .slice(-10)
    .reverse()
    .map((l) => {
      try {
        return JSON.parse(l) as {
          timestamp: string;
          action_phrase: string;
          invoked_skill?: string;
          context: string;
        };
      } catch {
        return null;
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // status color
  const p0Count = unsent.filter((u) => u.urgency === "P0").length;
  const staleCount = heartbeats.filter((h) => h.stale).length;
  const systemColor =
    p0Count > 0 || staleCount > 0 || circuit.open
      ? "red"
      : unsent.filter((u) => u.urgency === "P1").length > 0 || metaDrafts.length > 2
        ? "yellow"
        : "green";

  return {
    regEntries,
    growthEntries,
    metaEntries,
    circuit,
    domainDrafts,
    metaDrafts,
    heartbeats,
    unsent,
    energy,
    recentInvocations,
    systemColor,
  };
}

export default async function DashboardPage() {
  const stats = await gatherStats();

  const sysBadge =
    stats.systemColor === "red"
      ? { bg: "bg-red-500/20", text: "text-red-300", label: "🔴 needs attention" }
      : stats.systemColor === "yellow"
        ? { bg: "bg-yellow-500/20", text: "text-yellow-300", label: "🟡 monitor" }
        : { bg: "bg-green-500/20", text: "text-green-300", label: "🟢 healthy" };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <meta httpEquiv="refresh" content="30" />

      {/* Header */}
      <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50">Empire</h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            {new Date().toLocaleString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            })}
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full font-medium text-sm ${sysBadge.bg} ${sysBadge.text}`}>
          {sysBadge.label}
        </span>
      </header>

      {/* Top stats grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Skills" value={SKILL_COUNT} sub={`${DOMAIN_SKILL_COUNT} domain · ${META_SKILL_COUNT} meta`} />
        <StatCard label="Drafts pending" value={stats.domainDrafts.length + stats.metaDrafts.length} sub={`${stats.domainDrafts.length} domain · ${stats.metaDrafts.length} meta`} />
        <StatCard label="Invocations logged" value={stats.regEntries} sub={`growth-watcher feed`} />
        <StatCard label="Unsent cards" value={stats.unsent.length} sub={stats.unsent.length ? `top: ${stats.unsent[0]?.urgency}` : "outbox clear"} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Drafts */}
          <Card title="Domain drafts pending review">
            {stats.domainDrafts.length === 0 ? (
              <p className="text-zinc-500 text-sm">No domain drafts queued.</p>
            ) : (
              <ul className="space-y-2">
                {stats.domainDrafts.slice(0, 10).map((d) => (
                  <li key={d} className="text-sm font-mono text-zinc-300 flex items-center">
                    <span className="text-zinc-500 mr-1">·</span> {d}
                    <DraftActions name={d} isMeta={false} />
                  </li>
                ))}
                {stats.domainDrafts.length > 10 && (
                  <li className="text-xs text-zinc-500">+ {stats.domainDrafts.length - 10} more</li>
                )}
              </ul>
            )}
          </Card>

          {/* Meta drafts */}
          <Card title="Meta drafts (recursive layer)">
            {stats.metaDrafts.length === 0 ? (
              <p className="text-zinc-500 text-sm">No meta drafts. Growth cluster stable.</p>
            ) : (
              <ul className="space-y-2">
                {stats.metaDrafts.map((m) => {
                  const tag = m.risk > 0.7 ? "🔴" : m.risk > 0.5 ? "🟠" : m.risk > 0.3 ? "🟡" : "🟢";
                  return (
                    <li key={m.name} className="text-sm flex items-center gap-2">
                      <span>{tag}</span>
                      <span className="font-mono text-zinc-300">{m.name}</span>
                      <span className="text-zinc-500 text-xs">risk {m.risk.toFixed(2)}</span>
                      <DraftActions name={m.name} isMeta={true} />
                    </li>
                  );
                })}
              </ul>
            )}
            {stats.circuit.open && (
              <div className="mt-3 rounded bg-red-500/20 text-red-300 p-3 text-xs">
                <strong>Circuit breaker OPEN</strong>
                {stats.circuit.since && <> since {stats.circuit.since}</>}
                {stats.circuit.reason && <>: {stats.circuit.reason}</>}
                <ResetCircuitButton />
              </div>
            )}
          </Card>

          {/* Recent invocations */}
          <Card title="Recent invocations (last 10)">
            {stats.recentInvocations.length === 0 ? (
              <p className="text-zinc-500 text-sm">No invocations yet. Register is empty.</p>
            ) : (
              <ul className="space-y-1.5">
                {stats.recentInvocations.map((inv, i) => (
                  <li key={i} className="text-xs">
                    <span className="text-zinc-500">
                      {new Date(inv.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>{" "}
                    <span className="font-mono text-zinc-300">
                      {inv.invoked_skill || inv.action_phrase.slice(0, 40)}
                    </span>{" "}
                    <span className="text-zinc-600">· {inv.context}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Heartbeats */}
          <Card title="Poller health">
            {stats.heartbeats.length === 0 ? (
              <p className="text-zinc-500 text-sm">No pollers detected. Run install-growth-watcher.sh.</p>
            ) : (
              <ul className="space-y-2">
                {stats.heartbeats.map((h) => (
                  <li key={h.name} className="text-sm flex items-center gap-2">
                    <span>{h.stale ? "🔴" : "🟢"}</span>
                    <span className="font-mono text-zinc-300">{h.name}</span>
                    <span className="text-zinc-500 text-xs ml-auto">
                      {h.ageMin === Infinity ? "no heartbeat" : `${h.ageMin}m ago`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Unsent telegram */}
          <Card title="Telegram outbox (unsent)">
            {stats.unsent.length === 0 ? (
              <p className="text-zinc-500 text-sm">Outbox clear.</p>
            ) : (
              <ul className="space-y-2">
                {stats.unsent.slice(0, 8).map((u) => (
                  <li key={u.filename} className="text-sm flex items-center">
                    <span
                      className={
                        u.urgency === "P0"
                          ? "text-red-400 font-medium"
                          : u.urgency === "P1"
                            ? "text-yellow-400"
                            : "text-zinc-400"
                      }
                    >
                      {u.urgency}
                    </span>{" "}
                    <span className="text-zinc-300 text-xs ml-2">{u.preview}</span>
                    <CardActions filename={u.filename} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Energy trend */}
          <Card title="Energy trend (last 7 days)">
            {stats.energy.length === 0 ? (
              <p className="text-zinc-500 text-sm">No energy log entries yet.</p>
            ) : (
              <div className="space-y-1.5">
                {stats.energy.map((e) => (
                  <div key={e.date} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 w-16">{e.date.slice(5)}</span>
                    <div className="flex-1 bg-zinc-800 rounded h-2 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${(e.energy / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-zinc-300 w-8 text-right">{e.energy}/10</span>
                  </div>
                ))}
              </div>
            )}
            <EnergyCheckinForm />
          </Card>

          {/* Growth detections */}
          <Card title="Growth activity">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400">Domain detections</span>
                <span className="font-mono text-zinc-200">{stats.growthEntries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Meta detections</span>
                <span className="font-mono text-zinc-200">{stats.metaEntries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Work-register entries</span>
                <span className="font-mono text-zinc-200">{stats.regEntries}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-10 pt-6 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between flex-wrap gap-2">
        <span>
          Auto-refresh every 30s ·{" "}
          <a
            href="/dashboard/tenants"
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            tenants
          </a>{" "}
          ·{" "}
          <a
            href="/dashboard/graph"
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            skill graph
          </a>{" "}
          ·{" "}
          <a
            href="/dashboard/system"
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            system health
          </a>
        </span>
        <span>
          {SKILLS.length} skills loaded · registry build:{" "}
          <code className="text-zinc-400">scripts/generate-skill-registry.mjs</code>
        </span>
      </footer>
    </main>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 transition-colors duration-150 hover:border-zinc-700">
      <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.08em]">{label}</div>
      <div className="text-3xl font-bold tracking-tight text-zinc-50 mt-1.5 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1.5">{sub}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
      <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.09em] mb-3.5">{title}</h2>
      {children}
    </div>
  );
}
