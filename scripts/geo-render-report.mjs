#!/usr/bin/env node
/**
 * geo-render-report.mjs — render a client-facing HTML GEO report.
 *
 * Presentation layer ONLY. The scoring source of truth is the
 * geo-visibility-monitor skill (src/lib/skills/geo-visibility-monitor.ts):
 * this script re-renders that skill's outputs —
 *   customers/<slug>/07-geo/score-history.jsonl  (score, delta, cells per run)
 *   customers/<slug>/07-geo/report-<date>.md     (per-engine lines, weakest cells)
 * — into docs/seeds/geo/report-template.html and writes
 *   customers/<slug>/07-geo/report-<date>.html
 * ready to review (Jack ALWAYS reviews before the client sees it — skill
 * hard rule) and send by hand.
 *
 * Usage:    node scripts/geo-render-report.mjs --slug sunny-pools --name "Sunny Pools" --city "Naples, FL"
 * Selftest: node scripts/geo-render-report.mjs --selftest
 *
 * No LLM, no network, no prices. Never queries engines. Read-only on the
 * dossier except the rendered HTML it writes.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import os from "node:os";
import { pathToFileURL } from "node:url";

const BASE = process.env.DAY14_GEO_BASE || os.homedir();
const CUSTOMERS = path.join(BASE, "Documents/businesses/_shared/customers");
const TEMPLATE = path.join(BASE, "Documents/studio/docs/seeds/geo/report-template.html");

const ENGINE_LABELS = ["ChatGPT", "Perplexity", "Google AI Mode"];

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Latest history entry + full trend from score-history.jsonl. */
export function parseHistory(jsonl) {
  const entries = [];
  for (const line of jsonl.split("\n").filter(Boolean)) {
    try {
      const e = JSON.parse(line);
      if (typeof e.score === "number") entries.push(e);
    } catch {}
  }
  return entries;
}

/** Pull per-engine breakdown + weakest cells out of the skill's md report.
 *  Format is stable (written by writeGeoReport): lines like
 *  "- **ChatGPT** — mentioned in 3/10 prompts (top-3 in 1)" and a
 *  "## Weakest cells" section of `- "prompt" on Engine` lines. */
