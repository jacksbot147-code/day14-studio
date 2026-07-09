#!/usr/bin/env node
/**
 * geo-onboard-client.mjs — one-command GEO client onboarding + run import.
 *
 * Two modes:
 *
 * 1. SCAFFOLD — set up a new GEO client's dossier + localized prompt pack:
 *    node scripts/geo-onboard-client.mjs \
 *      --slug sunny-pools --name "Sunny Pools" --city "Naples" \
 *      --service "pool service" --vertical pools \
 *      --competitors "Comp A, Comp B, Comp C" [--gbp URL] [--site URL]
 *
 *    Creates customers/<slug>/07-geo/ with 00-geo-intake.md (never
 *    overwrites an existing intake) and prompt-pack-localized.md — the
 *    exact prompts to run across ChatGPT / Perplexity / Google AI Mode.
 *
 * 2. IMPORT — convert a tracker/manual CSV export into prompt-runs.jsonl:
 *    node scripts/geo-onboard-client.mjs --slug sunny-pools --import runs.csv
 *
 *    CSV columns (header row, any order, case-insensitive):
 *      engine, prompt, mentioned, [position], [sentiment], [citation], [timestamp]
 *    engine: chatgpt | perplexity | google-ai (aliases: gpt, pplx, google, aio →
 *    normalized). mentioned: yes/no/true/false/1/0. Rows append to
 *    customers/<slug>/07-geo/prompt-runs.jsonl (append-only — the
 *    geo-visibility-monitor skill takes latest-per-cell, so re-imports are safe).
 *
 * PROMPT SOURCE OF TRUTH: src/lib/geo-content.ts (GEO_PROMPT_PACK). This
 * script parses that file's pack block as text so the prompts are never
 * duplicated here. If parsing fails it aborts loudly — fix geo-content.ts
 * formatting rather than forking the pack.
 *
 * Hard rails: never queries AI engines itself (runs are recorded by Jack
 * or the tracker); writes only under the client's 07-geo/ dossier dir +
 * a work-register line. No sends, no pushes.
 *
 * Selftest: node scripts/geo-onboard-client.mjs --selftest
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import os from "node:os";

const BASE = process.env.DAY14_GEO_BASE || os.homedir();
const CUSTOMERS = path.join(BASE, "Documents/businesses/_shared/customers");
const REGISTER = path.join(BASE, "Documents/businesses/_shared/growth/work-register.jsonl");
const GEO_CONTENT = path.join(BASE, "Documents/studio/src/lib/geo-content.ts");

// ---------------------------------------------------------------------------
// Prompt pack extraction (single source: geo-content.ts, parsed as text).
// ---------------------------------------------------------------------------
export function parsePromptPack(tsSource) {
  const start = tsSource.indexOf("export const GEO_PROMPT_PACK");
  const end = tsSource.indexOf("GEO_PROMPT_COUNT");
  if (start === -1 || end === -1 || end <= start) return null;
  const block = tsSource.slice(start, end);
  const groups = [];
  const groupRe = /vertical:\s*"([^"]+)"\s*,\s*prompts:\s*\[([\s\S]*?)\]/g;
  let m;
  while ((m = groupRe.exec(block))) {
    const prompts = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    if (prompts.length) groups.push({ vertical: m[1], prompts });
  }
  return groups.length ? groups : null;
}

const VERTICAL_ALIASES = {
  pools: "Pool service",
  pool: "Pool service",
  lawn: "Lawn & landscape",
  landscape: "Lawn & landscape",
  pest: "Pest control",
  tree: "Tree & exterior",
  exterior: "Tree & exterior",
  fence: "Tree & exterior",
  "pressure-washing": "Tree & exterior",
};

export function localizePack(groups, { name, city, service, vertical }) {
  const wanted = [];
  const core = groups.find((g) => g.vertical.toLowerCase().includes("core"));
  if (core) wanted.push(core);
  const vLabel = VERTICAL_ALIASES[(vertical || "").toLowerCase()] || null;
  if (vLabel) {
    const vg = groups.find((g) => g.vertical === vLabel);
    if (vg) wanted.push(vg);
  }
  const sub = (p) =>
    p
      .replaceAll("{service}", service)
      .replaceAll("{city}", city)
      .replaceAll("{business name}", name);
  return wanted.map((g) => ({ vertical: g.vertical, prompts: g.prompts.map(sub) }));
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------
export function parseCsv(text) {
  // Minimal RFC-ish parser: quoted fields, embedded commas/quotes.
  const rows = [];
  let row = [],
    field = "",
    inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

const ENGINE_ALIASES = {
  chatgpt: "chatgpt",
  gpt: "chatgpt",
  openai: "chatgpt",
  perplexity: "perplexity",
  pplx: "perplexity",
  "google-ai": "google-ai",
  google: "google-ai",
  aio: "google-ai",
  "ai mode": "google-ai",
  "google ai mode": "google-ai",
  gemini: "google-ai",
};

export function rowsToRuns(rows) {
  if (rows.length < 2) return { runs: [], skipped: 0 };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name) => header.indexOf(name);
  const iEngine = col("engine"),
    iPrompt = col("prompt"),
    iMentioned = col("mentioned");
  if (iEngine === -1 || iPrompt === -1 || iMentioned === -1) {
    throw new Error(
      `CSV needs engine, prompt, mentioned columns — got: ${header.join(", ")}`
    );
  }
  const iPos = col("position"),
    iSent = col("sentiment"),
    iCit = col("citation"),
    iTs = col("timestamp");

  const runs = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const engine = ENGINE_ALIASES[(r[iEngine] || "").trim().toLowerCase()];
    const prompt = (r[iPrompt] || "").trim();
    const mRaw = (r[iMentioned] || "").trim().toLowerCase();
    const mentioned = ["yes", "true", "1", "y"].includes(mRaw)
      ? true
      : ["no", "false", "0", "n"].includes(mRaw)
        ? false
        : null;
    if (!engine || !prompt || mentioned === null) {
      skipped++;
      continue;
    }
    const posRaw = iPos !== -1 ? parseInt((r[iPos] || "").trim(), 10) : NaN;
    const sentRaw = iSent !== -1 ? (r[iSent] || "").trim().toLowerCase() : "";
    const run = {
      timestamp:
        iTs !== -1 && (r[iTs] || "").trim()
          ? new Date((r[iTs] || "").trim()).toISOString()
          : new Date().toISOString(),
      engine,
      prompt,
      mentioned,
      position: Number.isFinite(posRaw) ? posRaw : null,
    };
    if (["positive", "neutral", "negative"].includes(sentRaw)) run.sentiment = sentRaw;
    if (iCit !== -1 && (r[iCit] || "").trim()) run.citation = (r[iCit] || "").trim();
    runs.push(run);
  }
  return { runs, skipped };
}

// ---------------------------------------------------------------------------
async function logWorkRegister(action_phrase, context) {
  try {
    await fs.mkdir(path.dirname(REGISTER), { recursive: true });
    await fs.appendFile(
      REGISTER,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        action_phrase,
        context,
        agent: "geo-onboard-client",
        invoked_skill: "geo-visibility-monitor",
      }) + "\n",
      "utf8"
    );
  } catch {
    /* telemetry never blocks the work */
  }
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function scaffold() {
  const slug = arg("slug"),
    name = arg("name"),
    city = arg("city"),
    service = arg("service"),
    vertical = arg("vertical") || "",
    competitors = (arg("competitors") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!slug || !name || !city || !service) {
    console.error(
      "usage: geo-onboard-client.mjs --slug s --name N --city C --service S [--vertical pools|lawn|pest|tree] [--competitors 'A,B,C'] [--gbp URL] [--site URL]"
    );
    process.exit(1);
  }

  if (!existsSync(GEO_CONTENT)) {
    console.error(`cannot find ${GEO_CONTENT} — prompt pack source of truth missing`);
    process.exit(1);
  }
  const groups = parsePromptPack(await fs.readFile(GEO_CONTENT, "utf8"));
  if (!groups) {
    console.error("failed to parse GEO_PROMPT_PACK from geo-content.ts — fix formatting there, do not fork the pack");
    process.exit(1);
  }
  const localized = localizePack(groups, { name, city, service, vertical });

  const dir = path.join(CUSTOMERS, slug, "07-geo");
  await fs.mkdir(path.join(dir, "transcripts"), { recursive: true });

  const intake = path.join(dir, "00-geo-intake.md");
  if (!existsSync(intake)) {
    await fs.writeFile(
      intake,
      [
        `# GEO intake — ${name}`,
        "",
        `- slug: ${slug}`,
        `- business: ${name}`,
        `- city: ${city}`,
        `- service: ${service}`,
        `- vertical: ${vertical || "unset"}`,
        `- competitors: ${competitors.join(", ") || "TBD"}`,
        `- gbp: ${arg("gbp") || "TBD"}`,
        `- site: ${arg("site") || "TBD"}`,
        `- onboarded: ${new Date().toISOString()}`,
        "",
        "Founding-rate terms + pricing: src/lib/pricing.ts (GEO_TIERS, GEO_FOUNDING) — never restated here.",
      ].join("\n"),
      "utf8"
    );
    console.log(`✓ wrote ${intake}`);
  } else {
    console.log(`· intake exists, left untouched (append edits by hand)`);
  }

  const packLines = [
    `# Localized prompt pack — ${name} (${city})`,
    "",
    "Run EVERY prompt on EVERY engine (ChatGPT, Perplexity, Google AI Mode).",
    "Record each answer: mentioned? position among named businesses? save the",
    "transcript to transcripts/. Then import via:",
    "",
    `\`node scripts/geo-onboard-client.mjs --slug ${slug} --import runs.csv\``,
    "",
  ];
  for (const g of localized) {
    packLines.push(`## ${g.vertical}`);
    for (const p of g.prompts) packLines.push(`- [ ] ${p}`);
    packLines.push("");
  }
  if (competitors.length) {
    packLines.push("## Competitor spot-checks (record who IS named)");
    for (const c of competitors) packLines.push(`- [ ] "is ${c} in ${city} any good?" — all 3 engines`);
    packLines.push("");
  }
  const packFile = path.join(dir, "prompt-pack-localized.md");
  await fs.writeFile(packFile, packLines.join("\n"), "utf8");
  console.log(`✓ wrote ${packFile} (${localized.reduce((n, g) => n + g.prompts.length, 0)} prompts)`);

  await logWorkRegister(`onboarded GEO client ${slug} (${city}, ${service})`, slug);
  console.log(`\nNext: run the pack, record results, import the CSV, then geo-visibility-monitor produces the baseline /20.`);
}

