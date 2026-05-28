/**
 * auto-archive-spam — hand-coded impl.
 *
 * Pattern-matches an inbound message against spam signals. If 2+ signals
 * fire, the message is auto-archived (written to dossier 04-feedback.md
 * under a "Spam — auto-archived" section). NEVER deletes; archive ≠ delete.
 *
 * Does NOT touch Resend or Gmail directly. Logs an event in work-register.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { logAction } from "../work-register";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const CUSTOMERS = path.join(SHARED, "customers");
const SPAM_LOG = path.join(SHARED, "growth/spam-archive.jsonl");

export interface SpamCheckInput {
  sender_email: string;
  sender_domain?: string;
  subject?: string;
  body: string;
  customer_slug?: string;
  message_id?: string;
}

export interface SpamSignals {
  no_business_reference: boolean;
  generic_opener: boolean;
  suspicious_domain: boolean;
  off_topic_pitch: boolean;
  all_caps_or_excessive_punct: boolean;
  crypto_financial_scam: boolean;
  phishing_pattern: boolean;
  mass_mailer_marker: boolean;
}

export interface SpamCheckResult {
  is_spam: boolean;
  signals: SpamSignals;
  signal_count: number;
  signals_matched: string[];
  confidence: number;
}

const SUSPICIOUS_DOMAINS = [
  /^mail\.ru$/i,
  /^yandex\.(ru|com)$/i,
  /^day14-?studios?\.com$/i, // lookalike
  /^day-?14[a-z]+\.com$/i,
];

const GENERIC_OPENERS = [
  /^hi (there|sir|madam)/i,
  /^dear (sir|madam|valued)/i,
  /hope this (email|message) finds you well/i,
  /to whom it may concern/i,
];

const OFF_TOPIC_PITCHES = [
  /seo (services|optimization|ranking)/i,
  /boost your (rankings|traffic|sales)/i,
  /add your business to (our )?directory/i,
  /(buy|purchase) (cheap )?backlinks/i,
  /increase (your )?(traffic|conversions|leads) (by|with)/i,
  /web ?design (services|agency)/i,
];

const CRYPTO_SCAM = [
  /\b(bitcoin|btc|eth|ethereum|crypto(currency)?|nft|tokens?|coin offering)\b/i,
  /investment opportunity/i,
  /nigerian prince/i,
  /inheritance.*million/i,
  /wire transfer.*urgent/i,
];

const PHISHING = [
  /verify your (account|password|card|payment)/i,
  /confirm your (bank|credit card|identity)/i,
  /click (here|the link).*verify/i,
  /your account.*(suspended|locked|disabled)/i,
];

function detectSignals(input: SpamCheckInput): SpamSignals {
  const haystack = `${input.subject ?? ""}\n${input.body}`;
  const domain = input.sender_domain ?? input.sender_email.split("@")[1] ?? "";

  return {
    no_business_reference:
      !/day14|day 14/i.test(haystack) &&
      !/site|portal|platform/i.test(haystack) &&
      !/(splash|casamore|buildbridge|life ?loophole|day14)/i.test(haystack),
    generic_opener: GENERIC_OPENERS.some((r) => r.test(haystack)),
    suspicious_domain: SUSPICIOUS_DOMAINS.some((r) => r.test(domain)),
    off_topic_pitch: OFF_TOPIC_PITCHES.some((r) => r.test(haystack)),
    all_caps_or_excessive_punct:
      /[A-Z]{6,}/.test(haystack) || /[!?]{3,}/.test(haystack),
    crypto_financial_scam: CRYPTO_SCAM.some((r) => r.test(haystack)),
    phishing_pattern: PHISHING.some((r) => r.test(haystack)),
    mass_mailer_marker: /list-unsubscribe/i.test(haystack) && /\bclick\b/i.test(haystack),
  };
}

export function checkSpam(input: SpamCheckInput): SpamCheckResult {
  const signals = detectSignals(input);
  const matched: string[] = [];
  for (const [k, v] of Object.entries(signals)) {
    if (v) matched.push(k);
  }
  const isSpam = matched.length >= 2;
  const confidence = Math.min(1, matched.length / 4);
  return {
    is_spam: isSpam,
    signals,
    signal_count: matched.length,
    signals_matched: matched,
    confidence,
  };
}

async function appendDossier(slug: string, input: SpamCheckInput, result: SpamCheckResult): Promise<string | null> {
  if (!slug) return null;
  const dossierDir = path.join(CUSTOMERS, slug);
  await fs.mkdir(dossierDir, { recursive: true });
  const feedbackPath = path.join(dossierDir, "04-feedback.md");
  const date = new Date().toISOString().slice(0, 10);
  const block =
    `\n## Spam — auto-archived ${date}\n` +
    `- **From:** ${input.sender_email}\n` +
    `- **Subject:** ${input.subject ?? "(no subject)"}\n` +
    `- **Signals:** ${result.signals_matched.join(", ")}\n` +
    `- **Confidence:** ${result.confidence.toFixed(2)}\n` +
    `\n> ${input.body.slice(0, 300)}${input.body.length > 300 ? "..." : ""}\n`;

  if (existsSync(feedbackPath)) {
    await fs.appendFile(feedbackPath, block, "utf8");
  } else {
    await fs.writeFile(feedbackPath, `# Feedback — ${slug}\n${block}`, "utf8");
  }
  return feedbackPath;
}

async function logSpamEvent(input: SpamCheckInput, result: SpamCheckResult): Promise<void> {
  await fs.mkdir(path.dirname(SPAM_LOG), { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    sender: input.sender_email,
    domain: input.sender_domain ?? input.sender_email.split("@")[1] ?? "",
    subject: input.subject,
    signals: result.signals_matched,
    confidence: result.confidence,
    message_id: input.message_id,
  };
  await fs.appendFile(SPAM_LOG, JSON.stringify(entry) + "\n", "utf8");
}

export async function processSpam(input: SpamCheckInput): Promise<{
  result: SpamCheckResult;
  artifacts: string[];
}> {
  const result = checkSpam(input);
  const artifacts: string[] = [];
  if (result.is_spam) {
    if (input.customer_slug) {
      const p = await appendDossier(input.customer_slug, input, result);
      if (p) artifacts.push(p);
    }
    await logSpamEvent(input, result);
    artifacts.push(SPAM_LOG);
    await logAction({
      action_phrase: "auto-archived spam message",
      context: input.customer_slug ?? input.sender_email,
      invoked_skill: "auto-archive-spam",
      notes: `signals=${result.signals_matched.join(",")}`,
    });
  }
  return { result, artifacts };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<SpamCheckInput> | undefined;
  if (!inputs?.sender_email || !inputs.body) {
    return {
      ok: false,
      skill: "auto-archive-spam",
      path: "hand-coded",
      error: "missing required inputs: sender_email + body",
    };
  }
  const { result, artifacts } = await processSpam({
    sender_email: inputs.sender_email,
    sender_domain: inputs.sender_domain,
    subject: inputs.subject,
    body: inputs.body,
    customer_slug: inputs.customer_slug,
    message_id: inputs.message_id,
  });
  return {
    ok: true,
    skill: "auto-archive-spam",
    path: "hand-coded",
    result,
    artifacts,
  };
}
