/**
 * Shared types + constants for /admin/bulk-signoff.
 *
 * Lives in a sibling file (no `"use server"`) because Next.js Server Action
 * files (actions.ts) can only export async functions — no constants, no
 * types. Both actions.ts and page.tsx import from here.
 *
 * Lesson learned from the May 30 deploy chain: keeping the "use server"
 * surface async-only is the hard rule that broke prod last time.
 */

import path from "node:path";
import { homedir } from "node:os";

/** Tenants whose inboxes the bulk-signoff page reads + writes. */
export const TENANTS = ["day14", "day14-realty", "alignmd", "life-loophole"] as const;
export type Tenant = (typeof TENANTS)[number];

/**
 * The pick-kinds the bulk-signoff page surfaces. Excludes hot-flash + kennum
 * per the standing constraint (they aren't authored as inbox tenants anyway).
 */
export const SIGNOFF_KINDS = [
  "headline-pick",
  "hero-image-pick",
  "og-card-pick",
  "social-variant-pick",
  "cs-body-pick",
  "subject-line-pick",
  "brand-hero-pick",
  "landing-headline-pick",
] as const;
export type SignoffKind = (typeof SIGNOFF_KINDS)[number];

/** Statuses bulk-signoff writes. Inbox-only mutations — reversible by admin. */
export type SignoffStatus =
  | "awaiting-jack"
  | "approved"
  | "dismissed";

/**
 * Minimal item shape the page + actions rely on. Each tenant inbox JSON has
 * extra per-kind fields (variants_file, candidates, etc.) — those pass
 * through untouched. We only read/write the status + id.
 */
export interface InboxItem {
  id: string;
  kind: string;
  tenant?: string;
  title?: string;
  summary?: string;
  status?: SignoffStatus | string;
  priority?: "low" | "medium" | "high" | string;
  created_at?: string;
  // Per-kind passthrough fields — we don't enumerate them.
  [key: string]: unknown;
}

export interface InboxFile {
  schema_version?: number;
  tenant?: string;
  generated_at?: string;
  generated_by?: string;
  items: InboxItem[];
}

/**
 * Absolute path to a tenant's inbox JSON. Centralised so the page + actions
 * can never disagree about where to read/write.
 */
export function inboxPath(tenant: string): string {
  if (!/^[a-z0-9-]+$/i.test(tenant)) {
    throw new Error(`Invalid tenant slug: ${tenant}`);
  }
  return path.join(
    homedir(),
    "Documents/studio/public/data/inboxes",
    `${tenant}.json`,
  );
}
