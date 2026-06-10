/**
 * customer-history-lookup — hand-coded impl.
 *
 * Given a customer_slug or email, gather everything Jack would want to
 * see before responding to them: dossier highlights, recent work-register
 * entries, refund history, complaint history, LTV, churn score.
 *
 * Used by inbound-classifier before customer responses, and as a /lookup
 * Telegram command.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { lookupByEmail } from "../customer-index";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const CUSTOMERS = path.join(SHARED, "customers");
const REGISTER = path.join(SHARED, "growth/work-register.jsonl");

interface LookupInput {
  customer_slug?: string;
  customer_email?: string;
}

export interface CustomerSnapshot {
  slug: string;
  found: boolean;
  brand?: Record<string, unknown>;
  status_summary?: string;
  recent_activity: Array<{
    timestamp: string;
    action: string;
    skill?: string;
  }>;
  refund_count: number;
  complaint_count: number;
  recent_complaint_severity?: string;
  estimated_mrr: number;
  tenure_days: number;
}

async function readSafe(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function findSlugByEmail(email: string): Promise<string | null> {
  // Cached index over every customer's 01-brand.json — replaces the
  // per-lookup scan of the customers directory.
  const entry = await lookupByEmail(email);
  return entry?.slug ?? null;
}

function countOccurrences(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

export async function lookupCustomer(input: LookupInput): Promise<CustomerSnapshot> {
  let slug = input.customer_slug;
  if (!slug && input.customer_email) {
    slug = (await findSlugByEmail(input.customer_email)) || undefined;
  }
  if (!slug) {
    return {
      slug: "(not found)",
      found: false,
      recent_activity: [],
      refund_count: 0,
      complaint_count: 0,
      estimated_mrr: 0,
      tenure_days: 0,
    };
  }

  const dossierDir = path.join(CUSTOMERS, slug);
  if (!existsSync(dossierDir)) {
    return {
      slug,
      found: false,
      recent_activity: [],
      refund_count: 0,
      complaint_count: 0,
      estimated_mrr: 0,
      tenure_days: 0,
    };
  }

  let brand: Record<string, unknown> = {};
  const brandText = await readSafe(path.join(dossierDir, "01-brand.json"));
  if (brandText) {
    try {
      brand = JSON.parse(brandText);
    } catch {
      // skip
    }
  }

  const signupIso = brand.signup_date as string | undefined;
  const tenureDays = signupIso
    ? Math.round((Date.now() - new Date(signupIso).getTime()) / 86400000)
    : 0;

  const refundText = (await readSafe(path.join(dossierDir, "03-refunds.md"))) || "";
  const refundCount = countOccurrences(refundText, /^## /gm);

  const feedbackText =
    (await readSafe(path.join(dossierDir, "04-feedback.md"))) || "";
  const complaintCount = countOccurrences(feedbackText, /^## /gm);
  let recentComplaintSeverity: string | undefined;
  const severityMatch = feedbackText.match(/\*\*Severity\*\*: (critical|high|medium|low)/);
  if (severityMatch && severityMatch[1]) recentComplaintSeverity = severityMatch[1];

  const statusText = (await readSafe(path.join(dossierDir, "02-status.md"))) || "";
  const statusBlocks = statusText.split(/^## /gm);
  const statusSummary = statusBlocks[statusBlocks.length - 1]?.slice(0, 500);

  const recentActivity: CustomerSnapshot["recent_activity"] = [];
  if (existsSync(REGISTER)) {
    const text = await fs.readFile(REGISTER, "utf8");
    for (const line of text.split("\n").reverse()) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line);
        if (e.customer_slug === slug || e.context === slug) {
          recentActivity.push({
            timestamp: e.timestamp,
            action: (e.action_phrase || e.invoked_skill || "").slice(0, 80),
            skill: e.invoked_skill,
          });
          if (recentActivity.length >= 8) break;
        }
      } catch {
        // skip
      }
    }
  }

  return {
    slug,
    found: true,
    brand,
    status_summary: statusSummary,
    recent_activity: recentActivity,
    refund_count: refundCount,
    complaint_count: complaintCount,
    recent_complaint_severity: recentComplaintSeverity,
    estimated_mrr: (brand.monthly_amount as number) || 0,
    tenure_days: tenureDays,
  };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<LookupInput> | undefined;
  if (!inputs?.customer_slug && !inputs?.customer_email) {
    return {
      ok: false,
      skill: "customer-history-lookup",
      path: "hand-coded",
      error: "must provide customer_slug or customer_email",
    };
  }
  const snapshot = await lookupCustomer({
    customer_slug: inputs.customer_slug,
    customer_email: inputs.customer_email,
  });
  return {
    ok: snapshot.found,
    skill: "customer-history-lookup",
    path: "hand-coded",
    result: snapshot,
    error: snapshot.found ? undefined : `customer not found`,
  };
}
