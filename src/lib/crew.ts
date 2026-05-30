/**
 * crew.ts — single source of truth for Day14 Mission Control v2.
 *
 * 24 Russian-cosmonaut-designated robot operators across 6 fleets.
 * Planning source: ~/Documents/MISSION-CONTROL-V2-FULL-EMPIRE.md (2026-05-27).
 *
 * Each unit wraps real running agents in the empire. Designations are
 * Russian roots + service numbers; aesthetic is brutalist mechanical,
 * deliberately not anthropomorphized.
 */

export type FleetId =
  | "empire"
  | "day14-realty"
  | "life-loophole"
  | "hot-flash-co"
  | "kennum-lawn-care"
  | "alignmd";

export type UnitState = "active" | "watch" | "parked" | "offline" | "planned";

export interface CrewUnit {
  designation: string;
  role: string;
  fleet: FleetId;
  tenantSlug: string | null;
  wraps: string[];
  signature: string;
  primaryAction: string;
  rootMeaning: string;
  state: UnitState;
  pluginAssignments?: string[];
}

export const CREW_ROSTER: readonly CrewUnit[] = [
  // ─────────────────────────────────────────────────────────────
  // Layer 1 — Empire fleet (cross-tenant, render on /admin)
  // ─────────────────────────────────────────────────────────────
  {
    designation: "MIRA-7",
    role: "Approvals Coordinator",
    fleet: "empire",
    tenantSlug: null,
    wraps: ["unified Approvals queue", "approval-handler", "todo-reconciler"],
    signature: "stacked envelopes",
    primaryAction: "Clear the routine batch",
    rootMeaning: "MIRA = world / peace",
    state: "active",
  },
  {
    designation: "VOSTOK-1",
    role: "Day Anchor",
    fleet: "empire",
    tenantSlug: null,
    wraps: ["morning-briefing", "end-of-day", "system-pulse", "growth-narrator"],
    signature: "sunrise rocket",
    primaryAction: "Open today's briefing",
    rootMeaning: "VOSTOK = east (first Soviet spacecraft)",
    state: "active",
  },
  {
    designation: "STRAZH-9",
    role: "Watchtower",
    fleet: "empire",
    tenantSlug: null,
    wraps: [
      "auto-restart-watchdog",
      "vercel-deploy-monitor",
      "proactive-monitor",
      "outbox-deadletter",
    ],
    signature: "radar pulse",
    primaryAction: "Restart a flagged unit",
    rootMeaning: "STRAZH = guard",
    state: "active",
  },
  {
    designation: "ZORKII-3",
    role: "Opportunity Scout",
    fleet: "empire",
    tenantSlug: null,
    wraps: [
      "opportunity-scanner",
      "expansion-prompter",
      "idea-pitcher",
      "proactive-pitcher",
      "competitor-researcher",
    ],
    signature: "telescope",
    primaryAction: "Review fresh opportunities",
    rootMeaning: "ZORKII = sharp-sighted",
    state: "active",
    pluginAssignments: ["marketing-skills"],
  },
  {
    designation: "SCHET-4",
    role: "Empire CFO",
    fleet: "empire",
    tenantSlug: null,
    wraps: [
      "multi-tenant-mrr-aggregator",
      "business-tax-scanner",
      "finance rollup + 90-day forecast",
    ],
    signature: "bar-chart",
    primaryAction: "Open the empire P&L",
    rootMeaning: "SCHET = count / account",
    state: "active",
  },
  {
    designation: "TELEGRAM-X",
    role: "Inbound Bridge",
    fleet: "empire",
    tenantSlug: null,
    wraps: ["telegram-outbox-poller", "telegram-inbox-dispatch"],
    signature: "wire telegraph",
    primaryAction: "Restart the Mac LaunchAgent",
    rootMeaning: "transliterated — offline since 2026-05-23",
    state: "offline",
  },

  // ─────────────────────────────────────────────────────────────
  // Layer 2a — Day14 Realty fleet (5)
  // ─────────────────────────────────────────────────────────────
  {
    designation: "GEKTAR-12",
    role: "Scout",
    fleet: "day14-realty",
    tenantSlug: "day14-realty",
    wraps: [
      "realty-scout",
      "county-data-fetcher",
      "county-feed-agent",
      "intake-agent",
      "enrichment-agent",
      "re-market-expander",
      "re-freshness-monitor",
    ],
    signature: "radar + map pin",
    primaryAction: "Open the A-tier board",
    rootMeaning: "GEKTAR = hectare",
    state: "parked",
  },
  {
    designation: "OTSENKA-8",
    role: "Evaluator",
    fleet: "day14-realty",
    tenantSlug: "day14-realty",
    wraps: ["evaluation-agent", "distress-monitor", "comp-analyst", "deal-alerter"],
    signature: "scoring dial",
    primaryAction: "Show today's new evaluations",
    rootMeaning: "OTSENKA = evaluation",
    state: "parked",
  },
  {
    designation: "PISMO-2",
    role: "Outreach Composer",
    fleet: "day14-realty",
    tenantSlug: "day14-realty",
    wraps: ["re-skip-trace", "outreach-drafter (planned)"],
    signature: "envelope",
    primaryAction: "Draft first-contact for a new lead",
    rootMeaning: "PISMO = letter",
    state: "planned",
    pluginAssignments: ["stop-slop", "marketing-skills"],
  },
  {
    designation: "DOGOVOR-5",
    role: "Contracts Clerk",
    fleet: "day14-realty",
    tenantSlug: "day14-realty",
    wraps: ["contract-generator (LOI, P&S, assignment, option, seller-finance)"],
    signature: "document seal",
    primaryAction: "Generate a contract draft",
    rootMeaning: "DOGOVOR = contract",
    state: "active",
  },
  {
    designation: "SDELKA-1",
    role: "Deal Closer",
    fleet: "day14-realty",
    tenantSlug: "day14-realty",
    wraps: ["deal-stage", "MAO offer-drafter (planned)", "pipeline tracker"],
    signature: "handshake",
    primaryAction: "Move a deal forward",
    rootMeaning: "SDELKA = deal",
    state: "planned",
  },

  // ─────────────────────────────────────────────────────────────
  // Layer 2b — Life Loophole fleet (4)
  // ─────────────────────────────────────────────────────────────
  {
    designation: "NALOG-9",
    role: "Tax Strategist",
    fleet: "life-loophole",
    tenantSlug: "life-loophole",
    wraps: ["/advisor AI agent", "grounding contract", "eval harness"],
    signature: "scales",
    primaryAction: "Open the advisor",
    rootMeaning: "NALOG = tax",
    state: "active",
    pluginAssignments: ["stop-slop"],
  },
  {
    designation: "PERO-3",
    role: "Brand Scribe",
    fleet: "life-loophole",
    tenantSlug: "life-loophole",
    wraps: ["content engine", "calendar", "drafts folder", "cross-poster", "hashtag-researcher"],
    signature: "pen",
    primaryAction: "Open drafts queue",
    rootMeaning: "PERO = pen / feather (also serves Hot Flash + Kennum)",
    state: "active",
    pluginAssignments: ["stop-slop", "cc-nano-banana", "marketing-skills"],
  },
  {
    designation: "ARKHIV-7",
    role: "Catalog Custodian",
    fleet: "life-loophole",
    tenantSlug: "life-loophole",
    wraps: [
      "48-strategy catalog.json",
      "validate-catalog.mjs",
      "annual figures",
      "business-tax-scanner",
    ],
    signature: "filing cabinet",
    primaryAction: "Run the catalog validator",
    rootMeaning: "ARKHIV = archive",
    state: "active",
  },
  {
    designation: "RASSILKA-2",
    role: "Newsletter Coordinator",
    fleet: "life-loophole",
    tenantSlug: "life-loophole",
    wraps: ["lead-magnet", "drip sequence"],
    signature: "envelope stack",
    primaryAction: "Open subscriber pipeline",
    rootMeaning: "RASSILKA = mailing (needs platform choice)",
    state: "planned",
    pluginAssignments: ["stop-slop", "marketing-skills"],
  },

  // ─────────────────────────────────────────────────────────────
  // Layer 2c — Hot Flash Co fleet (4, parked)
  // ─────────────────────────────────────────────────────────────
  {
    designation: "DOMNA-4",
    role: "Product Designer",
    fleet: "hot-flash-co",
    tenantSlug: "hot-flash-co",
    wraps: ["hot-flash-co-daily-engine", "generate-hot-flash-designs", "Printify drafts"],
    signature: "thermal gauge",
    primaryAction: "Review today's product drafts",
    rootMeaning: "DOMNA = blast furnace",
    state: "parked",
    pluginAssignments: ["stop-slop", "cc-nano-banana"],
  },
  {
    designation: "REKLAMA-6",
    role: "Marketing Composer",
    fleet: "hot-flash-co",
    tenantSlug: "hot-flash-co",
    wraps: ["hot-flash-co-marketing-engine", "social cross-poster"],
    signature: "speaker",
    primaryAction: "Open marketing drafts",
    rootMeaning: "REKLAMA = advertisement",
    state: "parked",
    pluginAssignments: ["stop-slop", "marketing-skills"],
  },
  {
    designation: "GOLOS-1",
    role: "CS Voice",
    fleet: "hot-flash-co",
    tenantSlug: "hot-flash-co",
    wraps: ["hot-flash-co-orders-watcher", "Resend CS triage", "CS templates"],
    signature: "speech bubble",
    primaryAction: "Open CS inbox",
    rootMeaning: "GOLOS = voice",
    state: "parked",
    pluginAssignments: ["stop-slop"],
  },
  {
    designation: "LAVKA-3",
    role: "Storefront Steward",
    fleet: "hot-flash-co",
    tenantSlug: "hot-flash-co",
    wraps: ["Printify publishing", "store URL wiring"],
    signature: "shop awning",
    primaryAction: "Confirm products live",
    rootMeaning: "LAVKA = shop / stall",
    state: "parked",
    pluginAssignments: ["cc-nano-banana"],
  },

  // ─────────────────────────────────────────────────────────────
  // Layer 2d — Kennum Lawn Care fleet (3)
  // ─────────────────────────────────────────────────────────────
  {
    designation: "TRAVA-5",
    role: "GM",
    fleet: "kennum-lawn-care",
    tenantSlug: "kennum-lawn-care",
    wraps: ["lawn-care-gm-kennum-lawn-care", "lawn-care vertical pack"],
    signature: "clippers",
    primaryAction: "Open quotes + today's route",
    rootMeaning: "TRAVA = grass",
    state: "parked",
  },
  {
    designation: "SMETA-2",
    role: "Quote Composer",
    fleet: "kennum-lawn-care",
    tenantSlug: "kennum-lawn-care",
    wraps: ["quote drafting", "contact-form triage"],
    signature: "calculator",
    primaryAction: "Draft a new quote",
    rootMeaning: "SMETA = estimate",
    state: "parked",
    pluginAssignments: ["stop-slop", "marketing-skills"],
  },
  {
    designation: "MARSHRUT-7",
    role: "Route Planner",
    fleet: "kennum-lawn-care",
    tenantSlug: "kennum-lawn-care",
    wraps: ["today's stops", "density scoring"],
    signature: "route map",
    primaryAction: "Open today's route",
    rootMeaning: "MARSHRUT = route",
    state: "parked",
  },

  // ─────────────────────────────────────────────────────────────
  // Layer 2e — AlignMD fleet (3)
  // ─────────────────────────────────────────────────────────────
  {
    designation: "DOKTOR-8",
    role: "Credentialing Concierge",
    fleet: "alignmd",
    tenantSlug: "alignmd",
    wraps: ["readiness route", "credentialing checks"],
    signature: "stethoscope",
    primaryAction: "Open clinician readiness",
    rootMeaning: "DOKTOR = doctor",
    state: "active",
  },
  {
    designation: "MATCH-4",
    role: "Job Match",
    fleet: "alignmd",
    tenantSlug: "alignmd",
    wraps: ["external_jobs feed", "matching layer"],
    signature: "compass",
    primaryAction: "Open today's matches",
    rootMeaning: "MATCH = transliterated",
    state: "active",
  },
  {
    designation: "NAUKA-6",
    role: "Research Agent",
    fleet: "alignmd",
    tenantSlug: "alignmd",
    wraps: ["alignmd-research-build-agent"],
    signature: "telescope",
    primaryAction: "Review research output",
    rootMeaning: "NAUKA = science",
    state: "active",
  },
];

