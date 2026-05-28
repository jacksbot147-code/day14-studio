/**
 * lead-source-tracker — hand-coded impl.
 *
 * Tags an inbound lead with one of the canonical Day14 sources, derived
 * from UTM, referrer, or hand-tagged context. Deterministic.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export type LeadSource =
  | "cold-dm"
  | "warm-dm"
  | "case-study-video"
  | "organic-search"
  | "referral-existing-customer"
  | "referral-non-customer"
  | "walk-in"
  | "inbound-cold"
  | "unknown";

export interface LeadSourceInput {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  referrer?: string;
  hand_tagged_source?: LeadSource;
  notes?: string;
}

export interface LeadSourceResult {
  source: LeadSource;
  confidence: number; // 0..1
  signals: string[];
}

const SEARCH_DOMAINS = /(?:google|bing|duckduckgo|brave\.com|search\.brave|yahoo)\./i;

export function classifyLeadSource(input: LeadSourceInput): LeadSourceResult {
  const signals: string[] = [];
  if (input.hand_tagged_source) {
    signals.push(`hand_tagged:${input.hand_tagged_source}`);
    return { source: input.hand_tagged_source, confidence: 1, signals };
  }
  const utmSource = (input.utm_source || "").toLowerCase();
  const utmMedium = (input.utm_medium || "").toLowerCase();
  const utmContent = (input.utm_content || "").toLowerCase();
  const referrer = (input.referrer || "").toLowerCase();

  if (utmSource === "ig-dm" || utmMedium === "ig-dm" || utmContent.includes("ig-dm")) {
    signals.push(`utm:ig-dm`);
    const warm = utmContent.includes("warm") || (input.notes ?? "").toLowerCase().includes("warm");
    return {
      source: warm ? "warm-dm" : "cold-dm",
      confidence: 0.95,
      signals,
    };
  }
  if (utmSource.startsWith("video-") || utmMedium === "video") {
    signals.push(`utm:video`);
    return { source: "case-study-video", confidence: 0.9, signals };
  }
  if (utmSource === "referral" || utmMedium === "referral") {
    signals.push(`utm:referral`);
    const isCustomer = utmContent.includes("customer") || (input.notes ?? "").toLowerCase().includes("existing customer");
    return {
      source: isCustomer ? "referral-existing-customer" : "referral-non-customer",
      confidence: 0.85,
      signals,
    };
  }
  if (referrer && SEARCH_DOMAINS.test(referrer)) {
    signals.push(`referrer:search`);
    return { source: "organic-search", confidence: 0.8, signals };
  }
  if ((input.notes ?? "").toLowerCase().includes("walk-in") || (input.notes ?? "").toLowerCase().includes("in-person")) {
    signals.push(`notes:walk-in`);
    return { source: "walk-in", confidence: 0.9, signals };
  }
  if (referrer || utmSource || utmMedium) {
    signals.push(`partial-utm`);
    return { source: "inbound-cold", confidence: 0.5, signals };
  }
  return { source: "unknown", confidence: 0.2, signals: ["no_signal"] };
}

export async function invokeLeadSourceTracker(
  input: LeadSourceInput
): Promise<LeadSourceResult> {
  const result = classifyLeadSource(input);
  await auditLog({
    action: "lead_source_tagged",
    actor: "automated:lead-source-tracker",
    details: { source: result.source, confidence: result.confidence, signals: result.signals },
    skill_invoked: "lead-source-tracker",
    actor_source: "skill-runner",
  });
  return result;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = (ctx.inputs as Partial<LeadSourceInput> | undefined) ?? {};
  const result = await invokeLeadSourceTracker(input);
  return {
    ok: true,
    skill: "lead-source-tracker",
    path: "hand-coded",
    result,
  };
}
