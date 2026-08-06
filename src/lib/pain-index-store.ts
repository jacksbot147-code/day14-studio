/**
 * File IO for the pain index. All fs lives here so `pain-index.ts` stays pure
 * and unit-testable without a filesystem.
 *
 * A source that cannot be read is reported in `unread_sources` rather than
 * silently treated as healthy — a gap must never look like an all-clear.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type {
  HeartbeatInput,
  LedgerInput,
  LoopGateConfigInput,
  LoopGateStateInput,
  OpsPulseInput,
  PainIndex,
  PainInputs,
  RadarInput,
  SyncInput,
  WorkRegisterInput,
} from "./pain-index";

const OPS_DIR = path.join(process.cwd(), "public", "data", "ops");
const SHARED = path.join(homedir(), "Documents/businesses/_shared");

export const PAIN_INDEX_PATH = path.join(OPS_DIR, "pain-index.json");

async function readJson<T>(p: string): Promise<{ value: T | null; missing: boolean }> {
  try {
    return { value: JSON.parse(await fs.readFile(p, "utf8")) as T, missing: false };
  } catch (err) {
    const missing = (err as NodeJS.ErrnoException)?.code === "ENOENT";
    return { value: null, missing };
  }
}

/** Last line's timestamp + count, without loading the whole file into objects. */
async function readWorkRegister(): Promise<{ value: WorkRegisterInput | null; missing: boolean }> {
  const p = path.join(SHARED, "growth/work-register.jsonl");
  try {
    const text = await fs.readFile(p, "utf8");
    const lines = text.split("\n").filter(Boolean);
    let last: string | null = null;
    for (let i = lines.length - 1; i >= 0 && last === null; i--) {
      try {
        const parsed = JSON.parse(lines[i]!) as { timestamp?: string };
        if (parsed.timestamp) last = parsed.timestamp;
      } catch {
        /* skip malformed trailing line */
      }
    }
    return { value: { count: lines.length, last_timestamp: last }, missing: false };
  } catch (err) {
    return { value: null, missing: (err as NodeJS.ErrnoException)?.code === "ENOENT" };
  }
}

/** Heartbeat age by file mtime — CLAUDE.md prime directive 5 says mtime only. */
async function readHeartbeats(now: Date): Promise<{ value: HeartbeatInput[] | null; missing: boolean }> {
  const dir = path.join(SHARED, "poller");
  try {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith("-heartbeat.log"));
    const out: HeartbeatInput[] = [];
    for (const f of files) {
      try {
        const st = await fs.stat(path.join(dir, f));
        out.push({
          name: f.replace("-heartbeat.log", ""),
          age_min: Math.round((now.getTime() - st.mtimeMs) / 60000),
        });
      } catch {
        /* vanished mid-scan */
      }
    }
    return { value: out, missing: false };
  } catch (err) {
    return { value: null, missing: (err as NodeJS.ErrnoException)?.code === "ENOENT" };
  }
}

/** How many scripts import the loop gate — a gate wired nowhere gates nothing. */
async function countLoopGateImports(): Promise<number> {
  const roots = [path.join(process.cwd(), "scripts"), path.join(process.cwd(), "scripts", "_generic")];
  const seen = new Set<string>();
  for (const root of roots) {
    let files: string[];
    try {
      files = await fs.readdir(root);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith(".mjs")) continue;
      const full = path.join(root, f);
      try {
        const text = await fs.readFile(full, "utf8");
        if (/from\s+["'][^"']*loop-gate\.mjs["']/.test(text) && !full.endsWith("loop-gate.mjs")) {
          seen.add(full);
        }
      } catch {
        /* unreadable */
      }
    }
  }
  return seen.size;
}

/** Gather every source. Missing files are recorded, never assumed healthy. */
export async function gatherPainInputs(now: Date = new Date()): Promise<PainInputs> {
  const unread: string[] = [];

  const ledger = await readJson<LedgerInput>(path.join(OPS_DIR, ".llm-ledger.json"));
  if (ledger.value === null) unread.push(".llm-ledger.json");

  const cfg = await readJson<LoopGateConfigInput>(path.join(OPS_DIR, ".loop-gate.json"));
  if (cfg.value === null) unread.push(".loop-gate.json");

  // Absence here is a FINDING (the gate has never run), not an unread source,
  // so it is deliberately not pushed to `unread`.
  const state = await readJson<LoopGateStateInput>(path.join(OPS_DIR, ".loop-gate-state.json"));

  const radar = await readJson<RadarInput>(path.join(OPS_DIR, "tech-radar.json"));
  if (radar.value === null) unread.push("tech-radar.json");

  const sync = await readJson<SyncInput>(path.join(SHARED, "ops/empire-sync.json"));
  if (sync.value === null && !sync.missing) unread.push("empire-sync.json");

  const register = await readWorkRegister();
  if (register.value === null) unread.push("work-register.jsonl");

  const heartbeats = await readHeartbeats(now);
  if (heartbeats.value === null) unread.push("poller heartbeats");

  // The business pulse. Absent means ops-pulse has never run — reported as
  // unread so the revenue rules going quiet is never mistaken for good news.
  const pulse = await readJson<OpsPulseInput>(path.join(OPS_DIR, "ops-pulse.json"));
  if (pulse.value === null) unread.push("ops-pulse.json (never generated?)");

  return {
    now,
    ledger: ledger.value,
    loopGateConfig: cfg.value,
    loopGateState: state.value,
    loopGateWiredInto: await countLoopGateImports(),
    workRegister: register.value,
    heartbeats: heartbeats.value,
    sync: sync.value,
    radar: radar.value,
    opsPulse: pulse.value,
    unreadSources: unread,
  };
}

export async function readPainIndex(): Promise<PainIndex | null> {
  const r = await readJson<PainIndex>(PAIN_INDEX_PATH);
  return r.value;
}

/** Atomic overwrite. One file, always — never a dated snapshot directory. */
export async function writePainIndex(index: PainIndex): Promise<void> {
  await fs.mkdir(OPS_DIR, { recursive: true });
  const tmp = `${PAIN_INDEX_PATH}.tmp-${process.pid}`;
  await fs.writeFile(tmp, JSON.stringify(index, null, 2) + "\n", "utf8");
  await fs.rename(tmp, PAIN_INDEX_PATH);
}
