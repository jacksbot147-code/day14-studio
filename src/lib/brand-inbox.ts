/**
 * brand-inbox.ts — write inbound brand-site submissions into the per-tenant
 * inbox tree at ~/Documents/businesses/<slug>/inbox/<ts>-<kind>.json.
 *
 * The unified Approvals queue (collectAllApprovals in admin-approvals.ts)
 * reads from these files so every contact, quote, subscribe, and checklist
 * request from a brand site lands in /admin/inbox tagged with the right
 * tenant.
 *
 * Writes are atomic (temp-then-rename) so concurrent submissions don't tear.
 * The tenant slug is guarded against path traversal — anything not matching
 * the safe-segment shape is rejected up-front.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");

export type BrandInboxKind = "contact" | "quote" | "subscribe" | "checklist";

export interface BrandInboxRecord {
  id: string;
  ts: string;
  kind: BrandInboxKind;
  tenant: string;
  payload: Record<string, unknown>;
  status: "open";
}

/** A safe, single path segment — blocks traversal in any caller-supplied id. */
function isSafeSegment(s: string): boolean {
  return /^[a-z0-9][a-z0-9._-]*$/i.test(s) && !s.includes("..") && !s.includes("/");
}

/**
 * Append a submission to a tenant's inbox. Best-effort: returns
 * { ok, id, error? } and never throws. The caller should still respond
 * 200 to the user regardless of inbox write success.
 */
export async function writeBrandInbox(input: {
  tenant: string;
  kind: BrandInboxKind;
  payload: Record<string, unknown>;
}): Promise<{ ok: boolean; id: string; error?: string }> {
  const tenant = (input.tenant || "").trim();
  const kind = input.kind;
  const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  if (!isSafeSegment(tenant)) {
    return { ok: false, id, error: "invalid tenant slug" };
  }
  if (kind !== "contact" && kind !== "quote" && kind !== "subscribe" && kind !== "checklist") {
    return { ok: false, id, error: "invalid kind" };
  }

  const inboxDir = path.join(BIZ, tenant, "inbox");
  const finalPath = path.join(inboxDir, `${id}-${kind}.json`);
  const tmpPath = `${finalPath}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

  const record: BrandInboxRecord = {
    id,
    ts: new Date().toISOString(),
    kind,
    tenant,
    payload: input.payload,
    status: "open",
  };

  try {
    await fs.mkdir(inboxDir, { recursive: true });
    await fs.writeFile(tmpPath, JSON.stringify(record, null, 2), { encoding: "utf8" });
    await fs.rename(tmpPath, finalPath);
    return { ok: true, id };
  } catch (err) {
    // Best-effort cleanup of any half-written temp file. We swallow this
    // failure too — the response to the user must still be 200.
    try {
      await fs.unlink(tmpPath);
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      id,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Build the absolute path to a tenant's inbox dir, or null if slug is unsafe. */
export function tenantInboxDir(tenant: string): string | null {
  if (!isSafeSegment(tenant)) return null;
  return path.join(BIZ, tenant, "inbox");
}

export const BRAND_INBOX_ROOT = BIZ;
