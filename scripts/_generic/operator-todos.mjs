/**
 * operator-todos.mjs — the operator (human) to-do list.
 *
 * Anything a Day14 agent CANNOT do itself (create an account, enter payment
 * info, publish a Printify draft, point a domain, sign off on brand identity)
 * gets pushed here. The list is the single source of truth on Jack's Mac:
 *
 *   ~/Documents/businesses/_shared/operator-todos.json
 *
 * Read path  : sync-empire-state.mjs embeds open items into empire-state.json
 *              -> rendered on the day14.us/admin empire homescreen.
 * Write path : bot-brain.mjs handles "done N" / "todos" from Telegram.
 *
 * Usage:
 *   import { addTodo, completeTodo, listOpenTodos } from "./_generic/operator-todos.mjs";
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const TODOS_FILE = path.join(
  homedir(),
  "Documents/businesses/_shared/operator-todos.json"
);

function emptyStore() {
  return { schema_version: 1, next_seq: 1, todos: [] };
}

export async function loadTodos() {
  if (!existsSync(TODOS_FILE)) return emptyStore();
  try {
    const data = JSON.parse(await fs.readFile(TODOS_FILE, "utf8"));
    if (!Array.isArray(data.todos)) return emptyStore();
    if (!data.next_seq) {
      data.next_seq = data.todos.reduce((m, t) => Math.max(m, t.seq || 0), 0) + 1;
    }
    return data;
  } catch {
    return emptyStore();
  }
}

export async function saveTodos(data) {
  await fs.mkdir(path.dirname(TODOS_FILE), { recursive: true });
  await fs.writeFile(TODOS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Add an item to the operator to-do list.
 * De-dupes against any OPEN item with the same tenant + title.
 *
 * `instructions` is OPTIONAL and backward-compatible. When provided it is a
 * structured object that the /admin empire homescreen renders click-to-expand:
 *   { steps?: string[], links?: {label,url}[], code?: string }
 *   - steps : ordered plain-English actions
 *   - links : exact sites with real URLs
 *   - code  : terminal commands to paste (one string, may be multi-line)
 * Most callers should go through operator-todo-writer.mjs (addOperatorTask),
 * which assembles a complete `instructions` object from category templates.
 */
export async function addTodo({
  tenant = "day14",
  title,
  detail = "",
  category = "general",
  priority = "medium",
  source = "system",
  instructions = null,
}) {
  if (!title) throw new Error("addTodo: title is required");
  const data = await loadTodos();
  const dup = data.todos.find(
    (t) => t.status === "open" && t.tenant === tenant && t.title === title
  );
  if (dup) return dup;
  const seq = data.next_seq;
  const todo = {
    id: `todo-${seq}`,
    seq,
    tenant,
    title,
    detail,
    category,
    priority,
    status: "open",
    created_at: new Date().toISOString(),
    completed_at: null,
    source,
  };
  // Only persist `instructions` when it carries real content — keeps existing
  // callers' todos byte-identical to before.
  if (instructions && typeof instructions === "object") {
    const clean = {};
    if (Array.isArray(instructions.steps) && instructions.steps.length)
      clean.steps = instructions.steps.filter(Boolean).map(String);
    if (Array.isArray(instructions.links) && instructions.links.length)
      clean.links = instructions.links
        .filter((l) => l && l.url)
        .map((l) => ({ label: String(l.label || l.url), url: String(l.url) }));
    if (instructions.code && String(instructions.code).trim())
      clean.code = String(instructions.code).trim();
    if (Object.keys(clean).length) todo.instructions = clean;
  }
  data.todos.push(todo);
  data.next_seq = seq + 1;
  await saveTodos(data);
  return todo;
}

/**
 * Mark a to-do done. `ref` may be a seq number ("3", "#3"), or an id ("todo-3").
 * Returns the completed todo, or null if not found.
 */
export async function completeTodo(ref) {
  const data = await loadTodos();
  let todo = null;
  const n = parseInt(String(ref).replace(/[^0-9]/g, ""), 10);
  if (!Number.isNaN(n)) todo = data.todos.find((t) => t.seq === n);
  if (!todo) todo = data.todos.find((t) => t.id === ref);
  if (!todo) return null;
  if (todo.status !== "done") {
    todo.status = "done";
    todo.completed_at = new Date().toISOString();
    await saveTodos(data);
  }
  return todo;
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

/** All open items, highest priority first, then oldest first. */
export async function listOpenTodos() {
  const data = await loadTodos();
  return data.todos
    .filter((t) => t.status === "open")
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) ||
        (a.seq || 0) - (b.seq || 0)
    );
}

// CLI: `node operator-todos.mjs list` | `... done 3` | `... add "<title>" [tenant]`
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "list" || !cmd) {
    const open = await listOpenTodos();
    if (!open.length) console.log("Operator to-do list is empty.");
    else
      for (const t of open)
        console.log(`  ${t.seq}. [${t.priority}] ${t.title}  (${t.tenant})`);
  } else if (cmd === "done") {
    const t = await completeTodo(rest[0]);
    console.log(t ? `Completed: ${t.title}` : `Not found: ${rest[0]}`);
  } else if (cmd === "add") {
    const t = await addTodo({ title: rest[0], tenant: rest[1] || "day14", source: "cli" });
    console.log(`Added #${t.seq}: ${t.title}`);
  } else {
    console.error("Usage: operator-todos.mjs [list | done <n> | add <title> [tenant]]");
    process.exit(1);
  }
}
