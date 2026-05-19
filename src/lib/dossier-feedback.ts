/**
 * Dossier feedback writer — append inbound customer messages to
 * 04-feedback.md with structured metadata.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { ClassifiedInbound } from "./inbound-classifier";

const DAY14_CUSTOMERS_DIR = path.join(
  homedir(),
  "Documents/businesses/day14/customers"
);

export interface InboundEntry {
  slug: string | null;
  from_email: string;
  from_name?: string;
  subject: string;
  body_text: string;
  classification: ClassifiedInbound;
  message_id: string;
  received_at: string;
}

/**
 * Append an inbound message entry to the customer's 04-feedback.md.
 * If slug is null (no matching customer), write to a lead-inbox file instead.
 */
export async function appendFeedbackEntry(entry: InboundEntry): Promise<string> {
  const md = renderEntry(entry);

  if (entry.slug) {
    const feedbackPath = path.join(
      DAY14_CUSTOMERS_DIR,
      entry.slug,
      "04-feedback.md"
    );
    await ensureFile(feedbackPath, `# Customer feedback — ${entry.slug}\n\n`);
    await fs.appendFile(feedbackPath, md, "utf8");
    return feedbackPath;
  }

  // Pre-deposit lead — write to a shared lead-inbox file
  const leadsPath = path.join(
    homedir(),
    "Documents/studio/docs/leads-inbox.md"
  );
  await ensureFile(leadsPath, `# Lead inbox\n\nMessages from non-customers.\n\n`);
  await fs.appendFile(leadsPath, md, "utf8");
  return leadsPath;
}

async function ensureFile(filepath: string, initialContent: string): Promise<void> {
  try {
    await fs.access(filepath);
  } catch {
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, initialContent, "utf8");
  }
}

function renderEntry(entry: InboundEntry): string {
  const lines: string[] = [];

  lines.push(`\n## Entry — ${entry.received_at}\n`);
  lines.push(
    `**From:** ${entry.from_name ? `${entry.from_name} <${entry.from_email}>` : entry.from_email}`
  );
  lines.push(`**Subject:** ${entry.subject}`);
  lines.push(
    `**Classification:** ${entry.classification.tag} (confidence ${entry.classification.confidence.toFixed(2)})`
  );
  if (entry.classification.signals_matched.length > 0) {
    lines.push(
      `**Signals:** ${entry.classification.signals_matched.slice(0, 3).join(", ")}`
    );
  }
  lines.push(`**Message ID:** ${entry.message_id}\n`);
  lines.push(`### The message\n`);
  lines.push(`> ${entry.body_text.split("\n").join("\n> ")}\n`);
  lines.push(`### Draft reply (for Jack to review)\n`);
  lines.push(renderDraftReply(entry));
  lines.push(`\n---\n`);

  return lines.join("\n");
}

/**
 * Draft a reply based on classification. Returns a markdown block with
 * the draft to-line + subject + body. Jack reviews + sends from his inbox.
 */
function renderDraftReply(entry: InboundEntry): string {
  const firstName = entry.from_name?.split(" ")[0] ?? "there";
  const replySubject = entry.subject.toLowerCase().startsWith("re:")
    ? entry.subject
    : `Re: ${entry.subject}`;

  let body: string;
  switch (entry.classification.tag) {
    case "scope-question":
      body = `${firstName},\n\nGood question. Let me get you a clear answer on that today.\n\nWill follow up by EOD with specifics.\n\n— Jack\nDay14`;
      break;
    case "change-request":
      body = `${firstName},\n\nGot it. Drafting a preview of that change now — I'll send the link as soon as it's ready (~2-4 hrs).\n\n— Jack\nDay14`;
      break;
    case "complaint":
      body = `${firstName},\n\nThat's on me. Looking at this right now.\n\nI'll have a fix or update for you within 4 hours. Text me direct if you want to talk: 239-XXX-XXXX.\n\n— Jack\nDay14`;
      break;
    case "payment":
      body = `[Payment-related — Jack to draft personally. NEVER auto-reply on money.]`;
      break;
    case "launch-question":
      body = `${firstName},\n\nQuick update on launch:\n\n[Specific launch status — pull from 05-launch.md]\n\nLet me know if anything else.\n\n— Jack\nDay14`;
      break;
    case "general":
      body = `${firstName},\n\nThanks, on it.\n\n— Jack\nDay14`;
      break;
    case "spam":
      body = `[Spam — auto-archived; no reply needed.]`;
      break;
    case "needs-human-review":
    default:
      body = `[Needs Jack's eyes — couldn't classify confidently.]`;
      break;
  }

  return [
    `\`\`\``,
    `To: ${entry.from_email}`,
    `Subject: ${replySubject}`,
    ``,
    body,
    `\`\`\``,
  ].join("\n");
}
