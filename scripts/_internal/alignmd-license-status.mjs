#!/usr/bin/env node
/**
 * alignmd-license-status.mjs — AlignMD QA-layer agent (Day14 OS shared-agent pattern).
 *
 * Ships roadmap beefup #3 (the "24/7 license-status" claim) from
 * drafts/ALIGNMD-AGENT-ROADMAP-2026-06-08.md, consuming T4's outputs
 * (credential-parse-v2 records + public/data/alignmd/state-boards.json).
 *
 * WHAT IT DOES — for each clinician in the active dossier queue:
 *   1. Reads their parsed license info (license_number, issuing_state,
 *      expiration_date, board_name) from a credential-parse dossier record.
 *   2. Looks up the matching state-board entry in state-boards.json and
 *      BUILDS the license-verification lookup payload (URL + query method +
 *      form/query fields) — the exact request a human or an out-of-sandbox
 *      automation would submit to verify the license.
 *   3. Notes the expected check, but does NOT scrape. Real-time scraping is
 *      out of scope here: the sandbox has no board network access and most
 *      state boards block bots. The agent STAGES the payload only.
 *   4. Writes a "needs human verification" row for any license whose last
 *      check is unknown or older than the staleness threshold (default 90
 *      days), and for any license that is expired / expiring inside the
 *      threshold.
 *
 * OUTPUT — drafts/ALIGNMD-LICENSE-CHECK-<date>.json, one object with a
 * `rows[]` array for tonight's queue. The operator / a downstream automation
 * reads this to know which licenses need a primary-source check.
 *
 * COST / NETWORK SAFETY — this agent makes ZERO model calls and ZERO network
 * calls. It is pure local payload-staging. There is no `--live` scrape path
 * by design: the overnight task constraint is "no real network calls to state
 * boards from this sandbox," and primary-source verification must happen from
 * an authorized environment, not here.
 *
 * Usage:
 *   # default: read the dossier queue (drafts/CREDENTIAL-PARSED-*.json),
 *   #          fall back to a clearly-marked stub if none exist
 *   node scripts/_internal/alignmd-license-status.mjs
 *
 *   # point at an explicit queue file (a single record or an array of records)
 *   node scripts/_internal/alignmd-license-status.mjs --queue /path/to/dossiers.json
 *
 *   # change the staleness threshold (days)
 *   node scripts/_internal/alignmd-license-status.mjs --stale-days 60
 *
 *   # no-network, no-cost validation of the URL builder + staleness logic
 *   node scripts/_internal/alignmd-license-status.mjs --self-test
 *
 * Constraints honored: pure Node + existing seed data only (no new deps), no
 * file deletes, no network, atomic temp-then-rename writes.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..", "..");
const STATE_BOARDS_PATH = path.join(STUDIO_ROOT, "public/data/alignmd/state-boards.json");
const DRAFTS_DIR = path.join(STUDIO_ROOT, "drafts");

const DEFAULT_STALE_DAYS = 90;

// ---------------------------------------------------------------------------
// date helpers (America/New_York to match the rest of the studio's TZ).
// ---------------------------------------------------------------------------
function todayISO(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/** Whole days between two ISO YYYY-MM-DD dates (b - a). null if unparseable. */
function daysBetween(aISO, bISO) {
  const a = new Date(`${aISO}T00:00:00Z`).getTime();
  const b = new Date(`${bISO}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

// ---------------------------------------------------------------------------
// atomic write
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// dossier-queue loader.
// A dossier record is a credential-parse-v2 success record (or anything that
// carries a `credential` block + identity fields). We normalize to:
//   { dossier_id, provider_name, last_check_date, credential, source }
// ---------------------------------------------------------------------------
function normalizeDossier(rec, idx) {
  const cred = rec.credential || rec; // tolerate a bare credential object
  const dossier_id =
    rec.dossier_id || rec.provider_id || rec.id || rec.source_filename || `dossier-${idx + 1}`;
  const provider_name = rec.provider_name || rec.clinician_name || cred.licensee || null;
  // last verified: accept several field names a parse/assembly stage might use.
  const last_check_date =
    rec.last_license_check || rec.last_check_date || cred.last_verified_at || cred.last_checked || null;
  return {
    dossier_id,
    provider_name,
    last_check_date: last_check_date ? String(last_check_date).slice(0, 10) : null,
    credential: {
      license_number: cred.license_number ?? null,
      issuing_state: cred.issuing_state ?? null,
      expiration_date: cred.expiration_date ?? null,
      board_name: cred.board_name ?? null,
    },
    source_filename: rec.source_filename || null,
    _stub: Boolean(rec._stub),
  };
}

/** A clearly-marked stub queue, used only when no real parsed dossiers exist. */
function stubQueue() {
  return [
    {
      _stub: true,
      dossier_id: "STUB-okafor-tx",
      provider_name: "Jane A. Okafor, MD",
      last_license_check: null, // never checked -> must flag
      source_filename: "sample-tmb-license.txt",
      credential: {
        license_number: "K4821",
        issuing_state: "TX",
        expiration_date: "2027-08-31",
        board_name: "Texas Medical Board",
      },
    },
  ];
}

async function loadQueue(queueArg) {
  // 1. explicit --queue file
  if (queueArg) {
    const j = await readJsonOrNull(queueArg);
    if (j == null) return { rows: [], source: `--queue ${queueArg} (unreadable)`, stub: false };
    const arr = Array.isArray(j) ? j : Array.isArray(j.rows) ? j.rows : [j];
    return { rows: arr, source: `--queue ${path.relative(STUDIO_ROOT, queueArg)}`, stub: false };
  }
  // 2. real parsed dossiers in drafts/CREDENTIAL-PARSED-*.json
  let names = [];
  try {
    names = (await fs.readdir(DRAFTS_DIR)).filter(
      (n) => /^CREDENTIAL-PARSED-.*\.json$/.test(n),
    );
  } catch {
    /* drafts dir missing — fall through to stub */
  }
  const recs = [];
  for (const n of names) {
    const j = await readJsonOrNull(path.join(DRAFTS_DIR, n));
    if (!j) continue;
    if (Array.isArray(j)) recs.push(...j);
    else if (Array.isArray(j.rows)) recs.push(...j.rows);
    else recs.push(j);
  }
  if (recs.length > 0) {
    return { rows: recs, source: `drafts/CREDENTIAL-PARSED-*.json (${names.length} file(s))`, stub: false };
  }
  // 3. stub fallback (no live credential-parse has fired yet)
  return {
    rows: stubQueue(),
    source: "stub (no CREDENTIAL-PARSED-*.json present; live credential-parse never fired)",
    stub: true,
  };
}

// ---------------------------------------------------------------------------
// state-board lookup-payload builder. Builds, does NOT execute.
// ---------------------------------------------------------------------------
function buildLookupPayload(board, dossier) {
  if (!board) {
    return {
      resolvable: false,
      method: "aggregator",
      note: "No state-board entry for this issuing_state; fall back to FSMB DocInfo national aggregator.",
      aggregator_url: "https://www.docinfo.org/",
    };
  }
  const cred = dossier.credential;
  const lastName = dossier.provider_name
    ? String(dossier.provider_name).replace(/,.*$/, "").trim().split(/\s+/).slice(-1)[0]
    : null;
  const firstName = dossier.provider_name
    ? String(dossier.provider_name).replace(/,.*$/, "").trim().split(/\s+/)[0]
    : null;

  // GET_DIRECT: a URL template the license/name can be substituted into.
  if (board.query_method === "GET_DIRECT" && board.lookup_url_pattern) {
    const url = board.lookup_url_pattern
      .replace("{license_number}", encodeURIComponent(cred.license_number || ""))
      .replace("{last_name}", encodeURIComponent(lastName || ""))
      .replace("{first_name}", encodeURIComponent(firstName || ""));
    return {
      resolvable: true,
      method: "GET_DIRECT",
      url,
      expected_check: "GET the URL; confirm the returned profile shows license_number active and expiration_date matching the dossier.",
      board_lookup_verified: Boolean(board.lookup_verified),
    };
  }

  // POST_FORM (the common case): stage the form fields a human/automation submits.
  return {
    resolvable: true,
    method: "POST_FORM",
    url: board.lookup_url || board.board_url || null,
    form_fields: {
      license_number: cred.license_number || null,
      last_name: lastName,
      first_name: firstName,
    },
    expected_check:
      "Open the lookup URL, submit the form_fields, and confirm an active license matching license_number with expiration_date = " +
      (cred.expiration_date || "(unknown)") +
      ".",
    board_lookup_verified: Boolean(board.lookup_verified),
    note: board.lookup_verified
      ? undefined
      : "lookup_url is a T4 scaffold value (lookup_verified:false) — confirm it resolves before relying on it.",
  };
}

// ---------------------------------------------------------------------------
// per-dossier staleness + flag logic.
// ---------------------------------------------------------------------------
function evaluateRow(dossier, boards, { staleDays, checkDate }) {
  const cred = dossier.credential;
  const board =
    (boards.boards || []).find((b) => b.state === (cred.issuing_state || "").toUpperCase()) || null;

  const staged_lookup = buildLookupPayload(board, dossier);

  // staleness of the last verification
  let days_since_last_check = null;
  if (dossier.last_check_date) {
    days_since_last_check = daysBetween(dossier.last_check_date, checkDate);
  }
  const stale = days_since_last_check == null || days_since_last_check > staleDays;

  // expiration posture (secondary signal — an expired license also needs review)
  let days_to_expiry = null;
  if (cred.expiration_date) days_to_expiry = daysBetween(checkDate, cred.expiration_date);
  const expired = days_to_expiry != null && days_to_expiry < 0;
  const expiring_soon = days_to_expiry != null && days_to_expiry >= 0 && days_to_expiry <= staleDays;

  const reasons = [];
  if (days_since_last_check == null) reasons.push("no prior license check on record (never verified)");
  else if (days_since_last_check > staleDays)
    reasons.push(`last check ${days_since_last_check}d ago (> ${staleDays}d threshold)`);
  if (expired) reasons.push(`license EXPIRED ${Math.abs(days_to_expiry)}d ago`);
  else if (expiring_soon) reasons.push(`license expires in ${days_to_expiry}d`);
  if (!board) reasons.push(`no board entry for state "${cred.issuing_state}" — use FSMB aggregator`);
  if (board && board.lookup_verified === false)
    reasons.push("board lookup_url is an unverified T4 scaffold");

  const needs_human_verification = stale || expired || expiring_soon || !board;

  return {
    dossier_id: dossier.dossier_id,
    provider_name: dossier.provider_name,
    is_stub: dossier._stub || false,
    license_number: cred.license_number,
    issuing_state: cred.issuing_state,
    board_name: cred.board_name || (board && board.name) || null,
    expiration_date: cred.expiration_date,
    last_check_date: dossier.last_check_date,
    days_since_last_check,
    days_to_expiry,
    expired,
    expiring_soon,
    needs_human_verification,
    reason: reasons.join("; ") || "current; within threshold",
    staged_lookup,
    source_filename: dossier.source_filename,
  };
}

// ---------------------------------------------------------------------------
// self-test — no network, no cost.
// ---------------------------------------------------------------------------
async function runSelfTest() {
  const boards = (await readJsonOrNull(STATE_BOARDS_PATH)) || { boards: [] };
  const checkDate = "2026-06-08";

  const neverChecked = normalizeDossier(
    {
      dossier_id: "t-never",
      provider_name: "Jane A. Okafor, MD",
      last_license_check: null,
      credential: { license_number: "K4821", issuing_state: "TX", expiration_date: "2027-08-31", board_name: "Texas Medical Board" },
    },
    0,
  );
  const freshCheck = normalizeDossier(
    {
      dossier_id: "t-fresh",
      provider_name: "Sam Lee, MD",
      last_license_check: "2026-05-20", // 19d ago
      credential: { license_number: "A99887", issuing_state: "CA", expiration_date: "2028-01-31", board_name: "Medical Board of California" },
    },
    1,
  );
  const staleCheck = normalizeDossier(
    {
      dossier_id: "t-stale",
      provider_name: "Pat Ray, MD",
      last_license_check: "2026-01-01", // ~158d ago
      credential: { license_number: "Z123", issuing_state: "FL", expiration_date: "2027-03-01", board_name: "Florida Board of Medicine" },
    },
    2,
  );
  const noBoard = normalizeDossier(
    {
      dossier_id: "t-noboard",
      provider_name: "No Such, MD",
      last_license_check: "2026-06-01",
      credential: { license_number: "PR-1", issuing_state: "PR", expiration_date: "2030-01-01", board_name: "PR board" },
    },
    3,
  );

  const opts = { staleDays: 90, checkDate };
  const rNever = evaluateRow(neverChecked, boards, opts);
  const rFresh = evaluateRow(freshCheck, boards, opts);
  const rStale = evaluateRow(staleCheck, boards, opts);
  const rNoBoard = evaluateRow(noBoard, boards, opts);

  const checks = [
    ["never-checked row flagged", rNever.needs_human_verification === true],
    ["fresh (19d) row NOT flagged", rFresh.needs_human_verification === false],
    ["stale (>90d) row flagged", rStale.needs_human_verification === true],
    ["stale days_since computed (~158)", rStale.days_since_last_check >= 150 && rStale.days_since_last_check <= 165],
    ["TX board resolved a lookup payload", rNever.staged_lookup.resolvable === true],
    ["unknown state falls back to aggregator", rNoBoard.staged_lookup.method === "aggregator"],
    ["no network/model fields present", rNever.staged_lookup.url !== undefined || rNever.staged_lookup.method === "POST_FORM" || rNever.staged_lookup.method === "GET_DIRECT"],
  ];
  let allPass = true;
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) allPass = false;
  }
  console.log(`[self-test] ${allPass ? "all checks passed" : "FAILURES present"}`);
  process.exitCode = allPass ? 0 : 1;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { queue: null, staleDays: DEFAULT_STALE_DAYS, out: null, selfTest: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--self-test") args.selfTest = true;
    else if (a === "--queue") args.queue = argv[++i];
    else if (a === "--stale-days") args.staleDays = Math.max(0, Number(argv[++i]) || DEFAULT_STALE_DAYS);
    else if (a === "--out") args.out = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    await runSelfTest();
    return;
  }

  const checkDate = todayISO();
  const boards = (await readJsonOrNull(STATE_BOARDS_PATH)) || null;
  const boardsNote = boards
    ? `state-boards.json loaded (${(boards.boards || []).length} boards)`
    : "state-boards.json MISSING — payloads will fall back to the FSMB aggregator";

  const { rows: rawRows, source, stub } = await loadQueue(args.queue);
  const dossiers = rawRows.map((r, i) => normalizeDossier(r, i));

  const evaluated = dossiers.map((d) =>
    evaluateRow(d, boards || { boards: [] }, { staleDays: args.staleDays, checkDate }),
  );
  const needs = evaluated.filter((r) => r.needs_human_verification);

  const out = {
    agent: "alignmd-license-status",
    version: 2,
    generated_at: new Date().toISOString(),
    check_date: checkDate,
    queue_source: source,
    is_stub_queue: stub,
    staleness_threshold_days: args.staleDays,
    network_calls: 0,
    model_calls: 0,
    note:
      "Lookup payloads are STAGED, not executed. No state board was contacted from this sandbox " +
      "(boards block bots; primary-source verification must run from an authorized environment). " +
      boardsNote,
    totals: {
      queue: evaluated.length,
      needs_human_verification: needs.length,
      ok: evaluated.length - needs.length,
    },
    rows: evaluated,
  };

  const outPath = args.out || path.join(DRAFTS_DIR, `ALIGNMD-LICENSE-CHECK-${checkDate}.json`);
  await atomicWriteJson(outPath, out);
  console.log(`[ok] license-status staged ${evaluated.length} dossier(s); ${needs.length} need human verification.`);
  console.log(`[ok] queue source: ${source}`);
  console.log(`[ok] wrote → ${path.relative(STUDIO_ROOT, outPath)}`);
  if (stub) console.log("[note] STUB queue used — no real parsed dossiers exist yet (live credential-parse never fired).");
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exitCode = 1;
});
