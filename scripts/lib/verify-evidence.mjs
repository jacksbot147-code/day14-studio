/**
 * lib/verify-evidence.mjs
 *
 * Evidence-based verification of scheduled-task completion.
 *
 * Today's lesson (EOD 2026-05-28): the morning briefing was happily marking
 * scheduled tasks as "completed" just because their return-status was a 0 and
 * their stdout said "done". The EOD verifier caught seven phantom-success
 * tasks (T3, T4, T5, T6, T8, T9, T14) only by going to the filesystem +
 * inbox + work-log and checking what actually landed.
 *
 * E5 (suggestion #5) promotes that pattern into the morning briefing so the
 * phantom-success runs are surfaced at 07:30 the next morning instead of
 * waiting until 16:00 EOD.
 *
 * Public surface:
 *
 *   verifyTaskCompletion({
 *     taskId,                                        // "workday-t03-stop-slop-loophole"
 *     mustExist: ["/abs/path/...", ...],             // each must exist on disk
 *     mustAppendTo: [{ file, sectionTitleSubstring }] // file must contain a heading whose text matches the substring
 *     mustHaveInboxItem: [{ tenant, kind, minCount = 1 }] // tenant inbox json must have ≥ minCount items with item.kind === kind
 *   }) -> Promise<{ ok: boolean, missing: string[] }>
 *
 *   loadExpectations() -> Promise<Map<taskId, expectation>>   // reads the manifest
 *
 * The verifier reads ONLY — it never mutates state. Missing inputs degrade
 * to a "missing" reason rather than throwing, so a malformed expectation
 * never crashes the briefing pass.
 *
 * Untrusted-input note: `taskId`, file paths, inbox payloads etc. all
 * originate inside the studio worktree. We still treat them as plain text —
 * nothing here is interpolated into a shell command or eval'd.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const STUDIO = path.join(HOME, "Documents/studio");
const EXPECTATIONS_PATH = path.join(
  STUDIO,
  "scripts/scheduled-task-expectations.json"
);
const INBOX_DIR = path.join(STUDIO, "public/data/inboxes");

/** Read the manifest. Returns Map<taskId, expectation>. Empty map on error. */
export async function loadExpectations(p = EXPECTATIONS_PATH) {
  try {
    const text = await fs.readFile(p, "utf8");
    const parsed = JSON.parse(text);
    const tasks = parsed.tasks || {};
    const map = new Map();
    for (const [taskId, exp] of Object.entries(tasks)) {
      map.set(taskId, exp);
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Best-effort existsSync that also handles undefined / empty input. */
function safeExists(p) {
  if (!p || typeof p !== "string") return false;
  try {
    return existsSync(p);
  } catch {
    return false;
  }
}

/** Read a text file; null on miss. */
async function readTextOrNull(p) {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

/** Read a JSON file; null on parse / miss. */
async function readJsonOrNull(p) {
  const text = await readTextOrNull(p);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Check a markdown file for a heading whose body contains the substring.
 * We look at lines that begin with `#` characters — anything from `#` through
 * `######` is accepted. Substring match is case-sensitive; that matches the
 * literal headings the scheduled-task SKILL.md instructions produce.
 */
function markdownHasHeadingMatching(text, substring) {
  if (!text || !substring) return false;
  for (const line of text.split("\n")) {
    if (!line.startsWith("#")) continue;
    if (line.includes(substring)) return true;
  }
  return false;
}

/**
 * Resolve a tenant inbox path. Tenant is a short slug (e.g. "life-loophole")
 * that maps to `public/data/inboxes/<tenant>.json`. We refuse anything that
 * tries to break out of the inbox directory.
 */
function resolveInboxPath(tenant) {
  if (typeof tenant !== "string" || !tenant) return null;
  if (tenant.includes("/") || tenant.includes("..")) return null;
  return path.join(INBOX_DIR, `${tenant}.json`);
}

/** Count items inside an inbox JSON whose `kind` field equals `kind`. */
function countItemsByKind(inbox, kind) {
  if (!inbox) return 0;
  // Tolerate either a top-level array or `{ items: [...] }` or `{ inbox: [...] }`.
  const items = Array.isArray(inbox)
    ? inbox
    : Array.isArray(inbox.items)
      ? inbox.items
      : Array.isArray(inbox.inbox)
        ? inbox.inbox
        : [];
  let n = 0;
  for (const item of items) {
    if (item && item.kind === kind) n += 1;
  }
  return n;
}

/**
 * Verify a single task's expected evidence shape.
 *
 * The function NEVER throws — every failure shape produces a reason string in
 * `missing[]`. `ok === true` only when every check passed and there were
 * checks to run; an empty expectation returns `{ ok: true, missing: [] }`
 * (i.e. "no expectations declared, nothing to disprove").
 */
/**
 * Walk a dot-path through a JSON value. Supports plain keys and numeric
 * indices (e.g. "items.0.kind"). Returns `undefined` when any segment
 * resolves to null/undefined or a non-existent key/index. Defensive — never
 * throws.
 */
function getJsonPath(obj, dotPath) {
  if (obj == null || !dotPath) return undefined;
  const parts = String(dotPath).split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(p);
      if (!Number.isInteger(idx)) return undefined;
      cur = cur[idx];
    } else if (typeof cur === "object") {
      cur = cur[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

export async function verifyTaskCompletion({
  taskId,
  mustExist = [],
  mustAppendTo = [],
  mustHaveInboxItem = [],
  mustContainText = [],
  mustHaveMtimeAfter = [],
  mustHaveJsonField = [],
} = {}) {
  const missing = [];

  // 1. Files / dirs that must exist on disk.
  for (const raw of mustExist) {
    const p = typeof raw === "string" ? raw : raw && raw.path;
    if (!p) {
      missing.push(`mustExist entry has no path`);
      continue;
    }
    const resolved = p.startsWith("~/") ? path.join(HOME, p.slice(2)) : p;
    if (!safeExists(resolved)) {
      missing.push(`missing file: ${p}`);
    }
  }

  // 2. Files that must contain a heading section.
  for (const entry of mustAppendTo) {
    if (!entry || !entry.file || !entry.sectionTitleSubstring) {
      missing.push(`mustAppendTo entry malformed`);
      continue;
    }
    const file = entry.file.startsWith("~/")
      ? path.join(HOME, entry.file.slice(2))
      : entry.file;
    const text = await readTextOrNull(file);
    if (text === null) {
      missing.push(`missing log file: ${entry.file}`);
      continue;
    }
    if (!markdownHasHeadingMatching(text, entry.sectionTitleSubstring)) {
      missing.push(
        `no heading containing "${entry.sectionTitleSubstring}" in ${entry.file}`
      );
    }
  }

  // 3. Inbox items that must be present for a given tenant + kind.
  for (const entry of mustHaveInboxItem) {
    if (!entry || !entry.tenant || !entry.kind) {
      missing.push(`mustHaveInboxItem entry malformed`);
      continue;
    }
    const minCount = Number.isFinite(entry.minCount) ? entry.minCount : 1;
    const inboxPath = resolveInboxPath(entry.tenant);
    if (!inboxPath) {
      missing.push(`invalid tenant slug: ${entry.tenant}`);
      continue;
    }
    const inbox = await readJsonOrNull(inboxPath);
    if (inbox === null) {
      missing.push(
        `missing inbox: ${entry.tenant}.json (expected kind=${entry.kind})`
      );
      continue;
    }
    const n = countItemsByKind(inbox, entry.kind);
    if (n < minCount) {
      missing.push(
        `inbox ${entry.tenant} has ${n} items of kind="${entry.kind}", expected ≥ ${minCount}`
      );
    }
  }

  // 4. Files that must contain one or more substrings.
  //    Catches the text-content-phantom class — e.g. "brand-site-builder.mjs
  //    must contain `stripSlop`" would have caught T4's three-pass phantom on
  //    pass #1. (Added by N6, 2026-06-02.)
  for (const entry of mustContainText) {
    if (!entry || !entry.file || !entry.substring) {
      missing.push(`mustContainText entry malformed`);
      continue;
    }
    const file = entry.file.startsWith("~/")
      ? path.join(HOME, entry.file.slice(2))
      : entry.file;
    const text = await readTextOrNull(file);
    if (text === null) {
      missing.push(`missing file for mustContainText: ${entry.file}`);
      continue;
    }
    const haystack = entry.caseInsensitive ? text.toLowerCase() : text;
    const needle = entry.caseInsensitive
      ? String(entry.substring).toLowerCase()
      : String(entry.substring);
    if (!haystack.includes(needle)) {
      missing.push(
        `${entry.file} does not contain substring "${entry.substring}"`
      );
    }
  }

  // 5. Files whose mtime must be newer than a given ISO timestamp.
  //    Catches the stale-cache soft-phantom class — e.g. O8's brand-hero
  //    PNGs existed but were from a prior run. (Added by N6, 2026-06-02.)
  for (const entry of mustHaveMtimeAfter) {
    if (!entry || !entry.file || !entry.isoTimestamp) {
      missing.push(`mustHaveMtimeAfter entry malformed`);
      continue;
    }
    const file = entry.file.startsWith("~/")
      ? path.join(HOME, entry.file.slice(2))
      : entry.file;
    try {
      const stat = await fs.stat(file);
      const threshold = new Date(entry.isoTimestamp).getTime();
      if (!Number.isFinite(threshold)) {
        missing.push(
          `mustHaveMtimeAfter isoTimestamp unparseable: ${entry.isoTimestamp}`
        );
        continue;
      }
      if (stat.mtimeMs <= threshold) {
        missing.push(
          `${entry.file} mtime (${new Date(stat.mtimeMs).toISOString()}) not after ${entry.isoTimestamp}`
        );
      }
    } catch {
      missing.push(`mustHaveMtimeAfter — file not found: ${entry.file}`);
    }
  }

  // 6. JSON file fields that must equal a given value.
  //    Catches the JSON-sentinel phantom class — e.g. inbox items with
  //    `real_image: null` instead of `true` after a banana re-fire claim.
  //    Supports dot-path navigation (e.g. "items.0.kind"). (Added by N6,
  //    2026-06-02.)
  for (const entry of mustHaveJsonField) {
    if (!entry || !entry.file || !entry.jsonPath) {
      missing.push(`mustHaveJsonField entry malformed`);
      continue;
    }
    const file = entry.file.startsWith("~/")
      ? path.join(HOME, entry.file.slice(2))
      : entry.file;
    const json = await readJsonOrNull(file);
    if (json === null) {
      missing.push(`missing JSON for mustHaveJsonField: ${entry.file}`);
      continue;
    }
    const value = getJsonPath(json, entry.jsonPath);
    if (entry.equals !== undefined) {
      if (value !== entry.equals) {
        missing.push(
          `${entry.file}#${entry.jsonPath} = ${JSON.stringify(value)}, expected ${JSON.stringify(entry.equals)}`
        );
      }
    } else if (value === undefined) {
      missing.push(`${entry.file}#${entry.jsonPath} resolved to undefined`);
    }
  }

  return {
    taskId: taskId || null,
    ok: missing.length === 0,
    missing,
  };
}

/**
 * Convenience: verify a list of taskIds against the on-disk manifest.
 * Returns an array of verification results.
 */
export async function verifyAll(taskIds) {
  const exps = await loadExpectations();
  const out = [];
  for (const id of taskIds) {
    const exp = exps.get(id);
    if (!exp) {
      out.push({ taskId: id, ok: false, missing: ["no expectations declared"] });
      continue;
    }
    const result = await verifyTaskCompletion({ taskId: id, ...exp });
    out.push(result);
  }
  return out;
}
