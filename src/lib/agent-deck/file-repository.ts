/**
 * agent-deck/file-repository — the file-backed DeckRepository.
 *
 * Reads the live operator state under ~/Documents/businesses/_shared (the model
 * Jack's machine already produces) and projects it into the typed DeckState
 * contract, scoped by tenant. The Supabase adapter (added when a customer needs
 * hosted isolation) implements the same DeckRepository — callers never change.
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { auditLog } from "@/lib/skills/audit-log-generator";
import type {
  ActivityItem,
  AgentRow,
  DeckRepository,
  DeckState,
  DriftRow,
  PriorityItem,
  TapItem,
  TapKind,
  TapResult,
} from "./types";
import { PRIORITY_RANK, normalizePriority } from "./types";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const STUDIO = path.join(HOME, "Documents/studio");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const FOUNDER = path.join(SHARED, "founder-ops");
const TODOS_FILE = path.join(SHARED, "operator-todos.json");

const EMPLOYEES = [
  "sales-director", "cfo-agent", "customer-success-agent", "compliance-officer",
  "brand-steward", "pr-director", "product-strategist", "performance-analyst",
  "devops-sre", "investor-relations",
];
const EMPLOYEE_STALE_MIN = 1560; // ~26h

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
  return ms === null ? null : Math.round((Date.now() - ms) / 60000);
}
function parseJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/** A tenant-scoped row matches when no scope is set, or its tenant equals the scope. */
function inScope(tenant: string | null, rowTenant?: string | null): boolean {
  if (tenant === null) return true;
  return !!rowTenant && rowTenant === tenant;
}

type RawHeartbeat = { name: string; status?: string; ageMin?: number; lastBeat?: string };
type RawBattle = { ts?: string; tenant?: string; actor?: string; action?: string; error?: string | null };
type RawTodo = { id: string; seq?: number; title?: string; status?: string; priority?: string; tenant?: string; detail?: string };

function lastActionFor(name: string, battle: RawBattle[]): RawBattle | null {
  const want = [name, `automated:${name}`];
  for (let i = battle.length - 1; i >= 0; i--) {
    const b = battle[i];
    if (b && b.actor && want.includes(b.actor)) return b;
  }
  return null;
}

