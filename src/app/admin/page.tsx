import Link from "next/link";
import { loadEmpireState, fetchPrintifyProducts } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS, SiteCta, SITE_URL } from "./layout-bits";

export const metadata = {
  title: "Day14 — Command Center",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function rel(iso: string) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function money(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function stageInfo(stage: string): { cls: string; label: string } {
  const s = (stage || "").toLowerCase();
  if (s.includes("fail")) return { cls: "stage-failed", label: "Build failed" };
  if (s.includes("build") || s.includes("scaffold") || s.includes("launch") || s.includes("draft"))
    return { cls: "stage-building", label: stage || "Building" };
  if (!s) return { cls: "stage-default", label: "—" };
  return { cls: "stage-live", label: stage };
}

// Segments with their own dedicated admin page (vs. the generic tenant page).
const SEGMENT_PAGES: Record<string, string> = {
  "day14-realty": "/admin/realty",
  alignmd: "/admin/alignmd",
};

export default async function AdminOverview() {
  const state = await loadEmpireState();
  const products = await fetchPrintifyProducts();
  const totalProducts = products.length;
  const totalRevenue = state.tenants.reduce((s, t) => s + t.revenue_cents, 0);
  const totalOrders = state.tenants.reduce((s, t) => s + t.orders, 0);
  const healthy = state.heartbeats.filter((h) => h.status === "healthy").length;
  const stale = state.heartbeats.filter((h) => h.status === "stale");
  const failedBuilds = state.tenants.filter((t) => (t.stage || "").toLowerCase().includes("fail")).length;

  const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const openTodos = [...(state.human_todos ?? [])]
    .filter((t) => t.status === "open")
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) ||
        a.seq - b.seq
    );
  const highTodos = openTodos.filter((t) => t.priority === "high").length;
  const botUser = state.bot_username || null;

  // Businesses, ranked by revenue then orders.
  const businesses = [...state.tenants].sort(
    (a, b) => b.revenue_cents - a.revenue_cents || b.orders - a.orders
  );

  // Agent workforce + 24h run count, from the empire-wide activity log.
  const dayAgo = Date.now() - 86_400_000;
  let runs24h = 0;
  const agentMap = new Map<
    string,
    { actor: string; runs: number; tenants: Set<string>; lastTs: string; lastAction: string }
  >();
  for (const a of state.empire_battle_log) {
    if (a.ts && new Date(a.ts).getTime() >= dayAgo) runs24h++;
    const actor = a.actor || "unknown";
    const e =
      agentMap.get(actor) ||
      { actor, runs: 0, tenants: new Set<string>(), lastTs: "", lastAction: "" };
    e.runs++;
    if (a.tenant) e.tenants.add(a.tenant);
    if (!e.lastTs || (a.ts || "") > e.lastTs) {
      e.lastTs = a.ts || "";
      e.lastAction = a.action || "";
    }
    agentMap.set(actor, e);
  }
  const agents = [...agentMap.values()].sort((a, b) => b.lastTs.localeCompare(a.lastTs));

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="empire" />
      <h1>Day14 Command Center</h1>
      <div className="sub">
        {state.tenants.length} businesses · synced {rel(state.generated_at)} ·{" "}
        <Link href="/admin" prefetch={false} style={{ color: "var(--accent)" }}>refresh</Link>
      </div>

      <SiteCta url={SITE_URL} label="View day14.us" />

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div className="kpi">
          <div className="kpi-label">Revenue</div>
          <div className="kpi-value">{money(totalRevenue)}</div>
          <div className="kpi-sub">{totalOrders} orders · {totalProducts} products</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Businesses</div>
          <div className="kpi-value">{state.tenants.length}</div>
          <div className="kpi-sub" style={{ color: failedBuilds > 0 ? "var(--red)" : "var(--muted)" }}>
            {failedBuilds > 0 ? `${failedBuilds} need attention` : "all building or live"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Needs you</div>
          <div className="kpi-value" style={{ color: openTodos.length > 0 ? "var(--amber)" : "var(--text)" }}>
            {openTodos.length}
          </div>
          <div className="kpi-sub">{highTodos > 0 ? `${highTodos} high priority` : "open to-do items"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Agent runs</div>
          <div className="kpi-value">{runs24h}</div>
          <div className="kpi-sub">last 24 hours</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Daemons</div>
          <div className="kpi-value">{healthy}/{state.heartbeats.length}</div>
          <div className="kpi-sub" style={{ color: stale.length > 0 ? "var(--red)" : "var(--muted)" }}>
            {stale.length > 0 ? `${stale.length} stale` : "all healthy"}
          </div>
        </div>
      </div>

      <div className="section-header">
        <div className="section-title">
          Needs you{openTodos.length > 0 ? ` · ${openTodos.length}` : ""}
        </div>
      </div>
      <div className={`todo-panel ${openTodos.length > 0 ? "has-items" : ""}`}>
        {openTodos.length === 0 ? (
          <div className="todo-empty">Nothing needs you right now — the agents have it covered.</div>
        ) : (
          openTodos.map((t) => (
            <div key={t.id} className={`todo-row ${t.priority === "high" ? "pri-high" : ""}`}>
              <div className="todo-seq">{t.seq}</div>
              <div className="todo-body">
                <div className="todo-title">{t.title}</div>
                {t.detail ? <div className="todo-detail">{t.detail}</div> : null}
                <div className="todo-meta">
                  <span className={`pill ${t.priority === "high" ? "pri-high" : ""}`}>{t.priority}</span>
                  <span className="pill">{t.tenant}</span>
                  <span className="pill">{t.category}</span>
                </div>
              </div>
              <div className="todo-action">
                {botUser ? (
                  <a
                    className="todo-done-btn"
                    href={`https://t.me/${botUser}?text=${encodeURIComponent(`done ${t.seq}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Mark done
                  </a>
                ) : (
                  <span className="todo-done-hint">
                    Telegram: <code>done {t.seq}</code>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section-header">
        <div className="section-title">Businesses</div>
        <Link href="/admin/finance" prefetch={false} className="section-link">P&amp;L →</Link>
      </div>
      {businesses.length === 0 ? (
        <div className="section"><div className="empty">No businesses yet.</div></div>
      ) : (
        <div className="biz-list">
          {businesses.map((t) => {
            const st = stageInfo(t.stage);
            return (
              <Link key={t.slug} href={SEGMENT_PAGES[t.slug] || `/admin/tenants/${t.slug}`} prefetch={false} className="biz-row">
                <div className="biz-main">
                  <div className="biz-name">{t.display_name}</div>
                  <div className="biz-sub">{t.type}{t.tagline ? ` · ${t.tagline}` : ""}</div>
                </div>
                <span className={`stage-pill ${st.cls}`}>{st.label}</span>
                <div className="biz-stats">
                  <div className="biz-stat">
                    <div className="biz-stat-num">${(t.revenue_cents / 100).toLocaleString()}</div>
                    <div className="biz-stat-label">Revenue</div>
                  </div>
                  <div className="biz-stat">
                    <div className="biz-stat-num">{t.orders}</div>
                    <div className="biz-stat-label">Orders</div>
                  </div>
                </div>
                <div className="biz-arrow">›</div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="panel-grid" style={{ marginTop: 28 }}>
        <div>
          <div className="section-header" style={{ margin: "0 0 12px" }}>
            <div className="section-title">Agent workforce</div>
          </div>
          <div className="section">
            {agents.length === 0 ? (
              <div className="empty">No agent activity yet.</div>
            ) : (
              <>
                <div className="agent-row head">
                  <div>Agent</div><div>Runs</div><div>Businesses</div><div>Last active</div>
                </div>
                {agents.slice(0, 12).map((ag) => (
                  <div key={ag.actor} className="agent-row">
                    <div className="agent-name">{ag.actor}</div>
                    <div className="agent-runs">{ag.runs}</div>
                    <div className="agent-last">{ag.tenants.size}</div>
                    <div className="agent-action">{rel(ag.lastTs)} · {ag.lastAction}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        <div>
          <div className="section-header" style={{ margin: "0 0 12px" }}>
            <div className="section-title">System</div>
            <Link href="/admin/health" prefetch={false} className="section-link">Health →</Link>
          </div>
          <div className="section">
            <div className="sys-row">
              <span className="sys-label">Daemons healthy</span>
              <span className="sys-value" style={{ color: stale.length > 0 ? "var(--red)" : "var(--green)" }}>
                {healthy} / {state.heartbeats.length}
              </span>
            </div>
            <div className="sys-row">
              <span className="sys-label">Skills live</span>
              <span className="sys-value">{state.skill_counts.live}</span>
            </div>
            <div className="sys-row">
              <span className="sys-label">Skill drafts</span>
              <span className="sys-value">{state.skill_counts.drafts}</span>
            </div>
            <div className="sys-row">
              <span className="sys-label">Last sync</span>
              <span className="sys-value">{rel(state.generated_at)}</span>
            </div>
            {stale.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--red)", marginBottom: 8 }}>
                  Stale daemons
                </div>
                {stale.slice(0, 6).map((d, i) => (
                  <div key={i} className="daemon" style={{ marginBottom: 6 }}>
                    <div className="daemon-status stale"></div>
                    <div className="daemon-name">{d.name}</div>
                    {isFinite(d.ageMin) ? <div className="daemon-age">{d.ageMin}m</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--green)" }}>
                All daemons reporting in.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section-header"><div className="section-title">Recent activity</div></div>
      <div className="section">
        {state.empire_battle_log.length === 0 ? (
          <div className="empty">No activity logged yet.</div>
        ) : (
          state.empire_battle_log.slice(0, 24).map((a, i) => (
            <div key={i} className="feed-row">
              <div className="feed-time">{rel(a.ts)}</div>
              <div className="feed-actor">
                <Link href={`/admin/tenants/${a.tenant}`} prefetch={false}>{a.tenant}</Link>
              </div>
              <div className="feed-text"><b>{a.actor}</b> — {a.action}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 36 }}>
        Synced from local Mac ·{" "}
        <form action="/api/admin/auth" method="POST" style={{ display: "inline" }}>
          <button
            formMethod="DELETE"
            type="submit"
            style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, padding: 0, fontFamily: "inherit" }}
          >
            log out
          </button>
        </form>
      </div>
    </div>
  );
}
