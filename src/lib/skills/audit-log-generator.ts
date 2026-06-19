/**
 * audit-log-generator — hand-coded impl.
 *
 * Append-only audit log with per-day hash chain for tamper detection.
 * Logs are stored at ~/Documents/businesses/_shared/audit/audit-{YYYY-MM}.jsonl.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import crypto from "node:crypto";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";

// AUDIT_DIR is derived per-call (not cached at module load) so tests that
// swap process.env.HOME between cases — and any future HOME relocation — are
// honored. homedir() reads $HOME on POSIX.
function auditDir(): string {
  return path.join(homedir(), "Documents/businesses/_shared/audit");
}

/**
 * In-process append lock. auditLog() does read-prevHash → compute → append
 * with `await` points in between; ~30 skills call it concurrently in the same
 * event loop, so two interleaved calls could read the SAME prevHash and append
 * sibling entries that share a prev_hash — silently breaking the very hash
 * chain this skill exists to protect (spec hard rule 6; "chain integrity
 * fails" is a P0 failure mode). Serializing the critical section closes that
 * race. Single-process only — cross-process writers would still need a
 * file lock, but Day14 OS writes the audit log from one runtime.
 */
let appendLock: Promise<unknown> = Promise.resolve();
function withAppendLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = appendLock.then(fn, fn);
  // Keep the chain alive regardless of this call's outcome.
  appendLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export interface AuditEntry {
  action: string; // refund_issued, dns_change, etc.
  actor: string; // jack@day14 or automated:{skill_name}
  customer_slug?: string;
  details?: Record<string, unknown>;
  skill_invoked?: string;
  actor_source?: string; // telegram, webhook, cowork, scheduled
}

/**
 * Append a single audit entry. Computes the file's running hash chain.
 * Safe to call from any other skill — this is the primary export.
 */
