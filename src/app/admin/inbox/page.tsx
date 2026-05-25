import { loadEmpireState } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import { ApprovalsQueue, type ApprovalItem } from "./approvals-queue";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

export const metadata = {
  title: "Approvals — Day14 Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * /admin/inbox — the unified Approvals queue.
 *
 * Initiative A1: one approval surface. Everything that needs Jack — from every
 * source — is aggregated here so nothing is ever lost, even with the Telegram
 * bridge down. The on-screen queue is the source of truth; the Approve / Skip
 * actions (in approvals-queue.tsx) write straight to the underlying state files
 * via /api/admin/approvals, using the same conventions the Telegram flow uses.
 *
 * Aggregated sources:
 *   - open operator to-dos    (empire-state.json human_todos)
 *   - queued social posts     (businesses/<t>/social-queue/<platform>/*.json)
 *   - skill drafts            (studio/docs/seeds/skills/_drafts/<name>)
 *   - expansion requests      (businesses/_shared/expansion-requests/*.json)
 *   - opportunity pitches     (empire-state.json opportunities, pitched + open)
 */

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const STUDIO_DRAFTS = path.join(HOME, "Documents/studio/docs/seeds/skills/_drafts");
const EXPANSION_INBOX = path.join(BIZ, "_shared/expansion-requests");

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

async function collectApprovals(
  state: Awaited<ReturnType<typeof loadEmpireState>>
): Promise<ApprovalItem[]> {
  const items: ApprovalItem[] = [];
  const now = Date.now();

  // ── Open operator to-dos ─────────────────────────────────────────────────
  for (const todo of (state.human_todos || []).filter((t) => t.status === "open")) {
    const high = todo.priority === "high";
    items.push({
      key: `todo-${todo.id}`,
      kind: "todo",
      id: todo.id,
      urgency: high ? "high" : "normal",
      typeLabel: "Operator to-do",
      business: todo.tenant || "empire",
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
    for (const platform of await fs.readdir(sqRoot).catch(() => [])) {
      const platformDir = path.join(sqRoot, platform);
      const files = (await fs.readdir(platformDir).catch(() => []))
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
    const files = (await fs.readdir(EXPANSION_INBOX).catch(() => []))
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

export default async function InboxPage() {
  const state = await loadEmpireState();
  const items = await collectApprovals(state);

  const counts = {
    high: items.filter((i) => i.urgency === "high").length,
    todo: items.filter((i) => i.kind === "todo").length,
    social: items.filter((i) => i.kind === "social").length,
    skill: items.filter((i) => i.kind === "skill").length,
    expansion: items.filter((i) => i.kind === "expansion").length,
    opportunity: items.filter((i) => i.kind === "opportunity").length,
  };

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="inbox" />
      <h1>Approvals queue</h1>
      <PageHint>
        Your single approvals queue — everything from every source that is
        waiting on a decision from you.
      </PageHint>
      <div className="sub">
        {items.length === 0
          ? "Every source checked — nothing is waiting on you."
          : `${items.length} ${items.length === 1 ? "item needs" : "items need"} you, from every source — one surface, works whether or not Telegram is up.`}
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        <div className="kpi">
          <div className="kpi-label">Urgent</div>
          <div className="kpi-value">{counts.high}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">To-dos</div>
          <div className="kpi-value">{counts.todo}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Posts</div>
          <div className="kpi-value">{counts.social}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Skills</div>
          <div className="kpi-value">{counts.skill}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Requests</div>
          <div className="kpi-value">{counts.expansion}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Pitches</div>
          <div className="kpi-value">{counts.opportunity}</div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <ApprovalsQueue items={items} />
      </div>
    </div>
  );
}
