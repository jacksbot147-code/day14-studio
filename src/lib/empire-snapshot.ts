import fs from "node:fs/promises";
import path from "node:path";

/**
 * Marketing-side reader for `public/data/empire-state.json` — the same
 * snapshot the /admin cockpit consumes, projected down to what the public
 * marketing site actually wants to show. Read at request time on
 * `force-dynamic` pages; safe to call on every render.
 *
 * Falls back to a sensible empty snapshot when the file is missing or
 * malformed (the marketing site must still render on a fresh checkout).
 */

export interface BattleLogEntry {
  ts: string;
  tenant: string;
  actor: string;
  action: string;
}

export interface EmpireSnapshot {
  generated_at: string;
  tenant_count: number;
  agent_count_healthy: number;
  agent_count_total: number;
  runs_24h: number;
  recent: BattleLogEntry[];
}

const EMPTY: EmpireSnapshot = {
  generated_at: "",
  tenant_count: 0,
  agent_count_healthy: 0,
  agent_count_total: 0,
  runs_24h: 0,
  recent: [],
};

interface RawState {
  generated_at?: string;
  tenants?: unknown[];
  heartbeats?: Array<{ status?: string }>;
  empire_battle_log?: Array<{ ts?: string; tenant?: string; actor?: string; action?: string }>;
}

export async function loadEmpireSnapshot(): Promise<EmpireSnapshot> {
  try {
    const file = path.join(process.cwd(), "public/data/empire-state.json");
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as RawState;

    const log = Array.isArray(raw.empire_battle_log) ? raw.empire_battle_log : [];
    const dayAgo = Date.now() - 86_400_000;
    let runs24h = 0;
    for (const e of log) {
      if (typeof e.ts === "string" && new Date(e.ts).getTime() >= dayAgo) runs24h++;
    }

    const beats = Array.isArray(raw.heartbeats) ? raw.heartbeats : [];
    const healthy = beats.filter((h) => h.status === "healthy").length;

    const recent: BattleLogEntry[] = log
      .filter(
        (e): e is BattleLogEntry =>
          typeof e.ts === "string" &&
          typeof e.tenant === "string" &&
          typeof e.actor === "string" &&
          typeof e.action === "string",
      )
      .slice(0, 14);

    return {
      generated_at: typeof raw.generated_at === "string" ? raw.generated_at : "",
      tenant_count: Array.isArray(raw.tenants) ? raw.tenants.length : 0,
      agent_count_healthy: healthy,
      agent_count_total: beats.length,
      runs_24h: runs24h,
      recent,
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Plain-English action label. Strips the technical scout/orchestrator/poll
 * verbs into something a marketing visitor reads as "a thing happened".
 */
export function describeAction(entry: BattleLogEntry): string {
  const a = entry.action.replace(/_/g, " ");
  // Map common verbs to friendlier marketing phrasings.
  const map: Record<string, string> = {
    "scout run": "scouted properties",
    "queue built": "queued content",
    "pipeline completed": "shipped a content pipeline",
    "fatal error": "flagged itself for restart",
    "drafted": "drafted a piece",
    "publish": "queued for publish",
  };
  return map[a] ?? a;
}

/** Relative-time label for marketing-side timestamps. */
export function relativeAge(iso: string): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}
