import Link from "next/link";
import { loadEmpireState, fetchPrintifyProducts, computeEmpireXp, levelFromXp, xpForLevel } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS, SiteCta, SITE_URL } from "./layout-bits";

export const metadata = {
  title: "Day14 — Empire",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const ARCHETYPE_CLASSES: Record<string, { class: string; icon: string; color: string }> = {
  "pod-store": { class: "Merchant", icon: "👕", color: "#f59e0b" },
  "newsletter": { class: "Bard", icon: "📜", color: "#a855f7" },
  "saas": { class: "Engineer", icon: "⚙️", color: "#06b6d4" },
  "course": { class: "Scholar", icon: "📚", color: "#10b981" },
  "info-product": { class: "Sage", icon: "🔮", color: "#8b5cf6" },
  "agency": { class: "Warlord", icon: "⚔️", color: "#ef4444" },
  "consulting": { class: "Oracle", icon: "🧠", color: "#3b82f6" },
  "physical-product": { class: "Smith", icon: "🔨", color: "#f97316" },
  "affiliate-site": { class: "Scout", icon: "🗺️", color: "#84cc16" },
  "marketplace": { class: "Broker", icon: "🤝", color: "#ec4899" },
  "community": { class: "Druid", icon: "🌳", color: "#22c55e" },
  "real-estate": { class: "Prospector", icon: "🏠", color: "#0ea5e9" },
};

function rel(iso: string) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

export default async function AdminEmpire() {
  const state = await loadEmpireState();
  const products = await fetchPrintifyProducts();
  const totalProducts = products.length;
  const totalRevenue = state.tenants.reduce((s, t) => s + t.revenue_cents, 0);
  const totalOrders = state.tenants.reduce((s, t) => s + t.orders, 0);
  const maxStreak = state.tenants.reduce((m, t) => Math.max(m, t.streak), 0);
  const healthy = state.heartbeats.filter((h) => h.status === "healthy").length;
  const stale = state.heartbeats.filter((h) => h.status === "stale").length;
  const empireXp = computeEmpireXp(state, totalProducts);
  const level = levelFromXp(empireXp);
  const xpToNext = xpForLevel(level + 1) - empireXp;
  const xpPct = ((empireXp - xpForLevel(level)) / (xpForLevel(level + 1) - xpForLevel(level))) * 100;
  const healthPct = state.heartbeats.length > 0 ? (healthy / state.heartbeats.length) * 100 : 0;

  const sortedTenants = [...state.tenants].sort((a, b) => {
    const xpA = a.orders * 1000 + (a.revenue_cents / 100) * 10 + 500 + a.streak * 50;
    const xpB = b.orders * 1000 + (b.revenue_cents / 100) * 10 + 500 + b.streak * 50;
    return xpB - xpA;
  });

  const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const openTodos = [...(state.human_todos ?? [])]
    .filter((t) => t.status === "open")
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) ||
        a.seq - b.seq
    );
  const botUser = state.bot_username || null;

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="empire" />
      <h1>⚔️ Day14 Empire</h1>
      <div className="sub">
        {state.tenants.length} tenants · synced {rel(state.generated_at)} ·{" "}
        <Link href="/admin" prefetch={false} style={{ color: "var(--accent)" }}>refresh</Link>
      </div>

      <SiteCta url={SITE_URL} label="View day14.us live site" />

      <div className="empire-bar">
        <div className="empire-row">
          <div className="level-badge">
            <div className="level-num">{level}</div>
            <div className="level-label">Empire Level</div>
          </div>
          <div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${Math.max(0, Math.min(100, xpPct)).toFixed(1)}%` }}></div>
              <div className="xp-text">{empireXp.toLocaleString()} XP · {xpToNext.toLocaleString()} to level {level + 1}</div>
            </div>
          </div>
          <div className="health-badge">
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Empire Health</div>
            <div style={{ fontSize: 22, fontWeight: 700, margin: "4px 0" }}>{healthPct.toFixed(0)}%</div>
            <div className="health-bar">
              <div className={`health-fill ${healthPct > 80 ? "good" : healthPct > 50 ? "warn" : "bad"}`} style={{ width: `${healthPct}%` }}></div>
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{healthy}/{state.heartbeats.length} daemons</div>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">💰 Revenue</div>
          <div className="kpi-value">${(totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="kpi-sub">{totalOrders} orders</div>
        </div>
        <div className="kpi"><div className="kpi-label">👕 Products</div><div className="kpi-value">{totalProducts}</div></div>
        <div className="kpi"><div className="kpi-label">🏛️ Tenants</div><div className="kpi-value">{state.tenants.length}</div></div>
        <div className="kpi"><div className="kpi-label">🧬 Skills</div><div className="kpi-value">{state.skill_counts.live}</div><div className="kpi-sub">{state.skill_counts.drafts} drafts</div></div>
        <div className="kpi"><div className="kpi-label">🔥 Best Streak</div><div className="kpi-value">{maxStreak}d</div></div>
        <div className="kpi"><div className="kpi-label">⚙️ Daemons</div><div className="kpi-value">{healthy}/{state.heartbeats.length}</div><div className="kpi-sub" style={{ color: stale > 0 ? "var(--red)" : "var(--muted)" }}>{stale} stale</div></div>
      </div>

      <div className="section-header">
        <div className="section-title">
          📋 Your To-Do — needs you{openTodos.length > 0 ? ` (${openTodos.length})` : ""}
        </div>
      </div>
      <div className={`todo-panel ${openTodos.length > 0 ? "has-items" : ""}`}>
        {openTodos.length === 0 ? (
          <div className="todo-empty">🎉 Nothing needs you right now — the agents have it covered.</div>
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
                    ✓ Done
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

      <div className="section-header"><div className="section-title">⚔ Heroes — click any card</div></div>
      {sortedTenants.length === 0 ? (
        <div style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>No heroes yet.</div>
      ) : (
        <div className="tenant-grid">
          {sortedTenants.map((t, i) => {
            const arch = ARCHETYPE_CLASSES[t.type] || { class: "Adventurer", icon: "🎯", color: "#6b7280" };
            const xp = t.orders * 1000 + (t.revenue_cents / 100) * 10 + 500 + t.streak * 50;
            const tlvl = levelFromXp(xp);
            return (
              <Link key={t.slug} href={`/admin/tenants/${t.slug}`} prefetch={false} className={`char-card ${i < 3 ? "rank-" + (i + 1) : ""}`} style={{ display: "block" }}>
                {i < 3 ? <div className="rank-badge">#{i + 1}</div> : null}
                <div className="char-level">LVL {tlvl}</div>
                <div className="char-header">
                  <div className="char-icon" style={{ color: arch.color }}>{arch.icon}</div>
                  <div>
                    <div className="char-name">{t.display_name}</div>
                    <div className="char-class" style={{ color: arch.color }}>{arch.class}</div>
                  </div>
                </div>
                {t.stage === "build-failed" ? (
                  <div className="build-failed-flag">⚠ Build failed — retry queued</div>
                ) : null}
                <div className="char-stats">
                  <div className="char-stat-label">💰 Revenue</div><div className="char-stat-value">${(t.revenue_cents / 100).toFixed(2)}</div>
                  <div className="char-stat-label">📦 Orders</div><div className="char-stat-value">{t.orders}</div>
                  <div className="char-stat-label">⚡ XP</div><div className="char-stat-value">{xp.toLocaleString()}</div>
                  <div className="char-stat-label">🔥 Streak</div><div className="char-stat-value streak-fire">{t.streak}d</div>
                </div>
                <div className="char-click-hint">→ Open dashboard</div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="section-header"><div className="section-title">📜 Empire Battle Log</div></div>
      <div className="battle-log">
        {state.empire_battle_log.length === 0
          ? <div style={{ color: "var(--muted)" }}>No activity.</div>
          : state.empire_battle_log.slice(0, 30).map((a, i) => (
            <div key={i} className="battle-entry">
              <div className="battle-time">{rel(a.ts)}</div>
              <div className="battle-tenant"><Link href={`/admin/tenants/${a.tenant}`} prefetch={false}>{a.tenant}</Link></div>
              <div><b>{a.actor}</b> → {a.action}</div>
            </div>
          ))
        }
      </div>

      <div className="section-header"><div className="section-title">⚙ Daemons</div></div>
      <div className="daemon-grid">
        {state.heartbeats.map((b, i) => (
          <div key={i} className="daemon">
            <div className={`daemon-status ${b.status}`}></div>
            <div className="daemon-name">{b.name}</div>
            {isFinite(b.ageMin) ? <div className="daemon-age">{b.ageMin}m</div> : null}
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 11, marginTop: 40 }}>
        Synced from local Mac · <form action="/api/admin/auth" method="POST" style={{ display: "inline" }}><button formMethod="DELETE" type="submit" style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 11, padding: 0, fontFamily: "inherit" }}>log out</button></form>
      </div>
    </div>
  );
}
