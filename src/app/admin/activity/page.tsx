import { loadEmpireState } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import { ActivityFeed, type ActivityEvent } from "./activity-feed";

export const metadata = {
  title: "Activity — Day14 Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** One raw battle-log entry. Extra keys are untrusted data, rendered as text. */
type LogEntry = { ts: string; tenant: string; actor: string; action: string } & Record<
  string,
  unknown
>;

/** Turn a snake_case action token into readable words: "market_expanded" → "market expanded". */
function humanizeAction(action: string): string {
  if (!action) return "did something";
  return action.replace(/[_-]+/g, " ").trim() || "did something";
}

/** Read a numeric extra field off an entry, or undefined if absent / not a number. */
function num(entry: LogEntry, key: string): number | undefined {
  const v = entry[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Read a string extra field off an entry, trimmed, or undefined if absent / empty. */
function str(entry: LogEntry, key: string): string | undefined {
  const v = entry[key];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * Build a plain-English line for what an entry did. The actor is rendered
 * separately (bold) by the feed, so this is the predicate only — it should
 * read naturally after the actor name.
 *
 * Everything here is treated as untrusted data: only known numeric/string
 * fields are interpolated, and they land in plain JSX text nodes.
 */
function summarize(entry: LogEntry): string {
  const base = humanizeAction(entry.action);

  // A few high-signal actions get a richer, count-aware sentence.
  switch (entry.action) {
    case "market_expanded": {
      const added = num(entry, "added");
      const watch = num(entry, "watch_list");
      const reason = str(entry, "reason");
      if (added !== undefined && added > 0) {
        return `expanded the realty market — added ${added} ${
          added === 1 ? "county" : "counties"
        }${watch !== undefined ? `, ${watch} on the watch list` : ""}.`;
      }
      return `reviewed the realty market for expansion${
        reason ? ` (${reason})` : " — no new counties this run"
      }.`;
    }
    case "cluster_run": {
      const scaffolded = num(entry, "scaffolded");
      const season = str(entry, "season");
      return `ran the business cluster${
        scaffolded !== undefined
          ? ` — scaffolded ${scaffolded} ${scaffolded === 1 ? "item" : "items"}`
          : ""
      }${season ? ` (${season})` : ""}.`;
    }
    case "pipeline_advanced": {
      const quoted = num(entry, "quoted") ?? 0;
      const invoiced = num(entry, "invoiced") ?? 0;
      const leads = num(entry, "open_leads");
      return `advanced the sales pipeline — ${quoted} quoted, ${invoiced} invoiced${
        leads !== undefined ? `, ${leads} open ${leads === 1 ? "lead" : "leads"}` : ""
      }.`;
    }
    case "crm_scored": {
      const customers = num(entry, "customers") ?? 0;
      const atRisk = num(entry, "at_risk");
      return `scored the customer base — ${customers} ${
        customers === 1 ? "customer" : "customers"
      }${atRisk !== undefined ? `, ${atRisk} at risk` : ""}.`;
    }
    case "routes_optimized": {
      const scheduled = num(entry, "scheduled") ?? 0;
      const rolled = num(entry, "rolled_for_weather");
      return `optimized job routes — ${scheduled} scheduled${
        rolled !== undefined && rolled > 0 ? `, ${rolled} rolled for weather` : ""
      }.`;
    }
    case "portal_feeds_built": {
      const feeds = num(entry, "portal_feeds") ?? 0;
      return `rebuilt the customer portal — ${feeds} ${
        feeds === 1 ? "feed" : "feeds"
      }.`;
    }
    default:
      break;
  }

  // Generic fallback: the humanized action, plus a count if one obvious
  // numeric field is present.
  for (const key of ["count", "added", "created", "processed", "updated"]) {
    const n = num(entry, key);
    if (n !== undefined) {
      return `${base} — ${n} ${key === "added" ? "added" : "items"}.`;
    }
  }
  return `${base}.`;
}

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
        <div className="section">
          <div className="empty">
            No activity has been logged yet. Once the agents start running,
            their work will appear here as a readable timeline.
          </div>
        </div>
      ) : (
        <ActivityFeed events={events} tenants={tenants} />
      )}
    </div>
  );
}
