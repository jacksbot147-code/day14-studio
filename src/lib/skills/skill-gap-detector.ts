/**
 * skill-gap-detector — hand-coded impl.
 *
 * Scans the work-register for ad-hoc actions (is_ad_hoc=true entries),
 * groups them by phrase similarity, and surfaces patterns with 2+ recurrences
 * across distinct contexts. Writes candidates to docs/skill-gaps.md.
 *
 * Does NOT promote anything — only flags. Promotion goes through
 * skill-tree-grower (which uses skill-promotion-criteria).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";

const HOME = homedir();
const REGISTER = path.join(HOME, "Documents/businesses/_shared/growth/work-register.jsonl");
const GAP_LOG = path.join(HOME, "Documents/studio/docs/skill-gaps.md");
const DAY_MS = 86400000;

interface AdHocEntry {
  phrase: string;
  context: string;
  timestamp: string;
  notes?: string;
}

export interface GapCandidate {
  cluster_key: string;
  example_phrases: string[];
  recurrences: number;
  distinct_contexts: number;
  first_seen: string;
  last_seen: string;
}

function normalize(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clusterKey(phrase: string): string {
  // Take the first 3 content words (after dropping pronouns/articles) as the cluster key.
  const stop = new Set([
    "a", "an", "the", "i", "we", "to", "of", "for", "in", "on", "at", "and",
    "or", "but", "is", "was", "were", "be", "this", "that", "it", "with",
    "by", "from", "as", "my", "his", "her", "its", "their"
  ]);
  const words = normalize(phrase).split(" ").filter((w) => w && !stop.has(w));
  return words.slice(0, 3).join("-");
}

async function readAdHocEntries(daysBack = 30): Promise<AdHocEntry[]> {
  if (!existsSync(REGISTER)) return [];
  const cutoff = Date.now() - daysBack * DAY_MS;
  let text: string;
  try {
    text = await fs.readFile(REGISTER, "utf8");
  } catch {
    return [];
  }
  const out: AdHocEntry[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as {
        timestamp?: string;
        is_ad_hoc?: boolean;
        action_phrase?: string;
        context?: string;
        notes?: string;
      };
      if (!e.is_ad_hoc || !e.action_phrase || !e.timestamp) continue;
      if (new Date(e.timestamp).getTime() < cutoff) continue;
      out.push({
        phrase: e.action_phrase,
        context: e.context ?? "unknown",
        timestamp: e.timestamp,
        notes: e.notes,
      });
    } catch {
      // skip
    }
  }
  return out;
}

export async function detectGaps(daysBack = 30, minRecurrences = 2): Promise<GapCandidate[]> {
  const entries = await readAdHocEntries(daysBack);
  const clusters = new Map<
    string,
    { phrases: Set<string>; contexts: Set<string>; first: string; last: string }
  >();

  for (const e of entries) {
    const key = clusterKey(e.phrase);
    if (!key) continue;
    let c = clusters.get(key);
    if (!c) {
      c = { phrases: new Set(), contexts: new Set(), first: e.timestamp, last: e.timestamp };
      clusters.set(key, c);
    }
    c.phrases.add(e.phrase);
    c.contexts.add(e.context);
    if (e.timestamp < c.first) c.first = e.timestamp;
    if (e.timestamp > c.last) c.last = e.timestamp;
  }

  const out: GapCandidate[] = [];
  for (const [key, c] of clusters) {
    if (c.phrases.size < minRecurrences) continue;
    if (c.contexts.size < 2) continue;
    out.push({
      cluster_key: key,
      example_phrases: Array.from(c.phrases).slice(0, 5),
      recurrences: c.phrases.size,
      distinct_contexts: c.contexts.size,
      first_seen: c.first,
      last_seen: c.last,
    });
  }
  out.sort((a, b) => b.recurrences - a.recurrences);
  return out;
}

export async function appendGapLog(candidates: GapCandidate[]): Promise<string> {
  await fs.mkdir(path.dirname(GAP_LOG), { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  if (!existsSync(GAP_LOG)) {
    lines.push("# Skill gaps (auto-detected)");
    lines.push("");
    lines.push("Each entry is a recurring ad-hoc pattern that may deserve a skill.");
    lines.push("Promotion goes through `skill-promotion-criteria` (3+ occurrences required).");
    lines.push("");
  }
  lines.push(`## ${date} — gap scan`);
  if (candidates.length === 0) {
    lines.push("");
    lines.push("_No new gap candidates this run._");
    lines.push("");
  } else {
    for (const c of candidates) {
      lines.push("");
      lines.push(`### \`${c.cluster_key}\` — ${c.recurrences}× across ${c.distinct_contexts} contexts`);
      lines.push(`- **First seen:** ${c.first_seen.slice(0, 10)}`);
      lines.push(`- **Last seen:** ${c.last_seen.slice(0, 10)}`);
      lines.push(`- **Example phrases:**`);
      for (const p of c.example_phrases) lines.push(`  - "${p}"`);
      lines.push(
        `- **Promote when:** recurrences ≥ 3 AND distinct_contexts ≥ 2 (currently ${c.recurrences}/${c.distinct_contexts})`
      );
    }
    lines.push("");
  }

  await fs.appendFile(GAP_LOG, lines.join("\n"), "utf8");
  return GAP_LOG;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const days = (ctx.inputs?.days_back as number | undefined) ?? 30;
  const candidates = await detectGaps(days);
  const logPath = await appendGapLog(candidates);
  return {
    ok: true,
    skill: "skill-gap-detector",
    path: "hand-coded",
    result: { count: candidates.length, candidates },
    artifacts: [logPath],
  };
}
