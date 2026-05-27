/**
 * admin-approvals.ts — server-side helpers that compute what is waiting on
 * Jack across the empire and per tenant.
 *
 * Two aggregators live here:
 *
 *   collectAllApprovals(state)
 *     The empire-wide queue powering /admin/inbox. Pulls from every source
 *     (operator to-dos, social, skill drafts, expansion requests, opportunity
 *     pitches), tags each item with the tenant slug it belongs to (or null
 *     for empire-level items), and sorts by urgency + age. The per-tenant
 *     Mission Control reuses this and filters by `tenant === slug` so the
 *     same items show up in both surfaces — single source of truth.
 *
 *   collectTenantApprovals(slug, openTodos)
 *     A narrower per-tenant slice (to-dos + social only) used by the
 *     "What's blocked" panel and KPI count on /admin/tenants/[slug]. Kept
 *     separate from the full empire view because that panel intentionally
 *     ignores empire-only surfaces.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { HumanTodo } from "@/lib/admin-state";
import type { loadEmpireState } from "@/lib/admin-state";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const STUDIO_DRAFTS = path.join(HOME, "Documents/studio/docs/seeds/skills/_drafts");
const EXPANSION_INBOX = path.join(BIZ, "_shared/expansion-requests");

export type ApprovalKind = "todo" | "social" | "skill" | "expansion" | "opportunity";

export interface ApprovalItem {
  /** Stable React key — unique across the whole queue. */
  key: string;
  /** Which write handler the API should run. */
  kind: ApprovalKind;
  /** The id the API resolves the item by. */
  id: string;
  /** Urgency bucket — drives grouping. */
  urgency: "high" | "normal" | "low";
  /** Short type label, e.g. "Operator to-do". */
  typeLabel: string;
  /** Display label for the business this belongs to. */
  business: string;
  /**
   * Tenant slug this item belongs to, or null for empire-level items
   * (skill drafts, expansion requests, opportunity pitches, empire to-dos).
   * Drives the tenant filter chips on /admin/inbox and the per-tenant
   * mini queue on /admin/tenants/[slug].
   */
  tenant: string | null;
  /** The headline. */
  title: string;
  /** Why it needs Jack. */
  reason: string;
  /** Optional longer preview text. */
  preview?: string;
  /** Minutes since the item appeared, for the meta line. */
  ageMin: number;
  /** Verb shown on the primary button. */
  approveLabel: string;
  /** Verb shown on the secondary button. */
  skipLabel: string;
  /** Telegram command that does the same thing — the hosted-copy fallback. */
  telegramHint?: string;
}

export interface TenantApprovalItem {
  /** Stable React key — unique within the tenant queue. */
  key: string;
  /** Which write handler the API would run if it had to. */
  kind: "todo" | "social";
  /** The id the API would resolve the item by. */
  id: string;
  /** Urgency bucket. */
  urgency: "high" | "normal" | "low";
  /** Short type label, e.g. "Operator to-do". */
  typeLabel: string;
  /** The headline. */
  title: string;
  /** Why it is sitting in the queue. */
  reason: string;
  /** Minutes since the item appeared. */
  ageMin: number;
}

function ageMinFrom(iso: string | undefined | null, now: number): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.round((now - t) / 60_000));
}

function clip(text: string, n: number): string {
  const trimmed = text.trim();
  return trimmed.length > n ? `${trimmed.slice(0, n)}…` : trimmed;
}

/**
 * Normalize a free-form `todo.tenant` field into either a real tenant slug
 * or null (for "no tenant" / empire-level). Some todos carry the literal
 * string "empire" rather than a real slug — those count as null here so
 * they fall into the Unassigned chip on the inbox filter.
 */
function todoTenantSlug(tenant: string | null | undefined): string | null {
  if (!tenant) return null;
  const t = tenant.trim();
  if (!t || t === "empire") return null;
  return t;
}

/**
 * The empire-wide approvals queue. Powers /admin/inbox and (filtered) the
 * per-tenant mini queue on /admin/tenants/[slug]. Every item is tagged
 * with `tenant` (a slug, or null for empire-level items) so the same set
 * can be sliced both ways without re-collecting.
 */
