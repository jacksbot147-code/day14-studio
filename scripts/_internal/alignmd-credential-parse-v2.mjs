#!/usr/bin/env node
/**
 * alignmd-credential-parse-v2.mjs — AlignMD credentialing agent (Day14 OS shared-agent pattern).
 *
 * Ships beefup #1 from drafts/ALIGNMD-AGENT-ROADMAP-2026-06-08.md:
 * a structured-JSON credential extraction agent that turns an uploaded
 * medical credential (a PDF or a photo of a paper doc, already OCR'd to
 * text upstream) into the field-by-field record the dossier-assembly stage
 * (roadmap beefup #2) will consume.
 *
 * Three things this v2 does that the (unimplemented) v1 pitch never did:
 *   A) Structured-JSON extraction prompt with field-by-field validation,
 *      built for Claude Haiku (claude-haiku-4-5) for cost. The output schema
 *      is CREDENTIAL_SCHEMA below — that is the dossier-assembly input contract.
 *   B) Failure-handling. A doc that can't be parsed/validated no longer
 *      silent-drops: it is written to drafts/INTAKE-FAILED-<date>.json with
 *      the parse error, the source filename, and a suggested manual-review path.
 *   C) State-board cross-reference. The parsed issuing_state is matched
 *      against public/data/alignmd/state-boards.json (the seed T5's
 *      license-status agent reads) and the matching board entry is attached.
 *
 * COST SAFETY — this run stages, it does not spend. By default the agent
 * builds the prompt and emits a STAGED payload describing exactly what would
 * be sent to Haiku; it makes NO network call. A real model call only happens
 * with the explicit `--live` flag AND a present ANTHROPIC_API_KEY AND an
 * open budget gate (scripts/lib/budget-gate.mjs). Per the overnight task
 * constraints, paid calls require Jack's terminal — so `--live` is wired but
 * intentionally left un-fired here.
 *
 * Usage:
 *   # dry-run (default): build prompt + validate a sample, stage the call
 *   node scripts/_internal/alignmd-credential-parse-v2.mjs
 *
 *   # parse a specific OCR'd credential text file (still dry/staged)
 *   node scripts/_internal/alignmd-credential-parse-v2.mjs --input /path/to/extracted.txt --source license-scan.pdf
 *
 *   # actually call Haiku (requires Jack's terminal + ANTHROPIC_API_KEY + budget)
 *   node scripts/_internal/alignmd-credential-parse-v2.mjs --input ./extracted.txt --source license.pdf --live
 *
 * Constraints honored: pure Node + existing lib only (no new deps), no file
 * deletes, no real paid call unless --live, atomic temp-then-rename writes.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..", "..");
const STATE_BOARDS_PATH = path.join(STUDIO_ROOT, "public/data/alignmd/state-boards.json");
const DRAFTS_DIR = path.join(STUDIO_ROOT, "drafts");
const ENV_FILE = path.join(STUDIO_ROOT, ".env.local");

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"; // cost-efficient extraction
const BUDGET_DOMAIN = "alignmd";

// ---------------------------------------------------------------------------
// CREDENTIAL_SCHEMA — the dossier-assembly input contract.
// Each field: { type, required, validate(value) -> string|null (error msg) }.
// snake_case mirrors the AlignMD Supabase credential columns.
// ---------------------------------------------------------------------------
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

const CREDENTIAL_SCHEMA = {
  license_number: {
    type: "string",
    required: true,
    validate: (v) =>
      typeof v === "string" && v.trim().length >= 3
        ? null
        : "license_number must be a string of >= 3 chars",
  },
  issuing_state: {
    type: "string",
    required: true,
    validate: (v) =>
      typeof v === "string" && US_STATES.has(v.trim().toUpperCase())
        ? null
        : "issuing_state must be a 2-letter US state/DC code",
  },
  expiration_date: {
    type: "string",
    required: true,
    validate: (v) => {
      if (typeof v !== "string" || !ISO_DATE.test(v)) return "expiration_date must be ISO YYYY-MM-DD";
      const d = new Date(v + "T00:00:00Z");
      return Number.isNaN(d.getTime()) ? "expiration_date is not a real date" : null;
    },
  },
  board_name: {
    type: "string",
    required: true,
    validate: (v) =>
      typeof v === "string" && v.trim().length >= 3 ? null : "board_name must be a non-trivial string",
  },
  specialty: {
    type: "string",
    required: false,
    validate: (v) =>
      v == null || (typeof v === "string" && v.trim().length > 0)
        ? null
        : "specialty must be a non-empty string or null",
  },
  malpractice_carrier: {
    type: "string",
    required: false,
    validate: (v) =>
      v == null || typeof v === "string" ? null : "malpractice_carrier must be a string or null",
  },
  employment_history: {
    type: "array",
    required: false,
    validate: (v) => {
      if (v == null) return null;
      if (!Array.isArray(v)) return "employment_history must be an array";
      for (const [i, e] of v.entries()) {
        if (typeof e !== "object" || e == null) return `employment_history[${i}] must be an object`;
        if (!e.employer || typeof e.employer !== "string")
          return `employment_history[${i}].employer is required`;
        for (const k of ["start_date", "end_date"]) {
          if (e[k] != null && e[k] !== "present" && !ISO_DATE.test(String(e[k])))
            return `employment_history[${i}].${k} must be ISO YYYY-MM-DD, "present", or null`;
        }
      }
      return null;
    },
  },
};

const SCHEMA_FIELDS = Object.keys(CREDENTIAL_SCHEMA);

// ---------------------------------------------------------------------------
// A) Structured-JSON extraction prompt for Haiku.
// ---------------------------------------------------------------------------
function buildExtractionPrompt(rawText, sourceFilename) {
  const fieldSpec = SCHEMA_FIELDS.map((f) => {
    const s = CREDENTIAL_SCHEMA[f];
    return `  - ${f} (${s.type}${s.required ? ", REQUIRED" : ", nullable"})`;
  }).join("\n");

  const system = [
    "You are AlignMD's credential-parse agent. You extract structured data from a single medical credential document",
    "(a state medical license, board certificate, malpractice face sheet, or CV page) that has already been OCR'd to text.",
    "You return ONLY a single JSON object — no prose, no markdown fences. Be conservative: if a field is not clearly",
    "present in the source text, set it to null rather than guessing. Never invent a license number, state, or date.",
    "Normalize every date to ISO YYYY-MM-DD. Normalize issuing_state to its 2-letter USPS code.",
  ].join(" ");

  const user = [
    `Source document: ${sourceFilename || "(unnamed upload)"}`,
    "",
    "Extract exactly these fields into a JSON object:",
    fieldSpec,
    "",
    "employment_history items are objects of { employer, role, start_date, end_date, location } where dates are",
    'ISO YYYY-MM-DD, "present", or null.',
    "",
    "Field-by-field rules:",
    "- license_number: the license/permit identifier as printed, trimmed. Do not include the word 'License'.",
    "- issuing_state: the state that ISSUED the license (the board's state), as a 2-letter code.",
    "- expiration_date: the license expiration/valid-through date, ISO format.",
    "- board_name: the full issuing board name as printed.",
    "- specialty: the clinical specialty if stated, else null.",
    "- malpractice_carrier: insurer name if this is a malpractice doc, else null.",
    "- employment_history: only if the document is a CV/work-history page, else [].",
    "",
    "Return ONLY the JSON object.",
    "",
    "--- BEGIN SOURCE TEXT ---",
    rawText || "(empty)",
    "--- END SOURCE TEXT ---",
  ].join("\n");

  return { system, user, model: ANTHROPIC_MODEL };
}

// ---------------------------------------------------------------------------
// Validation + state-board cross-reference.
// ---------------------------------------------------------------------------
function validateCredential(obj) {
  const errors = [];
  if (typeof obj !== "object" || obj == null) {
    return { valid: false, errors: ["model output was not a JSON object"], normalized: null };
  }
  const normalized = {};
  for (const field of SCHEMA_FIELDS) {
    const spec = CREDENTIAL_SCHEMA[field];
    let value = obj[field];
    // light normalization
    if (field === "issuing_state" && typeof value === "string") value = value.trim().toUpperCase();
    if (typeof value === "string") value = value.trim();
    if (spec.required && (value == null || value === "")) {
      errors.push(`missing required field: ${field}`);
      normalized[field] = null;
      continue;
    }
    const err = spec.validate(value);
    if (err) errors.push(err);
    normalized[field] = value == null ? (spec.type === "array" ? [] : null) : value;
  }
  return { valid: errors.length === 0, errors, normalized };
}

async function attachStateBoard(normalized) {
  let boards = null;
  try {
    boards = JSON.parse(await fs.readFile(STATE_BOARDS_PATH, "utf8"));
  } catch {
    return { state_board: null, board_lookup_note: "state-boards.json unavailable" };
  }
  const code = normalized.issuing_state;
  const match = (boards.boards || []).find((b) => b.state === code) || null;
  if (!match) return { state_board: null, board_lookup_note: `no board entry for state ${code}` };
  return {
    state_board: {
      state: match.state,
      name: match.name,
      lookup_url: match.lookup_url,
      query_method: match.query_method,
      lookup_verified: match.lookup_verified,
    },
    board_lookup_note: "matched; T5 license-status agent should stage a verification payload from this entry",
  };
}

// ---------------------------------------------------------------------------
// B) Failure-handling — write drafts/INTAKE-FAILED-<date>.json (append/merge).
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

function suggestedManualReviewPath(sourceFilename) {
  // AlignMD's human-driven verification surface (Phase-4 verification panel).
  return {
    app: "alignmd",
    route: "/providers/<provider_id>/verification",
    action: "Open a manual credential review; re-key the fields the parser could not extract.",
    source_filename: sourceFilename || null,
  };
}

async function recordFailure({ sourceFilename, stage, error, prompt }) {
  const failPath = path.join(DRAFTS_DIR, `INTAKE-FAILED-${todayISO()}.json`);
  let doc = { date: todayISO(), agent: "alignmd-credential-parse-v2", failures: [] };
  if (existsSync(failPath)) {
    try {
      const prev = JSON.parse(await fs.readFile(failPath, "utf8"));
      if (prev && Array.isArray(prev.failures)) doc = prev;
    } catch {
      /* corrupt prior file — start fresh but do NOT delete the old one's content silently */
      doc.note = "previous INTAKE-FAILED file was unparseable; this run started a fresh failures array";
    }
  }
  doc.failures.push({
    recorded_at: new Date().toISOString(),
    source_filename: sourceFilename || null,
    stage, // "read" | "model" | "json_parse" | "validation"
    error: String(error),
    suggested_manual_review: suggestedManualReviewPath(sourceFilename),
    staged_prompt_present: Boolean(prompt),
  });
  await atomicWriteJson(failPath, doc);
  return failPath;
}

