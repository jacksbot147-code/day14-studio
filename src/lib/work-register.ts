/**
 * Work register — the append-only log of agent actions.
 *
 * Every agent (build, PM, QA, etc.) calls logAction() when it does
 * substantive work. The growth-watcher daemon scans this log
 * continuously for recurring patterns that should become skills.
 *
 * Format: JSONL — one JSON object per line, append-only.
 * Path: ~/Documents/businesses/_shared/growth/work-register.jsonl
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const GROWTH_DIR = path.join(
  homedir(),
  "Documents/businesses/_shared/growth"
);
const REGISTER_PATH = path.join(GROWTH_DIR, "work-register.jsonl");

export interface WorkEntry {
  action_phrase: string; // short, 8-15 words describing the work
  context: string; // customer slug, session id, etc.
  type?: string; // entry type; "error" entries surface on /dashboard/system
  agent?: string; // which agent did the work
  customer_slug?: string;
  invoked_skill?: string; // if a skill was invoked, name it
  is_ad_hoc?: boolean; // true if no skill matched the work
  is_meta?: boolean; // true when this is a growth-cluster pattern (vs domain)
  source?: string; // module/component that produced the entry (for errors)
  notes?: string;
}

/**
 * Log a single work action. Auto-creates the register file if missing.
 *
 * Returns void — fire-and-forget. Errors are logged but don't throw.
 */
export async function logAction(entry: WorkEntry): Promise<void> {
  try {
    await fs.mkdir(GROWTH_DIR, { recursive: true });

    const record = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    await fs.appendFile(REGISTER_PATH, JSON.stringify(record) + "\n", "utf8");
  } catch (err) {
    console.error(
      "[work-register] Failed to log action:",
      err instanceof Error ? err.message : err
    );
    // Don't throw — logging failures shouldn't break agent flow
  }
}

/**
 * Convenience: log an ad-hoc action (no skill matched).
 * These are the prime candidates for growth-watcher to promote.
 *
 * Pass `is_meta: true` in the options when the ad-hoc happened
 * INSIDE the growth-cluster itself — feeds meta-growth-watcher.
 */
export async function logAdHoc(
  action_phrase: string,
  context: string,
  notes?: string,
  options?: { is_meta?: boolean }
): Promise<void> {
  return logAction({
    action_phrase,
    context,
    is_ad_hoc: true,
    is_meta: options?.is_meta ?? isGrowthClusterContext(context),
    notes,
  });
}

/**
 * Heuristic: contexts that look like growth-cluster components.
 * If the context starts with `growth-` or `skill-` (and isn't a
 * customer slug like `customer-skill-co`), default to is_meta=true.
 */
function isGrowthClusterContext(context: string): boolean {
  const META_PREFIXES = ["growth-", "skill-", "meta-", "draft-"];
  return META_PREFIXES.some((p) => context.startsWith(p));
}

/**
 * Standardized error logging. Appends a `type: "error"` entry to the
 * work-register so /dashboard/system can surface failures.
 *
 * Fire-and-forget like logAction — NEVER throws and NEVER changes the
 * caller's control flow. Use in catch blocks that would otherwise be
 * silent (or console.log-only) in consequential paths.
 */
export async function logError(
  source: string,
  err: unknown,
  context = "system",
  notes?: string
): Promise<void> {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
  // Also keep the console trail for local debugging / poller logs
  console.error(`[${source}] ${message}`);
  return logAction({
    action_phrase: `error in ${source}: ${message}`.slice(0, 300),
    context,
    type: "error",
    source,
    agent: source,
    notes,
  });
}

/**
 * Convenience: log a skill invocation.
 * The growth-watcher uses these to track skill usage frequency
 * for skill-coverage-auditor's reports.
 */
export async function logSkillInvocation(
  skill_name: string,
  context: string,
  customer_slug?: string
): Promise<void> {
  return logAction({
    action_phrase: `invoked ${skill_name}`,
    context,
    agent: "skill-invoker",
    invoked_skill: skill_name,
    customer_slug,
  });
}
