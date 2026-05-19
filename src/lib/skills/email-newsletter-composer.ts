/**
 * email-newsletter-composer — hand-coded impl.
 *
 * Composes a weekly newsletter from a list of inputs: highlight items,
 * SWFL local angle, customer wins, useful link. Outputs MailerLite-ready
 * subject + preheader + body.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

interface NewsletterInput {
  tenant?: string;
  issue_number?: number;
  highlights?: string[]; // what shipped this week
  swfl_bit?: string; // local angle (weather, event, vertical trend)
  useful_thing?: string; // tip / checklist / link
  send_date?: string; // YYYY-MM-DD; default = next Tuesday
}

const SYSTEM_PROMPT = `You write a weekly newsletter for Jack at Day14 — a SW Florida productized build studio.

Voice rules:
- Reads like a sharp friend's text, NOT a press release
- One personal observation from the week as the opener (NOT "this week we shipped X")
- NO emojis
- NO "in today's fast-paced world", "let's dive in", "in conclusion"
- Short paragraphs, scannable
- ONE primary CTA per issue
- ONE reply prompt ("hit reply with...")
- Always include the SWFL local bit
- Total length: 400-500 words

Format the response as JSON, no preamble, no markdown fence:
{
  "subject": "...",         // < 50 chars, no emoji, curiosity-driving
  "preheader": "...",       // one-line tease, doesn't repeat subject
  "body_markdown": "..."    // the full newsletter body, markdown
}`;

function nextTuesday(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilTue = (2 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilTue);
  return d.toISOString().slice(0, 10);
}

export async function composeNewsletter(input: NewsletterInput): Promise<{
  ok: boolean;
  subject?: string;
  preheader?: string;
  body_markdown?: string;
  path?: string;
  error?: string;
}> {
  const tenant = input.tenant || "day14";
  const issue = input.issue_number || 1;
  const sendDate = input.send_date || nextTuesday();

  const prompt = `Issue #${issue}, scheduled to send: ${sendDate}.

What to include:
- Highlights this week: ${input.highlights?.join("; ") || "(none specified — open with a candid personal observation from the week)"}
- SWFL bit: ${input.swfl_bit || "(none specified — pick something local: weather pattern, SWFL service-industry trend, or local event)"}
- Useful thing: ${input.useful_thing || "(pick one: a free checklist, a useful tool, a counterintuitive tip)"}

Write the newsletter now. JSON only.`;

  const result = await callGemini({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.7,
    maxOutputTokens: 2048,
  });

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error };
  }

  let parsed: { subject: string; preheader: string; body_markdown: string };
  try {
    const cleaned = result.text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: `failed to parse newsletter JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Save as a single file with all three pieces
  const draftsDir = path.join(HOME, "Documents/businesses", tenant, "content/newsletters");
  await fs.mkdir(draftsDir, { recursive: true });
  const fileName = `issue-${String(issue).padStart(3, "0")}-${sendDate}.md`;
  const filePath = path.join(draftsDir, fileName);

  const content = `---
issue: ${issue}
send_date: ${sendDate}
subject: ${JSON.stringify(parsed.subject)}
preheader: ${JSON.stringify(parsed.preheader)}
status: draft
tenant: ${tenant}
generated_by: email-newsletter-composer
---

# ${parsed.subject}

**Preheader**: ${parsed.preheader}

---

${parsed.body_markdown}
`;

  await fs.writeFile(filePath, content, "utf8");

  await auditLog({
    action: "newsletter_drafted",
    actor: "automated:email-newsletter-composer",
    customer_slug: tenant,
    details: {
      issue,
      send_date: sendDate,
      subject: parsed.subject,
      path: filePath,
    },
    skill_invoked: "email-newsletter-composer",
    actor_source: "skill-runner",
  });

  return {
    ok: true,
    subject: parsed.subject,
    preheader: parsed.preheader,
    body_markdown: parsed.body_markdown,
    path: filePath,
  };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<NewsletterInput> | undefined;
  const result = await composeNewsletter({
    tenant: inputs?.tenant,
    issue_number: inputs?.issue_number,
    highlights: inputs?.highlights,
    swfl_bit: inputs?.swfl_bit,
    useful_thing: inputs?.useful_thing,
    send_date: inputs?.send_date,
  });
  return {
    ok: result.ok,
    skill: "email-newsletter-composer",
    path: "hand-coded",
    result: {
      subject: result.subject,
      path: result.path,
    },
    artifacts: result.path ? [result.path] : [],
    error: result.error,
  };
}