export async function collectAllApprovals(
  state: Awaited<ReturnType<typeof loadEmpireState>>
): Promise<ApprovalItem[]> {
  const items: ApprovalItem[] = [];
  const now = Date.now();

  // Map slug → display name so empire-level items that name a tenant can
  // surface a friendly label rather than the raw slug.
  const tenantNameBySlug = new Map<string, string>();
  for (const t of state.tenants) tenantNameBySlug.set(t.slug, t.display_name);

  // ── Open operator to-dos ─────────────────────────────────────────────────
  for (const todo of (state.human_todos || []).filter((t) => t.status === "open")) {
    const high = todo.priority === "high";
    const slug = todoTenantSlug(todo.tenant);
    items.push({
      key: `todo-${todo.id}`,
      kind: "todo",
      id: todo.id,
      urgency: high ? "high" : "normal",
      typeLabel: "Operator to-do",
      business: slug ? (tenantNameBySlug.get(slug) ?? slug) : "empire",
      tenant: slug,
      title: todo.title,
      reason: `Only you can do this — ${todo.category} task an agent filed and cannot finish itself.`,
      preview: todo.detail ? clip(todo.detail, 220) : undefined,
      ageMin: ageMinFrom(todo.created_at, now),
      approveLabel: "Mark done",
      skipLabel: "Dismiss",
      telegramHint: `done ${todo.seq}`,
    });
  }

  // ── Queued social posts ──────────────────────────────────────────────────
  for (const t of state.tenants) {
    const sqRoot = path.join(BIZ, t.slug, "social-queue");
    if (!existsSync(sqRoot)) continue;
    for (const platform of await fs.readdir(sqRoot).catch(() => [] as string[])) {
      const platformDir = path.join(sqRoot, platform);
      const files = (await fs.readdir(platformDir).catch(() => [] as string[]))
        .filter((f) => f.endsWith(".json"))
        .slice(0, 10);
      for (const f of files) {
        try {
          const data = JSON.parse(await fs.readFile(path.join(platformDir, f), "utf8"));
          if (data?.status !== "queued") continue;
          const postId: string = data.id || data.content?.slug || f.replace(/\.json$/, "");
          items.push({
            key: `social-${t.slug}-${postId}`,
            kind: "social",
            id: postId,
            urgency: "normal",
            typeLabel: `${platform} post`,
            business: t.display_name,
            tenant: t.slug,
            title: data.content?.slug || data.angle || postId,
            reason: "Queued content awaiting your sign-off before it can publish.",
            preview: clip(
              data.angle || data.content?.caption || data.content?.text || "",
              200
            ),
            ageMin: ageMinFrom(data.queued_at, now),
            approveLabel: "Approve",
            skipLabel: "Skip",
            telegramHint: `approve post ${postId}`,
          });
        } catch {
          /* skip unreadable queue file */
        }
      }
    }
  }

  // ── Skill drafts awaiting sign-off ───────────────────────────────────────
  if (existsSync(STUDIO_DRAFTS)) {
    const drafts = (await fs.readdir(STUDIO_DRAFTS, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
      .slice(0, 15);
    for (const d of drafts) {
      const skillMd = path.join(STUDIO_DRAFTS, d.name, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      const stat = await fs.stat(skillMd);
      const text = (await fs.readFile(skillMd, "utf8")).slice(0, 260);
      items.push({
        key: `skill-${d.name}`,
        kind: "skill",
        id: d.name,
        urgency: "low",
        typeLabel: "Skill draft",
        business: "empire",
        tenant: null,
        title: d.name,
        reason: "A new skill an agent drafted — approve to make it live, or skip.",
        preview: clip(text, 220),
        ageMin: ageMinFrom(stat.mtime.toISOString(), now),
        approveLabel: "Approve",
        skipLabel: "Skip",
        telegramHint: `approve ${d.name}`,
      });
    }
  }

  // ── Pending expansion requests ───────────────────────────────────────────
  if (existsSync(EXPANSION_INBOX)) {
    const files = (await fs.readdir(EXPANSION_INBOX).catch(() => [] as string[]))
      .filter((f) => f.endsWith(".json"))
      .slice(0, 15);
    for (const f of files) {
      try {
        const data = JSON.parse(await fs.readFile(path.join(EXPANSION_INBOX, f), "utf8"));
        if (data?.status !== "pending") continue;
        const isBusiness = data.type === "new-business";
        items.push({
          key: `expansion-${f}`,
          kind: "expansion",
          id: f,
          urgency: isBusiness ? "high" : "normal",
          typeLabel: isBusiness ? "New business request" : "Expansion request",
          business: "empire",
          tenant: null,
          title: isBusiness
            ? "Bootstrap a new business"
            : data.skill_name || "New skill request",
          reason: isBusiness
            ? "An agent flagged a new business to launch — needs your go-ahead."
            : "An expansion request waiting on your call.",
          preview: clip(
            data.description || JSON.stringify(data.extracted || {}),
            220
          ),
          ageMin: ageMinFrom(data.requested_at, now),
          approveLabel: "Approve",
          skipLabel: "Dismiss",
          telegramHint: isBusiness ? "bootstrap now" : undefined,
        });
      } catch {
        /* skip unreadable request file */
      }
    }
  }

  // ── Opportunity pitches awaiting a launch decision ───────────────────────
  for (const o of (state.opportunities || [])
    .filter((o) => o.pitched && o.status === "open")
    .slice(0, 15)) {
    items.push({
      key: `opportunity-${o.id}`,
      kind: "opportunity",
      id: o.id,
      urgency: "low",
      typeLabel: "Opportunity pitch",
      business: "empire",
      tenant: null,
      title: o.niche,
      reason: `Pitched idea (score ${o.total_score}) — approve to queue it for launch, or skip.`,
      preview: clip(o.rationale || "", 220),
      ageMin: 0,
      approveLabel: "Approve",
      skipLabel: "Skip",
      telegramHint: `bootstrap-pitch ${o.id}`,
    });
  }

  // High urgency first, then by age (newest first) within a bucket.
  const rank = { high: 0, normal: 1, low: 2 } as const;
  items.sort((a, b) => rank[a.urgency] - rank[b.urgency] || a.ageMin - b.ageMin);
  return items;
}

/**
 * Collect everything waiting on Jack for one tenant. Mirrors the inbox
 * aggregator but scoped — and only for sources that have a tenant scope.
 */
export async function collectTenantApprovals(
  slug: string,
  openTodos: HumanTodo[]
): Promise<TenantApprovalItem[]> {
  const items: TenantApprovalItem[] = [];
  const now = Date.now();

  // ── Open operator to-dos filed against this tenant ───────────────────────
  for (const todo of openTodos.filter((t) => t.tenant === slug)) {
    const high = todo.priority === "high";
    items.push({
      key: `todo-${todo.id}`,
      kind: "todo",
      id: todo.id,
      urgency: high ? "high" : "normal",
      typeLabel: "Operator to-do",
      title: todo.title || `Task #${todo.seq}`,
      reason: todo.detail
        ? clip(todo.detail, 200)
        : `Only you can do this — ${todo.category} task an agent filed.`,
      ageMin: ageMinFrom(todo.created_at, now),
    });
  }

  // ── Queued social posts under this tenant's social-queue tree ────────────
  const sqRoot = path.join(BIZ, slug, "social-queue");
  if (existsSync(sqRoot)) {
    const platforms = await fs.readdir(sqRoot).catch(() => [] as string[]);
    for (const platform of platforms) {
      const platformDir = path.join(sqRoot, platform);
      const files = (await fs.readdir(platformDir).catch(() => [] as string[]))
        .filter((f) => f.endsWith(".json"))
        .slice(0, 10);
      for (const f of files) {
        try {
          const raw = await fs.readFile(path.join(platformDir, f), "utf8");
          const data: {
            id?: string;
            status?: string;
            angle?: string;
            queued_at?: string;
            content?: { slug?: string; caption?: string; text?: string };
          } = JSON.parse(raw);
          if (data?.status !== "queued") continue;
          const postId: string =
            data.id || data.content?.slug || f.replace(/\.json$/, "");
          const preview = clip(
            data.angle || data.content?.caption || data.content?.text || "",
            160
          );
          items.push({
            key: `social-${slug}-${postId}`,
            kind: "social",
            id: postId,
            urgency: "normal",
            typeLabel: `${platform} post`,
            title: data.content?.slug || data.angle || postId,
            reason: preview
              ? `Queued ${platform} post — ${preview}`
              : `Queued ${platform} post awaiting your sign-off.`,
            ageMin: ageMinFrom(data.queued_at, now),
          });
        } catch {
          /* skip unreadable queue file */
        }
      }
    }
  }

  // High urgency first, then oldest first within a bucket.
  const rank: Record<TenantApprovalItem["urgency"], number> = {
    high: 0,
    normal: 1,
    low: 2,
  };
  items.sort(
    (a, b) => rank[a.urgency] - rank[b.urgency] || b.ageMin - a.ageMin
  );
  return items;
}
