"use server";

/**
 * /admin/bulk-signoff server actions — Approve / Skip.
 *
 * Pattern mirrors `src/app/admin/ship/publish-action.ts`:
 *   - File is "use server"; ONLY async function exports are allowed (Next.js
 *     rule, hard-learned in the May 30 deploy chain). Shared types + the
 *     `inboxPath()` helper live in ./types.ts (no "use server").
 *   - Inbox mutations are inbox-only and reversible (admin can flip an item
 *     back to `awaiting-jack` from /admin/inbox).
 *   - Writes are atomic: temp-then-rename so a concurrent reader never sees
 *     a half-written JSON file.
 *   - Each mutation appends a single-line audit entry to WORK-LOG.md and
 *     calls `revalidatePath("/admin/bulk-signoff")` so the page re-renders
 *     with the new state on the next request.
 *
 * Hot-flash-co + kennum-lawn-care are excluded by tenant whitelist in
 * ./types.ts — calls referencing those tenants throw.
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { homedir } from "node:os";
import { revalidatePath } from "next/cache";
import {
  TENANTS,
  inboxPath,
  type InboxFile,
  type InboxItem,
  type SignoffStatus,
} from "./types";

/** Where the audit trail lives. Same file the rest of the admin appends to. */
const WORK_LOG = path.join(homedir(), "Documents/studio/WORK-LOG.md");

/** Validate a tenant slug against the whitelist. Throws on miss. */
function assertTenant(tenant: string): void {
  if (!(TENANTS as readonly string[]).includes(tenant)) {
    throw new Error(`Tenant not allowed for bulk-signoff: ${tenant}`);
  }
}

/**
 * Read tenant inbox JSON. Returns the parsed object. Throws if the file is
 * missing or malformed — the page's error boundary catches it and shows the
 * admin a useful message instead of a blank screen.
 */
async function readInbox(tenant: string): Promise<InboxFile> {
  const raw = await fs.readFile(inboxPath(tenant), "utf8");
  const parsed = JSON.parse(raw) as InboxFile;
  if (!Array.isArray(parsed.items)) {
    throw new Error(`Malformed inbox for ${tenant}: items[] missing`);
  }
  return parsed;
}

/**
 * Atomic write: stage to `<file>.<uuid>.tmp` in the same dir, then rename.
 * Same dir keeps the rename a single inode op so a concurrent reader either
 * sees the old file or the new file — never a half-written one.
 */
async function writeInboxAtomic(tenant: string, data: InboxFile): Promise<void> {
  const target = inboxPath(tenant);
  const tmp = `${target}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await fs.rename(tmp, target);
}

/**
 * Append a single-line audit entry. Best-effort: a work-log failure must
 * not undo the inbox mutation that already succeeded — log to console and
 * carry on.
 */
async function appendWorkLog(line: string): Promise<void> {
  try {
    await fs.appendFile(WORK_LOG, line.endsWith("\n") ? line : `${line}\n`, "utf8");
  } catch (err) {
    console.warn("bulk-signoff: WORK-LOG append failed", err);
  }
}

/**
 * Core mutation. Finds the item by id inside the tenant inbox, sets its
 * status, and atomic-writes the file back. Returns the previous status so
 * callers (and the audit line) can record what changed.
 */
async function setItemStatus(
  tenant: string,
  itemId: string,
  next: SignoffStatus,
): Promise<{ previous: string | undefined; title: string | undefined }> {
  assertTenant(tenant);

  const data = await readInbox(tenant);
  const idx = data.items.findIndex((i: InboxItem) => i.id === itemId);
  if (idx === -1) {
    throw new Error(`Item not found in ${tenant} inbox: ${itemId}`);
  }
  const existing = data.items[idx];
  if (!existing) {
    // Defensive: findIndex returned >=0 so this is unreachable, but the
    // noUncheckedIndexedAccess compiler option requires the explicit guard.
    throw new Error(`Item vanished mid-mutation in ${tenant} inbox: ${itemId}`);
  }
  const previous = existing.status as string | undefined;
  const title = existing.title as string | undefined;
  data.items[idx] = { ...existing, status: next };
  await writeInboxAtomic(tenant, data);
  return { previous, title };
}

/**
 * Approve an inbox item — flips status to "approved". Inbox-only: even an
 * approved item still waits for Jack's final publish tap on the per-kind
 * surface (constraint from overnight plan §Standing constraints).
 */
export async function approveItem(tenant: string, itemId: string): Promise<void> {
  const { previous, title } = await setItemStatus(tenant, itemId, "approved");
  await appendWorkLog(
    `- ${new Date().toISOString()} bulk-signoff approve tenant=${tenant} id=${itemId} ` +
      `prev=${previous ?? "none"} → approved` +
      (title ? `  (${title})` : ""),
  );
  revalidatePath("/admin/bulk-signoff");
}

/**
 * Skip (dismiss) an inbox item — flips status to "dismissed". Reversible:
 * admin can re-open the per-kind surface and set it back to awaiting-jack.
 */
export async function skipItem(tenant: string, itemId: string): Promise<void> {
  const { previous, title } = await setItemStatus(tenant, itemId, "dismissed");
  await appendWorkLog(
    `- ${new Date().toISOString()} bulk-signoff skip   tenant=${tenant} id=${itemId} ` +
      `prev=${previous ?? "none"} → dismissed` +
      (title ? `  (${title})` : ""),
  );
  revalidatePath("/admin/bulk-signoff");
}
