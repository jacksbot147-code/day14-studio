/**
 * lib/file-todo.mjs
 *
 * Shared helper so ANY empire agent can file an operator to-do without
 * re-implementing the operator-todos.json schema or accidentally creating
 * duplicates.
 *
 * ─── THE CONVENTION ────────────────────────────────────────────────────────
 * The operator to-do list lives at
 *   ~/Documents/businesses/_shared/operator-todos.json
 * Shape: { schema_version, next_seq, todos: [ ...todo ] }
 *
 * Every to-do has, at minimum:
 *   id          string   "todo-<seq>"            (assigned here)
 *   seq         number   monotonically increasing (assigned here)
 *   tenant      string   business slug, e.g. "alignmd" / "day14"
 *   title       string   one-line operator-facing summary
 *   detail      string   what to do and why
 *   category    string   credentials | fix | publish | review | content |
 *                        data | realty | database | deploy | ...
 *   priority    string   high | medium | low
 *   status      string   open | done | merged
 *   created_at  string   ISO timestamp           (assigned here)
 *   completed_at  null | ISO
 *   source      string   the agent/script that filed it
 *   instructions  optional { steps[], links[], code }
 *
 * IMPORTANT — the admin UI only surfaces to-dos with status === "open".
 *   - "done"   = operator finished it (drops off the UI)
 *   - "merged" = the todo-reconciler folded an exact duplicate into an
 *                earlier to-do (drops off the UI; keeps an audit trail)
 * Keep any new status values backward-compatible with that rule.
 *
 * ─── HOW TO USE ────────────────────────────────────────────────────────────
 *   import { fileTodo } from "./lib/file-todo.mjs";
 *   await fileTodo({
 *     tenant: "alignmd",
 *     title: "Run Supabase migration 0013",
 *     detail: "...",
 *     category: "database",
 *     priority: "high",
 *     source: "overnight-agent",
 *     instructions: { steps: ["..."], code: "..." }, // optional
 *   });
 *
 * fileTodo() is DEDUP-SAFE: before appending it checks every still-open
 * to-do for the same tenant and refuses to re-file one with a near-identical
 * title. So agents can call it on every run without flooding the list.
 *
 * Returns: { filed: boolean, todo?, reason?, duplicateOf? }
 *   filed:true  → a new to-do was appended
 *   filed:false → skipped because an open near-duplicate already exists
 *                 (duplicateOf = its id)
 *
 * This module ONLY ever appends. It never edits or removes existing to-dos —
 * reconciliation is the todo-reconciler's job.
 * ───────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const TODOS_FILE = path.join(
  HOME,
  "Documents/businesses/_shared/operator-todos.json",
);

const VALID_PRIORITIES = new Set(["high", "medium", "low"]);

/**
 * Normalize a title for comparison: lowercase, strip punctuation, collapse
 * whitespace. Two titles that normalize to the same string (or that are
 * one a prefix of the other) are treated as the same to-do.
 */
export function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** True if two titles are near-identical (same normalized form, or one
 *  clearly contains the other and they are within a few chars). */
export function titlesMatch(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // One a prefix of the other, with only a small tail difference — covers
  // "County records needed: Lee County" vs "...: Lee County, FL".
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (longer.startsWith(shorter) && longer.length - shorter.length <= 6) {
    return true;
  }
  return false;
}

/** Load the to-do file, tolerating a missing file (returns a fresh shape). */
export async function loadTodos(file = TODOS_FILE) {
  if (!existsSync(file)) {
    return { schema_version: 1, next_seq: 1, todos: [] };
  }
  const raw = await fs.readFile(file, "utf8");
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.todos)) {
    throw new Error("operator-todos.json is malformed: missing todos array");
  }
  if (typeof data.next_seq !== "number") {
    // Recover next_seq from the data rather than trusting a bad header.
    data.next_seq =
      Math.max(0, ...data.todos.map((t) => Number(t.seq) || 0)) + 1;
  }
  if (typeof data.schema_version !== "number") data.schema_version = 1;
  return data;
}

/** Atomically write the to-do file (write to a temp file, then rename). */
export async function saveTodos(data, file = TODOS_FILE) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await fs.rename(tmp, file);
}

/**
 * File a new operator to-do.
 *
 * @param {object}  opts
 * @param {string}  opts.tenant        business slug (required)
 * @param {string}  opts.title         one-line summary (required)
 * @param {string} [opts.detail]       longer description
 * @param {string} [opts.category]     credentials|fix|publish|review|...
 * @param {string} [opts.priority]     high|medium|low  (default "medium")
 * @param {string} [opts.source]       filing agent name (default "agent")
 * @param {object} [opts.instructions] optional { steps, links, code }
 * @param {string} [opts.file]         override path (mainly for tests)
 * @returns {Promise<{filed:boolean, todo?:object, reason?:string, duplicateOf?:string}>}
 */
export async function fileTodo(opts = {}) {
  const tenant = String(opts.tenant || "").trim();
  const title = String(opts.title || "").trim();
  if (!tenant) return { filed: false, reason: "tenant is required" };
  if (!title) return { filed: false, reason: "title is required" };

  const file = opts.file || TODOS_FILE;
  const priority = VALID_PRIORITIES.has(opts.priority)
    ? opts.priority
    : "medium";

  const data = await loadTodos(file);

  // Dedup: never re-file if an open to-do for the same tenant already
  // carries a near-identical title.
  const dup = data.todos.find(
    (t) =>
      t.status === "open" &&
      t.tenant === tenant &&
      titlesMatch(t.title, title),
  );
  if (dup) {
    return {
      filed: false,
      reason: `open near-duplicate already exists (${dup.id})`,
      duplicateOf: dup.id,
    };
  }

  const seq = data.next_seq;
  const todo = {
    id: `todo-${seq}`,
    seq,
    tenant,
    title,
    detail: String(opts.detail || "").trim(),
    category: String(opts.category || "review").trim(),
    priority,
    status: "open",
    created_at: new Date().toISOString(),
    completed_at: null,
    source: String(opts.source || "agent").trim(),
  };
  if (opts.instructions && typeof opts.instructions === "object") {
    todo.instructions = opts.instructions;
  }

  data.todos.push(todo);
  data.next_seq = seq + 1;
  await saveTodos(data, file);

  return { filed: true, todo };
}

export { TODOS_FILE };
