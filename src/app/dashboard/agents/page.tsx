/**
 * /dashboard/agents — the Agent Command Deck.
 *
 * One screen for watching the agent workforce, replacing five surfaces:
 *   - liveness (heartbeat mtime, from empire-state.json + employee log mtimes)
 *   - last action (empire battle log / audit)
 *   - the tap queue (operator-todos + unsent jack-tap outbox files)
 *   - drift (brand-health table)
 *   - the leader brief (founder-ops priority-today + today-*.md)
 *
 * Server-rendered, read-only at request time. The ONLY writes are Jack's
 * explicit approve/deny taps, which go through /api/dashboard/agents/approve
 * (audit-logged). See vault: "Agent Oversight (Command Deck)".
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { TapActions } from "./agent-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const STUDIO = path.join(HOME, "Documents/studio");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const FOUNDER = path.join(SHARED, "founder-ops");

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
async function mtimeMs(p: string): Promise<number | null> {
  try {
    return (await fs.stat(p)).mtimeMs;
  } catch {
    return null;
  }
}
function ageMinFrom(ms: number | null): number | null {
  if (ms === null) return null;
  return Math.round((Date.now() - ms) / 60000);
}
function fmtAge(min: number | null): string {
  if (min === null) return "no telemetry";
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.round(min / 60)}h ago`;
  return `${Math.round(min / 1440)}d ago`;
}
function parseJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

type Heartbeat = { name: string; kind?: string; status?: string; ageMin?: number; cadenceMin?: number; lastBeat?: string };
type Battle = { ts?: string; tenant?: string; actor?: string; action?: string; error?: string | null };
type HumanTodo = { id: string; seq?: number; tenant?: string; title?: string; detail?: string; priority?: string; status?: string };
type EmpireState = { generated_at?: string; heartbeats?: Heartbeat[]; empire_battle_log?: Battle[]; human_todos?: HumanTodo[] };
type PriorityItem = { score?: number; tier?: string; label?: string; action?: string };
type OperatorTodo = { id: string; seq?: number; title?: string; status?: string; priority?: string; tenant?: string; detail?: string };
type OutboxTap = { file: string; text: string; urgency: string; queued_at: string };

const EMPLOYEES = [
  "sales-director", "cfo-agent", "customer-success-agent", "compliance-officer",
  "brand-steward", "pr-director", "product-strategist", "performance-analyst",
  "devops-sre", "investor-relations",
];

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, urgent: 1, normal: 2, medium: 2, low: 3 };

function lastActionFor(name: string, battle: Battle[]): Battle | null {
  const want = [name, `automated:${name}`];
  for (let i = battle.length - 1; i >= 0; i--) {
    const b = battle[i];
    if (b && b.actor && want.includes(b.actor)) return b;
  }
  return null;
}

async function gather() {
  const empire = parseJson<EmpireState>(await readSafe(path.join(STUDIO, "public/data/empire-state.json"))) || {};
  const heartbeats = Array.isArray(empire.heartbeats) ? empire.heartbeats : [];
  const battle = Array.isArray(empire.empire_battle_log) ? empire.empire_battle_log : [];

  // Leader brief
  const priority = parseJson<{ items?: PriorityItem[]; generated_at?: string }>(await readSafe(path.join(FOUNDER, "priority-today.json")));
  const priorityItems = priority && Array.isArray(priority.items) ? priority.items : [];
  const todayFiles = (await lsSafe(FOUNDER)).filter((f) => /^today-\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort().reverse();
  const newestToday = todayFiles[0] ?? null;

  // Tap queue — operator todos (open) + outbox jack-taps (unsent)
  const todoStore = parseJson<{ todos?: OperatorTodo[] }>(await readSafe(path.join(SHARED, "operator-todos.json")));
  const openTodos = (todoStore && Array.isArray(todoStore.todos) ? todoStore.todos : [])
    .filter((t) => (t.status || "open") === "open")
    .sort((a, b) => (PRIORITY_RANK[(a.priority || "normal").toLowerCase()] ?? 2) - (PRIORITY_RANK[(b.priority || "normal").toLowerCase()] ?? 2));

  const outboxTaps: OutboxTap[] = [];
  for (const f of await lsSafe(OUTBOX)) {
    if (!f.endsWith(".json")) continue;
    const d = parseJson<{ tap_required?: boolean; sent_at?: string | null; text?: string; urgency?: string; queued_at?: string }>(await readSafe(path.join(OUTBOX, f)));
    if (d && d.tap_required === true && !d.sent_at) {
      outboxTaps.push({ file: f, text: d.text || "(tap)", urgency: d.urgency || "P2", queued_at: d.queued_at || "" });
    }
  }

  // Employee liveness via log mtime
  const employees: Array<{ name: string; ageMin: number | null }> = [];
  for (const name of EMPLOYEES) {
    const out = await mtimeMs(path.join(SHARED, "poller", `${name}.stdout.log`));
    const err = await mtimeMs(path.join(SHARED, "poller", `${name}.stderr.log`));
    const newest = out === null ? err : err === null ? out : Math.max(out, err);
    employees.push({ name, ageMin: ageMinFrom(newest) });
  }

  // Drift (best-effort, markdown table)
  const driftMd = (await readSafe(path.join(SHARED, "brand-health-empire.md"))) || "";
  const driftRows: Array<{ tenant: string; score: string; drift: string }> = [];
  for (const line of driftMd.split("\n")) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*[^|]*\|\s*[^|]*\|\s*([^|]+?)\s*\|/);
    if (m && m[1] && m[1] !== "Tenant" && !m[1].startsWith("--")) {
      driftRows.push({ tenant: m[1], score: (m[2] || "—").trim(), drift: (m[3] || "—").trim() });
    }
  }

  return { empire, heartbeats, battle, priorityItems, newestToday, openTodos, outboxTaps, employees, driftRows };
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
      <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.09em] mb-3.5">{title}</h2>
      {children}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
      <div className="text-3xl font-bold tabular-nums text-zinc-50">{value}</div>
      <div className="text-xs text-zinc-400 mt-1">{label}</div>
    </div>
  );
}

export default async function AgentDeckPage() {
  const d = await gather();
  const aliveDaemons = d.heartbeats.filter((h) => h.status === "healthy").length;
  const tapCount = d.openTodos.length + d.outboxTaps.length;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50">Agent Command Deck</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Read-only on live state · approvals are audit-logged · generated {d.empire.generated_at?.slice(0, 16).replace("T", " ") || "—"}
          </p>
        </div>
        <a href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200 underline">← Empire</a>
      </header>

      {/* Leader brief */}
      <div className="mb-6">
        <Card title="Leader Brief — today's priorities">
          {d.priorityItems.length === 0 ? (
            <p className="text-sm text-zinc-500">No priority-today.json yet. Newest brief: {d.newestToday ? <code className="text-zinc-300">founder-ops/{d.newestToday}</code> : "—"}.</p>
          ) : (
            <ol className="space-y-2">
              {d.priorityItems.slice(0, 6).map((it, i) => (
                <li key={i} className="text-sm flex items-start gap-3">
                  <span className="text-zinc-500 tabular-nums">{it.tier || "•"}</span>
                  <span className="text-zinc-200">{it.label}</span>
                  {it.action && <span className="text-zinc-500 text-xs ml-auto max-w-[40%] truncate">{it.action}</span>}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Daemons healthy" value={`${aliveDaemons}/${d.heartbeats.length}`} />
        <Stat label="Awaiting your tap" value={String(tapCount)} />
        <Stat label="Employees tracked" value={String(d.employees.length)} />
        <Stat label="Recent actions" value={String(d.battle.length)} />
      </div>

      {/* Tap queue */}
      <div className="mb-6">
        <Card title={`Tap queue — ${tapCount} awaiting (most consequential first)`}>
          {tapCount === 0 ? (
            <p className="text-sm text-zinc-500">Nothing waiting on you. 🎉</p>
          ) : (
            <ul className="space-y-3">
              {d.openTodos.map((t) => (
                <li key={t.id} className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-zinc-800 text-zinc-400">{(t.priority || "normal")}</span>
                  <span className="text-sm text-zinc-200">{t.title || t.id}</span>
                  {t.tenant && <span className="text-xs text-zinc-500">· {t.tenant}</span>}
                  <span className="ml-auto"><TapActions kind="todo" id={t.id} /></span>
                </li>
              ))}
              {d.outboxTaps.map((t) => (
                <li key={t.file} className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-amber-900/40 text-amber-300">{t.urgency} · unsent</span>
                  <span className="text-sm text-zinc-200">{t.text.slice(0, 90)}</span>
                  <span className="ml-auto"><TapActions kind="tap" id={t.file} /></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Agent grids */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card title={`Daemons & pollers — ${d.heartbeats.length}`}>
          <ul className="space-y-2">
            {d.heartbeats.map((h) => {
              const last = lastActionFor(h.name, d.battle);
              const ok = h.status === "healthy";
              return (
                <li key={h.name} className="text-sm flex items-center gap-2">
                  <span>{ok ? "🟢" : "🔴"}</span>
                  <span className="font-mono text-zinc-300">{h.name}</span>
                  {last && <span className="text-zinc-500 text-xs truncate max-w-[40%]">· {last.action}</span>}
                  <span className="text-zinc-500 text-xs ml-auto">{typeof h.ageMin === "number" ? fmtAge(h.ageMin) : "—"}</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Employees (scheduled C-suite) — liveness by log mtime">
          <ul className="space-y-2">
            {d.employees.map((e) => {
              const ok = e.ageMin !== null && e.ageMin < 1560;
              return (
                <li key={e.name} className="text-sm flex items-center gap-2">
                  <span>{e.ageMin === null ? "⚪" : ok ? "🟢" : "🔴"}</span>
                  <span className="font-mono text-zinc-300">{e.name}</span>
                  <span className="text-zinc-500 text-xs ml-auto">{fmtAge(e.ageMin)}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-zinc-600 mt-3">9 of 10 employees emit only stdout-log telemetry — no heartbeat/audit slice yet (see Agent Oversight note).</p>
        </Card>
      </div>

      {/* Activity timeline + drift */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Recent activity (empire battle log)">
          <ul className="space-y-1.5">
            {d.battle.slice(-18).reverse().map((b, i) => (
              <li key={i} className="text-xs flex items-center gap-2">
                <span className="text-zinc-600 tabular-nums">{b.ts?.slice(5, 16).replace("T", " ") || "—"}</span>
                <span className="font-mono text-zinc-400">{b.actor || "—"}</span>
                <span className="text-zinc-300 truncate">{b.action}</span>
                {b.error && <span className="text-red-400 text-[10px] ml-auto">err</span>}
              </li>
            ))}
            {d.battle.length === 0 && <li className="text-sm text-zinc-500">No recent activity recorded.</li>}
          </ul>
        </Card>

        <Card title="Drift — brand health (best-effort)">
          {d.driftRows.length === 0 ? (
            <p className="text-sm text-zinc-500">No brand-health data yet (brand-steward has scored 0 samples).</p>
          ) : (
            <ul className="space-y-2">
              {d.driftRows.map((r, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="text-zinc-300">{r.tenant}</span>
                  <span className="text-zinc-500 text-xs ml-auto">score {r.score} · drift {r.drift}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-[11px] text-zinc-600 mt-8">
        Outcome tracking (draft → sent → paid) and per-agent audit slices are stubs until agents emit per-name telemetry — see the build sequence in the Agent Org &amp; Orchestration note.
      </p>
    </main>
  );
}
