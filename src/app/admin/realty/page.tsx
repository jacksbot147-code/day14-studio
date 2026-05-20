import { loadTenantOps, type REEvaluation } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS } from "../layout-bits";

export const metadata = { title: "Realty — Day14 Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${Math.round((cents || 0) / 100).toLocaleString()}`;
}
function tierClass(tier: string) {
  return tier.startsWith("A") ? "a" : tier.startsWith("B") ? "b" : "c";
}

export default async function RealtyDashboard() {
  const ops = await loadTenantOps("day14-realty");
  const deals: REEvaluation[] = [...(ops.evaluations || [])].sort((a, b) => b.score - a.score);
  const propertyCount = (ops.properties || []).length;
  const tierA = deals.filter((d) => d.tier.startsWith("A")).length;
  const tierB = deals.filter((d) => d.tier.startsWith("B")).length;
  const totalValue = deals.reduce((s, d) => s + (d.value_cents || 0), 0);

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="realty" />
      <h1>Realty</h1>
      <div className="sub">
        Deal sourcing + evaluation · day14-realty segment
        {ops.generated_at ? ` · synced ${new Date(ops.generated_at).toLocaleString()}` : ""}
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
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
