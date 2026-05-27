/**
 * mrr-forecast.ts — read the rolling MRR history log and project it forward.
 *
 * The multi-tenant MRR aggregator skill appends a JSONL snapshot every run
 * to `~/Documents/businesses/_shared/metrics/mrr-history.jsonl`. Each line:
 *
 *   { "ts": "2026-05-27T13:42:00.000Z",
 *     "total_mrr": 12345,
 *     "per_tenant": [{ "slug": "alignmd", "mrr": 5000 }, ...] }
 *
 * Aggregator runs multiple times a day; for forecasting we only want one
 * snapshot per calendar day (the last one), and we exclude today so the
 * projection always extrapolates from completed days. We then fit a simple
 * ordinary-least-squares line through the last ≤ 90 prior-day points and
 * extrapolate 30 / 60 / 90 days forward.
 *
 * Everything in this module is best-effort: missing/empty/malformed history
 * returns a `ForecastResult` with `kind: "no-data"` so the caller can render
 * a graceful empty state instead of erroring.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HISTORY_PATH = path.join(
  homedir(),
  "Documents/businesses/_shared/metrics/mrr-history.jsonl",
);

/** One prior-day rollup, normalised to a date string (UTC, YYYY-MM-DD). */
export interface DailyMrrPoint {
  date: string;
  total_mrr: number;
  per_tenant: Record<string, number>;
}

/** A projected (or historical) point on the chart timeline. */
export interface ForecastPoint {
  /** YYYY-MM-DD */
  date: string;
  /** Days since the first history point. */
  dayIndex: number;
  /** Whole-dollar MRR. */
  value: number;
}

/** Per-tenant projection (linear regression on that tenant's MRR history). */
export interface TenantForecast {
  slug: string;
  current_mrr: number;
  projected_30d: number;
  projected_60d: number;
  projected_90d: number;
}

interface ForecastReady {
  kind: "ready" | "early-signal";
  /** Number of prior-day points fed into the regression. */
  pointCount: number;
  current_mrr: number;
  current_arr: number;
  projected_30d_mrr: number;
  projected_60d_mrr: number;
  projected_90d_mrr: number;
  projected_30d_arr: number;
  projected_60d_arr: number;
  projected_90d_arr: number;
  /** Historical series, oldest → newest, one point per prior day. */
  history: ForecastPoint[];
  /** Projected series, today → today + 90, one point per day. */
  projection: ForecastPoint[];
  /** Per-tenant forecasts, ranked by current MRR descending. */
  per_tenant: TenantForecast[];
}

interface ForecastNoData {
  kind: "no-data";
  reason: "missing" | "empty";
}

export type ForecastResult = ForecastReady | ForecastNoData;

interface RawHistoryLine {
  ts?: unknown;
  total_mrr?: unknown;
  per_tenant?: unknown;
}

/** Parse the JSONL log into one point per prior calendar day (UTC). */
async function readPriorDayHistory(): Promise<DailyMrrPoint[]> {
  if (!existsSync(HISTORY_PATH)) return [];
  let text: string;
  try {
    text = await fs.readFile(HISTORY_PATH, "utf8");
  } catch {
    return [];
  }
  const today = new Date().toISOString().slice(0, 10);
  /** date → last snapshot seen for that date */
  const byDay = new Map<string, DailyMrrPoint>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let parsed: RawHistoryLine;
    try {
      parsed = JSON.parse(line) as RawHistoryLine;
    } catch {
      continue;
    }
    if (typeof parsed.ts !== "string") continue;
    const date = parsed.ts.slice(0, 10);
    if (date === today) continue; // exclude today; we want completed days only
    if (typeof parsed.total_mrr !== "number" || !Number.isFinite(parsed.total_mrr)) {
      continue;
    }
    const perTenant: Record<string, number> = {};
    if (Array.isArray(parsed.per_tenant)) {
      for (const row of parsed.per_tenant) {
        if (!row || typeof row !== "object") continue;
        const r = row as { slug?: unknown; mrr?: unknown };
        if (typeof r.slug !== "string") continue;
        if (typeof r.mrr !== "number" || !Number.isFinite(r.mrr)) continue;
        perTenant[r.slug] = r.mrr;
      }
    }
    // Last write per day wins (later in the file overrides earlier).
    byDay.set(date, {
      date,
      total_mrr: parsed.total_mrr,
      per_tenant: perTenant,
    });
  }
  // Sort by date ascending, keep at most the last 90 prior days.
  const ordered = Array.from(byDay.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return ordered.slice(-90);
}

/**
 * Ordinary-least-squares fit through points `(x_i, y_i)`. Returns the slope
 * and intercept. If the inputs are degenerate (fewer than 2 points or zero
 * variance in x), falls back to slope 0 / intercept = last y.
 */
