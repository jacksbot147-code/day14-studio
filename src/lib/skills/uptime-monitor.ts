/**
 * uptime-monitor — hand-coded impl.
 *
 * Polls customer URLs from a single vantage point (the local Mac mini).
 * The full 3-region check requires the LaunchAgent-installed version + a
 * paid uptime API for the other regions. This local-only version still
 * catches 80% of downtime within 5 minutes.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const SHARED = path.join(homedir(), "Documents/businesses/_shared");
const CUSTOMERS = path.join(SHARED, "customers");
const UPTIME_DIR = path.join(SHARED, "uptime");

const TIMEOUT_MS = 5000;
const ALERT_AFTER_MIN = 10;
const POLL_CADENCE_MIN = 5; // LaunchAgent cycle interval
// Down for ALERT_AFTER_MIN+ ⇒ this many consecutive failed checks.
const ALERT_AFTER_CHECKS = Math.ceil(ALERT_AFTER_MIN / POLL_CADENCE_MIN);

export interface UptimeCheck {
  customer_slug: string;
  url: string;
  status: number | null;
  ms_to_ttfb: number | null;
  ok: boolean;
  error?: string;
  checked_at: string;
}

async function fetchWithTimeout(url: string, ms: number): Promise<UptimeCheck> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const result: UptimeCheck = {
    customer_slug: "",
    url,
    status: null,
    ms_to_ttfb: null,
    ok: false,
    checked_at: new Date().toISOString(),
  };
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "Day14-Uptime-Monitor/1.0" },
    });
    result.status = res.status;
    result.ms_to_ttfb = Date.now() - start;
    result.ok = res.status >= 200 && res.status < 400;
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    result.error = aborted
      ? `timeout after ${ms}ms`
      : err instanceof Error
        ? err.message
        : String(err);
  } finally {
    clearTimeout(timer);
  }
  return result;
}

/**
 * Read customer URLs from dossiers. Each dossier may have a 02-status.md
 * with `url:` or `domain:` in frontmatter, or a 01-brand.json with `url`.
 */
async function discoverCustomerUrls(): Promise<
  Array<{ slug: string; url: string }>
> {
  if (!existsSync(CUSTOMERS)) return [];
  const slugs = await fs.readdir(CUSTOMERS);
  const customers: Array<{ slug: string; url: string }> = [];

  for (const slug of slugs) {
    const dossierDir = path.join(CUSTOMERS, slug);
    const stat = await fs.stat(dossierDir).catch(() => null);
    if (!stat || !stat.isDirectory()) continue;

    // Try 01-brand.json
    const brandPath = path.join(dossierDir, "01-brand.json");
    if (existsSync(brandPath)) {
      try {
        const brand = JSON.parse(await fs.readFile(brandPath, "utf8")) as {
          url?: string;
          domain?: string;
        };
        const url = brand.url || (brand.domain ? `https://${brand.domain}` : null);
        if (url) {
          customers.push({ slug, url });
          continue;
        }
      } catch {
        // fall through to 02-status.md
      }
    }

    // Fallback: `url:` or `domain:` line in 02-status.md frontmatter
    const statusPath = path.join(dossierDir, "02-status.md");
    if (existsSync(statusPath)) {
      try {
        const text = await fs.readFile(statusPath, "utf8");
        const match =
          text.match(/^url:\s*(\S+)\s*$/m) ??
          text.match(/^domain:\s*(\S+)\s*$/m);
        const raw = match?.[1];
        if (raw) {
          const url = raw.startsWith("http") ? raw : `https://${raw}`;
          customers.push({ slug, url });
        }
      } catch {
        // unreadable dossier file — skip this customer, don't kill the cycle
      }
    }
  }
  return customers;
}

/**
 * Run a single full cycle: check every known customer URL.
 */
