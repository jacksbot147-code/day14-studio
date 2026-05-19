/**
 * customer-service-triage — hand-coded impl.
 *
 * For an inbound customer message (from Etsy convo, Resend email, etc.),
 * classifies + drafts a response automatically. Jack-taps for sending.
 *
 * Combines: inbound-classifier + customer-history-lookup + Gemini draft.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { classify } from "./inbound-classifier";
import { lookupCustomer } from "./customer-history-lookup";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const OUTBOX = path.join(SHARED, "telegram/outbox");

interface TriageInput {
  customer_email?: string;
  customer_slug?: string;
  channel: "etsy" | "email" | "social-dm" | "phone-transcript";
  subject?: string;
  message_text: string;
  tenant?: string;
}

const RESPONSE_SYSTEM_PROMPT = `You draft customer service responses on behalf of Jack at Day14.

Voice:
- Warm but not saccharine
- Direct, action-oriented
- Apologize ONCE if appropriate, then solve the problem
- No "Thanks for reaching out!" boilerplate
- No "Please don't hesitate to" — use "If anything else comes up, reply here"
- No emojis
- Sign-off: "— Jack"

Constraints by classification:
- refund_request → acknowledge, explain policy, offer specific resolution
- complaint → take responsibility where appropriate, propose concrete fix, escalate if needed
- support_request → answer directly if simple; if not, ask ONE clarifying question
- new_lead → answer their question + invite them to book/order with specific next step
- payment_issue → acknowledge, explain what happened technically (if known), give them an exact next step

For complaints with legal-risk signals (lawsuit, attorney, BBB), respond carefully — don't admit liability, do offer to call.

Return ONLY the draft response text (no JSON, no preamble). 80-200 words max. Sign "— Jack" at the end.`;

export async function triageAndDraft(input: TriageInput): Promise<{
  ok: boolean;
  classification: ReturnType<typeof classify>;
  customer_context?: Awaited<ReturnType<typeof lookupCustomer>>;
  draft_response?: string;
  draft_path?: string;
  card_queued?: boolean;
  error?: string;
}> {
  // 1. Classify
  const classification = classify(input.message_text, input.subject || "");

  // 2. Look up customer context
  let customerContext: Awaited<ReturnType<typeof lookupCustomer>> | undefined;
  if (input.customer_slug || input.customer_email) {
    customerContext = await lookupCustomer({
      customer_slug: input.customer_slug,
      customer_email: input.customer_email,
    });
  }

  // 3. Build context for the draft prompt
  const contextLines: string[] = [];
  contextLines.push(`Channel: ${input.channel}`);
  if (input.subject) contextLines.push(`Subject: ${input.subject}`);
  contextLines.push(`Classification: ${classification.tag} (confidence ${classification.confidence.toFixed(2)})`);
  if (customerContext?.found) {
    contextLines.push(`Customer: ${customerContext.slug} (tenure: ${customerContext.tenure_days}d, MRR: $${customerContext.estimated_mrr})`);
    if (customerContext.refund_count > 0) contextLines.push(`Prior refunds: ${customerContext.refund_count}`);
    if (customerContext.complaint_count > 0) contextLines.push(`Prior complaints: ${customerContext.complaint_count}`);
  } else {
    contextLines.push(`Customer: new / not found in dossier`);
  }

  const prompt = `Customer message:
"""
${input.message_text}
"""

Context:
${contextLines.join("\n")}

Draft my response now.`;

  // 4. Draft response via Gemini
  const draftResult = await callGemini({
    prompt,
    systemPrompt: RESPONSE_SYSTEM_PROMPT,
    temperature: 0.5,
    maxOutputTokens: 800,
  });

  if (!draftResult.ok || !draftResult.text) {
    return {
      ok: false,
      classification,
      customer_context: customerContext,
      error: draftResult.error,
    };
  }

  const draft = draftResult.text.trim();

  // 5. Save the draft
  const tenant = input.tenant || customerContext?.slug || "day14";
  const draftsDir = path.join(HOME, "Documents/businesses", tenant, "cs-drafts");
  await fs.mkdir(draftsDir, { recursive: true });
  const filename = `${Date.now()}-${classification.tag}.md`;
  const draftPath = path.join(draftsDir, filename);

  const lines: string[] = [];
  lines.push(`# CS draft — ${classification.tag}`);
  lines.push(`*${new Date().toISOString()}*`);
  lines.push("");
  lines.push(`**Channel**: ${input.channel}`);
  if (input.subject) lines.push(`**Subject**: ${input.subject}`);
  if (customerContext?.found) lines.push(`**Customer**: ${customerContext.slug}`);
  lines.push(`**Classification**: ${classification.tag} (${classification.confidence.toFixed(2)} confidence)`);
  if (classification.matched_keywords.length > 0) {
    lines.push(`**Keywords**: ${classification.matched_keywords.join(", ")}`);
  }
  lines.push("");
  lines.push(`## Original message`);
  lines.push("```");
  lines.push(input.message_text);
  lines.push("```");
  lines.push("");
  lines.push(`## Drafted response`);
  lines.push("");
  lines.push(draft);
  lines.push("");
  lines.push(`---`);
  lines.push(`_Reply with "send" to send as-is, or edit before sending._`);

  await fs.writeFile(draftPath, lines.join("\n"), "utf8");

  // 6. Queue Jack-tap card with the draft
  await fs.mkdir(OUTBOX, { recursive: true });
  const cardUrgency =
    classification.tag === "complaint" || classification.tag === "refund_request" ? "P1" : "P2";
  const cardText =
    `📨 *CS draft ready* (${classification.tag})\n\n` +
    (customerContext?.found ? `From: ${customerContext.slug}\n` : "") +
    `Channel: ${input.channel}\n\n` +
    `_"${input.message_text.slice(0, 150)}${input.message_text.length > 150 ? "..." : ""}"_\n\n` +
    `Drafted response:\n\n${draft.slice(0, 400)}${draft.length > 400 ? "..." : ""}\n\n` +
    `Draft saved: \`${draftPath}\``;
  await fs.writeFile(
    path.join(OUTBOX, `${Date.now()}-cs-triage.json`),
    JSON.stringify(
      {
        text: cardText,
        urgency: cardUrgency,
        queued_at: new Date().toISOString(),
        sent_at: null,
        chat_id: process.env.TELEGRAM_CHAT_ID || null,
        tap_required: true,
      },
      null,
      2
    )
  );

  await auditLog({
    action: "cs_triage_completed",
    actor: "automated:customer-service-triage",
    customer_slug: customerContext?.slug,
    details: {
      channel: input.channel,
      classification: classification.tag,
      confidence: classification.confidence,
      draft_path: draftPath,
    },
    skill_invoked: "customer-service-triage",
    actor_source: "skill-runner",
  });

  return {
    ok: true,
    classification,
    customer_context: customerContext,
    draft_response: draft,
    draft_path: draftPath,
    card_queued: true,
  };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<TriageInput> | undefined;
  if (!inputs?.message_text || !inputs.channel) {
    return {
      ok: false,
      skill: "customer-service-triage",
      path: "hand-coded",
      error: "missing required inputs: message_text + channel",
    };
  }
  const result = await triageAndDraft({
    customer_email: inputs.customer_email,
    customer_slug: inputs.customer_slug,
    channel: inputs.channel,
    subject: inputs.subject,
    message_text: inputs.message_text,
    tenant: inputs.tenant,
  });
  return {
    ok: result.ok,
    skill: "customer-service-triage",
    path: "hand-coded",
    result: {
      classification: result.classification.tag,
      draft_path: result.draft_path,
    },
    artifacts: result.draft_path ? [result.draft_path] : [],
    jack_tap_required: true,
    error: result.error,
  };
}
