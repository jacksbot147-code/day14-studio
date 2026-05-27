import Link from "next/link";
import { loadEmpireState } from "@/lib/admin-state";
import { summarize, type LogEntry } from "@/lib/activity-summary";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import { ActivityFeed, type ActivityEvent } from "./activity-feed";
import { EmptyState } from "@/components/ui";

export const metadata = {
  title: "Activity — Day14 Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const state = await loadEmpireState();

  // Map tenant slugs to display names so the feed reads in plain language.
  const nameBySlug = new Map<string, string>();
  for (const t of state.tenants) nameBySlug.set(t.slug, t.display_name || t.slug);

  // Newest first. Sort defensively in case the log is not pre-ordered.
  const log: LogEntry[] = [...state.empire_battle_log]
    .filter((e): e is LogEntry => Boolean(e) && typeof e.ts === "string")
    .sort((a, b) => b.ts.localeCompare(a.ts));

  const events: ActivityEvent[] = log.map((e) => {
    const tenant = typeof e.tenant === "string" ? e.tenant : "";
    return {
      ts: e.ts,
      tenant,
      tenantLabel: nameBySlug.get(tenant) || tenant || "Empire",
      actor: typeof e.actor === "string" && e.actor ? e.actor : "unknown agent",
      summary: summarize(e),
    };
  });

  // Distinct tenants present in the log, for the filter chips.
  const seen = new Set<string>();
  const tenants: Array<{ slug: string; label: string }> = [];
  for (const e of events) {
    if (e.tenant && !seen.has(e.tenant)) {
      seen.add(e.tenant);
      tenants.push({ slug: e.tenant, label: e.tenantLabel });
    }
  }
  tenants.sort((a, b) => a.label.localeCompare(b.label));

  const businessCount = seen.size;

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="activity" />
      <h1>Activity</h1>
      <PageHint>
        A human-readable record of everything the autonomous agents have done
        across the empire — newest first, grouped by day. Filter by business or
        time window to catch up without reading any logs.
      </PageHint>
      <div className="sub">
        {events.length} {events.length === 1 ? "event" : "events"} logged across{" "}
        {businessCount} {businessCount === 1 ? "business" : "businesses"}
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon="📡"
          headline="No agent activity logged yet."
          hint={
            <>
              Every run an agent writes to its tenant&apos;s{" "}
              <code>audit-log.jsonl</code> shows up here as a plain-English line.
              If pollers are running but nothing appears, check{" "}
              <Link href="/admin/health" prefetch={false}>Health</Link> for stale
              heartbeats — the watchdog auto-restarts dead daemons.
            </>
          }
        />
      ) : (
        <ActivityFeed events={events} tenants={tenants} />
      )}
    </div>
  );
}