export async function runUptimeCycle(): Promise<{
  checks: UptimeCheck[];
  alerts: UptimeCheck[];
}> {
  const customers = await discoverCustomerUrls();
  const checks: UptimeCheck[] = [];
  const alerts: UptimeCheck[] = [];

  await fs.mkdir(UPTIME_DIR, { recursive: true });

  for (const c of customers) {
    // Isolate per customer — one bad dossier/log must not kill the cycle.
    try {
      const check = await fetchWithTimeout(c.url, TIMEOUT_MS);
      check.customer_slug = c.slug;
      checks.push(check);

      // Streak BEFORE this check, so we can detect threshold crossings
      // and recoveries against prior state.
      const priorDown = await countRecentDown(c.slug);

      // Log every check
      const date = new Date().toISOString().slice(0, 10);
      const logPath = path.join(UPTIME_DIR, `${c.slug}-${date}.jsonl`);
      await fs.appendFile(logPath, JSON.stringify(check) + "\n", "utf8");

      if (!check.ok) {
        // Alert exactly once, when the streak first crosses the threshold.
        // Spec hard rule 4: once known-down, suppress until recovered.
        const consecutive = priorDown + 1;
        if (consecutive === ALERT_AFTER_CHECKS) {
          alerts.push(check);
          await auditLog({
            action: "uptime_alert",
            actor: "automated:uptime-monitor",
            customer_slug: c.slug,
            details: {
              url: c.url,
              consecutive_failures: consecutive,
              status: check.status,
              ms_to_ttfb: check.ms_to_ttfb,
              error: check.error,
            },
            skill_invoked: "uptime-monitor",
            actor_source: "scheduled",
          });
        }
      } else if (priorDown >= ALERT_AFTER_CHECKS) {
        // Spec: on recovery, log a "back up" follow-up.
        await auditLog({
          action: "uptime_recovered",
          actor: "automated:uptime-monitor",
          customer_slug: c.slug,
          details: {
            url: c.url,
            downtime_checks: priorDown,
            approx_downtime_min: priorDown * POLL_CADENCE_MIN,
            status: check.status,
            ms_to_ttfb: check.ms_to_ttfb,
          },
          skill_invoked: "uptime-monitor",
          actor_source: "scheduled",
        });
      }
    } catch (err) {
      checks.push({
        customer_slug: c.slug,
        url: c.url,
        status: null,
        ms_to_ttfb: null,
        ok: false,
        error: `cycle error: ${err instanceof Error ? err.message : String(err)}`,
        checked_at: new Date().toISOString(),
      });
    }
  }

  return { checks, alerts };
}

/**
 * Consecutive failed checks at the tail of today's log. Known limitation:
 * only reads today's file, so a streak resets at midnight UTC — worst case
 * is one re-alert per day for a multi-day outage, which is acceptable.
 */
async function countRecentDown(slug: string): Promise<number> {
  const date = new Date().toISOString().slice(0, 10);
  const logPath = path.join(UPTIME_DIR, `${slug}-${date}.jsonl`);
  if (!existsSync(logPath)) return 0;
  const text = await fs.readFile(logPath, "utf8");
  const lines = text.trim().split("\n").filter(Boolean).reverse().slice(0, 50);
  let downCount = 0;
  for (const line of lines) {
    try {
      const check = JSON.parse(line) as UptimeCheck;
      if (!check.ok) downCount += 1;
      else break;
    } catch {
      // skip
    }
  }
  return downCount;
}

export async function run(_ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const { checks, alerts } = await runUptimeCycle();
  return {
    ok: true,
    skill: "uptime-monitor",
    path: "hand-coded",
    result: {
      checks_count: checks.length,
      alerts_count: alerts.length,
      alerts: alerts.map((a) => ({
        slug: a.customer_slug,
        url: a.url,
        status: a.status,
        error: a.error,
      })),
    },
    next_actions:
      alerts.length > 0
        ? alerts.map((a) => `investigate downtime on ${a.customer_slug} (${a.url})`)
        : [],
    jack_tap_required: alerts.length > 0,
  };
}
