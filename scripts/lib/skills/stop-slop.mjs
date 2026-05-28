/**
 * lib/skills/stop-slop.mjs
 *
 * Pure-Node port of the `stop-slop` Claude skill (installed at
 * ~/.claude/skills/stop-slop in interactive Claude Code). The skill itself
 * is unavailable to autonomous .mjs daemons because it only fires inside a
 * Claude Code session — so this file mirrors the same rules as deterministic
 * string / regex substitutions that any Node script can call.
 *
 * If a SKILL.md or references/ file is dropped at the canonical path in the
 * future, `loadRulesFromSkillDir()` will pick it up and override the inline
 * defaults. Until then the inline rule table below IS the source of truth.
 *
 * Public surface:
 *   stripSlop(text) -> { cleaned: string, removed: [{ phrase, count }] }
 *   loadRulesFromSkillDir(dir?) -> Promise<{ rules, source }>  (best-effort)
 *
 * Design rules:
 *   - Deterministic. No LLM call. No network.
 *   - Safe to run on markdown — never strips inside code fences or inline
 *     backticks (so we don't mangle code samples in briefings).
 *   - Word-boundary anchored where possible to avoid partial-word damage.
 *   - Case-insensitive matching; preserves leading capitalisation on the
 *     replacement when the match started with an uppercase letter.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

// ---- inline rule table ---------------------------------------------------
// Each entry: [pattern, replacement, label?]
//   pattern     RegExp (must be /g and /i)
//   replacement string — usually "" (drop) or a plain-English swap
//   label       optional canonical phrase to report in `removed[]`
//
// Categories (kept inline for the audit trail; ordering matters — longer /
// more specific phrases come before shorter overlapping ones):
//   1. Filler openers ("It's worth noting that…", "It's important to…")
//   2. Hedges that don't carry meaning ("essentially", "basically", "simply")
//   3. AI-tell adjectives ("seamlessly", "delve into", "navigate the
//      complexities", "in today's fast-paced world", "robust", "leverage")
//   4. Editorialising tails ("at the end of the day", "when all is said and
//      done", "needless to say")
//   5. Empty transitions ("Moreover,", "Furthermore,", "Additionally,",
//      "In conclusion,")
//   6. "Not just X but Y" rhetorical scaffolding -> "X and Y"
const INLINE_RULES = [
  // ---- 1. filler openers ----
  [/\b(it['’]s|it\s+is)\s+worth\s+noting\s+that\s+/gi, "", "it's worth noting that"],
  [/\b(it['’]s|it\s+is)\s+important\s+to\s+(note|remember|understand)\s+that\s+/gi, "", "it's important to note that"],
  [/\bit\s+should\s+be\s+noted\s+that\s+/gi, "", "it should be noted that"],
  [/\bplease\s+note\s+that\s+/gi, "", "please note that"],
  [/\bkeep\s+in\s+mind\s+that\s+/gi, "", "keep in mind that"],
  [/\bas\s+previously\s+mentioned,?\s*/gi, "", "as previously mentioned"],
  [/\bas\s+the\s+name\s+(suggests|implies),?\s*/gi, "", "as the name suggests"],

  // ---- 2. empty hedges ----
  [/\bessentially,?\s+/gi, "", "essentially"],
  [/\bbasically,?\s+/gi, "", "basically"],
  [/\bsimply\s+put,?\s*/gi, "", "simply put"],
  [/\bin\s+essence,?\s*/gi, "", "in essence"],
  [/\bat\s+its\s+core,?\s*/gi, "", "at its core"],

  // ---- 3. AI-tell adjectives / nouns ----
  [/\bseamlessly\b/gi, "", "seamlessly"],
  [/\bseamless\b/gi, "smooth", "seamless"],
  [/\bdelve\s+into\b/gi, "examine", "delve into"],
  [/\bdive\s+(deep\s+)?into\b/gi, "examine", "dive into"],
  [/\bnavigate\s+the\s+complexities\s+of\b/gi, "handle", "navigate the complexities of"],
  [/\bin\s+today['’]s\s+fast[- ]paced\s+world,?\s*/gi, "", "in today's fast-paced world"],
  [/\bin\s+the\s+ever[- ]evolving\s+landscape\s+of\b/gi, "in", "in the ever-evolving landscape of"],
  [/\bleverage\b/gi, "use", "leverage"],
  [/\bleveraging\b/gi, "using", "leveraging"],
  [/\brobust\b/gi, "solid", "robust"],
  [/\bcutting[- ]edge\b/gi, "new", "cutting-edge"],
  [/\bstate[- ]of[- ]the[- ]art\b/gi, "modern", "state-of-the-art"],
  [/\bgame[- ]changer\b/gi, "shift", "game-changer"],
  [/\bunlock\s+the\s+(power|potential)\s+of\b/gi, "use", "unlock the power of"],
  [/\bharness\s+the\s+(power|potential)\s+of\b/gi, "use", "harness the power of"],
  [/\bsupercharge\b/gi, "boost", "supercharge"],
  [/\btapestry\b/gi, "mix", "tapestry"],
  [/\brealm\b/gi, "area", "realm"],
  [/\bmyriad\b/gi, "many", "myriad"],
  [/\bplethora\b/gi, "many", "plethora"],

  // ---- 4. editorialising tails ----
  [/\bat\s+the\s+end\s+of\s+the\s+day,?\s*/gi, "", "at the end of the day"],
  [/\bwhen\s+all\s+is\s+said\s+and\s+done,?\s*/gi, "", "when all is said and done"],
  [/\bneedless\s+to\s+say,?\s*/gi, "", "needless to say"],
  [/\bsuffice\s+(it\s+)?to\s+say,?\s*/gi, "", "suffice to say"],

  // ---- 5. empty transitions ----
  [/(^|\n)moreover,?\s+/gi, "$1", "moreover"],
  [/(^|\n)furthermore,?\s+/gi, "$1", "furthermore"],
  [/(^|\n)additionally,?\s+/gi, "$1", "additionally"],
  [/(^|\n)in\s+conclusion,?\s+/gi, "$1", "in conclusion"],
  [/(^|\n)to\s+sum\s+(it\s+)?up,?\s+/gi, "$1", "to sum up"],

  // ---- 6. "not just X but Y" rhetorical scaffolding ----
  // Conservative: only collapses the literal "not just … but" → "and".
  [/\bnot\s+just\s+([^,.;:!?]{1,40}?)\s+but\s+/gi, "$1 and ", "not just X but Y"],

  // ---- 7. flowery closers Claude leans on ----
  [/\bi\s+hope\s+this\s+helps[!.]?\s*/gi, "", "i hope this helps"],
  [/\blet\s+me\s+know\s+if\s+you\s+have\s+any\s+(other\s+|further\s+)?questions[!.]?\s*/gi, "", "let me know if you have any questions"],
  [/\bfeel\s+free\s+to\s+/gi, "", "feel free to"],
];

// ---- code-fence aware splitter --------------------------------------------
/**
 * Split text into alternating prose / code segments. Code segments (fenced
 * ``` blocks and inline `…`) are returned untouched; prose segments are
 * passed through the rule table.
 */
function splitProseAndCode(text) {
  const segments = [];
  // Pattern matches a triple-backtick fenced block OR a single-backtick inline
  // span. We don't try to match HTML pre/code — markdown only.
  const re = /```[\s\S]*?```|`[^`\n]+`/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ kind: "prose", text: text.slice(lastIndex, m.index) });
    }
    segments.push({ kind: "code", text: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: "prose", text: text.slice(lastIndex) });
  }
  return segments;
}

// ---- apply rules ----------------------------------------------------------
function applyRulesToProse(prose, rules, counts) {
  let out = prose;
  for (const [pat, repl, label] of rules) {
    // Tally before replacement so we know how many phrases were stripped.
    const matches = out.match(pat);
    if (matches && matches.length > 0) {
      const key = label || String(pat);
      counts.set(key, (counts.get(key) || 0) + matches.length);
      out = out.replace(pat, repl);
    }
  }
  return out;
}

/**
 * Collapse the whitespace damage left behind after removing filler phrases:
 *   - Double / triple spaces → single space
 *   - Spaces before sentence punctuation
 *   - " ." that crept in from joining sentences
 *   - Leading lowercase after a sentence-final period gets re-capitalised
 *
 * We do NOT touch newlines — the markdown structure must survive intact.
 */
function tidyWhitespace(s) {
  let out = s;
  // Collapse runs of horizontal whitespace.
  out = out.replace(/[ \t]{2,}/g, " ");
  // Remove space before punctuation.
  out = out.replace(/ +([,.;:!?])/g, "$1");
  // Trim trailing whitespace at end of each line.
  out = out.replace(/[ \t]+\n/g, "\n");
  // Trim leading whitespace at start of each line that wasn't intentionally
  // indented (we only trim runs of 1–3 spaces; markdown indentation conventions
  // use 2 or 4 — preserve 4+).
  // (Deliberately conservative — leave alone.)
  // Re-capitalise after sentence boundaries when a lowercase letter follows a
  // period+space (created by stripping "Essentially, " at the start of a clause).
  out = out.replace(/([.!?]\s+)([a-z])/g, (_m, p, c) => p + c.toUpperCase());
  // Re-capitalise after a blank-line paragraph break (\n\n) — strips at the
  // start of a paragraph leave a lowercase opener otherwise.
  out = out.replace(/(\n\n+)([a-z])/g, (_m, br, c) => br + c.toUpperCase());
  // Re-capitalise the very first prose character if it's lowercase.
  out = out.replace(/^(\s*)([a-z])/, (_m, ws, c) => ws + c.toUpperCase());
  return out;
}

// ---- public API -----------------------------------------------------------
/**
 * Strip slop phrases from `text`.
 *
 * @param {string} text - markdown or plain prose. Untrusted input is fine; we
 *                       never eval, only regex-replace.
 * @param {object} [opts]
 * @param {Array} [opts.rules] - override the default rule table (same shape
 *                       as INLINE_RULES). Mostly for tests.
 * @returns {{ cleaned: string, removed: Array<{phrase: string, count: number}> }}
 */
export function stripSlop(text, opts = {}) {
  if (typeof text !== "string" || text.length === 0) {
    return { cleaned: text ?? "", removed: [] };
  }
  const rules = Array.isArray(opts.rules) ? opts.rules : INLINE_RULES;
  const counts = new Map();

  const segments = splitProseAndCode(text);
  const cleanedSegments = segments.map((seg) => {
    if (seg.kind === "code") return seg.text;
    const stripped = applyRulesToProse(seg.text, rules, counts);
    return tidyWhitespace(stripped);
  });

  const removed = [...counts.entries()]
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count);

  return { cleaned: cleanedSegments.join(""), removed };
}

/**
 * Best-effort loader for a future SKILL.md drop. If a `rules.json` or
 * `references/rules.json` sits next to SKILL.md with a `[pattern, replacement,
 * label?]` array (pattern as a string + flags pair `{src, flags}`), we use it
 * instead of the inline table. Otherwise we fall back to INLINE_RULES.
 *
 * This is intentionally optional — autonomous daemons should not require a
 * filesystem skill drop to function.
 */
export async function loadRulesFromSkillDir(dir) {
  const skillDir = dir || path.join(homedir(), ".claude/skills/stop-slop");
  const skillMd = path.join(skillDir, "SKILL.md");
  if (!existsSync(skillMd)) {
    return { rules: INLINE_RULES, source: "inline" };
  }
  // SKILL.md exists. Look for an optional rules.json next to it (or under
  // references/) — the SKILL.md itself is documentation, not data.
  const candidates = [
    path.join(skillDir, "rules.json"),
    path.join(skillDir, "references", "rules.json"),
  ];
  for (const c of candidates) {
    if (!existsSync(c)) continue;
    try {
      const raw = JSON.parse(await fs.readFile(c, "utf8"));
      if (!Array.isArray(raw)) continue;
      const compiled = [];
      for (const entry of raw) {
        if (!entry || typeof entry !== "object") continue;
        const src = entry.pattern?.src;
        const flags = entry.pattern?.flags || "gi";
        if (typeof src !== "string") continue;
        const replacement = typeof entry.replacement === "string" ? entry.replacement : "";
        const label = typeof entry.label === "string" ? entry.label : src;
        compiled.push([new RegExp(src, flags), replacement, label]);
      }
      if (compiled.length > 0) {
        return { rules: compiled, source: c };
      }
    } catch {
      // fall through to next candidate
    }
  }
  // SKILL.md exists but no machine-readable rules.json — keep using inline.
  return { rules: INLINE_RULES, source: `inline (SKILL.md present at ${skillMd}, no rules.json)` };
}

/** Count of inline rules — exported so daemons can log it on startup. */
export const INLINE_RULE_COUNT = INLINE_RULES.length;
