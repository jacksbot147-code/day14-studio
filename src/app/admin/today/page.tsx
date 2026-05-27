/**
 * /admin/today — "What changed today" admin page.
 *
 * Read-only snapshot of TODAY's empire activity built from the same data
 * sources `/admin/activity` uses (`empire_battle_log` via `loadEmpireState`)
 * plus the operator-todo list and, if it exists, the overnight end-of-day
 * markdown at `~/Documents/businesses/_shared/ops/daily/<YYYY-MM-DD>.md`.
 *
 * Day boundary defaults to America/New_York — Jack's local day, so the
 * page lines up with the morning-briefing and end-of-day scripts.
 *
 * Everything inside the log/todo data is treated as untrusted text and is
 * only ever rendered as text, never executed.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import Link from "next/link";
import { loadEmpireState } from "@/lib/admin-state";
import { summarize, type LogEntry } from "@/lib/activity-summary";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import { Card, EmptyState, StatusBanner } from "@/components/ui";

export const metadata = {
  title: "Today — Day14 Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const TZ = "America/New_York";

/** Today as a YYYY-MM-DD string in the configured timezone. */
function todayKey(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA emits YYYY-MM-DD.
  return fmt.format(new Date());
}

/**
 * Convert an ISO timestamp to a YYYY-MM-DD key in the configured timezone.
 * Returns "" on parse failure.
 */
