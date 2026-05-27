import Link from "next/link";
import { loadEmpireState } from "@/lib/admin-state";
import { getActiveTenants } from "@/lib/tenants";
import { buildForecast, type ForecastResult, type ForecastPoint } from "@/lib/mrr-forecast";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import { Card, EmptyState } from "@/components/ui";

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

function fmtMoney(dollars: number): string {
  return `$${Math.round(dollars).toLocaleString()}`;
}

function fmtMoneyCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

  // Forecast: live tenant MRR snapshot + JSONL history → 90-day projection.
  const tenants = getActiveTenants();
  const currentTenantMrr: Record<string, number> = {};
  const tenantNameBySlug: Record<string, string> = {};
  for (const t of tenants) {
    currentTenantMrr[t.slug] = t.billing?.monthly_amount ?? 0;
    tenantNameBySlug[t.slug] = t.name;
  }
  // Fall back to display_name from empire-state when the live registry is unavailable.
  for (const t of state.tenants) {
    if (!tenantNameBySlug[t.slug]) tenantNameBySlug[t.slug] = t.display_name;
  }
  const forecast = await buildForecast(currentTenantMrr);

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="finance" />
      <h1>Finance</h1>
      <PageHint>
        Revenue and the cross-tenant money rollup — what every business earns,
        added up.
      </PageHint>
      <div className="sub">Empire-wide P&amp;L · synced from local Mac</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi"><div className="kpi-label">Revenue</div><div className="kpi-value">{fmtMoneyCents(totalRev)}</div><div className="kpi-sub">{totalOrders} orders</div></div>
        <div className="kpi"><div className="kpi-label">COGS</div><div className="kpi-value">{fmtMoneyCents(totalCogs)}</div></div>
        <div className="kpi"><div className="kpi-label">Gross</div><div className="kpi-value" style={{ color: grossEmpire >= 0 ? "var(--green)" : "var(--red)" }}>{fmtMoneyCents(grossEmpire)}</div></div>
        <div className="kpi"><div className="kpi-label">Margin</div><div className="kpi-value">{marginEmpire.toFixed(0)}%</div></div>
      </div>

      <ForecastSection forecast={forecast} tenantNameBySlug={tenantNameBySlug} />

      <div className="section-header"><div className="section-title">Per-tenant P&L</div></div>
      <Card>
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
                <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>{fmtMoneyCents(r.revenue_cents)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>{fmtMoneyCents(r.cogs)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right", color: r.gross >= 0 ? "var(--green)" : "var(--red)" }}>{fmtMoneyCents(r.gross)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>{r.margin.toFixed(0)}%</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, background: "var(--surface-2)" }}>
              <td style={{ padding: "10px 12px" }}>EMPIRE</td>
              <td></td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{totalOrders}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtMoneyCents(totalRev)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtMoneyCents(totalCogs)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: grossEmpire >= 0 ? "var(--green)" : "var(--red)" }}>{fmtMoneyCents(grossEmpire)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{marginEmpire.toFixed(0)}%</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Forecast section ────────────────────────────────────────────────────────

function ForecastSection({
  forecast,
  tenantNameBySlug,
}: {
  forecast: ForecastResult;
  tenantNameBySlug: Record<string, string>;
}) {
  if (forecast.kind === "no-data") {
    return (
      <>
        <div className="section-header"><div className="section-title">Forecast</div></div>
        <EmptyState
          icon="📈"
          headline="Not enough MRR history to project yet."
          hint={
            <>
              The forecaster needs a few daily snapshots before it can fit a
              trend. The MRR aggregator runs nightly and writes to{" "}
              <code>~/Documents/businesses/_shared/finance/mrr-history.jsonl</code> —
              forecasts firm up after 7+ days of data.
            </>
          }
        />
      </>
    );
  }

  const isEarly = forecast.kind === "early-signal";
  const title = isEarly ? "Early signal" : "Forecast";
  const subtitle = isEarly
    ? `Based on ${forecast.pointCount} day${forecast.pointCount === 1 ? "" : "s"} of history — extrapolation will firm up once 7+ days are in.`
    : `Linear projection over ${forecast.pointCount} days of MRR history.`;

  return (
    <>
      <div className="section-header"><div className="section-title">{title}</div></div>
      <Card>
        <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 14 }}>{subtitle}</div>

        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 16 }}>
          <ForecastKpi label="Today" mrr={forecast.current_mrr} arr={forecast.current_arr} />
          <ForecastKpi label="30 days" mrr={forecast.projected_30d_mrr} arr={forecast.projected_30d_arr} baseline={forecast.current_mrr} />
          <ForecastKpi label="60 days" mrr={forecast.projected_60d_mrr} arr={forecast.projected_60d_arr} baseline={forecast.current_mrr} />
          <ForecastKpi label="90 days" mrr={forecast.projected_90d_mrr} arr={forecast.projected_90d_arr} baseline={forecast.current_mrr} />
        </div>

        <ForecastChart history={forecast.history} projection={forecast.projection} />
      </Card>

      <div className="section-header"><div className="section-title">Per-tenant forecast</div></div>
      <Card>
        {forecast.per_tenant.length === 0 ? (
          <EmptyState
            icon="🏷️"
            headline="No tenants on the forecast yet."
            hint={
              <>
                Per-tenant MRR splits land here once any business posts revenue —
                Printify orders for the merch stores, Stripe for subscription
                businesses. The empire-wide MRR above still projects from the
                aggregate.
              </>
            }
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid var(--border)" }}>Tenant</th>
                <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>Current MRR</th>
                <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>30d</th>
                <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>60d</th>
                <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>90d projected</th>
                <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {forecast.per_tenant.map((t) => {
                const delta = t.projected_90d - t.current_mrr;
                const pct = t.current_mrr > 0 ? (delta / t.current_mrr) * 100 : 0;
                const color =
                  delta > 0 ? "var(--green)" : delta < 0 ? "var(--red)" : "var(--muted)";
                const sign = delta > 0 ? "+" : "";
                return (
                  <tr key={t.slug}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                      <Link href={`/admin/tenants/${t.slug}`} style={{ color: "var(--accent)" }}>
                        {tenantNameBySlug[t.slug] ?? t.slug}
                      </Link>
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>{fmtMoney(t.current_mrr)}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--muted)" }}>{fmtMoney(t.projected_30d)}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--muted)" }}>{fmtMoney(t.projected_60d)}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>{fmtMoney(t.projected_90d)}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", textAlign: "right", color }}>
                      {sign}{fmtMoney(delta)} ({sign}{pct.toFixed(0)}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function ForecastKpi({
  label,
  mrr,
  arr,
  baseline,
}: {
  label: string;
  mrr: number;
  arr: number;
  baseline?: number;
}) {
  let deltaNode: React.ReactNode = null;
  if (typeof baseline === "number") {
    const delta = mrr - baseline;
    const pct = baseline > 0 ? (delta / baseline) * 100 : 0;
    const color =
      delta > 0 ? "var(--green)" : delta < 0 ? "var(--red)" : "var(--muted)";
    const sign = delta > 0 ? "+" : "";
    deltaNode = (
      <div className="kpi-sub" style={{ color }}>
        {sign}{fmtMoney(delta)} ({sign}{pct.toFixed(0)}%)
      </div>
    );
  }
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{fmtMoney(mrr)}</div>
      <div className="kpi-sub">ARR {fmtMoney(arr)}</div>
      {deltaNode}
    </div>
  );
}

// ── Hand-rolled SVG chart ───────────────────────────────────────────────────

function ForecastChart({
  history,
  projection,
}: {
  history: ForecastPoint[];
  projection: ForecastPoint[];
}) {
  const W = 800;
  const H = 280;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const allPoints: ForecastPoint[] = [...history, ...projection];
  if (allPoints.length === 0) {
    return null;
  }
  const minX = allPoints[0]!.dayIndex;
  const maxX = allPoints[allPoints.length - 1]!.dayIndex;
  const xSpan = Math.max(1, maxX - minX);
  let maxY = 0;
  for (const p of allPoints) if (p.value > maxY) maxY = p.value;
  if (maxY <= 0) maxY = 1;
  // Round max up to a "nice" number so the y-axis labels read cleanly.
  const niceMax = niceCeiling(maxY);

  const xAt = (dayIndex: number): number =>
    padL + ((dayIndex - minX) / xSpan) * plotW;
  const yAt = (value: number): number =>
    padT + plotH - (value / niceMax) * plotH;

  const historyPath = pointsToPath(history.map((p) => [xAt(p.dayIndex), yAt(p.value)]));
  const projectionPath = pointsToPath(projection.map((p) => [xAt(p.dayIndex), yAt(p.value)]));

  // Vertical "today" marker — the first projection point.
  const todayX = projection.length > 0 ? xAt(projection[0]!.dayIndex) : null;

  // Y-axis ticks: 0, 1/4, 1/2, 3/4, max.
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax);
  // X-axis ticks: first history date, today, today + 90.
  const xTicks: Array<{ x: number; label: string }> = [];
  if (history.length > 0) {
    xTicks.push({ x: xAt(history[0]!.dayIndex), label: history[0]!.date.slice(5) });
  }
  if (projection.length > 0) {
    xTicks.push({ x: xAt(projection[0]!.dayIndex), label: "today" });
    const last = projection[projection.length - 1]!;
    xTicks.push({ x: xAt(last.dayIndex), label: last.date.slice(5) });
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="MRR history and 90-day forecast"
      >
        {/* Plot frame */}
        <rect
          x={padL}
          y={padT}
          width={plotW}
          height={plotH}
          fill="var(--surface-2)"
          stroke="var(--border)"
        />

        {/* Y-axis gridlines + labels */}
        {yTicks.map((v, i) => {
          const y = yAt(v);
          return (
            <g key={`y-${i}`}>
              <line
                x1={padL}
                x2={padL + plotW}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray={i === 0 ? "" : "2 4"}
              />
              <text
                x={padL - 8}
                y={y + 4}
                fontSize={10}
                fill="var(--muted)"
                textAnchor="end"
                fontFamily="var(--mono, monospace)"
              >
                {`$${Math.round(v).toLocaleString()}`}
              </text>
            </g>
          );
        })}

        {/* "Today" divider */}
        {todayX !== null && (
          <line
            x1={todayX}
            x2={todayX}
            y1={padT}
            y2={padT + plotH}
            stroke="var(--accent)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.6}
          />
        )}

        {/* History line — solid */}
        {historyPath !== "" && (
          <path
            d={historyPath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Projection line — dashed */}
        {projectionPath !== "" && (
          <path
            d={projectionPath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 5"
            opacity={0.85}
          />
        )}

        {/* X-axis labels */}
        {xTicks.map((t, i) => (
          <text
            key={`x-${i}`}
            x={t.x}
            y={H - 10}
            fontSize={10}
            fill="var(--muted)"
            textAnchor="middle"
            fontFamily="var(--mono, monospace)"
          >
            {t.label}
          </text>
        ))}

        {/* Legend */}
        <g transform={`translate(${padL + 8}, ${padT + 12})`}>
          <line x1={0} x2={22} y1={0} y2={0} stroke="var(--accent)" strokeWidth={2} />
          <text x={28} y={3} fontSize={10} fill="var(--text-2)">history</text>
          <line x1={92} x2={114} y1={0} y2={0} stroke="var(--accent)" strokeWidth={2} strokeDasharray="6 5" />
          <text x={120} y={3} fontSize={10} fill="var(--text-2)">projection</text>
        </g>
      </svg>
    </div>
  );
}

function pointsToPath(points: Array<[number, number]>): string {
  if (points.length === 0) return "";
  const parts: string[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]!;
    parts.push(`${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`);
  }
  return parts.join(" ");
}

/** Round `n` up to the next "nice" number for a y-axis ceiling. */
function niceCeiling(n: number): number {
  if (n <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / pow;
  let nice: number;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
}
