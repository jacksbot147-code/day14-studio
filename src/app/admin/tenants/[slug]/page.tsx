import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadEmpireState,
  fetchPrintifyProducts,
  loadBrandSites,
  loadTenantOps,
} from "@/lib/admin-state";
import { summarize, type LogEntry } from "@/lib/activity-summary";
import {
  collectAllApprovals,
  collectTenantApprovals,
  type ApprovalItem,
} from "@/lib/admin-approvals";
import { AdminNav, ADMIN_CSS, SiteCta, SITE_URL, PageHint } from "../../layout-bits";
import { Card, EmptyState, StatusBanner, type StatusTone } from "@/components/ui";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  "pod-store": { label: "Print-on-demand", color: "#b45309" },
  "newsletter": { label: "Newsletter", color: "#7c3aed" },
  "saas": { label: "SaaS", color: "#0e7490" },
  "course": { label: "Course", color: "#15803d" },
  "real-estate": { label: "Real estate", color: "#4338ca" },
};

function rel(iso: string) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function stageInfo(stage: string): { cls: string; label: string } {
  const s = (stage || "").toLowerCase();
  if (s.includes("fail")) return { cls: "stage-failed", label: "Build failed" };
  if (s.includes("build") || s.includes("scaffold") || s.includes("launch") || s.includes("draft"))
    return { cls: "stage-building", label: stage || "Building" };
  if (!s) return { cls: "stage-default", label: "—" };
  return { cls: "stage-live", label: stage };
}

/** Local YYYY-MM-DD key for grouping (avoids UTC date drift). */
function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Human day header — "Today", "Yesterday", or a written date. */
function dayLabel(key: string): string {
  if (key === "unknown") return "Undated";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(`${key}T00:00:00`);
  if (Number.isNaN(day.getTime())) return key;
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return day.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: today.getFullYear() === day.getFullYear() ? undefined : "numeric",
  });
}

/** Heuristic: does this heartbeat name belong to the tenant? */
function heartbeatBelongsToTenant(name: string, slug: string): boolean {
  if (!name || !slug) return false;
  return name.toLowerCase().includes(slug.toLowerCase());
}

interface Props { params: Promise<{ slug: string }>; }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `${slug} — Day14 Admin`, robots: { index: false, follow: false } };
}

