#!/usr/bin/env node
/**
 * alignmd-evidence-verifier.mjs — AlignMD QA-layer agent (Day14 OS shared-agent pattern).
 *
 * Ships roadmap beefup #4 (trust/QA layer) from
 * drafts/ALIGNMD-AGENT-ROADMAP-2026-06-08.md. It flags dossiers where the
 * credential-parse output does NOT match the source document, so a parser
 * hallucination or OCR slip can't silently flow into an assembled dossier.
 *
 * WHAT IT DOES
 *   1. Reads the active dossier queue (credential-parse-v2 records).
 *   2. For each dossier, re-reads the SOURCE text (the OCR'd credential) with
 *      an independent, deterministic field extractor and diffs the re-read
 *      values against the parser's output (credential block).
 *   3. For every mismatch, writes a flag — dossier id + the mismatch detail +
 *      a recommended fix — to public/data/alignmd/verifier-flags.json (created
 *      if absent). The operator admin reads this file to surface dossiers
 *      needing review.
 *
 * WHY A DETERMINISTIC RE-READ (default): a second *independent* extraction is
 * what catches a parser mistake. A regex/keyword re-read needs no model, no
 * network, and no spend, and it disagrees with the LLM parser exactly where a
 * human should look. An OPTIONAL model-assisted re-read (`--live`) is wired
 * behind the cc-nano-banana skill-bridge pattern and gated by budget-gate.mjs,
 * but is intentionally left un-fired here (paid calls need Jack's terminal).
 *
 * MERGE SEMANTICS (augment, don't replace): an existing verifier-flags.json is
 * read first. Flags for dossier ids processed THIS run are refreshed (so a
 * mismatch that's been fixed drops off); flags for dossiers not in this run
 * are preserved. The file is never deleted or clobbered.
 *
 * Usage:
 *   node scripts/_internal/alignmd-evidence-verifier.mjs              # default queue
 *   node scripts/_internal/alignmd-evidence-verifier.mjs --queue f.json
 *   node scripts/_internal/alignmd-evidence-verifier.mjs --self-test  # no net/cost
 *   node scripts/_internal/alignmd-evidence-verifier.mjs --live       # model re-read (gated; needs Jack's terminal)
 *
 * Constraints honored: pure Node + existing lib only (no new deps), no file
 * deletes, no paid/network call unless --live + key + open budget gate, atomic
 * temp-then-rename writes.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..", "..");
const ALIGNMD_DATA_DIR = path.join(STUDIO_ROOT, "public/data/alignmd");
const FLAGS_PATH = path.join(ALIGNMD_DATA_DIR, "verifier-flags.json");
const DRAFTS_DIR = path.join(STUDIO_ROOT, "drafts");
const ENV_FILE = path.join(STUDIO_ROOT, ".env.local");

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const BUDGET_DOMAIN = "alignmd";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATE_NAME_TO_CODE = {
  ALABAMA: "AL", ALASKA: "AK", ARIZONA: "AZ", ARKANSAS: "AR", CALIFORNIA: "CA",
  COLORADO: "CO", CONNECTICUT: "CT", DELAWARE: "DE", FLORIDA: "FL", GEORGIA: "GA",
  HAWAII: "HI", IDAHO: "ID", ILLINOIS: "IL", INDIANA: "IN", IOWA: "IA", KANSAS: "KS",
  KENTUCKY: "KY", LOUISIANA: "LA", MAINE: "ME", MARYLAND: "MD", MASSACHUSETTS: "MA",
  MICHIGAN: "MI", MINNESOTA: "MN", MISSISSIPPI: "MS", MISSOURI: "MO", MONTANA: "MT",
  NEBRASKA: "NE", NEVADA: "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM", "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND",
  OHIO: "OH", OKLAHOMA: "OK", OREGON: "OR", PENNSYLVANIA: "PA", "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD", TENNESSEE: "TN", TEXAS: "TX", UTAH: "UT",
  VERMONT: "VT", VIRGINIA: "VA", WASHINGTON: "WA", "WEST VIRGINIA": "WV",
  WISCONSIN: "WI", WYOMING: "WY", "DISTRICT OF COLUMBIA": "DC",
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function todayISO(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

async function atomicWriteJson(target, data) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n");
  await fs.rename(tmp, target);
}

async function readJsonOrNull(p) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return null;
  }
}

async function readTextOrNull(p) {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

/** Normalize a messy date string to ISO YYYY-MM-DD, or null if not confident. */
function normalizeDate(s) {
  if (!s || typeof s !== "string") return null;
  const t = s.trim();
  if (ISO_DATE.test(t)) return t;
  // MM/DD/YYYY or M/D/YYYY
  let m = t.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  // Month DD, YYYY
  const MONTHS = {
    JANUARY: "01", FEBRUARY: "02", MARCH: "03", APRIL: "04", MAY: "05", JUNE: "06",
    JULY: "07", AUGUST: "08", SEPTEMBER: "09", OCTOBER: "10", NOVEMBER: "11", DECEMBER: "12",
  };
  m = t.match(/\b([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m) {
    const mm = MONTHS[m[1].toUpperCase()];
    if (mm) return `${m[3]}-${mm}-${m[2].padStart(2, "0")}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Independent, deterministic source re-reader. Returns best-effort field
// candidates extracted directly from the OCR text (NOT via the LLM parser).
// ---------------------------------------------------------------------------
function reReadSource(rawText) {
  const out = { license_number: null, issuing_state: null, expiration_date: null, board_name: null };
  if (!rawText || typeof rawText !== "string") return out;
  const text = rawText.replace(/\r/g, "");

  // license number: "License No.: X", "License #: X", "Lic No X", "License Number X"
  let m = text.match(/licen[cs]e\s*(?:no\.?|number|#)\s*[:#]?\s*([A-Z0-9-]{3,})/i);
  if (m) out.license_number = m[1].trim();

  // expiration: "Expires: ...", "Expiration ...", "Valid through ..."
  m = text.match(/(?:expir\w*|valid\s+through)\s*[:\-]?\s*([A-Za-z0-9 ,\/.]+?)(?:\n|$)/i);
  if (m) out.expiration_date = normalizeDate(m[1]);

  // issuing state: from "STATE OF <NAME>" or a state name in the board line
  m = text.match(/state\s+of\s+([A-Za-z ]+?)(?:\n|—|-|\|)/i);
  if (m) {
    const code = STATE_NAME_TO_CODE[m[1].trim().toUpperCase()];
    if (code) out.issuing_state = code;
  }
  if (!out.issuing_state) {
    for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
      if (new RegExp(`\\b${name}\\b`, "i").test(text)) {
        out.issuing_state = code;
        break;
      }
    }
  }

  // board name: a line containing "BOARD"
  for (const line of text.split("\n")) {
    if (/board/i.test(line) && line.trim().length >= 5) {
      out.board_name = line.replace(/^[^A-Za-z]*/, "").trim();
      break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Diff the parser output against the independent re-read. Only flags fields
// where BOTH sides produced a value and they disagree (high-signal mismatches).
// ---------------------------------------------------------------------------
function recommendFix(field) {
  switch (field) {
    case "license_number":
      return "Re-OCR the license-number field and re-key manually; license number must match the source exactly before assembly.";
    case "expiration_date":
      return "Confirm the expiration date against the source image; correct the parsed value (ISO YYYY-MM-DD).";
    case "issuing_state":
      return "Verify which state board issued the license; the parser's issuing_state disagrees with the document.";
    case "board_name":
      return "Confirm the issuing board name from the document header; parser value differs from source text.";
    default:
      return "Manually review this field against the source document.";
  }
}

function diffCredential(parsed, reread) {
  const flags = [];
  const fields = ["license_number", "issuing_state", "expiration_date", "board_name"];
  for (const f of fields) {
    const pv = parsed && parsed[f] != null ? String(parsed[f]).trim() : null;
    const sv = reread && reread[f] != null ? String(reread[f]).trim() : null;
    if (pv == null || sv == null) continue; // need both to assert a mismatch
    let mismatch;
    if (f === "issuing_state") mismatch = pv.toUpperCase() !== sv.toUpperCase();
    else if (f === "board_name") {
      // soft compare: mismatch only if neither contains the other (tolerate abbreviations)
      const a = pv.toLowerCase();
      const b = sv.toLowerCase();
      mismatch = !a.includes(b) && !b.includes(a);
    } else mismatch = pv.toLowerCase() !== sv.toLowerCase();
    if (mismatch) {
      flags.push({
        field: f,
        parsed_value: pv,
        source_value: sv,
        severity: f === "license_number" || f === "expiration_date" ? "high" : "medium",
        mismatch_detail: `parser=${JSON.stringify(pv)} vs source re-read=${JSON.stringify(sv)}`,
        recommended_fix: recommendFix(f),
      });
    }
  }
  return flags;
}

// ---------------------------------------------------------------------------
// dossier queue loader (mirror of license-status; tolerate several shapes).
// A dossier may carry the source text inline (`source_text`) or a path
// (`source_path` / `source_text_path`) to the OCR'd text we re-read.
// ---------------------------------------------------------------------------
function stubQueue() {
  return [
    {
      _stub: true,
      dossier_id: "STUB-okafor-tx-MATCH",
      source_filename: "sample-tmb-license.txt",
      credential: { license_number: "K4821", issuing_state: "TX", expiration_date: "2027-08-31", board_name: "Texas Medical Board" },
      source_text: [
        "STATE OF TEXAS — TEXAS MEDICAL BOARD",
        "Physician License",
        "License No.: K4821",
        "Specialty: Internal Medicine",
        "Issued: 03/14/2019    Expires: 08/31/2027",
      ].join("\n"),
    },
    {
      _stub: true,
      dossier_id: "STUB-doe-fl-MISMATCH",
      source_filename: "sample-fl-license.txt",
      // parser claims 2026 expiry + wrong license no; source says otherwise -> 2 flags
      credential: { license_number: "ME99887", issuing_state: "FL", expiration_date: "2026-12-31", board_name: "Florida Board of Medicine" },
      source_text: [
        "STATE OF FLORIDA — FLORIDA BOARD OF MEDICINE",
        "Physician License",
        "License No.: ME77654",
        "Expires: 01/31/2028",
      ].join("\n"),
    },
  ];
}

async function resolveSourceText(rec) {
  if (typeof rec.source_text === "string" && rec.source_text.length) return rec.source_text;
  const p = rec.source_path || rec.source_text_path;
  if (p) {
    const abs = path.isAbsolute(p) ? p : path.join(STUDIO_ROOT, p);
    const t = await readTextOrNull(abs);
    if (t) return t;
  }
  return null;
}

async function loadQueue(queueArg) {
  if (queueArg) {
    const j = await readJsonOrNull(queueArg);
    if (j == null) return { rows: [], source: `--queue ${queueArg} (unreadable)`, stub: false };
    const arr = Array.isArray(j) ? j : Array.isArray(j.rows) ? j.rows : [j];
    return { rows: arr, source: `--queue ${path.relative(STUDIO_ROOT, queueArg)}`, stub: false };
  }
  let names = [];
  try {
    names = (await fs.readdir(DRAFTS_DIR)).filter((n) => /^CREDENTIAL-PARSED-.*\.json$/.test(n));
  } catch {
    /* ignore */
  }
  const recs = [];
  for (const n of names) {
    const j = await readJsonOrNull(path.join(DRAFTS_DIR, n));
    if (!j) continue;
    if (Array.isArray(j)) recs.push(...j);
    else if (Array.isArray(j.rows)) recs.push(...j.rows);
    else recs.push(j);
  }
  if (recs.length > 0)
    return { rows: recs, source: `drafts/CREDENTIAL-PARSED-*.json (${names.length} file(s))`, stub: false };
  return {
    rows: stubQueue(),
    source: "stub (no CREDENTIAL-PARSED-*.json present; live credential-parse never fired)",
    stub: true,
  };
}

// ---------------------------------------------------------------------------
// OPTIONAL model-assisted re-read (cc-nano-banana skill-bridge pattern).
// Staged by default; live only behind --live + key + open budget gate.
// ---------------------------------------------------------------------------
async function loadEnv() {
  const env = {};
  if (!existsSync(ENV_FILE)) return env;
  const t = await readTextOrNull(ENV_FILE);
  if (!t) return env;
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function modelReRead({ rawText, live }) {
  if (!live) {
    return { mode: "staged", note: "deterministic re-read used; model re-read not fired (run --live from Jack's terminal to spend)." };
  }
  try {
    const { checkBudget, recordBudgetUse } = await import("../lib/budget-gate.mjs");
    const gate = await checkBudget(BUDGET_DOMAIN);
    if (!gate.allowed) return { mode: "blocked", note: `budget gate: ${gate.reason}` };
    const env = await loadEnv();
    const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { mode: "blocked", note: "ANTHROPIC_API_KEY not present" };

    const system =
      "You independently re-read an OCR'd medical credential and return ONLY a JSON object with " +
      "license_number, issuing_state (2-letter), expiration_date (ISO YYYY-MM-DD), board_name. " +
      "Use null where not clearly present. Do not guess.";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 500,
        system,
        messages: [{ role: "user", content: `--- SOURCE ---\n${rawText}\n--- END ---` }],
      }),
    });
    if (!res.ok) return { mode: "error", note: `anthropic ${res.status}` };
    const data = await res.json();
    await recordBudgetUse(BUDGET_DOMAIN);
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return { mode: "error", note: "model returned no JSON" };
    return { mode: "live", reread: JSON.parse(text.slice(start, end + 1)) };
  } catch (e) {
    return { mode: "error", note: String(e) };
  }
}

// ---------------------------------------------------------------------------
// flags-file merge (augment, don't replace).
// ---------------------------------------------------------------------------
async function loadFlagsFile() {
  const existing = await readJsonOrNull(FLAGS_PATH);
  if (existing && Array.isArray(existing.flags)) return existing;
  return {
    agent: "alignmd-evidence-verifier",
    version: 2,
    _meta: {
      purpose:
        "Operator-admin review queue. Each flag is a field where credential-parse output disagreed with an " +
        "independent re-read of the source document. The AlignMD operator admin reads this file to surface " +
        "dossiers needing manual review before assembly.",
    },
    flags: [],
    runs: [],
  };
}

// ---------------------------------------------------------------------------
// self-test — no network, no cost.
// ---------------------------------------------------------------------------
function runSelfTest() {
  const matchSrc = "STATE OF TEXAS — TEXAS MEDICAL BOARD\nLicense No.: K4821\nExpires: 08/31/2027";
  const mismatchSrc = "STATE OF FLORIDA — FLORIDA BOARD OF MEDICINE\nLicense No.: ME77654\nExpires: 01/31/2028";

  const r1 = reReadSource(matchSrc);
  const r2 = reReadSource(mismatchSrc);

  const okParsed = { license_number: "K4821", issuing_state: "TX", expiration_date: "2027-08-31", board_name: "Texas Medical Board" };
  const badParsed = { license_number: "ME99887", issuing_state: "FL", expiration_date: "2026-12-31", board_name: "Florida Board of Medicine" };

  const flagsOk = diffCredential(okParsed, r1);
  const flagsBad = diffCredential(badParsed, r2);

  const checks = [
    ["re-read parsed TX license number", r1.license_number === "K4821"],
    ["re-read normalized expiry to ISO", r1.expiration_date === "2027-08-31"],
    ["re-read detected issuing_state TX", r1.issuing_state === "TX"],
    ["matching dossier produces 0 flags", flagsOk.length === 0],
    ["mismatching dossier flags license_number", flagsBad.some((f) => f.field === "license_number")],
    ["mismatching dossier flags expiration_date", flagsBad.some((f) => f.field === "expiration_date")],
    ["license/expiry mismatches are high severity", flagsBad.filter((f) => f.severity === "high").length >= 2],
  ];
  let allPass = true;
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) allPass = false;
  }
  console.log(`[self-test] ${allPass ? "all checks passed" : "FAILURES present"}; bad-dossier flags: ${flagsBad.map((f) => f.field).join(", ")}`);
  process.exitCode = allPass ? 0 : 1;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { queue: null, live: false, selfTest: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--self-test") args.selfTest = true;
    else if (a === "--live") args.live = true;
    else if (a === "--queue") args.queue = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    runSelfTest();
    return;
  }

  const checkDate = todayISO();
  const { rows, source, stub } = await loadQueue(args.queue);

  const file = await loadFlagsFile();
  const processedIds = new Set();
  const newFlags = [];
  const coverage = { queue: rows.length, with_source: 0, no_source: 0, model_mode: null };

  for (let i = 0; i < rows.length; i++) {
    const rec = rows[i];
    const cred = rec.credential || rec;
    const dossier_id = rec.dossier_id || rec.provider_id || rec.id || rec.source_filename || `dossier-${i + 1}`;
    processedIds.add(dossier_id);

    const rawText = await resolveSourceText(rec);
    if (!rawText) {
      coverage.no_source += 1;
      // can't re-read -> not a mismatch, but record a low-severity coverage flag once
      newFlags.push({
        dossier_id,
        source_filename: rec.source_filename || null,
        field: "_source",
        severity: "info",
        mismatch_detail: "source text unavailable for re-read; cannot verify parsed fields against the document",
        recommended_fix: "Attach the OCR'd source text (source_text / source_path) so the evidence-verifier can diff it.",
        is_stub: Boolean(rec._stub),
        checked_at: new Date().toISOString(),
      });
      continue;
    }
    coverage.with_source += 1;

    let reread = reReadSource(rawText);
    let method = "deterministic-reread";
    if (args.live) {
      const mr = await modelReRead({ rawText, live: true });
      coverage.model_mode = mr.mode;
      if (mr.mode === "live" && mr.reread) {
        reread = { ...reread, ...mr.reread };
        method = "model-reread";
      }
    } else {
      coverage.model_mode = "staged";
    }

    const fieldFlags = diffCredential(cred, reread);
    for (const ff of fieldFlags) {
      newFlags.push({
        dossier_id,
        source_filename: rec.source_filename || null,
        ...ff,
        method,
        is_stub: Boolean(rec._stub),
        checked_at: new Date().toISOString(),
      });
    }
  }

  // merge: drop prior flags for dossiers re-checked this run, keep the rest.
  const preserved = (file.flags || []).filter((f) => !processedIds.has(f.dossier_id));
  file.flags = [...preserved, ...newFlags];
  file.agent = "alignmd-evidence-verifier";
  file.version = 2;
  file.runs = Array.isArray(file.runs) ? file.runs : [];
  file.runs.push({
    ran_at: new Date().toISOString(),
    check_date: checkDate,
    queue_source: source,
    is_stub_queue: stub,
    dossiers_checked: rows.length,
    flags_added: newFlags.length,
    coverage,
  });
  // keep runs log bounded
  if (file.runs.length > 30) file.runs = file.runs.slice(-30);

  await atomicWriteJson(FLAGS_PATH, file);

  const mismatchCount = newFlags.filter((f) => f.field !== "_source").length;
  console.log(`[ok] evidence-verifier checked ${rows.length} dossier(s) from ${source}.`);
  console.log(`[ok] ${mismatchCount} mismatch flag(s) + ${coverage.no_source} no-source flag(s) this run.`);
  console.log(`[ok] wrote → ${path.relative(STUDIO_ROOT, FLAGS_PATH)} (total flags now ${file.flags.length}).`);
  if (stub) console.log("[note] STUB queue used — no real parsed dossiers exist yet (live credential-parse never fired).");
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exitCode = 1;
});
