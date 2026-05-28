/**
 * admin-state.ts — server-side data layer for /admin pages.
 *
 * State is synced from Jack's Mac → studio/public/data/empire-state.json
 * by scripts/sync-empire-state.mjs (LaunchAgent every 15 min, auto-commits + pushes).
 *
 * Live data (Printify products + orders) is fetched directly from APIs.
 */

import fs from "node:fs/promises";
import path from "node:path";

export interface Heartbeat {
  name: string;
  status: "healthy" | "stale" | "error";
  ageMin: number;
  /** Expected beat interval — a known schedule, or self-calibrated. */
  cadenceMin?: number | null;
  /** "oneshot" = an interval job that runs then exits; "daemon" = always-on. */
  kind?: "daemon" | "oneshot";
  /** ISO timestamp of the most recent heartbeat. */
  lastBeat?: string | null;
}

interface EmpireState {
  generated_at: string;
  tenants: Array<{
    slug: string;
    display_name: string;
    type: string;
    stage: string;
    tagline?: string;
    revenue_cents: number;
    orders: number;
    streak: number;
    recent_audit: Array<{ ts: string; actor: string; action: string; [k: string]: unknown }>;
    content_counts: {
      pinterestPins: number;
      tiktokScripts: number;
      blogDrafts: number;
      newsletterIssues: number;
      aiVideos: number;
      csDrafts: number;
      marketingDrafts: number;
      rawFootage: number;
      redditDrafts: number;
    };
    queue: {
      queued: number;
      approved: number;
      posted: number;
      byPlatform: Record<string, { queued: number; approved: number; posted: number }>;
    };
  }>;
  heartbeats: Heartbeat[];
  skill_counts: { live: number; drafts: number };
  expansion_state: { skills_generated: number };
  opportunities: Array<{
    id: string;
    niche: string;
    total_score: number;
    suggested_archetype: string;
    rationale: string;
    pitched: boolean;
    status: string;
  }>;
  empire_battle_log: Array<{ ts: string; tenant: string; actor: string; action: string; [k: string]: unknown }>;
  human_todos?: Array<{
    id: string;
    seq: number;
    tenant: string;
    title: string;
    detail: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    source: string;
    // Optional structured, click-to-expand instructions (backward-compatible).
    instructions?: {
      steps?: string[];
      links?: Array<{ label: string; url: string }>;
      code?: string;
    };
  }>;
  bot_username?: string | null;
}

export type HumanTodo = NonNullable<EmpireState["human_todos"]>[number];

const FALLBACK: EmpireState = {
  generated_at: new Date().toISOString(),
  tenants: [],
  heartbeats: [],
  skill_counts: { live: 0, drafts: 0 },
  expansion_state: { skills_generated: 0 },
  opportunities: [],
  empire_battle_log: [],
  human_todos: [],
  bot_username: null,
};

export async function loadEmpireState(): Promise<EmpireState> {
  const f = path.join(process.cwd(), "public/data/empire-state.json");
  try {
    return JSON.parse(await fs.readFile(f, "utf8"));
  } catch {
    return FALLBACK;
  }
}

export interface BrandSite {
  slug: string;
  display_name: string;
  tagline: string;
  built_at?: string;
}

/** Tenants that have a published brand site, from public/data/brand-sites.json. */
export async function loadBrandSites(): Promise<BrandSite[]> {
  const f = path.join(process.cwd(), "public/data/brand-sites.json");
  try {
    const data = JSON.parse(await fs.readFile(f, "utf8")) as { sites?: BrandSite[] };
    return data.sites || [];
  } catch {
    return [];
  }
}