export default async function TenantPage({ params }: Props) {
  const { slug } = await params;
  const state = await loadEmpireState();
  const tenant = state.tenants.find((t) => t.slug === slug);
  if (!tenant) notFound();

  // Resolve the tenant's own public website from the brand-sites manifest.
  const brandSites = await loadBrandSites();
  const hasBrandSite = brandSites.some((s) => s.slug === slug);
  const isDay14 = slug === "day14";
  const siteUrl = hasBrandSite
    ? `${SITE_URL}/brands/${slug}`
    : isDay14
      ? SITE_URL
      : null;

  const products = await fetchPrintifyProducts();

  // Ops console data (synced from the tenant's agent cluster).
  const ops = await loadTenantOps(slug);
  const opsLeads = ops.leads ?? [];
  const opsQuotes = ops.quotes ?? [];
  const opsJobs = ops.jobs ?? [];
  const opsInvoices = ops.invoices ?? [];
  const opsCustomers = ops.customers ?? [];
  const hasLawnOps = Array.isArray(ops.jobs) || Array.isArray(ops.leads);
  const opsOutstanding = opsInvoices
    .filter((i) => i.status === "unpaid")
    .reduce((s, i) => s + (i.amount_cents ?? 0), 0);
  const routeBoard = ops.schedule?.board;

  // ── Mission Control: per-tenant state ─────────────────────────────────────
  // Open operator to-dos against this tenant (not the empire, not other tenants).
  const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const allOpenTodos = (state.human_todos ?? []).filter((t) => t.status === "open");
  const tenantTodos = [...allOpenTodos]
    .filter((t) => t.tenant === slug)
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) ||
        a.seq - b.seq
    );
  const tenantHighTodos = tenantTodos.filter((t) => t.priority === "high").length;

  // Heartbeats that look like they belong to this tenant (name match).
  const tenantHeartbeats = state.heartbeats.filter((h) =>
    heartbeatBelongsToTenant(h.name, slug)
  );
  const tenantHealthy = tenantHeartbeats.filter((h) => h.status === "healthy").length;
  const tenantDown = tenantHeartbeats.filter((h) => h.status === "error");
  const tenantStale = tenantHeartbeats.filter((h) => h.status === "stale");
  const buildFailed = (tenant.stage || "").toLowerCase().includes("fail");

  // Battle-log entries scoped to this tenant, newest first.
  const tenantLog: LogEntry[] = state.empire_battle_log
    .filter((e): e is LogEntry => Boolean(e) && typeof e?.ts === "string" && e?.tenant === slug)
    .sort((a, b) => b.ts.localeCompare(a.ts));
  const lastActivityTs = tenantLog[0]?.ts ?? "";

  // 24h window — distinct actors and total runs.
  const dayAgo = Date.now() - 86_400_000;
  const actorsTodaySet = new Set<string>();
  let runs24h = 0;
  for (const e of tenantLog) {
    const t = new Date(e.ts).getTime();
    if (!Number.isFinite(t) || t < dayAgo) continue;
    runs24h++;
    if (e.actor) actorsTodaySet.add(e.actor);
  }
  const actorsToday = actorsTodaySet.size;

  // Per-tenant approvals queue (only sources with a tenant scope).
  const tenantApprovals = await collectTenantApprovals(slug, allOpenTodos);

  // Mini approvals queue mirroring the empire-wide /admin/inbox view —
  // same items, just sliced to this tenant. Re-uses the inbox aggregator
  // so this card and the inbox can never drift out of sync.
  const allApprovalsForTenant: ApprovalItem[] = (await collectAllApprovals(state))
    .filter((item) => item.tenant === slug);
  const MINI_APPROVAL_LIMIT = 5;
  const miniApprovals = allApprovalsForTenant.slice(0, MINI_APPROVAL_LIMIT);
  const miniApprovalsOverflow = Math.max(
    0,
    allApprovalsForTenant.length - MINI_APPROVAL_LIMIT
  );

  // Audit-log error/failure markers in the last 7 days (tenant.recent_audit
  // is already scoped to this tenant by the sync).
  const weekAgo = Date.now() - 7 * 86_400_000;
  const errorAudit = tenant.recent_audit.filter((a) => {
    const action = (a.action || "").toLowerCase();
    if (!action.includes("fail") && !action.includes("error")) return false;
    const t = a.ts ? new Date(a.ts).getTime() : 0;
    return Number.isFinite(t) && t >= weekAgo;
  });

  // Mission Control verdict — one line scoped to this tenant.
  const tenantNeedsYou = tenantTodos.length + tenantApprovals.length;
  const sysTone: StatusTone =
    tenantDown.length > 0 || buildFailed
      ? "bad"
      : tenantStale.length > 0 ||
          tenantHighTodos > 0 ||
          tenantApprovals.length > 0 ||
          errorAudit.length > 0
        ? "warn"
        : "ok";
  const sysHeadline =
    tenantDown.length > 0
      ? `${tenantDown.length} agent${tenantDown.length === 1 ? "" : "s"} down — needs you`
      : buildFailed
        ? "Build failed — needs you"
        : tenantNeedsYou > 0
          ? `${tenantNeedsYou} item${tenantNeedsYou === 1 ? "" : "s"} need you`
          : "All clear on this business";

  // ── Activity timeline: latest 50 entries grouped by local day ─────────────
  const ACTIVITY_CAP = 50;
  const cappedLog = tenantLog.slice(0, ACTIVITY_CAP);
  const activityGroups: Array<[string, LogEntry[]]> = (() => {
    const map = new Map<string, LogEntry[]>();
    for (const e of cappedLog) {
      const key = dayKey(e.ts);
      const bucket = map.get(key);
      if (bucket) bucket.push(e);
      else map.set(key, [e]);
    }
    return [...map.entries()];
  })();

  // Agent activity on this tenant — grouped from the audit log.
  const agentStats = (() => {
    const m = new Map<string, { actor: string; runs: number; lastTs: string; lastAction: string }>();
    for (const a of tenant.recent_audit) {
      const actor = a.actor || "unknown";
      const e = m.get(actor) || { actor, runs: 0, lastTs: "", lastAction: "" };
      e.runs++;
      if (!e.lastTs || (a.ts || "") > e.lastTs) {
        e.lastTs = a.ts || "";
        e.lastAction = a.action || "";
      }
      m.set(actor, e);
    }
    return [...m.values()].sort((a, b) => b.lastTs.localeCompare(a.lastTs));
  })();

  const type = TYPE_LABELS[tenant.type] || { label: tenant.type, color: "#737a82" };
  const st = stageInfo(tenant.stage);

  const contentEntries = [
    { num: tenant.content_counts.pinterestPins, label: "Pinterest pins" },
    { num: tenant.content_counts.tiktokScripts, label: "TikTok scripts" },
    { num: tenant.content_counts.blogDrafts, label: "Blog drafts" },
    { num: tenant.content_counts.newsletterIssues, label: "Newsletter issues" },
    { num: tenant.content_counts.aiVideos, label: "AI videos" },
    { num: tenant.content_counts.csDrafts, label: "CS drafts" },
    { num: tenant.content_counts.marketingDrafts, label: "Marketing drafts" },
    { num: tenant.content_counts.rawFootage, label: "Raw footage" },
    { num: tenant.content_counts.redditDrafts, label: "Reddit drafts" },
  ];

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="empire" siteUrl={siteUrl ?? SITE_URL} siteLabel={hasBrandSite ? tenant.display_name : "day14.us"} />
      <div className="crumb"><Link href="/admin">← Overview</Link> &nbsp;/&nbsp; {slug}</div>
      <h1>{tenant.display_name}</h1>
      <PageHint>
        The full picture for one business — its build, content, money, and
        activity in a single place.
      </PageHint>
      <div className="sub">
        <span style={{ color: type.color, fontWeight: 600 }}>{type.label}</span>
        {" · "}
        <span className={`stage-pill ${st.cls}`}>{st.label}</span>
        {tenant.tagline ? <>{"  "}{tenant.tagline}</> : null}
      </div>

      {/* Per-tenant Mission Control — same shape as the empire banner. */}
      <StatusBanner
        tone={sysTone}
        headline={sysHeadline}
        detail={
          <>
            {tenantHeartbeats.length > 0
              ? `${tenantHealthy}/${tenantHeartbeats.length} agents up · `
              : "no scoped agents · "}
            {runs24h} agent run{runs24h === 1 ? "" : "s"} today ·{" "}
            {tenantApprovals.length} in approvals queue ·{" "}
            {lastActivityTs ? `last activity ${rel(lastActivityTs)}` : "no activity yet"}
          </>
        }
        style={{ marginBottom: 20 }}
      />

      {siteUrl ? (
        <SiteCta
          url={siteUrl}
          label={isDay14 ? "View day14.us" : `Visit ${tenant.display_name} website`}
        />
      ) : (
        <div className="site-pending">Brand site not built yet — it appears here once the build finishes.</div>
      )}

      {/* Per-tenant KPI strip — Mission Control style, four headline numbers. */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi">
          <div className="kpi-label">Revenue</div>
          <div className="kpi-value">${(tenant.revenue_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="kpi-sub">{tenant.orders} {tenant.orders === 1 ? "order" : "orders"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Agents acting</div>
          <div className="kpi-value">{actorsToday}</div>
          <div className="kpi-sub">{runs24h} run{runs24h === 1 ? "" : "s"} · last 24h</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Needs you</div>
          <div className="kpi-value" style={{ color: tenantTodos.length > 0 ? "var(--amber)" : "var(--text)" }}>
            {tenantTodos.length}
          </div>
          <div className="kpi-sub">{tenantHighTodos > 0 ? `${tenantHighTodos} high priority` : "open operator to-dos"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Approvals queued</div>
          <div className="kpi-value" style={{ color: tenantApprovals.length > 0 ? "var(--accent-text)" : "var(--text)" }}>
            {tenantApprovals.length}
          </div>
          <div className="kpi-sub">
            {tenantApprovals.length === 0
              ? "nothing waiting"
              : (
                <Link href="/admin/inbox" prefetch={false} style={{ color: "var(--accent-text)" }}>
                  open inbox →
                </Link>
              )}
          </div>
        </div>
      </div>

      {/* What&apos;s blocked — todos, approvals, and recent failures, all scoped. */}
      <div className="section-header">
        <div className="section-title">
          What&apos;s blocked
          {tenantTodos.length + tenantApprovals.length + errorAudit.length > 0
            ? ` · ${tenantTodos.length + tenantApprovals.length + errorAudit.length}`
            : ""}
        </div>
      </div>
      {tenantTodos.length + tenantApprovals.length + errorAudit.length === 0 ? (
        <EmptyState
          icon="🟢"
          headline={`Nothing is blocking ${tenant.display_name}.`}
          hint={
            <>
              No open operator to-dos, no queued approvals, no recent agent
              errors for this tenant. Activity is still tracked below — this
              panel only lights up when something needs you.
            </>
          }
        />
      ) : (
        <Card>
          {tenantTodos.length > 0 ? (
            <>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "var(--muted)",
                  marginBottom: 8,
                }}
              >
                Operator to-dos · {tenantTodos.length}
              </div>
              {tenantTodos.map((t) => (
                <div key={t.id} className="feed-row">
                  <div className="feed-time">{rel(t.created_at)}</div>
                  <div className="feed-actor">
                    <span className={`pill ${t.priority === "high" ? "pri-high" : ""}`}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="feed-text">
                    <b>{t.title}</b>
                    {t.detail ? (
                      <div style={{ color: "var(--muted)", marginTop: 3 }}>{t.detail}</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </>
          ) : null}

          {tenantApprovals.length > 0 ? (
            <div style={{ marginTop: tenantTodos.length > 0 ? 18 : 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "var(--muted)",
                  marginBottom: 8,
                }}
              >
                Approvals queued · {tenantApprovals.length}
              </div>
              {tenantApprovals.map((a) => (
                <div key={a.key} className="feed-row">
                  <div className="feed-time">{rel(new Date(Date.now() - a.ageMin * 60_000).toISOString())}</div>
                  <div className="feed-actor">
                    <span className={`pill ${a.urgency === "high" ? "pri-high" : ""}`}>
                      {a.typeLabel}
                    </span>
                  </div>
                  <div className="feed-text">
                    <b>{a.title}</b>
                    <div style={{ color: "var(--muted)", marginTop: 3 }}>{a.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {errorAudit.length > 0 ? (
            <div style={{ marginTop: tenantTodos.length + tenantApprovals.length > 0 ? 18 : 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "var(--red)",
                  marginBottom: 8,
                }}
              >
                Recent failures · {errorAudit.length}
              </div>
              {errorAudit.map((a, i) => (
                <div key={i} className="feed-row">
                  <div className="feed-time">{rel(a.ts)}</div>
                  <div className="feed-actor">{a.actor || "?"}</div>
                  <div className="feed-text">{a.action || ""}</div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      )}

      {/*
        Per-tenant mini Approvals queue — the same items the unified
        /admin/inbox would show, sliced to this tenant. Re-uses the
        empire collectAllApprovals aggregator so this preview and the
        inbox can't drift out of sync.
      */}
      <div className="section-header">
        <div className="section-title">
          Approvals queue
          {allApprovalsForTenant.length > 0 ? ` · ${allApprovalsForTenant.length}` : ""}
        </div>
        {allApprovalsForTenant.length > 0 ? (
          <Link
            href={`/admin/inbox?tenant=${slug}`}
            prefetch={false}
            className="section-link"
          >
            Open in inbox →
          </Link>
        ) : null}
      </div>
      {allApprovalsForTenant.length === 0 ? (
        <EmptyState
          icon="✅"
          headline={`No approvals waiting for ${tenant.display_name} — nice.`}
          hint={
            <>
              When an agent queues a post, files a to-do against this tenant,
              or anything else that needs your sign-off, it will show up here
              and in the unified{" "}
              <Link href={`/admin/inbox?tenant=${slug}`} prefetch={false}>
                Approvals queue
              </Link>
              .
            </>
          }
        />
      ) : (
        <Card>
          {miniApprovals.map((item) => (
            <div key={item.key} className="feed-row">
              <div className="feed-time">
                {rel(new Date(Date.now() - item.ageMin * 60_000).toISOString())}
              </div>
              <div className="feed-actor">
                <span className={`pill ${item.urgency === "high" ? "pri-high" : ""}`}>
                  {item.typeLabel}
                </span>
              </div>
              <div className="feed-text">
                <b>{item.title}</b>
                <div style={{ color: "var(--muted)", marginTop: 3 }}>{item.reason}</div>
              </div>
            </div>
          ))}
          {miniApprovalsOverflow > 0 ? (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
                fontSize: 12.5,
                color: "var(--muted)",
              }}
            >
              + {miniApprovalsOverflow} more —{" "}
              <Link
                href={`/admin/inbox?tenant=${slug}`}
                prefetch={false}
                style={{ color: "var(--accent-text)", fontWeight: 600 }}
              >
                open full filtered view →
              </Link>
            </div>
          ) : null}
        </Card>
      )}

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Revenue</div><div className="kpi-value">${(tenant.revenue_cents / 100).toFixed(2)}</div><div className="kpi-sub">{tenant.orders} orders</div></div>
        <div className="kpi"><div className="kpi-label">Products</div><div className="kpi-value">{products.filter((p: { visible?: boolean }) => p.visible !== false).length}</div></div>
        <div className="kpi"><div className="kpi-label">Streak</div><div className="kpi-value">{tenant.streak}d</div><div className="kpi-sub">days active</div></div>
        <div className="kpi"><div className="kpi-label">Queued</div><div className="kpi-value">{tenant.queue.queued}</div></div>
        <div className="kpi"><div className="kpi-label">Approved</div><div className="kpi-value">{tenant.queue.approved}</div></div>
        <div className="kpi"><div className="kpi-label">Posted</div><div className="kpi-value">{tenant.queue.posted}</div></div>
      </div>

      {hasLawnOps ? (
        <>
          <div className="section-header"><div className="section-title">Operations</div></div>
          <div className="ops-grid">
            <div className="ops-stat"><div className="ops-stat-num">{opsLeads.filter((l) => l.status === "new" || l.status === "quoted").length}</div><div className="ops-stat-label">Open leads</div></div>
            <div className="ops-stat"><div className="ops-stat-num">{opsQuotes.length}</div><div className="ops-stat-label">Quotes</div></div>
            <div className="ops-stat"><div className="ops-stat-num">{opsJobs.filter((j) => j.status === "scheduled").length}</div><div className="ops-stat-label">Scheduled jobs</div></div>
            <div className="ops-stat"><div className="ops-stat-num">{opsInvoices.filter((i) => i.status === "unpaid").length}</div><div className="ops-stat-label">Unpaid invoices</div></div>
            <div className="ops-stat"><div className="ops-stat-num">${(opsOutstanding / 100).toLocaleString()}</div><div className="ops-stat-label">Outstanding</div></div>
            <div className="ops-stat"><div className="ops-stat-num">{opsCustomers.length}</div><div className="ops-stat-label">Customers</div></div>
          </div>
          {routeBoard ? (
            <>
              <div className="section-header"><div className="section-title">Route board{ops.schedule?.season ? ` · ${ops.schedule.season}` : ""}</div></div>
              <div className="queue-grid">
                {Object.entries(routeBoard).map(([day, b]) => (
                  <div key={day} className="queue-cell">
                    <div className="queue-cell-name">{day}</div>
                    <div className="queue-counts">{b.stops} stops · density {b.density_score}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : null}

      <div className="section-header"><div className="section-title">Content factory output</div></div>
      <div className="content-grid">
        {contentEntries.map((e, i) => (
          <div key={i} className="content-stat">
            <div className="content-stat-num">{e.num}</div>
            <div className="content-stat-label">{e.label}</div>
          </div>
        ))}
      </div>

      <div className="section-header"><div className="section-title">Social queue</div></div>
      {Object.keys(tenant.queue.byPlatform).length === 0 ? (
        <EmptyState
          icon="📭"
          headline="No content queued for this tenant yet."
          hint={
            <>
              Social posts land here once the per-tenant marketing/social
              orchestrator runs (e.g. <code>hot-flash-co-marketing-engine</code>).
              Queued posts surface in the{" "}
              <Link href="/admin/inbox" prefetch={false}>Approvals queue</Link> for
              sign-off, then move to approved → posted as they ship.
            </>
          }
        />
      ) : (
        <div className="queue-grid">
          {Object.entries(tenant.queue.byPlatform).map(([p, c]) => (
            <div key={p} className="queue-cell">
              <div className="queue-cell-name">{p}</div>
              <div className="queue-counts"><span className="q">{c.queued}</span> · <span className="a">{c.approved}</span> · <span className="p">{c.posted}</span></div>
            </div>
          ))}
        </div>
      )}

      <div className="section-header"><div className="section-title">Agents</div></div>
      <Card>
        {agentStats.length === 0 ? (
          <EmptyState
            icon="🤖"
            headline={`${tenant.display_name} hasn't logged an agent run yet.`}
            hint={
              <>
                Agent runs land here as soon as one writes to{" "}
                <code>~/Documents/businesses/{tenant.slug}/audit-log.jsonl</code>.
                If you expected activity, start the relevant poller or check{" "}
                <Link href="/admin/health" prefetch={false}>Health</Link>.
              </>
            }
          />
        ) : (
          <>
            <div className="agent-row head">
              <div>Agent</div><div>Runs</div><div>Last</div><div>Last action</div>
            </div>
            {agentStats.map((ag) => (
              <div key={ag.actor} className="agent-row">
                <div className="agent-name">{ag.actor}</div>
                <div className="agent-runs">{ag.runs}</div>
                <div className="agent-last">{rel(ag.lastTs)}</div>
                <div className="agent-action">{ag.lastAction}</div>
              </div>
            ))}
          </>
        )}
      </Card>

      {/* Activity timeline — battle log scoped to this tenant, grouped by day. */}
      <div className="section-header">
        <div className="section-title">
          Activity timeline
          {tenantLog.length > 0
            ? ` · ${tenantLog.length}${tenantLog.length > ACTIVITY_CAP ? `+` : ""}`
            : ""}
        </div>
        <Link href="/admin/activity" prefetch={false} className="section-link">
          Full feed →
        </Link>
      </div>
      {activityGroups.length === 0 ? (
        <EmptyState
          icon="📡"
          headline={`No activity for ${tenant.display_name} yet.`}
          hint={
            <>
              Runs are tracked in the per-tenant audit log; the empire-wide{" "}
              <Link href="/admin/activity" prefetch={false}>Activity</Link> page
              has the broader feed. First run usually appears within one polling
              cycle.
            </>
          }
        />
      ) : (
        <div className="act-timeline">
          {activityGroups.map(([key, items]) => (
            <div key={key} className="act-day">
              <div className="act-day-head">
                <span className="act-day-label">{dayLabel(key)}</span>
                <span className="act-day-count">
                  {items.length} {items.length === 1 ? "event" : "events"}
                </span>
              </div>
              <div className="section act-day-body">
                {items.map((e, i) => (
                  <div key={`${e.ts}-${i}`} className="feed-row">
                    <div className="feed-time">{rel(e.ts)}</div>
                    <div className="feed-actor">{e.actor || "unknown agent"}</div>
                    <div className="feed-text">{summarize(e)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
