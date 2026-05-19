import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEmpireState, fetchPrintifyProducts, levelFromXp, xpForLevel } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS } from "../../layout-bits";

export const dynamic = "force-dynamic";

const ARCHETYPE_CLASSES: Record<string, { class: string; icon: string; color: string }> = {
  "pod-store": { class: "Merchant", icon: "👕", color: "#f59e0b" },
  "newsletter": { class: "Bard", icon: "📜", color: "#a855f7" },
  "saas": { class: "Engineer", icon: "⚙️", color: "#06b6d4" },
  "course": { class: "Scholar", icon: "📚", color: "#10b981" },
};

function rel(iso: string) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
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

  const products = await fetchPrintifyProducts();
  const arch = ARCHETYPE_CLASSES[tenant.type] || { class: "Adventurer", icon: "🎯", color: "#6b7280" };
  const xp = tenant.orders * 1000 + (tenant.revenue_cents / 100) * 10 + 500 + tenant.streak * 50;
  const level = levelFromXp(xp);
  const xpToNext = xpForLevel(level + 1) - xp;
  const xpPct = ((xp - xpForLevel(level)) / (xpForLevel(level + 1) - xpForLevel(level))) * 100;

  const contentEntries = [
    { icon: "📌", num: tenant.content_counts.pinterestPins, label: "Pinterest pins" },
    { icon: "🎬", num: tenant.content_counts.tiktokScripts, label: "TikTok scripts" },
    { icon: "📝", num: tenant.content_counts.blogDrafts, label: "Blog drafts" },
    { icon: "📧", num: tenant.content_counts.newsletterIssues, label: "Newsletter issues" },
    { icon: "🎥", num: tenant.content_counts.aiVideos, label: "AI videos" },
    { icon: "📨", num: tenant.content_counts.csDrafts, label: "CS drafts" },
    { icon: "📣", num: tenant.content_counts.marketingDrafts, label: "Marketing drafts" },
    { icon: "📹", num: tenant.content_counts.rawFootage, label: "Raw footage" },
    { icon: "👽", num: tenant.content_counts.redditDrafts, label: "Reddit drafts" },
  ];

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="empire" />
      <div className="crumb"><Link href="/admin">← Empire</Link> / {slug}</div>
      <h1>{arch.icon} {tenant.display_name}</h1>
      <div className="sub" style={{ color: arch.color }}>{arch.class} · {tenant.type} · {tenant.stage} · {tenant.tagline || ""}</div>

      <div className="empire-bar">
        <div className="empire-row">
          <div className="level-badge">
            <div className="level-num">{level}</div>
            <div className="level-label">Tenant Level</div>
          </div>
          <div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${Math.max(0, Math.min(100, xpPct)).toFixed(1)}%` }}></div>
              <div className="xp-text">{xp.toLocaleString()} XP · {xpToNext.toLocaleString()} to level {level + 1}</div>
            </div>
          </div>
          <div className="health-badge">
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Streak</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "var(--gold)" }}>🔥 {tenant.streak}d</div>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">💰 Revenue</div><div className="kpi-value">${(tenant.revenue_cents / 100).toFixed(2)}</div><div className="kpi-sub">{tenant.orders} orders</div></div>
        <div className="kpi"><div className="kpi-label">👕 Products</div><div className="kpi-value">{products.filter((p: { visible?: boolean }) => p.visible !== false).length}</div></div>
        <div className="kpi"><div className="kpi-label">⏳ Queued</div><div className="kpi-value">{tenant.queue.queued}</div></div>
        <div className="kpi"><div className="kpi-label">✓ Approved</div><div className="kpi-value">{tenant.queue.approved}</div></div>
        <div className="kpi"><div className="kpi-label">📤 Posted</div><div className="kpi-value">{tenant.queue.posted}</div></div>
        <div className="kpi"><div className="kpi-label">📨 CS</div><div className="kpi-value">{tenant.content_counts.csDrafts}</div></div>
      </div>

      <div className="section-header"><div className="section-title">📚 Content factory output</div></div>
      <div className="content-grid">
        {contentEntries.map((e, i) => (
          <div key={i} className="content-stat">
            <div className="content-stat-icon">{e.icon}</div>
            <div className="content-stat-num">{e.num}</div>
            <div className="content-stat-label">{e.label}</div>
          </div>
        ))}
      </div>

      <div className="section-header"><div className="section-title">🚦 Social queue</div></div>
      {Object.keys(tenant.queue.byPlatform).length === 0 ? (
        <div style={{ color: "var(--muted)", padding: 20 }}>No content queued yet.</div>
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

      <div className="section-header"><div className="section-title">📜 Activity log</div></div>
      <div className="battle-log">
        {tenant.recent_audit.length === 0
          ? <div style={{ color: "var(--muted)" }}>No activity logged yet.</div>
          : tenant.recent_audit.map((a, i) => (
            <div key={i} className="battle-entry">
              <div className="battle-time">{rel(a.ts)}</div>
              <div className="battle-tenant">{a.actor || "?"}</div>
              <div>{a.action || ""}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
