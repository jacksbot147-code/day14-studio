/**
 * lib/jack-actions.mjs
 *
 * Surface-it-to-Jack pattern. The scheduled-task sandbox can't reach
 * `launchctl`, `sudo`, the keychain, or anything outside the studio
 * worktree. When a task discovers it needs one of those, instead of
 * silently failing (or worse, claiming success), it records the action
 * for Jack in a plain-markdown checklist at:
 *
 *     ~/Documents/COMMANDS-FOR-JACK.md
 *
 * File shape (stable, hand-editable):
 *
 *     # Commands for Jack
 *
 *     _Auto-populated by scheduled tasks. Strike a line (`- [x]`) when done.
 *     Pending = unstruck `- [ ]` items._
 *
 *     ## 2026-05-28
 *
 *     - [ ] [HIGH] Finish realty pause — `launchctl unload ...` (why: ...)
 *     - [ ] [NORMAL] Activate auto-todo agent — `cp ... && launchctl load ...` (why: ...)
 *
 * Public surface:
 *   recordJackAction({ label, cmd, why, urgency = "normal" })
 *       → Promise<{ filed: boolean, duplicate?: boolean, path }>
 *   pendingJackActionsCount()
 *       → Promise<{ total: number, high: number, path }>
 *
 * Design rules:
 *   - Pure Node. No network. No model calls. No deletes.
 *   - Atomic temp-then-rename writes so concurrent appends from
 *     parallel scheduled tasks don't trample each other.
 *   - Dedup-safe: if today's section already has a `- [ ]` item with
 *     the same `cmd`, recordJackAction is a no-op (returns
 *     `{ filed: false, duplicate: true }`).
 *   - urgency in {low, normal, high}; rendered as [LOW]/[NORMAL]/[HIGH].
 *   - Date header is YYYY-MM-DD in America/New_York (Jack's TZ — matches
 *     the rest of the studio scheduled-task timestamps).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const HOME = homedir();
const DEFAULT_PATH = path.join(HOME, "Documents", "COMMANDS-FOR-JACK.md");

const HEADER = `# Commands for Jack

_Auto-populated by scheduled tasks when they hit a sandbox limit
(launchctl, sudo, secrets, anything outside the studio worktree).
Strike a line (\`- [x]\`) when done. Pending = unstruck \`- [ ]\` items._

`;

const URGENCY_TAGS = { low: "LOW", normal: "NORMAL", high: "HIGH" };

/** YYYY-MM-DD in America/New_York. */
function todayISO(now = new Date()) {
  // en-CA happens to format as YYYY-MM-DD.
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/** Read the file or return the header-only seed. Never throws on ENOENT. */
async function readOrSeed(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") return HEADER;
    throw err;
  }
}

/**
 * Atomic write: write to <file>.tmp.<pid>.<rand>, then rename.
 * Rename is atomic on the same filesystem, so a concurrent reader
 * either sees the old file or the new file — never a torn write.
 */
async function atomicWrite(filePath, contents) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.tmp.${process.pid}.${Math.random()
      .toString(36)
      .slice(2, 10)}`,
  );
  await fs.writeFile(tmp, contents, "utf8");
  await fs.rename(tmp, filePath);
}

/**
 * Insert `lineToAppend` into the body so it lives at the end of today's
 * `## YYYY-MM-DD` section. If today's section is missing, create it at
 * the top of the dated region (just after the header preamble).
 *
 * The existing date headers are kept verbatim — we only insert/append,
 * never reorder, so Jack's edits (struck items, hand-added notes) are
 * preserved.
 */
function spliceUnderTodaysHeader(body, dateStr, lineToAppend) {
  const headerLine = `## ${dateStr}`;
  const lines = body.split("\n");
  const headerIdx = lines.findIndex((l) => l.trim() === headerLine);

  if (headerIdx === -1) {
    // No section for today yet. Insert one at the top of the dated
    // region. Heuristic: first `## ` line, or end of file.
    const firstSectionIdx = lines.findIndex((l) => l.startsWith("## "));
    const insertAt = firstSectionIdx === -1 ? lines.length : firstSectionIdx;
    const newBlock = [headerLine, "", lineToAppend, ""];
    const before = lines.slice(0, insertAt);
    const after = lines.slice(insertAt);
    // Make sure there's a blank line between preamble and new header.
    if (before.length && before[before.length - 1].trim() !== "") {
      before.push("");
    }
    return [...before, ...newBlock, ...after].join("\n");
  }

  // Find the end of today's section — next `## ` heading or EOF.
  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      endIdx = i;
      break;
    }
  }

  // Walk back from endIdx past any trailing blank lines to find the
  // last content line in today's section.
  let lastContentIdx = endIdx - 1;
  while (lastContentIdx > headerIdx && lines[lastContentIdx].trim() === "") {
    lastContentIdx--;
  }

  const before = lines.slice(0, lastContentIdx + 1);
  const after = lines.slice(lastContentIdx + 1);
  return [...before, lineToAppend, ...after].join("\n");
}

