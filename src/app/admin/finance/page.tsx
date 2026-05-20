import Link from "next/link";
import { loadEmpireState } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS } from "../layout-bits";

export const metadata = { title: "Finance — Day14 Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

interface Cogs { per_order_cents: number; fixed_monthly_cents: number }

const DEFAULT_COGS: Cogs = { per_order_cents: 800, fixed_monthly_cents: 0 };

const COGS_BY_TYPE: Record<string, Cogs> = {
  "pod-store": { per_order_cents: 800, fixed_monthly_cents: 0 },
  "newsletter": { per_order_cents: 50, fixed_monthly_cents: 2900 },
  "course": { per_order_cents: 500, fixed_monthly_cents: 5900 },
  "info-product": { per_order_cents: 100, fixed_monthly_cents: 0 },
  "saas": { per_order_cents: 200, fixed_monthly_cents: 0 },
  "agency": { per_order_cents: 50000, fixed_monthly_cents: 0 },
  "consulting": { per_order_cents: 5000, fixed_monthly_cents: 0 },
  "physical-product": { per_order_cents: 1500, fixed_monthly_cents: 0 },
  "affiliate-site": { per_order_cents: 0, fixed_monthly_cents: 0 },
};

export default async function FinancePage() {
  const state = await loadEmpireState();
  const rows = state.tenants.map((t) => {
    const cogs: Cogs = COGS_BY_TYPE[t.type] ?? DEFAULT_COGS;
    const rev = t.revenue_cents;
    const cogsTotal = t.orders * cogs.per_order_cents + cogs.fixed_monthly_cents;
    const gross = rev - cogsTotal;
    const margin = rev > 0 ? (gross / rev) * 100 : 0;
    return { ...t, cogs: cogsTotal, gross, margin };
  });
  const totalRev = rows.reduce((s, r) => s + r.revenue_cents, 0);
  const totalCogs = rows.reduce((s, r) => s + r.cogs, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  const grossEmpire = totalRev - totalCogs;
  const marginEmpire = totalRev > 0 ? (grossEmpire / totalRev) * 100 : 0;

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="finance" />
      <h1>Finance</h1>
      <div className="sub">Empire-wide P&L · synced from local Mac</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi"><div className="kpi-label">Revenue</div><div className="kpi-value">${(totalRev / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div className="kpi-sub">{totalOrders} orders</div></div>
        <div className="kpi"><div className="kpi-label">COGS</div><div className="kpi-value">${(totalCogs / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="kpi"><div className="kpi-label">Gross</div><div className="kpi-value" style={{ color: grossEmpire >= 0 ? "var(--green)" : "var(--red)" }}>${(grossEmpire / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="kpi"><div className="kpi-label">Margin</div><div className="kpi-value">{marginEmpire.toFixed(0)}%</div></div>
      </div>

      <div className="section-header"><div className="section-title">Per-tenant P&L</div></div>
      <div className="section">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid var(--border)" }}>Tenant</th>
              <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid var(--border)" }}>Type</th>
              <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>Orders</th>
              <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>Revenue</th>
              <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>COGS</th>
              <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>Gross</th>
              <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug}>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                  <Link href={`/admin/tenants/${r.slug}`} style={{ color: "var(--accent)" }}>{r.display_name}</Link>
                </td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: 12 }}>{r.type}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>{r.orders}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>${(r.revenue_cents / 100).toFixed(2)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>${(r.cogs / 100).toFixed(2)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right", color: r.gross >= 0 ? "var(--green)" : "var(--red)" }}>${(r.gross / 100).toFixed(2)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>{r.margin.toFixed(0)}%</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, background: "var(--surface-2)" }}>
              <td style={{ padding: "10px 12px" }}>EMPIRE</td>
              <td></td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{totalOrders}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>${(totalRev / 100).toFixed(2)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>${(totalCogs / 100).toFixed(2)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: grossEmpire >= 0 ? "var(--green)" : "var(--red)" }}>${(grossEmpire / 100).toFixed(2)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{marginEmpire.toFixed(0)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
