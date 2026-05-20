import { loadEmpireState } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS } from "../layout-bits";

export const metadata = { title: "Health — Day14 Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const state = await loadEmpireState();
  const stale = state.heartbeats.filter((h) => h.status === "stale");
  const healthy = state.heartbeats.filter((h) => h.status === "healthy");
  const overall = stale.length > 3 ? "critical" : stale.length > 0 ? "degraded" : "healthy";

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="empire" />
      <h1>System Health</h1>
      <div className="sub">Status: {overall} · {state.heartbeats.length} daemons monitored</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi"><div className="kpi-label">Healthy</div><div className="kpi-value" style={{ color: "var(--green)" }}>{healthy.length}</div></div>
        <div className="kpi"><div className="kpi-label">Stale</div><div className="kpi-value" style={{ color: stale.length ? "var(--red)" : "var(--text)" }}>{stale.length}</div></div>
        <div className="kpi"><div className="kpi-label">Businesses</div><div className="kpi-value">{state.tenants.length}</div></div>
        <div className="kpi"><div className="kpi-label">Skills</div><div className="kpi-value">{state.skill_counts.live}</div></div>
      </div>

      {stale.length > 0 && (
        <>
          <div className="section-header"><div className="section-title">Stale daemons — auto-restart within 5 min</div></div>
          <div className="daemon-grid">
            {stale.map((d, i) => (
              <div key={i} className="daemon">
                <div className="daemon-status stale"></div>
                <div className="daemon-name">{d.name}</div>
                <div className="daemon-age">{d.ageMin}m</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-header"><div className="section-title">Healthy daemons</div></div>
      <div className="daemon-grid">
        {healthy.map((d, i) => (
          <div key={i} className="daemon">
            <div className="daemon-status healthy"></div>
            <div className="daemon-name">{d.name}</div>
            <div className="daemon-age">{d.ageMin}m</div>
          </div>
        ))}
      </div>

      <div className="section-header"><div className="section-title">Telegram /health command</div></div>
      <div className="section">
        <div style={{ fontSize: 12, lineHeight: 1.8, color: "var(--muted)" }}>
          Send <code style={{ color: "var(--accent)" }}>/health</code> in Telegram any time for a live snapshot — daemon health, outbox depth, recent errors, git state.
        </div>
      </div>
    </div>
  );
}
