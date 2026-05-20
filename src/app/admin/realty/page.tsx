import { loadTenantOps, type REEvaluation, type RETarget } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS } from "../layout-bits";

export const metadata = { title: "Realty — Day14 Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${Math.round((cents || 0) / 100).toLocaleString()}`;
}
function tierClass(tier: string) {
  return tier.startsWith("A") ? "a" : tier.startsWith("B") ? "b" : "c";
}
function targetStatus(status: string): { cls: string; label: string } {
  if (status === "active") return { cls: "stage-live", label: "Active" };
  if (status === "needs-csv") return { cls: "stage-building", label: "Needs CSV" };
  return { cls: "stage-default", label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Queued" };
}
function rel(iso: string | null | undefined) {
  if (!iso) return "not yet";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 3_600_000) return `${Math.max(1, Math.round(ms / 60_000))}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

export default async function RealtyDashboard() {
  const ops = await loadTenantOps("day14-realty");
  const deals: REEvaluation[] = [...(ops.evaluations || [])].sort((a, b) => b.score - a.score);
  const propertyCount = (ops.properties || []).length;
  const tierA = deals.filter((d) => d.tier.startsWith("A")).length;
  const tierB = deals.filter((d) => d.tier.startsWith("B")).length;
  const totalValue = deals.reduce((s, d) => s + (d.value_cents || 0), 0);
  const targets: RETarget[] = [...(ops.targets || [])].sort((a, b) =>
    (a.last_scanned_at || "") < (b.last_scanned_at || "") ? 1 : -1
  );

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="realty" />
      <h1>Realty</h1>
      <div className="sub">
        Deal sourcing + evaluation · day14-realty segment
        {ops.generated_at ? ` · synced ${new Date(ops.generated_at).toLocaleString()}` : ""}
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div className="kpi">
          <div className="kpi-label">Counties watched</div>
          <div className="kpi-value">{targets.length}</div>
          <div className="kpi-sub">{targets.filter((t) => t.status === "active").length} active</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Properties</div>
          <div className="kpi-value">{propertyCount}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">A-tier</div>
          <div className="kpi-value" style={{ color: "var(--green)" }}>{tierA}</div>
          <div className="kpi-sub">pursue now</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">B-tier</div>
          <div className="kpi-value" style={{ color: "var(--gold)" }}>{tierB}</div>
          <div className="kpi-sub">worth a look</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Tracked value</div>
          <div className="kpi-value">{money(totalValue)}</div>
        </div>
      </div>

      <div className="section-header"><div className="section-title">County watch list</div></div>
      {targets.length === 0 ? (
        <div className="section">
          <div className="empty">
            No counties on the watch list yet. Telegram a county or metro to the bot —
            e.g. <code>realty Lee County, FL</code> or <code>realty Tampa Bay area</code> —
            and the scout starts sourcing automatically.
          </div>
        </div>
      ) : (
        <div className="biz-list">
          {targets.map((t) => {
            const st = targetStatus(t.status);
            return (
              <div key={t.id} className="biz-row">
                <div className="biz-main">
                  <div className="biz-name">{t.label}</div>
                  <div className="biz-sub">
                    scanned {rel(t.last_scanned_at)}
                    {t.status === "needs-csv" ? " · awaiting county records CSV" : ""}
                  </div>
                </div>
                <span className={`stage-pill ${st.cls}`}>{st.label}</span>
                <div className="biz-stats">
                  <div className="biz-stat">
                    <div className="biz-stat-num">{t.properties_sourced}</div>
                    <div className="biz-stat-label">Properties</div>
                  </div>
                  <div className="biz-stat">
                    <div className="biz-stat-num">{t.a_tier}</div>
                    <div className="biz-stat-label">A-tier</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="section-header"><div className="section-title">Ranked deals</div></div>
      {deals.length === 0 ? (
        <div className="section" style={{ color: "var(--muted)", textAlign: "center", padding: 28, lineHeight: 1.6 }}>
          No properties scored yet. Drop a county property-appraiser CSV export into{" "}
          <code style={{ color: "var(--accent)" }}>businesses/day14-realty/intake/</code> — the Real-Estate
          Scout ingests and scores it on its next run.
        </div>
      ) : (
        <div className="section" style={{ display: "grid", gap: 10 }}>
          {deals.map((d) => (
            <div key={d.property_id} className={`deal deal-${tierClass(d.tier)}`}>
              <div className="deal-score">{d.score}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="deal-addr">
                  {d.address || "(no address)"}
                  {d.city ? `, ${d.city}` : ""}
                </div>
                <div className="deal-meta">
                  {d.tier} · best play: <b>{d.best_play}</b> · est. value {money(d.value_cents)}
                </div>
                {d.signals.length > 0 ? (
                  <div className="deal-sigs">
                    {d.signals.map((s) => (
                      <span key={s} className="deal-chip">{s}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="deal-plays">
                <span>flip {d.flip.score}</span>
                <span>rent {d.rental.score}</span>
                <span>whlsl {d.wholesale.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