export class FileDeckRepository implements DeckRepository {
  async getState(tenant: string | null): Promise<DeckState> {
    const empire = parseJson<{ generated_at?: string; heartbeats?: RawHeartbeat[]; empire_battle_log?: RawBattle[] }>(
      await readSafe(path.join(STUDIO, "public/data/empire-state.json")),
    ) || {};
    const heartbeats = Array.isArray(empire.heartbeats) ? empire.heartbeats : [];
    const battle = Array.isArray(empire.empire_battle_log) ? empire.empire_battle_log : [];

    // ---- Agents (daemons + employees) ----
    const agents: AgentRow[] = [];
    for (const h of heartbeats) {
      const rowTenant = guessTenant(h.name);
      if (!inScope(tenant, rowTenant ?? (tenant === null ? null : null))) {
        // Daemons without a tenant are shared infra: shown in god-view only.
        if (tenant !== null && !rowTenant) continue;
        if (tenant !== null && rowTenant !== tenant) continue;
      }
      const last = lastActionFor(h.name, battle);
      agents.push({
        name: h.name,
        kind: "daemon",
        status: h.status === "healthy" ? "healthy" : "down",
        ageMin: typeof h.ageMin === "number" ? h.ageMin : null,
        ...(last?.action ? { lastAction: last.action } : {}),
        ...(last?.ts ? { lastActionTs: last.ts } : {}),
        ...(rowTenant ? { tenant: rowTenant } : {}),
      });
    }
    // Employees are shared C-suite (serve every tenant) → only in the god-view.
    if (tenant === null) {
      for (const name of EMPLOYEES) {
        const out = await mtimeMs(path.join(SHARED, "poller", `${name}.stdout.log`));
        const err = await mtimeMs(path.join(SHARED, "poller", `${name}.stderr.log`));
        const newest = out === null ? err : err === null ? out : Math.max(out, err);
        const ageMin = ageMinFrom(newest);
        const status = ageMin === null ? "unknown" : ageMin < EMPLOYEE_STALE_MIN ? "healthy" : "stale";
        agents.push({ name, kind: "employee", status, ageMin });
      }
    }

    // ---- Taps (operator todos + outbox jack-taps) ----
    const taps: TapItem[] = [];
    const todoStore = parseJson<{ todos?: RawTodo[] }>(await readSafe(TODOS_FILE));
    const todos = todoStore && Array.isArray(todoStore.todos) ? todoStore.todos : [];
    for (const t of todos) {
      if ((t.status || "open") !== "open") continue;
      if (!inScope(tenant, t.tenant ?? null)) continue;
      taps.push({
        id: t.id,
        kind: "todo",
        title: t.title || t.id,
        ...(t.detail ? { detail: t.detail } : {}),
        priority: normalizePriority(t.priority),
        ...(t.tenant ? { tenant: t.tenant } : {}),
      });
    }
    for (const f of await lsSafe(OUTBOX)) {
      if (!f.endsWith(".json")) continue;
      const dd = parseJson<{ tap_required?: boolean; sent_at?: string | null; text?: string; urgency?: string; tenant?: string }>(
        await readSafe(path.join(OUTBOX, f)),
      );
      if (dd && dd.tap_required === true && !dd.sent_at) {
        if (!inScope(tenant, dd.tenant ?? null)) continue;
        taps.push({
          id: f,
          kind: "tap",
          title: (dd.text || "(tap)").slice(0, 120),
          priority: "high",
          urgency: dd.urgency || "P2",
          ...(dd.tenant ? { tenant: dd.tenant } : {}),
        });
      }
    }
    taps.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

    // ---- Priorities (leader brief) ----
    const priorityRaw = parseJson<{ items?: Array<{ tier?: string; label?: string; action?: string }> }>(
      await readSafe(path.join(FOUNDER, "priority-today.json")),
    );
    let priorities: PriorityItem[] = (priorityRaw && Array.isArray(priorityRaw.items) ? priorityRaw.items : [])
      .filter((it) => typeof it.label === "string")
      .map((it) => ({ ...(it.tier ? { tier: it.tier } : {}), label: it.label as string, ...(it.action ? { action: it.action } : {}) }));
    if (tenant !== null) priorities = priorities.filter((p) => p.label.toLowerCase().includes(tenant.toLowerCase()));
    const todayFiles = (await lsSafe(FOUNDER)).filter((f) => /^today-\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort().reverse();
    const newestBriefFile = todayFiles[0] ?? null;

    // ---- Activity ----
    const activity: ActivityItem[] = battle
      .filter((b) => inScope(tenant, b.tenant ?? null))
      .slice(-40)
      .map((b) => ({
        ...(b.ts ? { ts: b.ts } : {}),
        ...(b.actor ? { actor: b.actor } : {}),
        ...(b.action ? { action: b.action } : {}),
        ...(b.tenant ? { tenant: b.tenant } : {}),
        error: !!b.error,
      }));

    // ---- Drift ----
    const driftMd = (await readSafe(path.join(SHARED, "brand-health-empire.md"))) || "";
    const drift: DriftRow[] = [];
    for (const line of driftMd.split("\n")) {
      const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*[^|]*\|\s*[^|]*\|\s*([^|]+?)\s*\|/);
      if (m && m[1] && m[1] !== "Tenant" && !m[1].startsWith("--")) {
        const t = m[1];
        if (tenant !== null && t.toLowerCase().replace(/\s+/g, "-") !== tenant.toLowerCase()) continue;
        drift.push({ tenant: t, score: (m[2] || "—").trim(), drift: (m[3] || "—").trim() });
      }
    }

    // ---- Summary + posture ----
    const daemons = agents.filter((a) => a.kind === "daemon");
    const employees = agents.filter((a) => a.kind === "employee");
    const daemonsHealthy = daemons.filter((a) => a.status === "healthy").length;
    const employeesStale = employees.filter((a) => a.status !== "healthy").length;
    const summary = {
      daemonsHealthy,
      daemonsTotal: daemons.length,
      tapsAwaiting: taps.length,
      employeesStale,
      employeesTotal: employees.length,
    };
    const posture: DeckState["posture"] = taps.length > 0 || daemonsHealthy < daemons.length ? "attention" : "nominal";

    return {
      tenant,
      generatedAt: empire.generated_at ?? null,
      posture,
      agents,
      taps,
      priorities,
      activity,
      drift,
      summary,
      newestBriefFile,
    };
  }

