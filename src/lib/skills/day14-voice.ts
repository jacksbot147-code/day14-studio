/**
 * day14-voice — hand-coded impl.
 *
 * Deterministic voice validator. Scans a draft for off-voice patterns
 * (consultant-speak, em-dashes, AI-stink phrases, agency tone, etc.).
 * Returns a list of findings; never auto-edits the text.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export interface VoiceCheckInput {
  text: string;
  surface?: "email" | "sms" | "landing" | "blog" | "social" | "proposal";
  customer_slug?: string;
}

export interface VoiceFinding {
  rule: string;
  excerpt: string;
  severity: "blocker" | "warning";
  hint: string;
}

export interface VoiceCheckResult {
  on_voice: boolean;
  findings: VoiceFinding[];
  score: number; // 0..100, higher = more on-voice
}

interface Rule {
  id: string;
  pattern: RegExp;
  severity: "blocker" | "warning";
  hint: string;
}

const RULES: Rule[] = [
  { id: "ai-stink:dive-in", pattern: /let'?s dive in/i, severity: "blocker", hint: "Replace with action sentence — no warm-up phrases." },
  { id: "ai-stink:in-conclusion", pattern: /in conclusion/i, severity: "blocker", hint: "End with a clear next step instead." },
  { id: "ai-stink:fast-paced", pattern: /in today'?s fast[- ]paced/i, severity: "blocker", hint: "Cliché. Cut entire opening." },
  { id: "ai-stink:explore", pattern: /as we explore/i, severity: "blocker", hint: "Just say what." },
  { id: "em-dash", pattern: /—/, severity: "warning", hint: "Day14 voice uses commas or rewrites, no em-dashes." },
  { id: "agency-pronoun-we", pattern: /\bthe team\b/i, severity: "blocker", hint: "There is no team. Use 'I' (Jack)." },
  { id: "agency-pronoun-our", pattern: /\bour team\b/i, severity: "blocker", hint: "There is no team. Use 'I'." },
  { id: "passive-voice:shipped", pattern: /is shipped|are shipped|gets shipped/i, severity: "warning", hint: "Active voice: 'I ship'." },
  { id: "title-case", pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+\b/, severity: "warning", hint: "Sentence-case, not Title Case." },
  { id: "emoji", pattern: /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]/u, severity: "warning", hint: "Day14 voice uses no emojis." },
  { id: "competitive-pricing", pattern: /competitive pricing/i, severity: "blocker", hint: "Use a specific price instead." },
  { id: "world-class", pattern: /world[- ]class/i, severity: "blocker", hint: "Vague flex. Use a specific outcome instead." },
  { id: "synergy", pattern: /synerg(y|ies)/i, severity: "blocker", hint: "Consultant-speak." },
  { id: "robust", pattern: /\brobust\b/i, severity: "warning", hint: "Pick a more specific adjective." },
  { id: "leverage", pattern: /\bleverage(d|s|ing)?\b/i, severity: "warning", hint: "Try 'use' or 'rely on'." },
];

export function checkVoice(input: VoiceCheckInput): VoiceCheckResult {
  const findings: VoiceFinding[] = [];
  for (const rule of RULES) {
    const m = input.text.match(rule.pattern);
    if (m && typeof m.index === "number") {
      const start = Math.max(0, m.index - 20);
      const end = Math.min(input.text.length, m.index + m[0].length + 20);
      findings.push({
        rule: rule.id,
        excerpt: input.text.slice(start, end),
        severity: rule.severity,
        hint: rule.hint,
      });
    }
  }
  const blockerCount = findings.filter((f) => f.severity === "blocker").length;
  const warningCount = findings.length - blockerCount;
  const score = Math.max(0, 100 - blockerCount * 20 - warningCount * 5);
  return { on_voice: blockerCount === 0, findings, score };
}

export async function invokeDay14Voice(input: VoiceCheckInput): Promise<VoiceCheckResult> {
  const result = checkVoice(input);
  if (!result.on_voice) {
    await auditLog({
      action: "voice_check_failed",
      actor: "automated:day14-voice",
      customer_slug: input.customer_slug,
      details: { surface: input.surface, findings: result.findings.length, score: result.score },
      skill_invoked: "day14-voice",
      actor_source: "skill-runner",
    });
  }
  return result;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<VoiceCheckInput> | undefined;
  if (!input?.text) {
    return {
      ok: false,
      skill: "day14-voice",
      path: "hand-coded",
      error: "missing required input: text",
    };
  }
  const result = await invokeDay14Voice({
    text: input.text,
    surface: input.surface,
    customer_slug: input.customer_slug ?? ctx.customer_slug,
  });
  return {
    ok: result.on_voice,
    skill: "day14-voice",
    path: "hand-coded",
    result,
    jack_tap_required: !result.on_voice,
  };
}