// ── Per-tenant ops data (synced from the agent clusters' data layer) ──────
export interface REEvaluation {
  property_id: string;
  address: string;
  city?: string;
  owner?: string;
  enriched?: boolean;
  value_cents: number;
  score: number;
  tier: string;
  best_play: string;
  signals: string[];
  flip: {
    arv_cents: number;
    repairs_cents: number;
    mao_cents: number;
    est_profit_cents: number;
    score: number;
  };
  rental: {
    monthly_rent_cents: number;
    cap_rate_pct: number;
    rent_to_value_pct: number;
    score: number;
  };
  wholesale: {
    equity_cents: number;
    equity_pct: number;
    /** True when a real sale price backs the equity figure; false = guessed. */
    equity_known?: boolean;
    /** True when the equity (and so the wholesale score) is a low-confidence
     *  estimate because no sale price was on record. */
    low_confidence?: boolean;
    motivation_signals?: string[];
    score: number;
  };
  evaluated_at?: string;
}

export type DealStageId =
  | "watching"
  | "researching"
  | "contacted"
  | "offer-made"
  | "under-contract"
  | "closed"
  | "passed";

export interface DealStageNote {
  ts: string;
  text: string;
}

export interface DealStageEntry {
  stage: DealStageId;
  updated_at: string;
  notes: DealStageNote[];
}

export type CreditBand = "excellent" | "good" | "fair" | "limited" | "unknown";

export interface BuyerProfile {
  cash_available_cents: number;
  credit_band: CreditBand;
  has_llc: boolean;
  will_owner_occupy: boolean;
  goal: "flip" | "rental" | "wholesale" | "mixed";
  updated_at?: string;
}

export interface RETarget {
  id: string;
  county: string;
  state: string;
  label: string;
  status: string;
  monitor?: boolean;
  source?: string;
  cities?: string[];
  added_at?: string;
  last_scanned_at?: string | null;
  properties_sourced: number;
  a_tier: number;
}

export interface REFreshnessSnapshot {
  ts: string;
  total_properties: number;
  enriched: number;
  a_tier: number;
  counties: number;
  active_counties: number;
}

export interface REFreshness {
  updated_at?: string;
  first_tracked_at?: string;
  total_properties: number;
  enriched_count: number;
  enriched_pct: number;
  a_tier: number;
  counties: number;
  active_counties: number;
  added_last_run: number;
  added_7d: number;
  runs_tracked?: number;
  history?: REFreshnessSnapshot[];
}

export interface AlignmdBuildPhase {
  n: number;
  name: string;
  status: string;
  detail: string;
}
export interface AlignmdBuild {
  name?: string;
  tagline?: string;
  summary?: string;
  current_phase?: number;
  updated_at?: string;
  next_action?: string;
  phases?: AlignmdBuildPhase[];
  decisions_pending?: string[];
  links?: { build_plan?: string; project_dir?: string };
}

export interface TenantOps {
  slug?: string;
  generated_at?: string;
  targets?: RETarget[];
  build?: AlignmdBuild;
  leads?: Array<{ id: string; name?: string; status?: string }>;
  quotes?: Array<{ id: string; status?: string; amount_cents?: number; customer?: string; service?: string }>;
  jobs?: Array<{ id: string; status?: string; customer?: string; service?: string; day?: string; zone?: string }>;
  invoices?: Array<{ id: string; status?: string; amount_cents?: number; customer?: string }>;
  customers?: Array<{ name?: string }>;
  schedule?: { season?: string; board?: Record<string, { stops: number; density_score: number }> };
  evaluations?: REEvaluation[];
  properties?: Array<Record<string, unknown>>;
  freshness?: REFreshness;
  dealstages?: Record<string, DealStageEntry>;
  buyerprofile?: BuyerProfile;
  /** Set when the snapshot was hydrated from the slim summary, not the full
   *  ops snapshot. Read-only fields like evaluations may be truncated. */
  summary_only?: boolean;
}

/** Realty-summary shape — what sync-realty-summary.mjs emits. Small enough
 *  to commit (≤ 2 MB) so the hosted /admin/realty has data even when the
 *  full 110+ MB ops snapshot is gitignored. */
