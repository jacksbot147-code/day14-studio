/**
 * lib/skills/stop-slop.ts
 *
 * TypeScript port of `scripts/lib/skills/stop-slop.mjs`. Mirrors the same rule
 * table so the server-side `/admin/ship` pre-publish gate produces the same
 * counts as the offline Node daemons that already use the .mjs version.
 *
 * Public surface:
 *   stripSlop(text) -> { cleaned: string, removed: [{ phrase, count }] }
 *   INLINE_RULE_COUNT
 *
 * Design rules:
 *   - Deterministic. No LLM call. No network.
 *   - Safe to run on markdown — never strips inside code fences or inline
 *     backticks (so we don't mangle code samples in briefings).
 *   - Word-boundary anchored where possible to avoid partial-word damage.
 *   - Case-insensitive matching; re-capitalises sentence openers after
 *     filler is stripped.
 *
 * If the upstream .mjs rule table changes, update this file in lockstep.
 */

type Rule = readonly [RegExp, string, string];

// Each entry: [pattern, replacement, label]
const INLINE_RULES: readonly Rule[] = [
  // ---- 1. filler openers ----
  [/\b(it['’]s|it\s+is)\s+worth\s+noting\s+that\s+/gi, "", "it's worth noting that"],
  [
    /\b(it['’]s|it\s+is)\s+important\s+to\s+(note|remember|understand)\s+that\s+/gi,
    "",
    "it's important to note that",
  ],
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
  [/\bnot\s+just\s+([^,.;:!?]{1,40}?)\s+but\s+/gi, "$1 and ", "not just X but Y"],

  // ---- 7. flowery closers Claude leans on ----
  [/\bi\s+hope\s+this\s+helps[!.]?\s*/gi, "", "i hope this helps"],
  [
    /\blet\s+me\s+know\s+if\s+you\s+have\s+any\s+(other\s+|further\s+)?questions[!.]?\s*/gi,
    "",
    "let me know if you have any questions",
  ],
  [/\bfeel\s+free\s+to\s+/gi, "", "feel free to"],
];

type Segment = { kind: "prose" | "code"; text: string };

/**
 * Split text into alternating prose / code segments. Code segments (fenced
 * ``` blocks and inline `…`) are returned untouched.
 */
function splitProseAndCode(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /```[\s\S]*?```|`[^`\n]+`/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
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

function applyRulesToProse(
  prose: string,
  rules: readonly Rule[],
  counts: Map<string, number>,
): string {
  let out = prose;
  for (const [pat, repl, label] of rules) {
    const matches = out.match(pat);
    if (matches && matches.length > 0) {
      counts.set(label, (counts.get(label) ?? 0) + matches.length);
      out = out.replace(pat, repl);
    }
  }
  return out;
}

/**
 * Collapse the whitespace damage left behind after removing filler phrases.
 * Newlines are preserved so the markdown structure survives intact.
 */
function tidyWhitespace(s: string): string {
  let out = s;
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/ +([,.;:!?])/g, "$1");
  out = out.replace(/[ \t]+\n/g, "\n");
  out = out.replace(/([.!?]\s+)([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase());
  out = out.replace(/(\n\n+)([a-z])/g, (_m, br: string, c: string) => br + c.toUpperCase());
  out = out.replace(/^(\s*)([a-z])/, (_m, ws: string, c: string) => ws + c.toUpperCase());
  return out;
}

export interface SlopRemoval {
  phrase: string;
  count: number;
}

export interface SlopResult {
  cleaned: string;
  removed: SlopRemoval[];
}

/**
 * Strip slop phrases from `text`. Deterministic, no network.
 */
export function stripSlop(text: string): SlopResult {
  if (typeof text !== "string" || text.length === 0) {
    return { cleaned: text ?? "", removed: [] };
  }
  const counts = new Map<string, number>();
  const segments = splitProseAndCode(text);
  const cleanedSegments = segments.map((seg) => {
    if (seg.kind === "code") return seg.text;
    const stripped = applyRulesToProse(seg.text, INLINE_RULES, counts);
    return tidyWhitespace(stripped);
  });
  const removed: SlopRemoval[] = [...counts.entries()]
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count);
  return { cleaned: cleanedSegments.join(""), removed };
}

/** Total number of phrases removed across all rules. */
export function totalRemoved(removed: readonly SlopRemoval[]): number {
  let n = 0;
  for (const r of removed) n += r.count;
  return n;
}

export const INLINE_RULE_COUNT = INLINE_RULES.length;