export const FLEET_META: Record<FleetId, { label: string; subtitle: string; order: number }> = {
  empire: {
    label: "Empire fleet",
    subtitle: "Cross-tenant operators — 5 units + Telegram bridge",
    order: 0,
  },
  alignmd: {
    label: "AlignMD fleet",
    subtitle: "Healthcare credentialing — 3 units",
    order: 1,
  },
  "life-loophole": {
    label: "Life Loophole fleet",
    subtitle: "Personal-finance education — 4 units",
    order: 2,
  },
  "day14-realty": {
    label: "Day14 Realty fleet",
    subtitle: "Southwest Florida real estate — 5 units (paused)",
    order: 3,
  },
  "kennum-lawn-care": {
    label: "Kennum Lawn Care fleet",
    subtitle: "Service business — 3 units",
    order: 4,
  },
  "hot-flash-co": {
    label: "Hot Flash Co fleet",
    subtitle: "D2C wellness — 4 units (parked)",
    order: 5,
  },
};

export function unitsByFleet(): Array<{ fleet: FleetId; units: CrewUnit[] }> {
  const grouped = new Map<FleetId, CrewUnit[]>();
  for (const u of CREW_ROSTER) {
    if (!grouped.has(u.fleet)) grouped.set(u.fleet, []);
    grouped.get(u.fleet)!.push(u);
  }
  return Array.from(grouped.entries())
    .map(([fleet, units]) => ({ fleet, units }))
    .sort((a, b) => FLEET_META[a.fleet].order - FLEET_META[b.fleet].order);
}

export function unitByDesignation(designation: string): CrewUnit | undefined {
  return CREW_ROSTER.find((u) => u.designation === designation);
}

export function unitsForTenant(slug: string): CrewUnit[] {
  return CREW_ROSTER.filter((u) => u.tenantSlug === slug);
}

export function stateClass(state: UnitState): string {
  switch (state) {
    case "active":
      return "crew-state-active";
    case "watch":
      return "crew-state-watch";
    case "parked":
      return "crew-state-parked";
    case "offline":
      return "crew-state-offline";
    case "planned":
      return "crew-state-planned";
  }
}

export function stateLabel(state: UnitState): string {
  switch (state) {
    case "active":
      return "ACTIVE";
    case "watch":
      return "WATCH";
    case "parked":
      return "PARKED";
    case "offline":
      return "OFFLINE";
    case "planned":
      return "PLANNED";
  }
}
