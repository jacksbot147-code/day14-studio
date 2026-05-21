import { loadTenantOps } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS } from "../layout-bits";

export const metadata = { title: "AlignMD — Day14 Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function phaseStatus(s: string): { cls: string; label: string } {
  if (s === "done") return { cls: "stage-live", label: "Done" };
  if (s === "in_progress") return { cls: "stage-building", label: "In progress" };
  if (s === "scaffolded") return { cls: "stage-building", label: "Scaffolded" };
  return { cls: "stage-default", label: "Planned" };
}

export default async function AlignMdPage() {
  const ops = await loadTenantOps("alignmd");
  const build = ops.build;
  const phases = build?.phases ?? [];
  const done = phases.filter((p) => p.status === "done").length;
  const decisions = build?.decisions_pending ?? [];

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="alignmd" />
      <h1>AlignMD</h1>
      <div className="sub">
        {build?.tagline || "Precision Matching for Modern Healthcare"} · Day14 segment
      </div>

      {!build ? (
        <div className="section">
          <div className="empty">
            AlignMD was just registered as a segment — its build status appears here on
            the next state sync.
          </div>
        </div>
      ) : (
        <>
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <div className="kpi">
              <div className="kpi-label">Current phase</div>
              <div className="kpi-value">{build.current_phase ?? 0}</div>
              <div className="kpi-sub">of {Math.max(0, phases.length - 1)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Phases done</div>
              <div className="kpi-value">{done}/{phases.length}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Decisions open</div>
              <div className="kpi-value" style={{ color: decisions.length ? "var(--amber)" : "var(--text)" }}>
                {decisions.length}
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Stage</div>
              <div className="kpi-value" style={{ fontSize: 17 }}>Building</div>
            </div>
          </div>

          {build.summary ? (
            <div className="section" style={{ marginTop: 4 }}>
              <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
                {build.summary}
              </div>
            </div>
          ) : null}

          {build.next_action ? (
            <>
              <div className="section-header"><div className="section-title">Next action</div></div>
              <div className="todo-panel has-items">
                <div className="todo-row">
                  <div className="todo-seq">→</div>
                  <div className="todo-body">
                    <div className="todo-title">{build.next_action}</div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <div className="section-header"><div className="section-title">Build phases</div></div>
          <div className="biz-list">
            {phases.map((p) => {
              const st = phaseStatus(p.status);
              return (
                <div key={p.n} className="biz-row">
                  <div className="biz-main">
                    <div className="biz-name">Phase {p.n} — {p.name}</div>
                    <div className="biz-sub">{p.detail}</div>
                  </div>
                  <span className={`stage-pill ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
          </div>

          {decisions.length ? (
            <>
              <div className="section-header"><div className="section-title">Decisions to make</div></div>
              <div className="section">
                {decisions.map((d, i) => (
                  <div key={i} className="feed-row" style={{ gridTemplateColumns: "26px 1fr" }}>
                    <div className="feed-time">{i + 1}</div>
                    <div className="feed-text">{d}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="section-header"><div className="section-title">Project</div></div>
          <div className="section">
            <div className="sys-row">
              <span className="sys-label">Build plan</span>
              <span className="sys-value">{build.links?.build_plan || "AlignMD-Build-Plan.md"}</span>
            </div>
            <div className="sys-row">
              <span className="sys-label">Project folder</span>
              <span className="sys-value">{build.links?.project_dir || "~/Documents/alignmd/"}</span>
            </div>
            <div className="sys-row">
              <span className="sys-label">Updated</span>
              <span className="sys-value">
                {build.updated_at ? new Date(build.updated_at).toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
