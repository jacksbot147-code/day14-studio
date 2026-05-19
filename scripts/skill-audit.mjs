#!/usr/bin/env node
/**
 * skill-audit.mjs
 *
 * Pairwise similarity audit across all SKILL.md files.
 * Surfaces top merge candidates based on:
 *   - Shared trigger words
 *   - Description bigram overlap
 *   - Name token overlap
 *
 * Output: ~/Documents/studio/docs/skill-merge-candidates-{YYYY-MM-DD}.md
 *
 * Run: node ~/Documents/studio/scripts/skill-audit.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const SEEDS = path.join(HOME, "Documents/studio/docs/seeds/skills");
const STUDIO_DOCS = path.join(HOME, "Documents/studio/docs");

const STOPWORDS = new Set([
  "a","an","and","are","as","at","be","by","for","from","has","have","in",
  "is","it","its","of","on","or","that","the","this","to","was","will",
  "with","when","what","how","day14","skill","skills","jack","then","this",
  "auto","not","also","via","into","over","more","one","two","three","new",
  "use","used","uses","using","user","users","data","check","check","first",
  "before","after","every","always","never","need","needs","needed","each",
  "across","another","because","based","being","both","cannot","could","does",
  "doesnt","etc","just","like","most","much","only","other","some","still",
  "such","than","them","their","there","these","those","through","very",
  "want","wants","wanted","while","would","your","yours","you","yes","no"
]);

// ---- parse frontmatter + description ----
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  // triggers list
  const triggersBlock = m[1].match(/triggers:\n((?:\s+-\s+.*\n?)+)/);
  if (triggersBlock) {
    fm.triggers = triggersBlock[1]
      .split("\n")
      .map((l) => l.match(/-\s+"?([^"]+)"?/))
      .filter(Boolean)
      .map((x) => x[1].trim());
  }
  return fm;
}

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function bigrams(tokens) {
  const grams = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    grams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return grams;
}

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

// ---- load all skills ----
async function loadSkills() {
  const skills = [];
  for (const e of await fs.readdir(SEEDS, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith("_")) continue;
    const skillFile = path.join(SEEDS, e.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    const text = await fs.readFile(skillFile, "utf8");
    const fm = parseFrontmatter(text);
    skills.push({
      name: e.name,
      description: fm.description || "",
      triggers: fm.triggers || [],
      isMeta: fm.is_meta === "true",
      pack: fm.pack || "",
    });
  }
  return skills;
}

// ---- compute similarity ----
function similarity(a, b) {
  // Name token similarity (heavy weight on near-identical names)
  const nameA = a.name.split("-");
  const nameB = b.name.split("-");
  const nameSim = jaccard(nameA, nameB);

  // Trigger word similarity
  const trigA = (a.triggers || []).flatMap((t) => tokenize(t));
  const trigB = (b.triggers || []).flatMap((t) => tokenize(t));
  const trigSim = jaccard(trigA, trigB);

  // Description bigram similarity
  const descA = bigrams(tokenize(a.description));
  const descB = bigrams(tokenize(b.description));
  const descSim = jaccard(descA, descB);

  // Weighted composite
  const composite = nameSim * 0.4 + trigSim * 0.35 + descSim * 0.25;

  return { composite, nameSim, trigSim, descSim };
}

// ---- main ----
async function main() {
  console.log("Day14 OS — skill merge audit");
  const skills = await loadSkills();
  console.log(`Loaded ${skills.length} skills`);

  // Pairwise comparison (n²/2 — manageable for n=200)
  const pairs = [];
  for (let i = 0; i < skills.length; i++) {
    for (let j = i + 1; j < skills.length; j++) {
      // Don't cross-pollinate meta vs domain
      if (skills[i].isMeta !== skills[j].isMeta) continue;
      const s = similarity(skills[i], skills[j]);
      if (s.composite > 0.25) {
        pairs.push({
          a: skills[i].name,
          b: skills[j].name,
          aDesc: skills[i].description,
          bDesc: skills[j].description,
          ...s,
        });
      }
    }
  }

  pairs.sort((x, y) => y.composite - x.composite);
  const top = pairs.slice(0, 15);

  console.log(`Found ${pairs.length} candidate pairs (composite > 0.25)`);
  console.log(`Top ${top.length} surfaced.`);

  // ---- write report ----
  const date = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(
    STUDIO_DOCS,
    `skill-merge-candidates-${date}.md`
  );

  const lines = [];
  lines.push(`# Skill merge candidates — ${date}`);
  lines.push("");
  lines.push(`Auto-generated by \`scripts/skill-audit.mjs\``);
  lines.push("");
  lines.push(`## Summary`);
  lines.push(`- Skills scanned: **${skills.length}**`);
  lines.push(`- Pairs above similarity threshold (0.25): ${pairs.length}`);
  lines.push(`- Top 15 surfaced for review`);
  lines.push("");
  lines.push(`## Top merge candidates`);
  lines.push("");

  for (let i = 0; i < top.length; i++) {
    const p = top[i];
    lines.push(`### ${i + 1}. \`${p.a}\` ↔ \`${p.b}\``);
    lines.push("");
    lines.push(
      `**Composite similarity: ${p.composite.toFixed(2)}** (name ${p.nameSim.toFixed(2)} · triggers ${p.trigSim.toFixed(2)} · description ${p.descSim.toFixed(2)})`
    );
    lines.push("");
    lines.push(`- **${p.a}**: ${p.aDesc.slice(0, 200)}${p.aDesc.length > 200 ? "…" : ""}`);
    lines.push("");
    lines.push(`- **${p.b}**: ${p.bDesc.slice(0, 200)}${p.bDesc.length > 200 ? "…" : ""}`);
    lines.push("");
    lines.push(
      `**Suggested action**: ${
        p.composite > 0.6
          ? "**MERGE** — likely duplicate"
          : p.composite > 0.4
            ? "review carefully — overlap is high"
            : "review for delineation — describe how they differ"
      }`
    );
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push(`## Methodology`);
  lines.push("");
  lines.push(`Each pair scored on 3 dimensions:`);
  lines.push(`- **Name similarity** (40% weight): Jaccard of name-token sets`);
  lines.push(`- **Trigger similarity** (35% weight): Jaccard of trigger-word sets`);
  lines.push(`- **Description similarity** (25% weight): Jaccard of description bigrams`);
  lines.push("");
  lines.push(
    `Meta skills only compared to meta skills; domain only to domain.`
  );
  lines.push("");
  lines.push(
    `Threshold for surfacing: composite > 0.25. Action thresholds: MERGE > 0.6, careful review > 0.4, delineation review > 0.25.`
  );

  await fs.writeFile(reportPath, lines.join("\n"), "utf8");
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error("[skill-audit] FATAL:", err);
  process.exit(1);
});