/**
 * Format a single checklist line.
 *
 * Shape (matches task spec):
 *   - [ ] [HIGH] description — `command` (why: ...)
 *
 * The cmd is wrapped in backticks. We escape any backticks in the cmd
 * itself by collapsing them to single-quote — keeps the markdown
 * parseable and the line copy-pasteable.
 */
function formatLine({ label, cmd, why, urgency }) {
  const tag = URGENCY_TAGS[urgency] || URGENCY_TAGS.normal;
  const safeCmd = String(cmd ?? "").replace(/`/g, "'");
  const safeLabel = String(label ?? "").trim();
  const whyPart = why ? ` (why: ${String(why).trim()})` : "";
  return `- [ ] [${tag}] ${safeLabel} — \`${safeCmd}\`${whyPart}`;
}

/**
 * Check whether today's section already has an unstruck item with the
 * same cmd. Comparison is whitespace-insensitive on the cmd only.
 */
function alreadyPending(body, dateStr, cmd) {
  const headerLine = `## ${dateStr}`;
  const lines = body.split("\n");
  const headerIdx = lines.findIndex((l) => l.trim() === headerLine);
  if (headerIdx === -1) return false;
  const needle = String(cmd ?? "").replace(/\s+/g, " ").trim();
  if (!needle) return false;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break;
    if (!lines[i].startsWith("- [ ]")) continue;
    const haystack = lines[i].replace(/\s+/g, " ");
    if (haystack.includes(needle)) return true;
  }
  return false;
}

/**
 * Append a pending action for Jack.
 *
 * @param {object} opts
 * @param {string} opts.label   Human description ("Finish realty pause").
 * @param {string} opts.cmd     The exact command/instruction to run.
 * @param {string} [opts.why]   One-line rationale (shown in parens).
 * @param {"low"|"normal"|"high"} [opts.urgency="normal"]
 * @param {string} [opts.filePath]  Override target file (tests).
 * @param {Date}   [opts.now]       Override clock (tests).
 *
 * @returns {Promise<{ filed: boolean, duplicate?: boolean, path: string }>}
 */
export async function recordJackAction({
  label,
  cmd,
  why,
  urgency = "normal",
  filePath = DEFAULT_PATH,
  now,
} = {}) {
  if (!label || !cmd) {
    throw new Error("recordJackAction: `label` and `cmd` are required");
  }
  if (!URGENCY_TAGS[urgency]) {
    throw new Error(
      `recordJackAction: urgency must be one of low|normal|high (got ${urgency})`,
    );
  }
  const dateStr = todayISO(now);
  const current = await readOrSeed(filePath);

  if (alreadyPending(current, dateStr, cmd)) {
    return { filed: false, duplicate: true, path: filePath };
  }

  const line = formatLine({ label, cmd, why, urgency });
  const next = spliceUnderTodaysHeader(current, dateStr, line);
  await atomicWrite(filePath, next);
  return { filed: true, path: filePath };
}

/**
 * Count unstruck `- [ ]` items across the whole file. Returns the
 * total and the subset tagged [HIGH].
 *
 * Returns 0/0 (not an error) if the file is missing.
 */
export async function pendingJackActionsCount({ filePath = DEFAULT_PATH } = {}) {
  let body;
  try {
    body = await fs.readFile(filePath, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") return { total: 0, high: 0, path: filePath };
    throw err;
  }
  let total = 0;
  let high = 0;
  for (const line of body.split("\n")) {
    if (!line.startsWith("- [ ]")) continue;
    total++;
    if (/\[HIGH\]/.test(line)) high++;
  }
  return { total, high, path: filePath };
}

// Surfaced for tests / introspection. Not part of the stable API.
export const _internals = {
  todayISO,
  formatLine,
  spliceUnderTodaysHeader,
  alreadyPending,
  DEFAULT_PATH,
};