function tzDayKey(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** "h:mm am/pm" in the configured timezone — for the timeline strip. */
function tzTimeLabel(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

// ── Event classification — mirrors scripts/end-of-day.mjs ──────────────────
const FAILURE_ACTIONS = new Set([
  "fatal_error",
  "error",
  "failed",
  "fail",
  "circuit_breaker_open",
  "circuit_tripped",
  "enrichment_skipped_no_key",
]);

function isFailureEvent(ev: LogEntry): boolean {
  const action = String(ev.action || "");
  if (FAILURE_ACTIONS.has(action)) return true;
  if (/(_error|_failed|_failure)$/.test(action)) return true;
  const err = ev["error"];
  if (typeof err === "string" && err.trim().length > 0) return true;
  const errs = ev["errors"];
  if (Array.isArray(errs) && errs.length > 0) return true;
  if (ev["circuit_tripped"] === true) return true;
  return false;
}

const DRAFT_ACTION_HINTS = [
  "draft",
  "queued",
  "queue_built",
  "scaffold",
  "pitched",
  "proposed",
  "candidate",
];

function isDraftEvent(ev: LogEntry): boolean {
  const action = String(ev.action || "");
  if (DRAFT_ACTION_HINTS.some((h) => action.includes(h))) return true;
  const scaffolded = ev["scaffolded"];
  if (
    typeof scaffolded === "number" &&
    scaffolded > 0 &&
    !isFailureEvent(ev)
  ) {
    return true;
  }
  return false;
}

/** Pull a single-sentence failure reason out of an event. */
function failureReason(ev: LogEntry): string {
  const err = ev["error"];
  if (typeof err === "string" && err.trim()) return err.trim();
  const errs = ev["errors"];
  if (Array.isArray(errs) && errs.length > 0) {
    return errs
      .map((e) => (typeof e === "string" ? e : JSON.stringify(e)))
      .slice(0, 2)
      .join("; ");
  }
  if (ev["circuit_tripped"] === true) return "circuit breaker tripped";
  const action = String(ev.action || "unknown failure").replace(/[_-]+/g, " ");
  return action;
}

/** Try to read the EOD report for `today` if the overnight script has written it. */
async function loadEodReport(
  today: string
): Promise<{ exists: boolean; preview: string; path: string }> {
  const reportPath = path.join(
    homedir(),
    "Documents/businesses/_shared/ops/daily",
    `${today}.md`
  );
  if (!existsSync(reportPath)) {
    return { exists: false, preview: "", path: reportPath };
  }
  try {
    const text = await fs.readFile(reportPath, "utf8");
    const preview = text.split("\n").slice(0, 30).join("\n");
    return { exists: true, preview, path: reportPath };
  } catch {
    return { exists: false, preview: "", path: reportPath };
  }
}

export default async function TodayPage() {
  const state = await loadEmpireState();
  const today = todayKey();

  // Display names for tenant slugs.
  const nameBySlug = new Map<string, string>();
  for (const t of state.tenants) {
    nameBySlug.set(t.slug, t.display_name || t.slug);
  }

  // Filter the empire battle log to today's events (ET day boundary).
  const todayLog: LogEntry[] = state.empire_battle_log
    .filter(
      (e): e is LogEntry =>
        Boolean(e) && typeof e.ts === "string" && tzDayKey(e.ts) === today
    )
    .sort((a, b) => b.ts.localeCompare(a.ts));

  // Bucket events: failed / drafted / done.
  type Bucketed = { ev: LogEntry; bucket: "failed" | "drafted" | "done" };
  const bucketed: Bucketed[] = todayLog.map((ev) => {
    if (isFailureEvent(ev)) return { ev, bucket: "failed" };
    if (isDraftEvent(ev)) return { ev, bucket: "drafted" };
    return { ev, bucket: "done" };
  });

  const totals = {
    events: bucketed.length,
    done: bucketed.filter((b) => b.bucket === "done").length,
    drafted: bucketed.filter((b) => b.bucket === "drafted").length,
    failed: bucketed.filter((b) => b.bucket === "failed").length,
  };

  // Open operator to-dos still pending.
  const openTodos = (state.human_todos ?? []).filter((t) => t.status === "open");

  // Group "done" + "drafted" events by tenant for the "What landed" section.
  type LandedGroup = {
    tenant: string;
    label: string;
    done: LogEntry[];
    drafted: LogEntry[];
  };
  const landedByTenant = new Map<string, LandedGroup>();
  for (const b of bucketed) {
    if (b.bucket === "failed") continue;
    const tenant = typeof b.ev.tenant === "string" ? b.ev.tenant : "";
    const key = tenant || "empire";
    let group = landedByTenant.get(key);
    if (!group) {
      group = {
        tenant: key,
        label: nameBySlug.get(tenant) || tenant || "Empire-wide",
        done: [],
        drafted: [],
      };
      landedByTenant.set(key, group);
    }
    if (b.bucket === "done") group.done.push(b.ev);
    else group.drafted.push(b.ev);
  }
  const landedGroups = [...landedByTenant.values()].sort(
    (a, b) =>
      b.done.length + b.drafted.length - (a.done.length + a.drafted.length)
  );

  // Today's failures — collapse identical (actor, action, reason) into counts.
  type FailureGroup = {
    actor: string;
    action: string;
    reason: string;
    tenant: string;
    tenantLabel: string;
    count: number;
    lastTs: string;
  };
  const failureGroups = new Map<string, FailureGroup>();
  for (const b of bucketed) {
    if (b.bucket !== "failed") continue;
    const actor = String(b.ev.actor || "unknown agent");
    const action = String(b.ev.action || "failure").replace(/[_-]+/g, " ");
    const reason = failureReason(b.ev);
    const tenant = typeof b.ev.tenant === "string" ? b.ev.tenant : "";
    const key = `${tenant}|${actor}|${action}|${reason.slice(0, 80)}`;
    const existing = failureGroups.get(key);
    if (existing) {
      existing.count += 1;
      if (b.ev.ts > existing.lastTs) existing.lastTs = b.ev.ts;
    } else {
      failureGroups.set(key, {
        actor,
        action,
        reason,
        tenant,
        tenantLabel: nameBySlug.get(tenant) || tenant || "Empire",
        count: 1,
        lastTs: b.ev.ts,
      });
    }
  }
  const failures = [...failureGroups.values()].sort(
    (a, b) => b.lastTs.localeCompare(a.lastTs)
  );

  // Pending operator to-dos sorted high → low priority then by seq.
  const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const pendingTodos = [...openTodos].sort(
    (a, b) =>
      (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) ||
      a.seq - b.seq
  );

  // The today-only chronological timeline strip — oldest → newest reads like a
  // diary of the day. (Battle log is newest-first, so reverse it.)
  const timeline = [...todayLog].sort((a, b) => a.ts.localeCompare(b.ts));

  // End-of-day report, if the overnight script has already written it.
  const eod = await loadEodReport(today);

  // Banner: pick the loudest signal — failures > pending > healthy.
  const hasFailures = totals.failed > 0;
  const hasPending = pendingTodos.length > 0;
  const bannerTone = hasFailures ? "bad" : hasPending ? "warn" : "ok";
  const bannerHeadline = hasFailures
    ? `${totals.failed} ${totals.failed === 1 ? "failure" : "failures"} flagged today — needs you`
    : hasPending
      ? `${pendingTodos.length} open ${pendingTodos.length === 1 ? "item" : "items"} pending your call`
      : "Empire ran clean today";
  const bannerDetail = (
    <>
      {totals.events} agent {totals.events === 1 ? "run" : "runs"} ·{" "}
      {totals.drafted} {totals.drafted === 1 ? "draft" : "drafts"} ·{" "}
      {totals.done} resolved · {totals.failed} {totals.failed === 1 ? "error" : "errors"}
    </>
  );

  // Headline display date — "Wednesday, May 27".
  const headlineDate = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="today" />
      <h1>Today — {headlineDate}</h1>
      <PageHint>
        Everything that has happened across the empire today, in one place.
        Successes grouped by business, anything that failed or is still waiting
        on you, and a chronological diary of the day. Day boundary is America/
        New_York.
      </PageHint>
      <div className="sub">
        {totals.events} {totals.events === 1 ? "event" : "events"} today across{" "}
        {landedGroups.length}{" "}
        {landedGroups.length === 1 ? "business" : "businesses"} ·{" "}
        <Link href="/admin/activity" prefetch={false} style={{ color: "var(--accent)" }}>
          full activity feed →
        </Link>
      </div>

      <StatusBanner
        tone={bannerTone}
        headline={bannerHeadline}
        detail={bannerDetail}
        style={{ marginBottom: 20 }}
      />

      {/* ── KPI strip ─────────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi">
          <div className="kpi-label">Agent runs</div>
          <div className="kpi-value">{totals.events}</div>
          <div className="kpi-sub">{landedGroups.length} businesses active</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Drafts produced</div>
          <div className="kpi-value">{totals.drafted}</div>
          <div className="kpi-sub">queued, scaffolded, pitched</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Items resolved</div>
          <div className="kpi-value">{totals.done}</div>
          <div className="kpi-sub">runs that completed cleanly</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Errors</div>
          <div
            className="kpi-value"
            style={{ color: totals.failed > 0 ? "var(--red)" : "var(--text)" }}
          >
            {totals.failed}
          </div>
          <div className="kpi-sub">
            {pendingTodos.length} pending to-do
            {pendingTodos.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* ── What landed ───────────────────────────────────────────── */}
      <div className="section-header">
        <div className="section-title">What landed today</div>
      </div>
      {landedGroups.length === 0 ? (
        <EmptyState
          icon="🌅"
          headline="Nothing has landed today yet."
          hint={
            <>
              Agent successes show up here as soon as they write to a tenant&apos;s{" "}
              <code>audit-log.jsonl</code>. If you expected work and see none,{" "}
              <Link href="/admin/health" prefetch={false}>Health</Link> will tell
              you which pollers are quiet.
            </>
          }
        />
      ) : (
        <div className="panel-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {landedGroups.map((g) => {
            // Collapse "done" entries by actor — top actors only — so the card
            // doesn't drown in repetitive per-cycle lines.
            const byActor = new Map<string, { actor: string; count: number; sample: LogEntry }>();
            for (const ev of g.done) {
              const actor = String(ev.actor || "unknown agent");
              const existing = byActor.get(actor);
              if (existing) existing.count += 1;
              else byActor.set(actor, { actor, count: 1, sample: ev });
            }
            const topActors = [...byActor.values()]
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);
            const moreActors = byActor.size - topActors.length;
            return (
              <Card
                key={g.tenant}
                title={g.label}
                aside={
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    {g.done.length} done · {g.drafted.length} drafted
                  </span>
                }
              >
                {topActors.length === 0 && g.drafted.length === 0 ? (
                  <div className="empty">No successes logged.</div>
                ) : (
                  <>
                    {topActors.length > 0 && (
                      <div className="section act-day-body" style={{ marginBottom: g.drafted.length > 0 ? 12 : 0 }}>
                        {topActors.map((a) => (
                          <div key={a.actor} className="feed-row">
                            <div className="feed-time">{a.count}×</div>
                            <div className="feed-actor">{a.actor}</div>
                            <div className="feed-text">{summarize(a.sample)}</div>
                          </div>
                        ))}
                        {moreActors > 0 && (
                          <div className="feed-row">
                            <div className="feed-time" />
                            <div className="feed-actor" />
                            <div className="feed-text" style={{ color: "var(--muted)" }}>
                              …plus {moreActors} more actor
                              {moreActors === 1 ? "" : "s"}.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {g.drafted.length > 0 && (
                      <div>
                        <div
                          className="section-title"
                          style={{ marginBottom: 6, paddingBottom: 0, borderBottom: "none" }}
                        >
                          Drafted ({g.drafted.length})
                        </div>
                        <div className="section act-day-body">
                          {g.drafted.slice(0, 6).map((ev, i) => (
                            <div key={`${ev.ts}-${i}`} className="feed-row">
                              <div className="feed-time">{tzTimeLabel(ev.ts)}</div>
                              <div className="feed-actor">
                                {String(ev.actor || "unknown")}
                              </div>
                              <div className="feed-text">{summarize(ev)}</div>
                            </div>
                          ))}
                          {g.drafted.length > 6 && (
                            <div className="feed-row">
                              <div className="feed-time" />
                              <div className="feed-actor" />
                              <div className="feed-text" style={{ color: "var(--muted)" }}>
                                …and {g.drafted.length - 6} more drafts.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── What's pending or stuck ───────────────────────────────── */}
      <div className="section-header">
        <div className="section-title">Pending or stuck</div>
      </div>
      {failures.length === 0 && pendingTodos.length === 0 ? (
        <EmptyState
          icon="✅"
          headline="Nothing stuck and nothing waiting on you."
          hint={
            <>
              No errors logged today and no open operator to-dos. New blockers
              will show up here the moment an agent flags one, or as soon as a{" "}
              <code>human_todo</code> is added.
            </>
          }
        />
      ) : (
        <>
          {failures.length > 0 && (
            <Card
              title={`Failures (${failures.length})`}
              aside={
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  collapsed by actor + reason
                </span>
              }
            >
              <div className="section act-day-body">
                {failures.map((f, i) => (
                  <div key={i} className="feed-row">
                    <div className="feed-time">
                      {tzTimeLabel(f.lastTs)}
                      {f.count > 1 ? ` ·×${f.count}` : ""}
                    </div>
                    <div className="feed-actor">
                      {f.tenantLabel} · {f.actor}
                    </div>
                    <div className="feed-text">
                      <b>{f.action}</b> — {f.reason}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {pendingTodos.length > 0 && (
            <Card
              title={`Open to-dos (${pendingTodos.length})`}
              aside={
                <Link
                  href="/admin"
                  prefetch={false}
                  className="section-link"
                  style={{ marginTop: 0 }}
                >
                  open in Overview →
                </Link>
              }
            >
              <div className="section act-day-body">
                {pendingTodos.slice(0, 12).map((t) => (
                  <div key={t.id} className="feed-row">
                    <div className="feed-time">#{t.seq}</div>
                    <div className="feed-actor">
                      {nameBySlug.get(t.tenant) || t.tenant || "Empire"}
                    </div>
                    <div className="feed-text">
                      <b>{t.title}</b>
                      <span className="pill" style={{ marginLeft: 8 }}>
                        {t.category}
                      </span>
                      {t.priority === "high" ? (
                        <span
                          className="pill pri-high"
                          style={{ marginLeft: 4 }}
                        >
                          high
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
                {pendingTodos.length > 12 && (
                  <div className="feed-row">
                    <div className="feed-time" />
                    <div className="feed-actor" />
                    <div className="feed-text" style={{ color: "var(--muted)" }}>
                      …and {pendingTodos.length - 12} more in the queue.
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Today's timeline strip ────────────────────────────────── */}
      <div className="section-header">
        <div className="section-title">Today&apos;s timeline</div>
        <Link
          href="/admin/activity"
          prefetch={false}
          className="section-link"
        >
          full feed →
        </Link>
      </div>
      {timeline.length === 0 ? (
        <EmptyState
          icon="🔭"
          headline="No timeline events yet today."
          hint={
            <>
              Each agent run lands here in plain English, oldest first, so the
              day reads chronologically. Live runs appear after the next
              empire-state sync.
            </>
          }
        />
      ) : (
        <div className="section act-day-body">
          {timeline.map((ev, i) => {
            const tenant = typeof ev.tenant === "string" ? ev.tenant : "";
            return (
              <div key={`${ev.ts}-${i}`} className="feed-row">
                <div className="feed-time">{tzTimeLabel(ev.ts)}</div>
                <div className="feed-actor">
                  {nameBySlug.get(tenant) || tenant || "Empire"}
                </div>
                <div className="feed-text">
                  <b>{String(ev.actor || "unknown agent")}</b> {summarize(ev)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── End-of-day report link / inline preview ───────────────── */}
      <div className="section-header">
        <div className="section-title">End-of-day report</div>
      </div>
      {eod.exists ? (
        <Card
          title={`Daily reconciliation — ${today}`}
          aside={
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              first 30 lines · full file at <code>{eod.path}</code>
            </span>
          }
        >
          <pre
            style={{
              margin: 0,
              fontFamily: "var(--mono)",
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "var(--text-2)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {eod.preview}
          </pre>
        </Card>
      ) : (
        <EmptyState
          icon="🌙"
          headline="No end-of-day report written yet."
          hint={
            <>
              The overnight <code>scripts/end-of-day.mjs</code> writes a
              reconciliation markdown to{" "}
              <code>~/Documents/businesses/_shared/ops/daily/{today}.md</code>{" "}
              when it runs. Once it lands the first 30 lines will preview here.
            </>
          }
        />
      )}
    </div>
  );
}