  async resolveTap(tenant: string | null, kind: TapKind, id: string, decision: "approve" | "deny"): Promise<TapResult> {
    // Audit FIRST — the decision is recorded regardless of mutation outcome.
    try {
      await auditLog({
        action: "deck_tap_decision",
        actor: tenant ? `tenant:${tenant}` : "jack@day14",
        actor_source: "cowork",
        details: { kind, id, decision, tenant },
      });
    } catch {
      /* best-effort */
    }
    return kind === "todo" ? handleTodo(tenant, id, decision) : handleTap(tenant, id, decision);
  }
}

/** Map a daemon name to its owning tenant when the name embeds a known slug. */
function guessTenant(name: string): string | undefined {
  const m = name.match(/-(kennum-lawn-care|day14-realty|hot-flash-co|life-loophole|alignmd|splash-jacks)\b/);
  return m && m[1] ? m[1] : undefined;
}

function isSafeFile(s: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(s) && !s.includes("..") && !s.includes("/");
}

interface TodoStore {
  todos: Array<{ id: string; seq: number; title: string; status: string; completed_at: string | null; tenant?: string; [k: string]: unknown }>;
  [k: string]: unknown;
}

async function handleTodo(tenant: string | null, id: string, decision: "approve" | "deny"): Promise<TapResult> {
  if (!existsSync(TODOS_FILE)) return { ok: false, message: "operator to-do list unavailable" };
  const store = parseJson<TodoStore>(await readSafe(TODOS_FILE));
  if (!store || !Array.isArray(store.todos)) return { ok: false, message: "could not read to-do list" };
  const n = parseInt(String(id).replace(/[^0-9]/g, ""), 10);
  const todo = store.todos.find((t) => t.id === id) || (Number.isNaN(n) ? undefined : store.todos.find((t) => t.seq === n));
  if (!todo) return { ok: false, message: `no to-do matching: ${id}` };
  // Tenant isolation: a scoped caller may only act on its own tenant's items.
  if (tenant !== null && (todo.tenant ?? null) !== tenant) return { ok: false, message: "not authorized for this item" };

  todo.status = decision === "approve" ? "done" : "dismissed";
  todo.completed_at = new Date().toISOString();
  try {
    await fs.writeFile(TODOS_FILE, JSON.stringify(store, null, 2));
  } catch {
    return { ok: false, message: "could not save the to-do list" };
  }
  try {
    const snapPath = path.join(STUDIO, "public/data/empire-state.json");
    if (existsSync(snapPath)) {
      const snap = parseJson<{ human_todos?: Array<{ id: string }> }>(await readSafe(snapPath));
      if (snap && Array.isArray(snap.human_todos)) {
        snap.human_todos = snap.human_todos.filter((t) => t.id !== todo.id);
        await fs.writeFile(snapPath, JSON.stringify(snap, null, 2));
      }
    }
  } catch {
    /* sync-empire-state reconciles later */
  }
  return { ok: true, message: decision === "approve" ? `Marked done: ${todo.title}` : `Dismissed: ${todo.title}` };
}

async function handleTap(tenant: string | null, id: string, decision: "approve" | "deny"): Promise<TapResult> {
  if (!isSafeFile(id)) return { ok: false, message: "invalid tap id" };
  const filePath = path.join(OUTBOX, id);
  if (!existsSync(filePath)) return { ok: false, message: `no tap file: ${id}` };
  const data = parseJson<Record<string, unknown>>(await readSafe(filePath));
  if (!data) return { ok: false, message: "could not read the tap" };
  if (tenant !== null && (data.tenant ?? null) !== tenant) return { ok: false, message: "not authorized for this item" };
  data.tap_required = false;
  data.resolved_at = new Date().toISOString();
  data.resolved_action = decision;
  data.resolved_by = tenant ? `tenant:${tenant}` : "jack-deck";
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch {
    return { ok: false, message: "could not save the tap" };
  }
  return { ok: true, message: decision === "approve" ? "Tap approved — decision recorded" : "Tap dismissed" };
}
