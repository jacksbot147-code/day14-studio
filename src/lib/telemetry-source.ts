/**
 * telemetry-source — the read seam between the dashboard and where its
 * telemetry physically lives.
 *
 * WHY THIS EXISTS
 * ---------------
 * Today every `/dashboard` + `/admin` read goes straight to the local
 * filesystem on the mini (`~/Documents/businesses/_shared/...`,
 * work-register.jsonl, poller heartbeats, tenants.json). That is exactly why
 * `/admin` cannot run on Vercel as-is — Vercel has no access to that disk.
 *
 * The Supabase migration (see
 * `Obsidian-Vault/Admin Dashboard — Supabase Migration Spec.md`) will move that
 * telemetry into Postgres so a Vercel-hosted `/admin` can read it. To make that
 * swap a one-line change instead of a rewrite, every reader should eventually go
 * through this interface rather than calling `fs` directly.
 *
 * STATUS (item 6): this is the SEAM ONLY. It is additive and wires nothing.
 *   - `LocalFsTelemetrySource` wraps the CURRENT read paths verbatim, so its
 *     output matches what `dashboard/page.tsx#gatherStats()` already computes.
 *   - `SupabaseTelemetrySource` is a STUB that throws "not wired" — it documents
 *     the shape the Supabase impl must satisfy without pulling in any client.
 *   - The dashboard is NOT rewired yet. That cutover is its own Jack-tap step,
 *     specced in §5 of the migration note.
 *
 * Nothing here performs a write. Telemetry writes keep their existing seams
 * (`work-register.ts#logAction`, poller heartbeat appenders); the Supabase
 * *write* counterpart is `telemetry-sink.ts` in the migration spec, not this.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

import type { WorkEntry } from "./work-register";
import type { Tenant } from "./tenants";
import { getTenants as getTenantsLocal } from "./tenants";

// ---------------------------------------------------------------------------
// Shared paths — kept identical to dashboard/page.tsx so the local impl is a
// faithful wrapper of today's behavior.
// ---------------------------------------------------------------------------
const SHARED = path.join(homedir(), "Documents/businesses/_shared");
const WORK_REGISTER_PATH = path.join(SHARED, "growth/work-register.jsonl");
const POLLER_DIR = path.join(SHARED, "poller");

/** Default staleness window for a poller heartbeat (mirrors the dashboard). */
const DEFAULT_STALE_AFTER_MIN = 10;

// ---------------------------------------------------------------------------
// Read-model record shapes (the seam's public contract)
// ---------------------------------------------------------------------------

/**
 * One parsed line of work-register.jsonl. `logAction()` writes a `timestamp`
 * field alongside the `WorkEntry` body, so a read record is the union.
 */
export interface WorkRegisterRecord extends WorkEntry {
  timestamp: string;
}

/**
 * Health of a single poller, derived from its heartbeat file's last line.
 * `ageMin === Infinity` (and `lastBeat === null`) means "no heartbeat found".
 */
export interface HeartbeatRecord {
  name: string;
  /** Minutes since the last heartbeat line; Infinity if none. */
  ageMin: number;
  /** True when `ageMin` exceeds the staleness window. */
  stale: boolean;
  /** ISO timestamp of the last heartbeat line, or null. */
  lastBeat: string | null;
}

export interface GetWorkRegisterOptions {
  /** Cap on returned records, most-recent first. Omit for all. */
  limit?: number;
}

export interface GetHeartbeatsOptions {
  /** Minutes after which a heartbeat is considered stale. Default 10. */
  staleAfterMin?: number;
}

/**
 * The telemetry read contract. Both the local-FS impl (today) and the Supabase
 * impl (post-migration) satisfy this, so swapping is a one-line factory change.
 */
export interface TelemetrySource {
  /** Append-only agent-action log, newest first. */
  getWorkRegister(opts?: GetWorkRegisterOptions): Promise<WorkRegisterRecord[]>;
  /** Poller health derived from heartbeats. */
  getHeartbeats(opts?: GetHeartbeatsOptions): Promise<HeartbeatRecord[]>;
  /** The tenant registry, normalized (status/stage drift handled upstream). */
  getTenants(): Promise<Tenant[]>;
}

