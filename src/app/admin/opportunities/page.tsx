import { loadEmpireState } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS } from "../layout-bits";

export const metadata = { title: "Ideas — Day14 Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const state = await loadEmpireState();
  const opps = state.opportunities || [];

  const buckets = {
    pitched: opps.filter((o) => o.pitched && o.status === "open"),
    open: opps.filter((o) => !o.pitched && o.status === "open"),
    launching: opps.filter((o) => o.status === "launching"),
    skipped: opps.filter((o) => o.status === "skipped"),
  };

  const bucketLabels: Record<string, string> = {
    pitched: "📩 Pitched — ready to launch",
    open: "🆕 New (unpitched)",
    launching: "🚀 Launching",
    skipped: "⏭ Skipped",
  };

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="opps" />
      <h1>💡 Opportunities</h1>
      <div className="sub">{opps.length} ideas scanned · {buckets.pitched.length} pitched · {buckets.launching.length} launching</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi"><div className="kpi-label">🆕 New</div><div className="kpi-value">{buckets.open.length}</div></div>
        <div className="kpi"><div className="kpi-label">📩 Pitched</div><div className="kpi-value">{buckets.pitched.length}</div></div>
        <div className="kpi"><div className="kpi-label">🚀 Launching</div><div className="kpi-value">{buckets.launching.length}</div></div>
        <div className="kpi"><div className="kpi-label">⏭ Skipped</div><div className="kpi-value">{buckets.skipped.length}</div></div>
      </div>

      {(["pitched", "open", "launching", "skipped"] as const).map((bucket) => {
        const items = buckets[bucket];
        if (items.length === 0) return null;
        return (
          <div key={bucket}>
            <div className="section-header"><div className="section-title">{bucketLabels[bucket]} ({items.length})</div></div>
            {items.slice(0, 20).map((o) => {
              const score = o.total_score || 0;
              const tier = score >= 85 ? "high" : score >= 70 ? "medium" : "low";
              return (
                <div key={o.id} className="opp-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {o.suggested_archetype || "?"} · {o.id}
                      </div>
                      <h3 style={{ fontSize: 16, marginBottom: 8 }}>{o.niche || o.id}</h3>
                      <div style={{ fontSize: 12, color: "var(--text)", opacity: 0.85, lineHeight: 1.5 }}>{o.rationale}</div>
                      {o.pitched ? (
                        <div style={{ marginTop: 10 }}>
                          <code style={{ color: "var(--accent)", fontSize: 11 }}>bootstrap-pitch {o.id}</code>
                          <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 11 }}>(send via Telegram)</span>
                        </div>
                      ) : null}
                    </div>
                    <div className={`opp-score-badge ${tier}`}>{score}</div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="section-header"><div className="section-title">⚡ Telegram commands</div></div>
      <div className="section">
        <div style={{ fontSize: 12, lineHeight: 1.8, color: "var(--muted)" }}>
          <code style={{ color: "var(--accent)" }}>bootstrap-pitch &lt;id&gt;</code> — launch the business<br />
          <code style={{ color: "var(--accent)" }}>show pitch &lt;id&gt;</code> — show full pitch text<br />
          <code style={{ color: "var(--accent)" }}>skip-pitch &lt;id&gt;</code> — retire opportunity<br />
        </div>
      </div>
    </div>
  );
}
