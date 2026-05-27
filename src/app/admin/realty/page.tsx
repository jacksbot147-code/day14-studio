import { loadTenantOps, loadEmpireState, type REEvaluation, type RETarget } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import { AddCountyBox, UploadCsvBox, DealBoard } from "./realty-interactive";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Realty — Day14 Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${Math.round((cents || 0) / 100).toLocaleString()}`;
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
  const empire = await loadEmpireState();
  const botUsername = empire.bot_username || null;
  const deals: REEvaluation[] = [...(ops.evaluations || [])].sort((a, b) => b.score - a.score);
  const propertyCount = (ops.properties || []).length;
  const tierA = deals.filter((d) => d.tier.startsWith("A")).length;
  const tierB = deals.filter((d) => d.tier.startsWith("B")).length;
  const totalValue = deals.reduce((s, d) => s + (d.value_cents || 0), 0);
  const targets: RETarget[] = [...(ops.targets || [])].sort((a, b) =>
    (a.last_scanned_at || "") < (b.last_scanned_at || "") ? 1 : -1
  );
  const fresh = ops.freshness;
  const spark = (fresh?.history || []).slice(-30);
  const sparkMax = Math.max(1, ...spark.map((h) => h.total_properties));

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="realty" />
      <h1>Realty</h1>
      <PageHint>
        Your scored property deal board — click any property to open its full
        gameplan.
      </PageHint>
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

      {fresh ? (
        <>
          <div className="section-header"><div className="section-title">Pipeline freshness</div></div>
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <div className="kpi">
              <div className="kpi-label">Added last run</div>
              <div
                className="kpi-value"
                style={fresh.added_last_run > 0 ? { color: "var(--green)" } : undefined}
              >
                {fresh.added_last_run > 0 ? "+" : ""}
                {fresh.added_last_run.toLocaleString()}
              </div>
              <div className="kpi-sub">updated {rel(fresh.updated_at)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Added (7 days)</div>
              <div
                className="kpi-value"
                style={fresh.added_7d > 0 ? { color: "var(--green)" } : undefined}
              >
                {fresh.added_7d > 0 ? "+" : ""}
                {fresh.added_7d.toLocaleString()}
              </div>
              <div className="kpi-sub">{fresh.runs_tracked ?? 0} runs tracked</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Enriched</div>
              <div className="kpi-value">{fresh.enriched_pct}%</div>
              <div className="kpi-sub">
                {fresh.enriched_count.toLocaleString()} of {fresh.total_properties.toLocaleString()}
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Counties live</div>
              <div className="kpi-value">{fresh.active_counties}</div>
              <div className="kpi-sub">{fresh.counties} on watch list</div>
            </div>
          </div>
          {spark.length > 1 ? (
            <div
              className="section"
              style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 64 }}
            >
              {spark.map((h, i) => (
                <div
                  key={h.ts || i}
                  title={`${new Date(h.ts).toLocaleDateString()} — ${h.total_properties.toLocaleString()} properties`}
                  style={{
                    flex: 1,
                    height: `${Math.max(4, (h.total_properties / sparkMax) * 100)}%`,
                    background: "var(--green)",
                    opacity: 0.3 + 0.7 * ((i + 1) / spark.length),
                    borderRadius: 2,
                  }}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="section-header"><div className="section-title">County watch list</div></div>
      <AddCountyBox botUsername={botUsername} />
      {targets.length === 0 ? (
        <EmptyState
          icon="🗺️"
          headline="No counties on the watch list yet."
          hint={
            <>
              Add one with the box above, or Telegram the bot — e.g.{" "}
              <code>realty Lee County, FL</code> or{" "}
              <code>realty Tampa Bay area</code> — and the scout starts sourcing
              automatically. Watch-list counties feed{" "}
              <code>re-county-data-fetcher</code> and then the deal board.
            </>
          }
        />
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

      <UploadCsvBox targets={targets} />

      <div className="section-header"><div className="section-title">Ranked deals</div></div>
      <DealBoard deals={deals} />
    </div>
  );
}