export function parseReportMd(md) {
  const engines = [];
  for (const label of ENGINE_LABELS) {
    const re = new RegExp(
      `\\*\\*${label}\\*\\*\\s*—\\s*(?:mentioned in (\\d+)\\/(\\d+) prompts \\(top-3 in (\\d+)\\)|not measured)`
    );
    const m = md.match(re);
    if (!m) continue;
    if (m[1] === undefined) engines.push({ label, measured: false });
    else
      engines.push({
        label,
        measured: true,
        mentioned: Number(m[1]),
        cells: Number(m[2]),
        topThree: Number(m[3]),
      });
  }
  const weakest = [];
  const weakBlock = md.split(/## Weakest cells[^\n]*\n/)[1];
  if (weakBlock) {
    for (const line of weakBlock.split("\n")) {
      const m = line.match(/^- "(.+)" on (.+)$/);
      if (m) weakest.push({ prompt: m[1], engine: m[2] });
      else if (line.startsWith("#")) break;
    }
  }
  const partial = /Partial coverage/.test(md);
  return { engines, weakest, partial };
}

export function buildHtml(template, { name, city, date, history, parsed }) {
  const latest = history[history.length - 1];
  const score = latest.score;
  const delta = latest.delta;

  const deltaChip =
    delta === null || delta === undefined
      ? `<span class="chip flat">baseline measurement</span>`
      : delta > 0
        ? `<span class="chip up">▲ +${delta} since last report</span>`
        : delta < 0
          ? `<span class="chip down">▼ ${delta} since last report</span>`
          : `<span class="chip flat">no change since last report</span>`;

  const baselineNote =
    delta === null || delta === undefined
      ? "This is your starting point — the number the monthly work moves."
      : delta >= 0
        ? "Honest measurement, same prompts as last period."
        : "Down is reported as plainly as up — the weakest cells below are this period's targets.";

  const engineRows = parsed.engines
    .map((e) => {
      if (!e.measured)
        return `<div class="engine"><span class="name">${esc(e.label)}</span><div class="meter"><b style="width:0%"></b></div><span class="stat">not measured</span></div>`;
      const pct = e.cells ? Math.round((e.mentioned / e.cells) * 100) : 0;
      return `<div class="engine"><span class="name">${esc(e.label)}</span><div class="meter"><b style="width:${pct}%"></b></div><span class="stat">${e.mentioned}/${e.cells} · top-3 ×${e.topThree}</span></div>`;
    })
    .join("\n    ");

  const weakestSection = parsed.weakest.length
    ? `<div class="section"><h2>Where you're invisible — next period's targets</h2>
  <div class="weak"><p class="lead">These exact questions currently return answers that don't include you. Each one becomes targeted content work.</p><ul>
    ${parsed.weakest.map((w) => `<li>&ldquo;${esc(w.prompt)}&rdquo;<span class="eng">${esc(w.engine)}</span></li>`).join("\n    ")}
  </ul></div></div>`
    : `<div class="section"><h2>Where you're invisible</h2><div class="weak"><p class="lead">No zero-scoring cells this period — every measured question mentions you at least once. The work shifts to top-3 placement.</p></div></div>`;

  const historyRows = history
    .slice(-8)
    .reverse()
    .map((h) => {
      const d = (h.timestamp || "").slice(0, 10);
      const ch =
        h.delta === null || h.delta === undefined
          ? "—"
          : h.delta > 0
            ? `+${h.delta}`
            : String(h.delta);
      return `<tr><td class="mono">${esc(d)}</td><td class="mono">${h.score}/20</td><td>${esc(ch)}</td><td>${h.cells ?? "—"}</td></tr>`;
    })
    .join("\n        ");

  const coverageNote = parsed.partial
    ? `<div class="section method"><b>Coverage note.</b> Not all three engines were measured this period — the score reflects measured cells only and shouldn't be compared against a full-coverage baseline.</div>`
    : "";

  return template
    .replaceAll("{{CLIENT_NAME}}", esc(name))
    .replaceAll("{{CLIENT_CITY}}", esc(city))
    .replaceAll("{{REPORT_DATE}}", esc(date))
    .replaceAll("{{SCORE}}", String(score))
    .replaceAll("{{SCORE_PCT}}", String(Math.round((score / 20) * 100)))
    .replaceAll("{{DELTA_CHIP}}", deltaChip)
    .replaceAll("{{BASELINE_NOTE}}", baselineNote)
    .replaceAll("{{CELLS}}", String(latest.cells ?? "—"))
    .replaceAll("{{ENGINE_ROWS}}", engineRows)
    .replaceAll("{{WEAKEST_SECTION}}", weakestSection)
    .replaceAll("{{HISTORY_ROWS}}", historyRows)
    .replaceAll("{{COVERAGE_NOTE}}", coverageNote);
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const slug = arg("slug");
  const name = arg("name") || slug;
  const city = arg("city") || "";
  if (!slug) {
    console.error('usage: geo-render-report.mjs --slug <slug> [--name "Client"] [--city "Naples, FL"]');
    process.exit(1);
  }
  const geoDir = path.join(CUSTOMERS, slug, "07-geo");
  const historyFile = path.join(geoDir, "score-history.jsonl");
  if (!existsSync(historyFile)) {
    console.error(`no score history at ${historyFile} — run the geo-visibility-monitor skill first`);
    process.exit(1);
  }
  const history = parseHistory(await fs.readFile(historyFile, "utf8"));
  if (!history.length) {
    console.error("score history exists but has no valid entries");
    process.exit(1);
  }

  // Latest md report (per-engine + weakest cells).
  const mdFiles = (await fs.readdir(geoDir)).filter((f) => /^report-\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort();
  const latestMd = mdFiles[mdFiles.length - 1];
  const parsed = latestMd
    ? parseReportMd(await fs.readFile(path.join(geoDir, latestMd), "utf8"))
    : { engines: [], weakest: [], partial: false };

  const template = await fs.readFile(TEMPLATE, "utf8");
  const date = (latestMd ? latestMd.match(/(\d{4}-\d{2}-\d{2})/)[1] : new Date().toISOString().slice(0, 10));
  const html = buildHtml(template, { name, city, date, history, parsed });

  const out = path.join(geoDir, `report-${date}.html`);
  await fs.writeFile(out, html, "utf8");
  console.log(`✓ rendered ${out}`);
  console.log("  Review it BEFORE the client sees it (skill hard rule 5).");
}

// ---------------------------------------------------------------------------
async function selftest() {
  let pass = 0,
    fail = 0;
  const assert = (cond, n) => {
    if (cond) {
      pass++;
      console.log(`  ✓ ${n}`);
    } else {
      fail++;
      console.error(`  ✗ ${n}`);
    }
  };

  const history = parseHistory(
    [
      JSON.stringify({ timestamp: "2026-06-10T12:00:00Z", score: 6, cells: 30, delta: null }),
      "corrupt line {{{",
      JSON.stringify({ timestamp: "2026-07-10T12:00:00Z", score: 11, cells: 30, delta: 5 }),
    ].join("\n")
  );
  assert(history.length === 2 && history[1].score === 11, "parseHistory keeps valid entries, skips corrupt");

  const md = `# GEO visibility — sunny — 2026-07-10

## Score: 11/20 (+5 vs last report)

- Cells measured: 30

## Per engine
- **ChatGPT** — mentioned in 5/10 prompts (top-3 in 2)
- **Perplexity** — mentioned in 4/10 prompts (top-3 in 1)
- **Google AI Mode** — not measured

## Weakest cells (next month's content targets)
- "best pool service in naples" on Google AI Mode
- "pool company near me" on ChatGPT

_Generated: 2026-07-10T12:00:00Z_`;
  const parsed = parseReportMd(md);
  assert(parsed.engines.length === 3, "parseReportMd finds all 3 engine lines");
  assert(parsed.engines[0].mentioned === 5 && parsed.engines[0].topThree === 2, "engine numbers parsed");
  assert(parsed.engines[2].measured === false, "not-measured engine recognized");
  assert(parsed.weakest.length === 2 && parsed.weakest[0].engine === "Google AI Mode", "weakest cells parsed");

  const template = await fs.readFile(
    process.env.DAY14_GEO_TEMPLATE_TEST || TEMPLATE,
    "utf8"
  ).catch(() => "{{CLIENT_NAME}}|{{SCORE}}|{{SCORE_PCT}}|{{DELTA_CHIP}}|{{ENGINE_ROWS}}|{{WEAKEST_SECTION}}|{{HISTORY_ROWS}}|{{CELLS}}|{{BASELINE_NOTE}}|{{REPORT_DATE}}|{{CLIENT_CITY}}|{{COVERAGE_NOTE}}");
  const html = buildHtml(template, {
    name: "Sunny <Pools>",
    city: "Naples, FL",
    date: "2026-07-10",
    history,
    parsed,
  });
  assert(html.includes("Sunny &lt;Pools&gt;"), "client name is HTML-escaped");
  assert(html.includes("+5"), "delta rendered");
  assert(html.includes("55"), "score pct (11/20 → 55) rendered");
  assert(!html.includes("{{"), "no unreplaced placeholders remain");
  assert(html.includes("best pool service in naples"), "weakest cell text present");

  console.log(`\nselftest: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  if (process.argv.includes("--selftest")) selftest();
  else main().catch((err) => {
    console.error("FATAL:", err.message);
    process.exit(1);
  });
}