interface RealtySummary {
  slug?: string;
  generated_at?: string;
  counts?: {
    total_properties?: number;
    a_tier?: number;
    b_tier?: number;
    c_tier?: number;
    hot_leads?: number;
    by_tier?: Record<string, number>;
    by_county?: Record<string, number>;
  };
  top_a_deals?: Array<{
    id: string;
    address: string;
    city?: string;
    score: number;
    tier: string;
    best_play: string;
    value_cents: number;
    signals?: string[];
    county?: string;
  }>;
  freshness?: REFreshness;
}

function summaryToOps(summary: RealtySummary): TenantOps {
  const evaluations: REEvaluation[] = (summary.top_a_deals ?? []).map((d) => ({
    property_id: d.id,
    address: d.address,
    city: d.city,
    value_cents: d.value_cents,
    score: d.score,
    tier: d.tier,
    best_play: d.best_play,
    signals: d.signals ?? [],
    flip: { arv_cents: 0, repairs_cents: 0, mao_cents: 0, est_profit_cents: 0, score: 0 },
    rental: { monthly_rent_cents: 0, cap_rate_pct: 0, rent_to_value_pct: 0, score: 0 },
    wholesale: { equity_cents: 0, equity_pct: 0, score: 0 },
  }));
  return {
    slug: summary.slug,
    generated_at: summary.generated_at,
    evaluations,
    freshness: summary.freshness,
    summary_only: true,
  };
}

/** The synced ops snapshot for one tenant (public/data/ops/<slug>.json).
 *
 *  Falls back to a slim summary file when the full snapshot is missing —
 *  notably day14-realty, whose full ops file is 110+ MB and gitignored. */
export async function loadTenantOps(slug: string): Promise<TenantOps> {
  const f = path.join(process.cwd(), "public/data/ops", `${slug}.json`);
  try {
    return JSON.parse(await fs.readFile(f, "utf8")) as TenantOps;
  } catch {
    // Fall back to a slim summary file (currently only emitted for realty).
    const summaryPath = path.join(
      process.cwd(),
      "public/data/ops",
      `${slug}-summary.json`,
    );
    try {
      const summary = JSON.parse(
        await fs.readFile(summaryPath, "utf8"),
      ) as RealtySummary;
      return summaryToOps(summary);
    } catch {
      return {};
    }
  }
}

const PRINTIFY_API = "https://api.printify.com/v1";

export async function fetchPrintifyProducts() {
  const apiKey = process.env.PRINTIFY_API_KEY;
  if (!apiKey) return [];
  try {
    const sR = await fetch(`${PRINTIFY_API}/shops.json`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    });
    if (!sR.ok) return [];
    const shops = (await sR.json()) as Array<{ id: number }>;
    if (!shops.length) return [];
    const pR = await fetch(`${PRINTIFY_API}/shops/${shops[0]!.id}/products.json?limit=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    });
    if (!pR.ok) return [];
    const data = (await pR.json()) as { data?: Array<Record<string, unknown>> };
    return data.data || [];
  } catch {
    return [];
  }
}

// XP system
const XP = {
  product_created: 100, product_sold: 1000, skill_approved: 250,
  draft_created: 25, daemon_running: 10, tenant_launched: 500, revenue_per_dollar: 10,
};

export function computeEmpireXp(state: EmpireState, totalProducts: number) {
  const totalRevenue = state.tenants.reduce((s, t) => s + t.revenue_cents, 0);
  const totalOrders = state.tenants.reduce((s, t) => s + t.orders, 0);
  const healthy = state.heartbeats.filter((h) => h.status === "healthy").length;
  return totalProducts * XP.product_created
    + totalOrders * XP.product_sold
    + (totalRevenue / 100) * XP.revenue_per_dollar
    + state.skill_counts.live * XP.skill_approved
    + healthy * XP.daemon_running
    + state.tenants.length * XP.tenant_launched;
}

export function levelFromXp(xp: number) { return Math.floor(Math.sqrt(xp / 100)); }
export function xpForLevel(l: number) { return l * l * 100; }
