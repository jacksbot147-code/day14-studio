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

const AUDIT_DIR = path.join(homedir(), "Documents/businesses/_shared/audit");

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
  try {
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
}

/**
 * Verify the chain integrity of a month's audit log.
 */
export async function verifyChain(
  month?: string
): Promise<{ ok: boolean; entries: number; broken_at?: number; reason?: string }> {
  const m = month || new Date().toISOString().slice(0, 7);
  const filePath = path.join(AUDIT_DIR, `audit-${m}.jsonl`);
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

/**
 * Search the audit log. Returns matching entries.
 */
export async function searchAudit(
  query: { actor?: string; action?: string; customer_slug?: string; since?: string },
  limit = 50
): Promise<Array<Record<string, unknown>>> {
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
 * Default run() — used when invoked via the dispatcher.
 * Expects ctx.inputs to contain an AuditEntry.
 */
export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const entry = ctx.inputs as AuditEntry | undefined;
  if (!entry || !entry.action || !entry.actor) {
    return {
      ok: false,
      skill: "audit-log-generator",
      path: "hand-coded",
      error: "missing required fields: action + actor",
    };
  }
  const result = await auditLog(entry);
  return {
    ok: result.ok,
    skill: "audit-log-generator",
    path: "hand-coded",
    result,
    artifacts: result.ok ? [result.path] : [],
    error: result.error,
  };
}