export async function auditLog(entry: AuditEntry): Promise<{
  ok: boolean;
  path: string;
  hash: string;
  error?: string;
}> {
  // Serialize the entire read-modify-append so concurrent callers can't race
  // on prevHash and fork the chain. See withAppendLock above.
  return withAppendLock(async () => {
    try {
      const AUDIT_DIR = auditDir();
      await fs.mkdir(AUDIT_DIR, { recursive: true });
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM
      const filePath = path.join(AUDIT_DIR, `audit-${month}.jsonl`);

      // Compute hash chain: previous entry's hash + this entry's content
      let prevHash = "0".repeat(64);
      if (existsSync(filePath)) {
        const text = await fs.readFile(filePath, "utf8");
        const lines = text.trim().split("\n").filter(Boolean);
        const last = lines[lines.length - 1];
        if (last) {
          try {
            const parsed = JSON.parse(last) as { hash?: string };
            if (parsed.hash) prevHash = parsed.hash;
          } catch {
            // fall through
          }
        }
      }

      const record = {
        timestamp: new Date().toISOString(),
        ...entry,
        prev_hash: prevHash,
      };
      const recordJson = JSON.stringify(record);
      const hash = crypto
        .createHash("sha256")
        .update(recordJson + prevHash)
        .digest("hex");
      const final = { ...record, hash };

      await fs.appendFile(filePath, JSON.stringify(final) + "\n", "utf8");

      return { ok: true, path: filePath, hash };
    } catch (err) {
      return {
        ok: false,
        path: "",
        hash: "",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
}

/**
 * Verify the chain integrity of a month's audit log.
 */
export async function verifyChain(
  month?: string
): Promise<{ ok: boolean; entries: number; broken_at?: number; reason?: string }> {
  const m = month || new Date().toISOString().slice(0, 7);
  const filePath = path.join(auditDir(), `audit-${m}.jsonl`);
  if (!existsSync(filePath)) {
    return { ok: false, entries: 0, reason: "file does not exist" };
  }

  const text = await fs.readFile(filePath, "utf8");
  const lines = text.trim().split("\n").filter(Boolean);
  let prev = "0".repeat(64);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    try {
      const entry = JSON.parse(line) as {
        hash: string;
        prev_hash: string;
      };
      if (entry.prev_hash !== prev) {
        return {
          ok: false,
          entries: i,
          broken_at: i,
          reason: `prev_hash mismatch at entry ${i}`,
        };
      }
      // Recompute hash from entry sans the hash field
      const { hash: _hash, ...rest } = entry;
      const expected = crypto
        .createHash("sha256")
        .update(JSON.stringify(rest) + prev)
        .digest("hex");
      if (expected !== entry.hash) {
        return {
          ok: false,
          entries: i,
          broken_at: i,
          reason: `hash mismatch at entry ${i} — tampering detected`,
        };
      }
      prev = entry.hash;
    } catch (err) {
      return {
        ok: false,
        entries: i,
        broken_at: i,
        reason: `parse error at entry ${i}: ${err}`,
      };
    }
  }

  return { ok: true, entries: lines.length };
}

export interface ChainReport {
  ok: boolean; // every month intact
  total_entries: number;
  months: Array<{
    month: string;
    ok: boolean;
    entries: number;
    reason?: string;
  }>;
  last_entry?: { timestamp: string; action: string; detail?: string };
}

/**
 * Verify every monthly log file and summarize. This is what the nightly
 * 03:00 integrity check and the `/audit` command run — verifyChain() alone
 * only covers a single month. A single broken month flips ok=false (P0).
 */
export async function verifyAllChains(): Promise<ChainReport> {
  const AUDIT_DIR = auditDir();
  const files = (await fs.readdir(AUDIT_DIR).catch(() => []))
    .filter((f) => f.startsWith("audit-") && f.endsWith(".jsonl"))
    .sort();

  const months: ChainReport["months"] = [];
  let total = 0;
  let allOk = true;

  for (const file of files) {
    const month = file.slice("audit-".length, -".jsonl".length);
    const v = await verifyChain(month);
    months.push({ month, ok: v.ok, entries: v.entries, reason: v.reason });
    total += v.entries;
    if (!v.ok) allOk = false;
  }

  // Last entry across the most recent month, for the report footer.
  let last: ChainReport["last_entry"];
  const latest = files[files.length - 1];
  if (latest) {
    const text = await fs
      .readFile(path.join(AUDIT_DIR, latest), "utf8")
      .catch(() => "");
    const lines = text.trim().split("\n").filter(Boolean);
    const lastLine = lines.at(-1);
    if (lastLine) {
      try {
        const e = JSON.parse(lastLine) as Record<string, unknown>;
        last = {
          timestamp: String(e.timestamp ?? ""),
          action: String(e.action ?? "unknown"),
          detail:
            (e.customer_slug as string | undefined) ??
            (e.domain as string | undefined),
        };
      } catch {
        // ignore malformed tail
      }
    }
  }

  return { ok: allOk, total_entries: total, months, last_entry: last };
}

/**
 * Render a ChainReport in the spec's "🔒 Audit log integrity" format.
 */
export function formatIntegrityReport(report: ChainReport): string {
  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`🔒 Audit log integrity: ${today}`);
  lines.push("");
  lines.push(`Files: ${report.months.length} monthly logs`);
  lines.push(`Entries: ${report.total_entries.toLocaleString()} total`);
  lines.push("");
  if (report.months.length === 0) {
    lines.push("No audit logs found yet.");
    return lines.join("\n");
  }
  lines.push("Chain verification:");
  for (const m of report.months) {
    const mark = m.ok ? "✓ hash chain intact" : `✗ BROKEN — ${m.reason}`;
    lines.push(`  ${m.month}: ${mark} (${m.entries} entries)`);
  }
  if (report.last_entry) {
    lines.push("");
    const detail = report.last_entry.detail
      ? `, ${report.last_entry.detail}`
      : "";
    lines.push(
      `Last entry: ${report.last_entry.timestamp} (${report.last_entry.action}${detail})`
    );
  }
  if (!report.ok) {
    lines.push("");
    lines.push("⚠️  P0: chain integrity FAILED — investigate immediately.");
  }
  return lines.join("\n");
}

/**
 * Search the audit log. Returns matching entries.
 */
export async function searchAudit(
  query: { actor?: string; action?: string; customer_slug?: string; since?: string },
  limit = 50
): Promise<Array<Record<string, unknown>>> {
  const AUDIT_DIR = auditDir();
  const months = await fs.readdir(AUDIT_DIR).catch(() => []);
  const results: Array<Record<string, unknown>> = [];

  for (const file of months.sort().reverse()) {
    if (!file.startsWith("audit-") || !file.endsWith(".jsonl")) continue;
    const text = await fs.readFile(path.join(AUDIT_DIR, file), "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as Record<string, unknown>;
        if (query.actor && entry.actor !== query.actor) continue;
        if (query.action && entry.action !== query.action) continue;
        if (query.customer_slug && entry.customer_slug !== query.customer_slug)
          continue;
        if (
          query.since &&
          new Date(entry.timestamp as string) < new Date(query.since)
        )
          continue;
        results.push(entry);
        if (results.length >= limit) return results;
      } catch {
        // skip malformed
      }
    }
  }

  return results;
}

/**
 * run() — dispatched three ways (see spec "When invoked"):
 *   - log:    ctx.inputs carries an AuditEntry ({action, actor, ...}) → append.
 *   - search: ctx.inputs.mode === "search" (or any search filter present) →
 *             searchAudit, e.g. `/audit refund-handler`.
 *   - verify: anything else, including the bare `/audit` command and the
 *             nightly 03:00 integrity check → verifyAllChains + report.
 *
 * Previously this was log-only, so the `/audit` Telegram command and the
 * nightly check both dead-ended on "missing required fields: action + actor".
 */
const SKILL = "audit-log-generator";

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = (ctx.inputs ?? {}) as Record<string, unknown>;
  const mode = inputs.mode as string | undefined;

  // Log mode: a real AuditEntry was passed.
  if (mode === "log" || (inputs.action && inputs.actor)) {
    const entry = inputs as unknown as AuditEntry;
    if (!entry.action || !entry.actor) {
      return {
        ok: false,
        skill: SKILL,
        path: "hand-coded",
        error: "missing required fields: action + actor",
      };
    }
    try {
      const result = await auditLog(entry);
      return {
        ok: result.ok,
        skill: SKILL,
        path: "hand-coded",
        result,
        artifacts: result.ok ? [result.path] : [],
        error: result.error,
      };
    } catch (err) {
      return {
        ok: false,
        skill: SKILL,
        path: "hand-coded",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Search mode: a query was provided (mode flag or any filter field).
  const hasFilter =
    inputs.actor || inputs.action || inputs.customer_slug || inputs.since;
  if (mode === "search" || hasFilter) {
    try {
      const matches = await searchAudit(
        {
          actor: inputs.actor as string | undefined,
          action: inputs.action as string | undefined,
          customer_slug:
            (inputs.customer_slug as string | undefined) ?? ctx.customer_slug,
          since: inputs.since as string | undefined,
        },
        typeof inputs.limit === "number" ? inputs.limit : 50
      );
      return {
        ok: true,
        skill: SKILL,
        path: "hand-coded",
        result: { mode: "search", count: matches.length, matches },
      };
    } catch (err) {
      return {
        ok: false,
        skill: SKILL,
        path: "hand-coded",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Verify mode (default): nightly integrity check + bare `/audit`.
  try {
    const report = await verifyAllChains();
    return {
      ok: report.ok,
      skill: SKILL,
      path: "hand-coded",
      result: { mode: "verify", report, text: formatIntegrityReport(report) },
      // A broken chain is a P0, not a crash — surface the report but flag it.
      error: report.ok ? undefined : "chain integrity FAILED — see report",
    };
  } catch (err) {
    return {
      ok: false,
      skill: SKILL,
      path: "hand-coded",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
