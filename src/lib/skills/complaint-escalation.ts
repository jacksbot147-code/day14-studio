/**
 * complaint-escalation — hand-coded impl.
 *
 * When a customer complaint is detected (via inbound-classifier or
 * Stripe dispute), this skill triages severity, queues a high-priority
 * Telegram card, writes to dossier 04-feedback.md, and logs the audit
 * trail. Jack-tap required before any customer-facing response.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const CUSTOMERS = path.join(SHARED, "customers");
const OUTBOX = path.join(SHARED, "telegram/outbox");

interface ComplaintInput {
  customer_slug?: string;
  customer_email?: string;
  complaint_text: string;
  source: "email" | "review" | "social" | "phone" | "dispute" | "other";
  detected_by?: string;
}

type Severity = "critical" | "high" | "medium" | "low";

interface Triage {
  severity: Severity;
  signals: string[];
  recommended_response_window: string;
  legal_risk: boolean;
}

const CRITICAL_PATTERNS = [
  /\blawsuit\b/i,
  /\bsue\b/i,
  /\bfraud(ulent)?\b/i,
  /\battorney\b/i,
  /\blawyer\b/i,
  /\bbbb\b/i, // Better Business Bureau
  /\battorney general\b/i,
  /\bdispute the charge\b/i,
  /\bchargeback\b/i,
  /\brefund.*demanded\b/i,
];

const HIGH_PATTERNS = [
  /\brefund\b/i,
  /\bcancel.*subscription\b/i,
  /\bnever again\b/i,
  /\bawful\b/i,
  /\bterrible\b/i,
  /\bworst\b/i,
  /\bscam\b/i,
  /\bdeceptive\b/i,
  /\bmisleading\b/i,
];

const MEDIUM_PATTERNS = [
  /\bunhappy\b/i,
  /\bfrustrated\b/i,
  /\bdisappointed\b/i,
  /\bnot working\b/i,
  /\bbroken\b/i,
  /\bissue\b/i,
  /\bproblem\b/i,
];

export function triageComplaint(text: string): Triage {
  const signals: string[] = [];
  let severity: Severity = "low";
  let legalRisk = false;

  for (const p of CRITICAL_PATTERNS) {
    const m = text.match(p);
    if (m) {
      signals.push(`critical: "${m[0]}"`);
      severity = "critical";
      legalRisk = true;
    }
  }

  if (severity !== "critical") {
    for (const p of HIGH_PATTERNS) {
      const m = text.match(p);
      if (m) {
        signals.push(`high: "${m[0]}"`);
        if (severity !== "high") severity = "high";
      }
    }
  }

  if (severity === "low") {
    for (const p of MEDIUM_PATTERNS) {
      const m = text.match(p);
      if (m) {
        signals.push(`medium: "${m[0]}"`);
        severity = "medium";
        break;
      }
    }
  }

  const responseWindow = {
    critical: "within 1 hour",
    high: "within 4 hours",
    medium: "within 24 hours",
    low: "within 48 hours",
  }[severity];

  return {
    severity,
    signals,
    recommended_response_window: responseWindow,
    legal_risk: legalRisk,
  };
}

async function appendToDossier(slug: string, complaint: ComplaintInput, triage: Triage) {
  if (!slug) return null;
  const dossierDir = path.join(CUSTOMERS, slug);
  await fs.mkdir(dossierDir, { recursive: true });
  const feedbackPath = path.join(dossierDir, "04-feedback.md");

  const entry = `
## ${new Date().toISOString()} — Complaint detected

- **Severity**: ${triage.severity}${triage.legal_risk ? " 🚨 LEGAL RISK" : ""}
- **Source**: ${complaint.source}
- **Detected by**: ${complaint.detected_by || "complaint-escalation"}
- **Signals**: ${triage.signals.join("; ")}
- **Response window**: ${triage.recommended_response_window}

> ${complaint.complaint_text.slice(0, 500)}${complaint.complaint_text.length > 500 ? "..." : ""}

`;

  if (existsSync(feedbackPath)) {
    await fs.appendFile(feedbackPath, entry, "utf8");
  } else {
    await fs.writeFile(
      feedbackPath,
      `# Feedback — ${slug}\n${entry}`,
      "utf8"
    );
  }
  return feedbackPath;
}

async function queueEscalationCard(complaint: ComplaintInput, triage: Triage) {
  await fs.mkdir(OUTBOX, { recursive: true });
  const urgency = {
    critical: "P0",
    high: "P1",
    medium: "P2",
    low: "P3",
  }[triage.severity];
  const filename = `${Date.now()}-complaint-${triage.severity}.json`;
  const filepath = path.join(OUTBOX, filename);

  const text =
    `🚨 *Complaint detected* (${triage.severity})\n\n` +
    (complaint.customer_slug ? `Customer: \`${complaint.customer_slug}\`\n` : "") +
    (complaint.customer_email ? `Email: ${complaint.customer_email}\n` : "") +
    `Source: ${complaint.source}\n` +
    `Response window: ${triage.recommended_response_window}\n\n` +
    `Excerpt:\n_"${complaint.complaint_text.slice(0, 200)}${complaint.complaint_text.length > 200 ? "..." : ""}"_\n\n` +
    (triage.legal_risk
      ? "⚠️ Legal risk detected — handle carefully. Consider attorney review before responding."
      : "Reply with how you want to respond.");

  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        text,
        urgency,
        queued_at: new Date().toISOString(),
        sent_at: null,
        chat_id: process.env.TELEGRAM_CHAT_ID || null,
        tap_required: true,
      },
      null,
      2
    )
  );
  return filename;
}

export async function processComplaint(input: ComplaintInput): Promise<{
  ok: boolean;
  triage: Triage;
  artifacts: string[];
}> {
  const triage = triageComplaint(input.complaint_text);
  const artifacts: string[] = [];

  if (input.customer_slug) {
    const dossierPath = await appendToDossier(input.customer_slug, input, triage);
    if (dossierPath) artifacts.push(dossierPath);
  }

  const cardFile = await queueEscalationCard(input, triage);
  artifacts.push(path.join(OUTBOX, cardFile));

  await auditLog({
    action: "complaint_escalated",
    actor: "automated:complaint-escalation",
    customer_slug: input.customer_slug,
    details: {
      severity: triage.severity,
      source: input.source,
      legal_risk: triage.legal_risk,
      excerpt: input.complaint_text.slice(0, 100),
    },
    skill_invoked: "complaint-escalation",
    actor_source: "skill-runner",
  });

  return { ok: true, triage, artifacts };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<ComplaintInput> | undefined;
  if (!inputs?.complaint_text || !inputs.source) {
    return {
      ok: false,
      skill: "complaint-escalation",
      path: "hand-coded",
      error: "missing required inputs: complaint_text + source",
    };
  }
  const result = await processComplaint({
    customer_slug: inputs.customer_slug,
    customer_email: inputs.customer_email,
    complaint_text: inputs.complaint_text,
    source: inputs.source,
    detected_by: inputs.detected_by,
  });
  return {
    ok: result.ok,
    skill: "complaint-escalation",
    path: "hand-coded",
    result: result.triage,
    artifacts: result.artifacts,
    jack_tap_required: result.triage.severity !== "low",
  };
}
