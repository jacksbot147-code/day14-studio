import Link from "next/link";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { loadEmpireState } from "@/lib/admin-state";
import { summarize, type LogEntry } from "@/lib/activity-summary";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";

export const metadata = {
  title: "Search — Day14 Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

/**
 * /admin/search — one unified search surface across the empire.
 *
 * Every admin page hosts a `<SearchBox>` in the nav that submits here.
 * The page is fully server-rendered: no client-side fetch of empire data.
 *
 * Aggregated kinds:
 *   - tenants            (slug / display_name / tagline)
 *   - operator to-dos    (title / detail / category)
 *   - approvals          (five-source aggregator replicated from /admin/inbox,
 *                         since `collectApprovals` there is not exported)
 *   - opportunities      (niche / rationale)
 *   - agents             (actor name from `empire_battle_log`)
 *   - recent activity    (last 100 log entries — action / actor / tenant)
 *
 * Ranking: per-token exact word > prefix > substring, summed across fields
 * with the title field weighted higher. Results are then grouped by kind so
 * the eye can scan one cluster at a time.
 *
 * All log/file content is rendered as plain text — instruction-like data is
 * never executed, only displayed.
 */

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const STUDIO_DRAFTS = path.join(HOME, "Documents/studio/docs/seeds/skills/_drafts");
const EXPANSION_INBOX = path.join(BIZ, "_shared/expansion-requests");

// Match the per-business overrides used elsewhere in the admin, so search
// links land on the dedicated page when one exists.
const SEGMENT_PAGES: Record<string, string> = {
  "day14-realty": "/admin/realty",
  alignmd: "/admin/alignmd",
};

function tenantHref(slug: string): string {
  return SEGMENT_PAGES[slug] || `/admin/tenants/${slug}`;
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

function rel(iso: string) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Score a single query token against a single field.
 *
 *   100 — exact word match (token sits on word boundaries in the text)
 *    50 — prefix match (some word in the text starts with the token)
 *    10 — substring match (anywhere in the text)
 *     0 — no match
 *
 * Token and text are both lowercased by the caller.
 */
function scoreTokenAgainstField(token: string, text: string): number {
  if (!token || !text) return 0;
  const t = text.toLowerCase();
  const tok = token.toLowerCase();
  const escaped = escapeRegex(tok);
  if (new RegExp(`\\b${escaped}\\b`).test(t)) return 100;
  if (new RegExp(`\\b${escaped}`).test(t)) return 50;
  if (t.includes(tok)) return 10;
  return 0;
}

interface ScoredField {
  /** The raw field text, used by `scoreTokenAgainstField`. */
  text: string;
  /** Multiplier — gives the title field more weight than body fields. */
  weight: number;
}

/**
 * Score a result by summing per-token per-field scores. A result must match
 * at least one field of at least one token to land on the page.
 */
function scoreResult(tokens: string[], fields: ScoredField[]): number {
  let total = 0;
  for (const tok of tokens) {
    let tokenBest = 0;
    for (const f of fields) {
      const s = scoreTokenAgainstField(tok, f.text);
      if (s * f.weight > tokenBest) tokenBest = s * f.weight;
    }
    total += tokenBest;
  }
  return total;
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Replicated five-source approvals aggregator ────────────────────────────
// Lifted from `src/app/admin/inbox/page.tsx`'s in-file `collectApprovals`,
// which is not exported. The shape exposed here is the subset the search
// surface needs (kind / id / urgency / title / preview / age / business);
// the inbox's stronger ApprovalItem type stays on the inbox.

type ApprovalKind = "todo" | "social" | "skill" | "expansion" | "opportunity";

interface ApprovalSearchItem {
  kind: ApprovalKind;
  id: string;
  urgency: "high" | "normal" | "low";
  typeLabel: string;
  business: string;
  title: string;
  preview: string;
  ageMin: number;
}

async function collectApprovalsForSearch(
  state: Awaited<ReturnType<typeof loadEmpireState>>
): Promise<ApprovalSearchItem[]> {
  const items: ApprovalSearchItem[] = [];
  const now = Date.now();

  for (const todo of (state.human_todos || []).filter((t) => t.status === "open")) {
    items.push({
      kind: "todo",
      id: todo.id,
      urgency: todo.priority === "high" ? "high" : "normal",
      typeLabel: "Operator to-do",
      business: todo.tenant || "empire",
      title: todo.title,
      preview: todo.detail ? clip(todo.detail, 220) : "",
      ageMin: ageMinFrom(todo.created_at, now),
    });
  }

  for (const t of state.tenants) {
    const sqRoot = path.join(BIZ, t.slug, "social-queue");
    if (!existsSync(sqRoot)) continue;
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
          items.push({
            kind: "social",
            id: postId,
            urgency: "normal",
            typeLabel: `${platform} post`,
            business: t.display_name,
            title: data.content?.slug || data.angle || postId,
            preview: clip(
              data.angle || data.content?.caption || data.content?.text || "",
              200
            ),
            ageMin: ageMinFrom(data.queued_at, now),
          });
        } catch {
          /* skip unreadable queue file */
        }
      }
    }
  }

  if (existsSync(STUDIO_DRAFTS)) {
    const drafts = (await fs.readdir(STUDIO_DRAFTS, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
      .slice(0, 15);
    for (const d of drafts) {
      const skillMd = path.join(STUDIO_DRAFTS, d.name, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      try {
        const stat = await fs.stat(skillMd);
        const text = (await fs.readFile(skillMd, "utf8")).slice(0, 260);
        items.push({
          kind: "skill",
          id: d.name,
          urgency: "low",
          typeLabel: "Skill draft",
          business: "empire",
          title: d.name,
          preview: clip(text, 220),
          ageMin: ageMinFrom(stat.mtime.toISOString(), now),
        });
      } catch {
        /* skip unreadable draft */
      }
    }
  }

  if (existsSync(EXPANSION_INBOX)) {
    const files = (await fs.readdir(EXPANSION_INBOX).catch(() => [] as string[]))
      .filter((f) => f.endsWith(".json"))
      .slice(0, 15);
    for (const f of files) {
      try {
        const raw = await fs.readFile(path.join(EXPANSION_INBOX, f), "utf8");
        const data: {
          status?: string;
          type?: string;
          skill_name?: string;
          description?: string;
          extracted?: unknown;
          requested_at?: string;
        } = JSON.parse(raw);
        if (data?.status !== "pending") continue;
        const isBusiness = data.type === "new-business";
        items.push({
          kind: "expansion",
          id: f,
          urgency: isBusiness ? "high" : "normal",
          typeLabel: isBusiness ? "New business request" : "Expansion request",
          business: "empire",
          title: isBusiness
            ? "Bootstrap a new business"
            : data.skill_name || "New skill request",
          preview: clip(
            data.description ||
              (data.extracted ? JSON.stringify(data.extracted) : ""),
            220
          ),
          ageMin: ageMinFrom(data.requested_at, now),
        });
      } catch {
        /* skip unreadable request file */
      }
    }
  }

  for (const o of (state.opportunities || [])
    .filter((o) => o.pitched && o.status === "open")
    .slice(0, 15)) {
    items.push({
      kind: "opportunity",
      id: o.id,
      urgency: "low",
      typeLabel: "Opportunity pitch",
      business: "empire",
      title: o.niche,
      preview: clip(o.rationale || "", 220),
      ageMin: 0,
    });
  }

  return items;
}

// ── Result shape & rendering ───────────────────────────────────────────────

type ResultKind =
  | "tenant"
  | "todo"
  | "approval"
  | "opportunity"
  | "agent"
  | "activity";

interface SearchResult {
  kind: ResultKind;
  /** Stable React key. */
  key: string;
  /** The headline shown in the result row. */
  title: string;
  /** One-line context, in plain English. */
  context: string;
  /** Where the row links to. */
  href: string;
  /** Ranking score. */
  score: number;
}

const KIND_LABELS: Record<ResultKind, string> = {
  tenant: "Businesses",
  todo: "Operator to-dos",
  approval: "Approvals queue",
  opportunity: "Opportunities",
  agent: "Agents",
  activity: "Recent activity",
};

const KIND_ORDER: ResultKind[] = [
  "tenant",
  "todo",
  "approval",
  "opportunity",
  "agent",
  "activity",
];

export default async function AdminSearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawQ = params.q;
  const qInput = (typeof rawQ === "string" ? rawQ : Array.isArray(rawQ) ? rawQ[0] || "" : "").trim();
  const tokens = tokenize(qInput);
  const hasQuery = tokens.length > 0;

  const state = await loadEmpireState();
  const results: SearchResult[] = [];

  if (hasQuery) {
    // ── Tenants ────────────────────────────────────────────────────────────
    for (const t of state.tenants) {
      const score = scoreResult(tokens, [
        { text: t.display_name, weight: 2 },
        { text: t.slug, weight: 2 },
        { text: t.tagline || "", weight: 1 },
        { text: t.type, weight: 1 },
      ]);
      if (score <= 0) continue;
      const detail = [t.type, t.tagline].filter(Boolean).join(" · ");
      results.push({
        kind: "tenant",
        key: `tenant-${t.slug}`,
        title: t.display_name || t.slug,
        context: detail || `Stage: ${t.stage || "—"}`,
        href: tenantHref(t.slug),
        score,
      });
    }

    // ── Operator to-dos ────────────────────────────────────────────────────
    for (const todo of state.human_todos || []) {
      const score = scoreResult(tokens, [
        { text: todo.title, weight: 2 },
        { text: todo.detail || "", weight: 1 },
        { text: todo.category || "", weight: 1 },
        { text: todo.tenant || "", weight: 1 },
      ]);
      if (score <= 0) continue;
      const statusLabel = todo.status === "open" ? "Open" : todo.status;
      results.push({
        kind: "todo",
        key: `todo-${todo.id}`,
        title: todo.title,
        context: clip(
          `${statusLabel} · ${todo.category}${todo.tenant ? ` · ${todo.tenant}` : ""}${
            todo.detail ? ` — ${todo.detail}` : ""
          }`,
          180
        ),
        href: "/admin/inbox",
        score,
      });
    }

    // ── Approvals (five-source aggregator) ─────────────────────────────────
    const approvals = await collectApprovalsForSearch(state);
    for (const a of approvals) {
      const score = scoreResult(tokens, [
        { text: a.title, weight: 2 },
        { text: a.preview, weight: 1 },
        { text: a.typeLabel, weight: 1 },
        { text: a.business, weight: 1 },
      ]);
      if (score <= 0) continue;
      results.push({
        kind: "approval",
        key: `approval-${a.kind}-${a.id}`,
        title: a.title,
        context: clip(
          `${a.typeLabel} · ${a.business}${a.preview ? ` — ${a.preview}` : ""}`,
          180
        ),
        href: "/admin/inbox",
        score,
      });
    }

    // ── Opportunities ──────────────────────────────────────────────────────
    for (const o of state.opportunities || []) {
      const score = scoreResult(tokens, [
        { text: o.niche || "", weight: 2 },
        { text: o.rationale || "", weight: 1 },
        { text: o.suggested_archetype || "", weight: 1 },
      ]);
      if (score <= 0) continue;
      results.push({
        kind: "opportunity",
        key: `opportunity-${o.id}`,
        title: o.niche || o.id,
        context: clip(
          `${o.suggested_archetype || "?"} · score ${o.total_score}${
            o.rationale ? ` — ${o.rationale}` : ""
          }`,
          180
        ),
        href: "/admin/opportunities",
        score,
      });
    }

    // ── Agents (actor names from the empire battle log) ────────────────────
    const agentMap = new Map<
      string,
      { actor: string; runs: number; lastTs: string; lastAction: string }
    >();
    for (const a of state.empire_battle_log) {
      const actor = typeof a.actor === "string" && a.actor ? a.actor : "";
      if (!actor) continue;
      const e =
        agentMap.get(actor) ||
        { actor, runs: 0, lastTs: "", lastAction: "" };
      e.runs++;
      const ts = typeof a.ts === "string" ? a.ts : "";
      if (!e.lastTs || ts > e.lastTs) {
        e.lastTs = ts;
        e.lastAction =
          typeof a.action === "string" && a.action ? a.action : e.lastAction;
      }
      agentMap.set(actor, e);
    }
    for (const ag of agentMap.values()) {
      const score = scoreResult(tokens, [{ text: ag.actor, weight: 2 }]);
      if (score <= 0) continue;
      results.push({
        kind: "agent",
        key: `agent-${ag.actor}`,
        title: ag.actor,
        context: clip(
          `${ag.runs} ${ag.runs === 1 ? "run" : "runs"}${
            ag.lastTs ? ` · last ${rel(ag.lastTs)}` : ""
          }${ag.lastAction ? ` · ${ag.lastAction.replace(/[_-]+/g, " ")}` : ""}`,
          180
        ),
        href: "/admin/activity",
        score,
      });
    }

    // ── Recent activity (last 100 entries) ─────────────────────────────────
    const recent: LogEntry[] = [...state.empire_battle_log]
      .filter((e): e is LogEntry => Boolean(e) && typeof e.ts === "string")
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, 100);

    const nameBySlug = new Map<string, string>();
    for (const t of state.tenants) nameBySlug.set(t.slug, t.display_name || t.slug);

    for (let i = 0; i < recent.length; i++) {
      const e = recent[i];
      if (!e) continue;
      const tenant = typeof e.tenant === "string" ? e.tenant : "";
      const actor = typeof e.actor === "string" ? e.actor : "";
      const action = typeof e.action === "string" ? e.action : "";
      const score = scoreResult(tokens, [
        { text: action, weight: 2 },
        { text: actor, weight: 1 },
        { text: tenant, weight: 1 },
      ]);
      if (score <= 0) continue;
      const tenantLabel = nameBySlug.get(tenant) || tenant || "Empire";
      results.push({
        kind: "activity",
        key: `activity-${i}-${e.ts}`,
        title: `${actor || "agent"} — ${action.replace(/[_-]+/g, " ") || "did something"}`,
        context: clip(`${tenantLabel} · ${rel(e.ts)} — ${summarize(e)}`, 180),
        href: "/admin/activity",
        score,
      });
    }
  }

  // Per-kind buckets, ranked best-first inside each bucket.
  const buckets = new Map<ResultKind, SearchResult[]>();
  for (const kind of KIND_ORDER) buckets.set(kind, []);
  for (const r of results) buckets.get(r.kind)?.push(r);
  for (const list of buckets.values()) list.sort((a, b) => b.score - a.score);

  const totalHits = results.length;

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="search" searchQuery={qInput} />
      <h1>Search</h1>
      <PageHint>
        One search box across every admin surface — businesses, to-dos, the
        approvals queue, opportunities, agents, and recent activity.
      </PageHint>
      <div className="sub">
        {hasQuery
          ? `${totalHits} ${totalHits === 1 ? "result" : "results"} for ${'"'}${qInput}${'"'}`
          : "Type a query in the search box above to look across the empire."}
      </div>

      {!hasQuery ? (
        <div className="section">
          <div className="empty">
            Nothing searched yet. Try a business name, an agent, a to-do
            keyword, or a snippet from any recent activity line.
          </div>
        </div>
      ) : totalHits === 0 ? (
        <div className="section">
          <div className="empty">
            No matches for <code>{qInput}</code> across any admin surface.
            <br />
            Try a shorter or simpler term — e.g. just{" "}
            <code>{tokens[0]?.slice(0, Math.max(3, Math.floor((tokens[0]?.length ?? 0) / 2))) || "the"}</code>{" "}
            instead — or check spelling. The search covers tenants, operator
            to-dos, the approvals queue, opportunities, agent names, and the
            last 100 activity entries.
          </div>
        </div>
      ) : (
        <>
          {KIND_ORDER.map((kind) => {
            const list = buckets.get(kind) || [];
            if (list.length === 0) return null;
            return (
              <div key={kind}>
                <div className="section-header">
                  <div className="section-title">
                    {KIND_LABELS[kind]} ({list.length})
                  </div>
                </div>
                <div className="biz-list">
                  {list.slice(0, 20).map((r) => (
                    <Link key={r.key} href={r.href} prefetch={false} className="biz-row">
                      <div className="biz-main">
                        <div className="biz-name">{r.title}</div>
                        <div className="biz-sub">{r.context}</div>
                      </div>
                      <span className="pill">{KIND_LABELS[kind]}</span>
                      <div className="biz-arrow">›</div>
                    </Link>
                  ))}
                </div>
                {list.length > 20 ? (
                  <div className="toolbar-count" style={{ marginTop: 6 }}>
                    Showing the top 20 of {list.length} — narrow the query to
                    refine further.
                  </div>
                ) : null}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