// ---------------------------------------------------------------------------
// Model call — staged by default, live only behind --live + key + budget.
// ---------------------------------------------------------------------------
async function loadEnv() {
  const env = {};
  if (!existsSync(ENV_FILE)) return env;
  try {
    const t = await fs.readFile(ENV_FILE, "utf8");
    for (const line of t.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* ignore */
  }
  return env;
}

async function callHaiku({ system, user, model, live }) {
  if (!live) {
    return {
      mode: "staged",
      note: "dry-run: no network call made. Re-run with --live from Jack's terminal to spend.",
      request: { model, system_chars: system.length, user_chars: user.length },
    };
  }
  // --live path: gate hard before spending.
  let budget;
  try {
    const { checkBudget, recordBudgetUse } = await import("../lib/budget-gate.mjs");
    budget = await checkBudget(BUDGET_DOMAIN);
    if (!budget.allowed) {
      return { mode: "blocked", note: `budget gate: ${budget.reason}` };
    }
    const env = await loadEnv();
    const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { mode: "blocked", note: "ANTHROPIC_API_KEY not present" };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { mode: "error", note: `anthropic ${res.status}: ${t.slice(0, 200)}` };
    }
    const data = await res.json();
    await recordBudgetUse(BUDGET_DOMAIN);
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    return { mode: "live", text };
  } catch (e) {
    return { mode: "error", note: String(e) };
  }
}

