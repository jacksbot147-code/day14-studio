/**
 * cadence-contracts.mjs — the output-freshness contract table.
 *
 * Every entry declares what an agent is SUPPOSED to produce and how stale
 * that output may get before it's a breach. cadence-sentinel.mjs sweeps
 * this table and alerts Jack on state change.
 *
 * Why this exists (2026-07-09 audit): cfo-agent was silent 32 days,
 * product-strategist 27, investor-relations missed July month-wide —
 * all with green dashboards, because fleet health watches HEARTBEATS and
 * these agents' failure surface is OUTPUT STALENESS. This table is the
 * missing half of observability.
 *
 * Path fields are relative to $HOME. Exactly one of `file` (exact path)
 * or `dir`+`pattern` (newest matching file wins) per entry.
 * `maxAgeHours` includes deliberate slack over the nominal cadence so a
 * single slow run doesn't page (e.g. daily agents get 30h, not 24h).
 * Set `enabled: false` to silence an entry without deleting history.
 */

export const CADENCE_CONTRACTS = [
  {
    agent: "cfo-agent",
    dir: "Documents/businesses/_shared/finance",
    pattern: "^\\d{4}-\\d{2}-\\d{2}-(daily|weekly)\\.md$",
    maxAgeHours: 30, // daily 8am cadence + slack
    severity: "P1",
    note: "daily 8am + Sun 6pm — writes <date>-{daily,weekly}.md",
    enabled: true,
  },
  {
    agent: "product-strategist",
    file: "Documents/businesses/_shared/product-strategy.md",
    maxAgeHours: 30, // daily 4pm cadence + slack
    severity: "P1",
    note: "daily 4pm — overwrites product-strategy.md",
    enabled: true,
  },
  {
    agent: "investor-relations",
    dir: "Documents/businesses/_shared/investor-updates",
    pattern: "\\.md$",
    maxAgeHours: 38 * 24, // monthly (fires days 1-7) + slack
    severity: "P1",
    note: "monthly, fires days 1-7 @7am",
    enabled: true,
  },
  {
    agent: "performance-analyst",
    dir: "Documents/businesses/_shared/analytics",
    pattern: "-weekly\\.md$",
    maxAgeHours: 8 * 24, // Mon 7am weekly + slack
    severity: "P2",
    note: "Mon 7am weekly",
    enabled: true,
  },
  {
    agent: "compliance-officer",
    dir: "Documents/businesses/_shared/compliance",
    pattern: "\\.md$",
    maxAgeHours: 30, // daily 11pm + slack
    severity: "P2",
    note: "daily 11pm",
    enabled: true,
  },
  {
    agent: "devops-sre",
    dir: "Documents/businesses/_shared/ops",
    pattern: "^\\d{4}-\\d{2}-\\d{2}-\\d{2}\\.md$",
    maxAgeHours: 6, // every 4h + slack
    severity: "P2",
    note: "every 4h — writes <date>-<hour>.md",
    enabled: true,
  },
  {
    agent: "admin-sync (write leg)",
    file: "Documents/studio/public/data/empire-state.json",
    maxAgeHours: 1, // 15-min interval + generous slack
    severity: "P1",
    note: "15-min launchd one-shot; freshness here proves only the WRITE leg (push leg is separate — see vault admin-sync note)",
    enabled: true,
  },
  {
    agent: "gamified-dashboard",
    file: "Documents/businesses/_shared/empire.html",
    maxAgeHours: 2, // 15-min interval, low stakes
    severity: "P3",
    note: "15-min static HTML re-render; offline mirror only",
    enabled: true,
  },
];
