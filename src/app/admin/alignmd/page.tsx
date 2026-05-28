import { loadTenantOps } from "@/lib/admin-state";
import { loadAlignmdSummary } from "@/lib/alignmd-bridge";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import { Card, EmptyState, Kpi, StatusBanner } from "@/components/ui";

export const metadata = { title: "AlignMD — Day14 Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function phaseStatus(s: string): { cls: string; label: string } {
  if (s === "done") return { cls: "stage-live", label: "Done" };
  if (s === "in_progress") return { cls: "stage-building", label: "In progress" };
  if (s === "scaffolded") return { cls: "stage-building", label: "Scaffolded" };
  return { cls: "stage-default", label: "Planned" };
}

/**
 * Human-friendly relative time for ISO commit timestamps, e.g.
 * "3 hours ago" / "in 2 minutes". Falls back to the raw string if
 * the input can't be parsed — defensive because git timestamps come
 * from the live repo and we don't fully control their format.
 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso;
  const diffSec = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3_600), "hour");
  if (abs < 86_400 * 30) return rtf.format(Math.round(diffSec / 86_400), "day");
  if (abs < 86_400 * 365)
    return rtf.format(Math.round(diffSec / (86_400 * 30)), "month");
  return rtf.format(Math.round(diffSec / (86_400 * 365)), "year");
}

export default async function AlignMdPage() {
  const [ops, repo] = await Promise.all([
    loadTenantOps("alignmd"),
    loadAlignmdSummary(),
  ]);
  const build = ops.build;
  const phases = build?.phases ?? [];
  const done = phases.filter((p) => p.status === "done").length;
  const decisions = build?.decisions_pending ?? [];

  const repoBanner = (() => {
    if (!repo.reachable) {
      return {
        tone: "warn" as const,
        headline: "AlignMD repo not reachable from this host.",
        detail: `Expected at ${repo.repo_path}. Live repo state is only readable on the Mac where Day14 is developed.`,
      };
    }
    const dirty = (repo.uncommitted_files ?? 0) > 0;
    const ahead = (repo.unpushed_commits ?? 0) > 0;
    const pend = repo.pending_migrations.length;
    if (dirty || ahead || pend > 0) {
      const bits: string[] = [];
      if (dirty) bits.push(`${repo.uncommitted_files} uncommitted file${repo.uncommitted_files === 1 ? "" : "s"}`);
      if (ahead) bits.push(`${repo.unpushed_commits} unpushed commit${repo.unpushed_commits === 1 ? "" : "s"}`);
      if (pend > 0) bits.push(`${pend} migration${pend === 1 ? "" : "s"} pending`);
      return {
        tone: "warn" as const,
        headline: `AlignMD has work in flight on ${repo.branch ?? "(unknown branch)"}.`,
        detail: bits.join(" · "),
      };
    }
    return {
      tone: "ok" as const,
      headline: `AlignMD is clean on ${repo.branch ?? "(unknown branch)"}.`,
      detail: repo.last_commit
        ? `Last commit ${repo.last_commit.sha.slice(0, 7)} — ${repo.last_commit.subject}`
        : undefined,
    };
  })();

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="alignmd" />
      <h1>AlignMD</h1>
      <PageHint>
        A window into the AlignMD partner app — its build progress and pending
        decisions.
      </PageHint>
      <div className="sub">
        {build?.tagline || "Precision Matching for Modern Healthcare"} · Day14 segment
      </div>

      <div className="section-header"><div className="section-title">Repo state</div></div>
      <StatusBanner
        tone={repoBanner.tone}
        headline={repoBanner.headline}
        detail={repoBanner.detail}
        style={{ marginBottom: 12 }}
      />
      {repo.reachable ? (
        <>
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 12 }}>
            <Kpi
              label="Branch"
              value={repo.branch ?? "—"}
              sub={
                repo.last_commit
                  ? `@ ${repo.last_commit.sha.slice(0, 7)}`
                  : undefined
              }
            />
            <Kpi
              label="Uncommitted"
              value={repo.uncommitted_files ?? "—"}
              sub={(repo.uncommitted_files ?? 0) === 0 ? "clean tree" : "files"}
            />
            <Kpi
              label="Unpushed"
              value={repo.unpushed_commits ?? "—"}
              sub={(repo.unpushed_commits ?? 0) === 0 ? "in sync" : "commits"}
            />
            <Kpi
              label="Last migration"
              value={repo.last_migration ? repo.last_migration.split("_")[0] : "—"}
              sub={
                repo.pending_migrations.length
                  ? `${repo.pending_migrations.length} pending`
                  : "all applied"
              }
            />
          </div>
          <Card title="Snapshot" style={{ marginBottom: 24 }}>
            <div className="sys-row">
              <span className="sys-label">Repo path</span>
              <span className="sys-value">{repo.repo_path}</span>
            </div>
            {repo.last_commit ? (
              <>
                <div className="sys-row">
                  <span className="sys-label">Last commit</span>
                  <span className="sys-value">
                    {repo.last_commit.sha.slice(0, 12)} — {repo.last_commit.subject}
                  </span>
                </div>
                <div className="sys-row">
                  <span className="sys-label">Committed</span>
                  <span className="sys-value">
                    {new Date(repo.last_commit.ts).toLocaleString()}
                  </span>
                </div>
              </>
            ) : null}
            <div className="sys-row">
              <span className="sys-label">Latest migration</span>
              <span className="sys-value">{repo.last_migration ?? "—"}</span>
            </div>
            {repo.pending_migrations.length ? (
              <div className="sys-row">
                <span className="sys-label">Pending migrations</span>
                <span className="sys-value">
                  {repo.pending_migrations.join(", ")}
                </span>
              </div>
            ) : null}
            <div className="sys-row">
              <span className="sys-label">/clinician/readiness</span>
              <span className="sys-value">
                {repo.readiness_route_exists ? "present" : "missing"}
              </span>
            </div>
            <div className="sys-row">
              <span className="sys-label">/opportunities</span>
              <span className="sys-value">
                {repo.opportunities_route_exists ? "present" : "missing"}
              </span>
            </div>
          </Card>
        </>
      ) : null}

      <div className="section-header"><div className="section-title">Git bridge</div></div>
      {repo.reachable && repo.last_commit ? (
        <Card
          title="Live from ~/Documents/alignmd"
          aside={
            <span style={{ fontSize: 11, color: "var(--text-2)" }}>
              read-only · refreshed on render
            </span>
          }
        >
          <div
            className="kpi-grid"
            style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 12 }}
          >
            <Kpi
              label="Last commit"
              value={relativeTime(repo.last_commit.ts)}
              sub={`${repo.last_commit.sha.slice(0, 7)} · ${repo.last_commit.author}`}
            />
            <Kpi
              label="Ahead / behind"
              value={`${repo.ahead_of_origin ?? "—"} / ${repo.behind_of_origin ?? "—"}`}
              sub={
                repo.behind_of_origin === null
                  ? "no upstream"
                  : (repo.ahead_of_origin ?? 0) === 0 &&
                      (repo.behind_of_origin ?? 0) === 0
                    ? "in sync with origin"
                    : "vs. origin"
              }
            />
            <Kpi
              label="Working tree"
              value={
                (repo.uncommitted_files ?? 0) + (repo.untracked_files ?? 0)
              }
              sub={`${repo.uncommitted_files ?? 0} tracked · ${repo.untracked_files ?? 0} untracked`}
            />
            <Kpi
              label="Latest migration"
              value={repo.last_migration ? repo.last_migration.split("_")[0] : "—"}
              sub={
                repo.last_migration
                  ? repo.last_migration.replace(/\.sql$/, "")
                  : `${repo.applied_migrations.length} on disk`
              }
            />
          </div>
          <div className="sys-row">
            <span className="sys-label">Last commit message</span>
            <span className="sys-value">{repo.last_commit.subject}</span>
          </div>
          <div className="sys-row">
            <span className="sys-label">Branch</span>
            <span className="sys-value">{repo.branch ?? "—"}</span>
          </div>
          <div className="sys-row">
            <span className="sys-label">Migrations on disk</span>
            <span className="sys-value">
              {repo.applied_migrations.length
                ? `${repo.applied_migrations.length} file${repo.applied_migrations.length === 1 ? "" : "s"}`
                : "none"}
            </span>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon="🧭"
          headline="AlignMD git bridge offline."
          hint={
            <>
              Couldn&rsquo;t probe <code>{repo.repo_path}</code>. The bridge is
              read-only and only works on the host where the AlignMD repo is
              cloned. Once the repo is present, this card lights up with the
              latest commit, ahead/behind counts, and pending migrations.
            </>
          }
        />
      )}

      {!build ? (
        <EmptyState
          icon="🏥"
          headline="AlignMD just registered — build status syncing."
          hint={
            <>
              The segment is wired up; its build snapshot lands here on the next
              sync cycle (typically within a few minutes). Phase progress,
              pending decisions, and next actions appear once the AlignMD
              orchestrator writes its first <code>build-status.json</code>.
            </>
          }
        />
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
            <Card style={{ marginTop: 4 }}>
              <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
                {build.summary}
              </div>
            </Card>
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
              <Card>
                {decisions.map((d, i) => (
                  <div key={i} className="feed-row" style={{ gridTemplateColumns: "26px 1fr" }}>
                    <div className="feed-time">{i + 1}</div>
                    <div className="feed-text">{d}</div>
                  </div>
                ))}
              </Card>
            </>
          ) : null}

          <div className="section-header"><div className="section-title">Project</div></div>
          <Card>
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
          </Card>
        </>
      )}
    </div>
  );
}