function linearFit(
  xs: readonly number[],
  ys: readonly number[],
): { slope: number; intercept: number } {
  const n = xs.length;
  if (n < 2 || xs.length !== ys.length) {
    return { slope: 0, intercept: ys[ys.length - 1] ?? 0 };
  }
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    const x = xs[i]!;
    const y = ys[i]!;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) {
    return { slope: 0, intercept: sumY / n };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/** Add `days` to a YYYY-MM-DD date string and return YYYY-MM-DD. */
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole, non-negative dollars. */
function clampMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/**
 * Build the forecast. `currentTenantMrr` is the live snapshot (slug → MRR)
 * so we can rank tenants by today's value even when the history log only
 * contains a subset of them.
 */
export async function buildForecast(
  currentTenantMrr: Record<string, number>,
): Promise<ForecastResult> {
  const history = await readPriorDayHistory();
  if (history.length === 0) {
    return { kind: "no-data", reason: existsSync(HISTORY_PATH) ? "empty" : "missing" };
  }

  // Build the day-index axis. dayIndex 0 = first history point.
  // "Today" sits at dayIndex = (today - firstDate) in days.
  const firstDate = history[0]!.date;
  const firstMs = Date.parse(`${firstDate}T00:00:00.000Z`);
  const dayIndex = (dateStr: string): number => {
    const ms = Date.parse(`${dateStr}T00:00:00.000Z`);
    return Math.round((ms - firstMs) / 86400000);
  };
  const today = new Date().toISOString().slice(0, 10);
  const todayIndex = dayIndex(today);

  // Totals regression.
  const xs = history.map((p) => dayIndex(p.date));
  const ys = history.map((p) => p.total_mrr);
  const { slope, intercept } = linearFit(xs, ys);
  const predictTotal = (xi: number): number => clampMoney(slope * xi + intercept);

  // History series (solid line in the chart).
  const historySeries: ForecastPoint[] = history.map((p) => ({
    date: p.date,
    dayIndex: dayIndex(p.date),
    value: clampMoney(p.total_mrr),
  }));

  // Projection series: today → today + 90.
  const projection: ForecastPoint[] = [];
  for (let d = 0; d <= 90; d += 1) {
    const xi = todayIndex + d;
    projection.push({
      date: shiftDate(today, d),
      dayIndex: xi,
      value: predictTotal(xi),
    });
  }
  const current_mrr = projection[0]!.value;
  const projected_30d_mrr = projection[30]?.value ?? current_mrr;
  const projected_60d_mrr = projection[60]?.value ?? current_mrr;
  const projected_90d_mrr = projection[90]?.value ?? current_mrr;

  // Per-tenant regressions. Build one fit per slug observed across history,
  // and also include any slug present in the live snapshot so that brand-new
  // tenants still appear (with their current MRR as a flat projection).
  const tenantSlugs = new Set<string>();
  for (const p of history) {
    for (const slug of Object.keys(p.per_tenant)) tenantSlugs.add(slug);
  }
  for (const slug of Object.keys(currentTenantMrr)) tenantSlugs.add(slug);

  const perTenant: TenantForecast[] = [];
  for (const slug of tenantSlugs) {
    const tXs: number[] = [];
    const tYs: number[] = [];
    for (const p of history) {
      const v = p.per_tenant[slug];
      if (typeof v === "number" && Number.isFinite(v)) {
        tXs.push(dayIndex(p.date));
        tYs.push(v);
      }
    }
    const liveMrr = currentTenantMrr[slug];
    let current = liveMrr;
    let proj30 = liveMrr;
    let proj60 = liveMrr;
    let proj90 = liveMrr;
    if (tXs.length >= 2) {
      const fit = linearFit(tXs, tYs);
      const pred = (xi: number): number => clampMoney(fit.slope * xi + fit.intercept);
      // Prefer the live MRR as "current" when it's available, otherwise the
      // regression's value at todayIndex.
      current = liveMrr ?? pred(todayIndex);
      proj30 = pred(todayIndex + 30);
      proj60 = pred(todayIndex + 60);
      proj90 = pred(todayIndex + 90);
    } else {
      // Not enough history for this tenant — flat projection at current MRR.
      const fallback = liveMrr ?? tYs[tYs.length - 1] ?? 0;
      current = fallback;
      proj30 = fallback;
      proj60 = fallback;
      proj90 = fallback;
    }
    perTenant.push({
      slug,
      current_mrr: clampMoney(current ?? 0),
      projected_30d: clampMoney(proj30 ?? 0),
      projected_60d: clampMoney(proj60 ?? 0),
      projected_90d: clampMoney(proj90 ?? 0),
    });
  }
  perTenant.sort((a, b) => b.current_mrr - a.current_mrr);

  return {
    kind: history.length >= 7 ? "ready" : "early-signal",
    pointCount: history.length,
    current_mrr,
    current_arr: current_mrr * 12,
    projected_30d_mrr,
    projected_60d_mrr,
    projected_90d_mrr,
    projected_30d_arr: projected_30d_mrr * 12,
    projected_60d_arr: projected_60d_mrr * 12,
    projected_90d_arr: projected_90d_mrr * 12,
    history: historySeries,
    projection,
    per_tenant: perTenant,
  };
}
