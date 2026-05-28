/**
 * lead-first-touch-personalizer — hand-coded impl.
 *
 * Drafts the first-response reply to a fresh lead-form submission.
 * Pure-Node template fill keyed on vertical + service interest.
 * Writes a DRAFT to the customer dossier; never auto-sends.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();
const CUSTOMERS_BASE = path.join(HOME, "Documents/businesses");

export interface LeadFirstTouchInput {
  business_slug: string;
  business_vertical: "mobile-service" | "membership" | "food" | "custom";
  form_fields: {
    name: string;
    email: string;
    phone?: string;
    service_interest?: string;
    message?: string;
    source_page?: string;
    utm_campaign?: string;
  };
  submitted_at?: string;
  tenant_label?: string; // path under businesses/, default = business_slug
}

export interface LeadFirstTouchResult {
  ok: boolean;
  draft_path?: string;
  subject: string;
  body: string;
  error?: string;
}

function firstName(name: string): string {
  return (name.split(/\s+/)[0] || name).trim();
}

function verticalHook(vertical: LeadFirstTouchInput["business_vertical"]): string {
  switch (vertical) {
    case "mobile-service":
      return "we usually book {service} visits within 48 hours";
    case "membership":
      return "I can walk you through how the membership works in 10 minutes";
    case "food":
      return "happy to check availability for your date";
    default:
      return "happy to dig into the specifics";
  }
}

export function composeFirstTouchReply(input: LeadFirstTouchInput): {
  subject: string;
  body: string;
} {
  const fn = firstName(input.form_fields.name);
  const interest = input.form_fields.service_interest?.trim() || "what you asked about";
  const hookTemplate = verticalHook(input.business_vertical);
  const hook = hookTemplate.replace("{service}", interest);
  const subject = `Re: your inquiry about ${interest}`;
  const bodyLines = [
    `Hi ${fn},`,
    "",
    `Got your note about ${interest}. ${hook}.`,
  ];
  if (input.form_fields.message) {
    const trimmed = input.form_fields.message.trim().slice(0, 240);
    bodyLines.push("", `You wrote: "${trimmed}"`);
    bodyLines.push("", "Two quick questions so I can give you a useful answer instead of a generic one:");
    bodyLines.push("1. What's the timing you're hoping for?");
    bodyLines.push("2. Anything specific I should know about the setup at your end?");
  } else {
    bodyLines.push("", "If you can share the timing you're hoping for, I'll come back with a concrete next step.");
  }
  bodyLines.push("", "Talk soon,", "Jack");
  return { subject, body: bodyLines.join("\n") };
}

export async function invokeLeadFirstTouchPersonalizer(
  input: LeadFirstTouchInput
): Promise<LeadFirstTouchResult> {
  const { subject, body } = composeFirstTouchReply(input);
  const tenant = input.tenant_label || input.business_slug;
  const dossierDir = path.join(CUSTOMERS_BASE, tenant, "customers", input.business_slug);
  await fs.mkdir(dossierDir, { recursive: true });
  const feedbackPath = path.join(dossierDir, "04-feedback.md");
  const date = (input.submitted_at || new Date().toISOString()).slice(0, 10);
  const block =
    `\n## Lead first-touch DRAFT — ${date}\n` +
    `- **Lead:** ${input.form_fields.name} <${input.form_fields.email}>\n` +
    `- **Interest:** ${input.form_fields.service_interest ?? "(none)"}\n` +
    `- **Source page:** ${input.form_fields.source_page ?? "(unknown)"}\n` +
    `\n**Draft subject:** ${subject}\n\n**Draft body:**\n\n${body}\n`;
  try {
    if (existsSync(feedbackPath)) {
      await fs.appendFile(feedbackPath, block, "utf8");
    } else {
      await fs.writeFile(feedbackPath, `# Feedback — ${input.business_slug}\n${block}`, "utf8");
    }
    await auditLog({
      action: "lead_first_touch_drafted",
      actor: "automated:lead-first-touch-personalizer",
      customer_slug: input.business_slug,
      details: { lead_email: input.form_fields.email, vertical: input.business_vertical, draft_path: feedbackPath },
      skill_invoked: "lead-first-touch-personalizer",
      actor_source: "skill-runner",
    });
    return { ok: true, draft_path: feedbackPath, subject, body };
  } catch (err) {
    return {
      ok: false,
      subject,
      body,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<LeadFirstTouchInput> | undefined;
  if (!input?.business_slug || !input.business_vertical || !input.form_fields) {
    return {
      ok: false,
      skill: "lead-first-touch-personalizer",
      path: "hand-coded",
      error: "missing required inputs: business_slug, business_vertical, form_fields",
    };
  }
  const result = await invokeLeadFirstTouchPersonalizer(input as LeadFirstTouchInput);
  return {
    ok: result.ok,
    skill: "lead-first-touch-personalizer",
    path: "hand-coded",
    result,
    artifacts: result.draft_path ? [result.draft_path] : [],
    jack_tap_required: true,
    error: result.error,
  };
}