function extractJson(text) {
  // tolerate a stray markdown fence even though we asked for none
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object found in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { live: false, input: null, source: null, out: null, selfTest: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--live") args.live = true;
    else if (a === "--self-test") args.selfTest = true;
    else if (a === "--input") args.input = argv[++i];
    else if (a === "--source") args.source = argv[++i];
    else if (a === "--out") args.out = argv[++i];
  }
  return args;
}

/**
 * --self-test: exercise the validation (B) + state-board cross-reference (C)
 * paths with a no-network, no-cost fixture. Returns process exit code 0 only
 * if a known-good record validates and a known-bad record is rejected.
 */
async function runSelfTest() {
  const good = {
    license_number: "K4821",
    issuing_state: "tx",
    expiration_date: "2027-08-31",
    board_name: "Texas Medical Board",
    specialty: "Internal Medicine",
    malpractice_carrier: null,
    employment_history: [{ employer: "Austin Health", role: "Hospitalist", start_date: "2019-09-01", end_date: "present" }],
  };
  const bad = {
    license_number: "X", // too short
    issuing_state: "Texas", // not a 2-letter code
    expiration_date: "08/31/2027", // not ISO
    board_name: "TMB",
  };

  const g = validateCredential(good);
  const b = validateCredential(bad);
  const board = g.valid ? await attachStateBoard(g.normalized) : null;

  const checks = [
    ["good record validates", g.valid === true],
    ["good issuing_state normalized to TX", g.normalized.issuing_state === "TX"],
    ["bad record rejected", b.valid === false],
    ["bad record reports >= 3 errors", b.errors.length >= 3],
    ["state board matched for TX", Boolean(board && board.state_board && board.state_board.state === "TX")],
  ];
  let allPass = true;
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) allPass = false;
  }
  console.log(`[self-test] ${allPass ? "all checks passed" : "FAILURES present"}; bad-record errors: ${b.errors.join(" | ")}`);
  process.exitCode = allPass ? 0 : 1;
}

