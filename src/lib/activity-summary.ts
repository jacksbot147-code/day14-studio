/**
 * activity-summary.ts — shared plain-English summariser for empire_battle_log
 * entries. Used by /admin/activity (empire-wide feed) and the per-tenant
 * Mission Control page so both surfaces speak the same language.
 *
 * Everything here treats log entries as untrusted data — only known numeric
 * and string keys are interpolated and only ever rendered as text, never
 * executed.
 */

/** One raw battle-log entry. Extra keys are untrusted data, rendered as text. */
export type LogEntry = {
  ts: string;
  tenant: string;
  actor: string;
  action: string;
} & Record<string, unknown>;

/** Turn a snake_case action token into readable words. */
export function humanizeAction(action: string): string {
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
 * separately (bold) by the caller, so this is the predicate only — it reads
 * naturally after the actor name.
 */
export function summarize(entry: LogEntry): string {
  const base = humanizeAction(entry.action);

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

  // Generic fallback: humanized action plus a count if one obvious numeric
  // field is present.
  for (const key of ["count", "added", "created", "processed", "updated"]) {
    const n = num(entry, key);
    if (n !== undefined) {
      return `${base} — ${n} ${key === "added" ? "added" : "items"}.`;
    }
  }
  return `${base}.`;
}
