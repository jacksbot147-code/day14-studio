/**
 * File IO for the tech radar and the other AI-ops JSON files the dashboard reads.
 *
 * Kept apart from `tech-radar.ts` so the rule engine stays pure and testable
 * without touching a filesystem.
 *
 * Writes are atomic (tmp + rename) because the weekly scan reads this file
 * through the repo's raw URL and a torn write would poison the delta baseline.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { RADAR_RINGS, type RadarRing, type RadarItem, type TechRadar } from "./tech-radar";

export const OPS_DIR = path.join(process.cwd(), "public", "data", "ops");
export const RADAR_PATH = path.join(OPS_DIR, "tech-radar.json");
export const LEDGER_PATH = path.join(OPS_DIR, ".llm-ledger.json");
export const LOOP_GATE_PATH = path.join(OPS_DIR, ".loop-gate.json");

function emptyRadar(): TechRadar {
  const rings = {} as Record<RadarRing, RadarItem[]>;
  for (const r of RADAR_RINGS) rings[r] = [];
  return {
    schema: 2,
    title: "Day14 Tech Radar",
    purpose: "Delta baseline for the weekly tech scan.",
    updated: "",
    rules_for_changing_a_ring: [],
    rings,
    changelog: [],
  };
}

/** Read the radar. Returns null when the file is missing or unparseable — the
 *  dashboard renders that state explicitly rather than showing a fake radar. */
export async function readRadar(): Promise<TechRadar | null> {
  try {
    const text = await fs.readFile(RADAR_PATH, "utf8");
    const parsed = JSON.parse(text) as Partial<TechRadar>;
    const base = emptyRadar();
    const rings = {} as Record<RadarRing, RadarItem[]>;
    for (const r of RADAR_RINGS) {
      const list = parsed.rings?.[r];
      rings[r] = Array.isArray(list) ? list : [];
    }
    return {
      ...base,
      ...parsed,
      rings,
      changelog: Array.isArray(parsed.changelog) ? parsed.changelog : [],
      rules_for_changing_a_ring: Array.isArray(parsed.rules_for_changing_a_ring)
        ? parsed.rules_for_changing_a_ring
        : [],
    };
  } catch {
    return null;
  }
}

/** Atomic write. Pretty-printed so the git diff of a ring move is readable. */
export async function writeRadar(radar: TechRadar): Promise<void> {
  await fs.mkdir(OPS_DIR, { recursive: true });
  const tmp = `${RADAR_PATH}.tmp-${process.pid}`;
  await fs.writeFile(tmp, JSON.stringify(radar, null, 2) + "\n", "utf8");
  await fs.rename(tmp, RADAR_PATH);
}

/* ------------------------------------------------------------- LLM ledger */

export interface LedgerDay {
  calls: number;
  ok: number;
  failed: number;
  tokens_in: number;
  tokens_out: number;
  tokens_cache_read: number;
  tokens_cache_write: number;
  est_cost_usd: number;
  by_provider?: Record<
    string,
    { calls: number; ok: number; failed: number; est_cost_usd: number }
  >;
}

export interface LlmLedger {
  schema?: number;
  updated_at?: string;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  last_failure_error?: string | null;
  consecutive_failures?: number;
  days?: Record<string, LedgerDay>;
  last_agent?: string;
}

export async function readLedger(): Promise<LlmLedger | null> {
  try {
    return JSON.parse(await fs.readFile(LEDGER_PATH, "utf8")) as LlmLedger;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------- loop gate */

export interface LoopGateLoop {
  note?: string;
  max_noop_runs?: number;
  watch?: string[];
  exclude?: string[];
}

export interface LoopGate {
  default_max_noop_runs?: number;
  loops?: Record<string, LoopGateLoop>;
}

export async function readLoopGate(): Promise<LoopGate | null> {
  try {
    return JSON.parse(await fs.readFile(LOOP_GATE_PATH, "utf8")) as LoopGate;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------- radar mtime */

/** When the radar file itself last changed on disk. This is what the
 *  `tech-radar` loop gate watches, so it is the honest "did the scan do
 *  anything" signal — not the presence of a report. */
export async function radarLastChanged(): Promise<Date | null> {
  if (!existsSync(RADAR_PATH)) return null;
  try {
    const st = await fs.stat(RADAR_PATH);
    return st.mtime;
  } catch {
    return null;
  }
}