const SAMPLE_TEXT = [
  "STATE OF TEXAS — TEXAS MEDICAL BOARD",
  "Physician License",
  "License No.: K4821",
  "Licensee: Jane A. Okafor, MD",
  "Specialty: Internal Medicine",
  "Issued: 03/14/2019    Expires: 08/31/2027",
].join("\n");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    await runSelfTest();
    return;
  }
  const sourceFilename = args.source || (args.input ? path.basename(args.input) : "sample-tmb-license.txt");

  // ---- read source text (stage "read") ----
  let rawText = null;
  if (args.input) {
    try {
      rawText = await fs.readFile(args.input, "utf8");
    } catch (e) {
      const failPath = await recordFailure({ sourceFilename, stage: "read", error: e });
      console.log(`[FAIL:read] could not read ${args.input} → logged to ${path.relative(STUDIO_ROOT, failPath)}`);
      return;
    }
  } else {
    rawText = SAMPLE_TEXT;
    console.log("[info] no --input given; using built-in sample credential text (dry-run).");
  }

  // ---- build prompt (A) ----
  const prompt = buildExtractionPrompt(rawText, sourceFilename);

  // ---- model call (staged by default) ----
  const call = await callHaiku({ ...prompt, live: args.live });

  if (call.mode === "staged") {
    const staged = {
      agent: "alignmd-credential-parse-v2",
      mode: "staged",
      generated_at: new Date().toISOString(),
      source_filename: sourceFilename,
      model: prompt.model,
      schema_fields: SCHEMA_FIELDS,
      prompt,
      next: "run with --live from Jack's terminal to extract; output will be validated against CREDENTIAL_SCHEMA and cross-referenced to state-boards.json",
    };
    const outPath = args.out || path.join(DRAFTS_DIR, `CREDENTIAL-PARSE-STAGED-${todayISO()}.json`);
    await atomicWriteJson(outPath, staged);
    console.log(`[staged] prompt built for ${prompt.model}; no paid call fired.`);
    console.log(`[staged] payload → ${path.relative(STUDIO_ROOT, outPath)}`);
    console.log(`[staged] schema fields: ${SCHEMA_FIELDS.join(", ")}`);
    return;
  }

  if (call.mode !== "live") {
    const failPath = await recordFailure({ sourceFilename, stage: "model", error: call.note, prompt });
    console.log(`[FAIL:model] ${call.mode}: ${call.note} → ${path.relative(STUDIO_ROOT, failPath)}`);
    return;
  }

  // ---- parse model JSON (stage "json_parse") ----
  let parsed;
  try {
    parsed = extractJson(call.text);
  } catch (e) {
    const failPath = await recordFailure({ sourceFilename, stage: "json_parse", error: e, prompt });
    console.log(`[FAIL:json_parse] ${e} → ${path.relative(STUDIO_ROOT, failPath)}`);
    return;
  }

  // ---- validate (stage "validation") (B on failure) ----
  const { valid, errors, normalized } = validateCredential(parsed);
  if (!valid) {
    const failPath = await recordFailure({
      sourceFilename,
      stage: "validation",
      error: errors.join("; "),
      prompt,
    });
    console.log(`[FAIL:validation] ${errors.length} error(s) → ${path.relative(STUDIO_ROOT, failPath)}`);
    return;
  }

  // ---- success: attach state board (C) and emit dossier-ready record ----
  const boardRef = await attachStateBoard(normalized);
  const record = {
    agent: "alignmd-credential-parse-v2",
    parsed_at: new Date().toISOString(),
    source_filename: sourceFilename,
    credential: normalized,
    ...boardRef,
  };
  const outPath = args.out || path.join(DRAFTS_DIR, `CREDENTIAL-PARSED-${todayISO()}.json`);
  await atomicWriteJson(outPath, record);
  console.log(`[ok] parsed + validated ${sourceFilename} → ${path.relative(STUDIO_ROOT, outPath)}`);
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exitCode = 1;
});