// ---------------------------------------------------------------------------
// Local filesystem implementation — wraps the CURRENT read paths.
// ---------------------------------------------------------------------------

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

export class LocalFsTelemetrySource implements TelemetrySource {
  async getWorkRegister(
    opts: GetWorkRegisterOptions = {}
  ): Promise<WorkRegisterRecord[]> {
    const text = (await readSafe(WORK_REGISTER_PATH)) || "";
    const records: WorkRegisterRecord[] = [];
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        records.push(JSON.parse(line) as WorkRegisterRecord);
      } catch {
        // Skip a malformed line rather than fail the whole read — the dashboard
        // already tolerates partial logs.
      }
    }
    // Newest first; the file is append-only chronological, so reverse.
    records.reverse();
    if (opts.limit != null && opts.limit >= 0) {
      return records.slice(0, opts.limit);
    }
    return records;
  }

  async getHeartbeats(
    opts: GetHeartbeatsOptions = {}
  ): Promise<HeartbeatRecord[]> {
    const staleAfter = opts.staleAfterMin ?? DEFAULT_STALE_AFTER_MIN;
    const out: HeartbeatRecord[] = [];
    for (const f of await lsSafe(POLLER_DIR)) {
      if (!f.endsWith("-heartbeat.log")) continue;
      const text = (await readSafe(path.join(POLLER_DIR, f))) || "";
      const lines = text.trim().split("\n").filter(Boolean);
      const last = lines[lines.length - 1];
      let ageMin = Infinity;
      let lastBeat: string | null = null;
      if (last) {
        const m = last.match(/^(\S+)/);
        if (m && m[1]) {
          const t = new Date(m[1]).getTime();
          if (!Number.isNaN(t)) {
            ageMin = Math.round((Date.now() - t) / 60000);
            lastBeat = m[1];
          }
        }
      }
      out.push({
        name: f.replace("-heartbeat.log", ""),
        ageMin,
        stale: ageMin > staleAfter,
        lastBeat,
      });
    }
    return out;
  }

  async getTenants(): Promise<Tenant[]> {
    // tenants.ts already owns the schema-drift normalizer + 30s cache.
    return getTenantsLocal();
  }
}

// ---------------------------------------------------------------------------
// Supabase implementation — STUB. Throws until the migration wires it.
// ---------------------------------------------------------------------------

const NOT_WIRED =
  "SupabaseTelemetrySource is not wired yet — see " +
  "Obsidian-Vault/Admin Dashboard — Supabase Migration Spec.md (items 5–6). " +
  "Use LocalFsTelemetrySource until cutover.";

export class SupabaseTelemetrySource implements TelemetrySource {
  // eslint-disable-next-line no-unused-vars
  async getWorkRegister(
    _opts?: GetWorkRegisterOptions
  ): Promise<WorkRegisterRecord[]> {
    throw new Error(NOT_WIRED);
  }

  // eslint-disable-next-line no-unused-vars
  async getHeartbeats(
    _opts?: GetHeartbeatsOptions
  ): Promise<HeartbeatRecord[]> {
    throw new Error(NOT_WIRED);
  }

  async getTenants(): Promise<Tenant[]> {
    throw new Error(NOT_WIRED);
  }
}

// ---------------------------------------------------------------------------
// Factory — selects the impl. Defaults to local-FS so existing behavior is
// unchanged. Flip to "supabase" only after the migration cutover.
// ---------------------------------------------------------------------------

export type TelemetryBackend = "local-fs" | "supabase";

/** Reads `TELEMETRY_SOURCE`; anything other than "supabase" → local-fs. */
export function resolveTelemetryBackend(): TelemetryBackend {
  return process.env.TELEMETRY_SOURCE === "supabase" ? "supabase" : "local-fs";
}

let _cached: TelemetrySource | null = null;

/**
 * The process-wide telemetry source. Memoized so callers share one instance.
 * No reader is wired to this yet — that cutover is a tracked Jack-tap step.
 */
export function getTelemetrySource(): TelemetrySource {
  if (_cached) return _cached;
  _cached =
    resolveTelemetryBackend() === "supabase"
      ? new SupabaseTelemetrySource()
      : new LocalFsTelemetrySource();
  return _cached;
}