async function importCsv() {
  const slug = arg("slug"),
    file = arg("import");
  const dir = path.join(CUSTOMERS, slug, "07-geo");
  if (!existsSync(file)) {
    console.error(`CSV not found: ${file}`);
    process.exit(1);
  }
  await fs.mkdir(dir, { recursive: true });
  const { runs, skipped } = rowsToRuns(parseCsv(await fs.readFile(file, "utf8")));
  if (!runs.length) {
    console.error(`no valid rows (${skipped} skipped) — check engine/prompt/mentioned columns`);
    process.exit(1);
  }
  const out = path.join(dir, "prompt-runs.jsonl");
  await fs.appendFile(out, runs.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  console.log(`✓ appended ${runs.length} runs to ${out} (${skipped} rows skipped)`);
  await logWorkRegister(`imported ${runs.length} GEO prompt runs for ${slug}`, slug);
  console.log(`Next: run the geo-visibility-monitor skill for the score/report.`);
}

// ---------------------------------------------------------------------------
async function selftest() {
  let pass = 0,
    fail = 0;
  const assert = (cond, name) => {
    if (cond) {
      pass++;
      console.log(`  ✓ ${name}`);
    } else {
      fail++;
      console.error(`  ✗ ${name}`);
    }
  };

  // prompt pack parsing against a realistic TS snippet
  const ts = `
export const GEO_PROMPT_PACK: GeoPromptGroup[] = [
  {
    vertical: "Any local service (core five — every audit runs these)",
    prompts: [
      "best {service} in {city}",
      "is {business name} in {city} any good?",
    ],
  },
  {
    vertical: "Pool service",
    prompts: [
      "best weekly pool cleaning service in {city}",
    ],
  },
];
export const GEO_PROMPT_COUNT = 3;`;
  const groups = parsePromptPack(ts);
  assert(groups && groups.length === 2 && groups[0].prompts.length === 2, "parsePromptPack extracts groups + prompts");

  const loc = localizePack(groups, { name: "Sunny Pools", city: "Naples", service: "pool service", vertical: "pools" });
  assert(loc.length === 2, "localizePack includes core + vertical group");
  assert(loc[0].prompts[0] === "best pool service in Naples", "{service}/{city} substituted");
  assert(loc[0].prompts[1].includes("Sunny Pools"), "{business name} substituted");

  // CSV parsing
  const csv = `engine,prompt,mentioned,position,citation
chatgpt,"best pool service in Naples",yes,2,https://x.com
PPLX,"best pool service in Naples",no,,
fax,"bad row",yes,,
google ai mode,"who to hire",TRUE,1,`;
  const { runs, skipped } = rowsToRuns(parseCsv(csv));
  assert(runs.length === 3 && skipped === 1, "rowsToRuns: 3 valid, 1 skipped (unknown engine)");
  assert(runs[0].engine === "chatgpt" && runs[0].position === 2 && runs[0].mentioned === true, "row 1 normalized");
  assert(runs[1].engine === "perplexity" && runs[1].mentioned === false && runs[1].position === null, "alias PPLX + no-position");
  assert(runs[2].engine === "google-ai" && runs[2].mentioned === true, "alias 'google ai mode' + TRUE");

  // quoted comma
  const q = parseCsv('engine,prompt,mentioned\nchatgpt,"a, b, c",yes');
  assert(q[1][1] === "a, b, c", "quoted commas survive");

  console.log(`\nselftest: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

// Only run the CLI when executed directly — the parse/localize/CSV helpers
// are importable by other scripts (and the verification harness) without
// side effects.
import { pathToFileURL } from "node:url";
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  if (process.argv.includes("--selftest")) selftest();
  else if (arg("import")) importCsv();
  else scaffold();
}
