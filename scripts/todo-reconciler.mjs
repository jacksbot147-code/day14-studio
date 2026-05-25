#!/usr/bin/env node
/**
 * todo-reconciler.mjs
 *
 * A2 — the self-healing to-do list.
 *
 * The operator to-do list (~/Documents/businesses/_shared/operator-todos.json)
 * drifts out of sync with reality: exact-duplicate to-dos pile up, work gets
 * done without the to-do being closed, etc. This agent keeps the list honest
 * — CONSERVATIVELY.
 *
 * On each run it:
 *
 *   1. AUTO-FIXES only the clear-cut: exact-duplicate open to-dos (same tenant
 *      + near-identical title, both still "open"). It keeps the earliest and
 *      marks the rest status:"merged" with a reconciler_note pointing at the
 *      kept one. This is the ONLY thing it changes automatically.
 *
 *   2. FLAGS, never silently closes: for every other open to-do it looks for a
 *      clear completion signal — a file the to-do explicitly names now exists,
 *      or an audit-log entry that plainly matches. If found it does NOT change
 *      status; it adds a reconciler_note ("Looks done — <evidence>. Review and
 *      close.") so the to-do stays visible to Jack but carries the hint.
 *
 *   3. Writes a human-readable report to
 *      ~/Documents/businesses/_shared/ops/todo-reconciliation.md
 *
 *   4. Appends one summary line to the shared audit log.
 *
 * Conservative by design: when unsure it leaves the to-do exactly as it is and
 * says so in the report. It NEVER deletes a to-do and NEVER auto-closes on a
 * soft signal. A "merge" is a status change, not a deletion.
 *
 * Untrusted-input note: titles/details inside operator-todos.json are treated
 * as untrusted data — only used for string matching and report text, never
 * executed or used to build filesystem paths beyond the explicit allow-listed
 * patterns below.
 *
 * CLI:
 *   node todo-reconciler.mjs            # reconcile + write report
 *   node todo-reconciler.mjs --dry-run  # report only, write nothing
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { loadTodos, saveTodos, titlesMatch } from "./lib/file-todo.mjs";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const TODOS_FILE = path.join(SHARED, "operator-todos.json");
const REPORT_FILE = path.join(SHARED, "ops/todo-reconciliation.md");
const AUDIT_FILE = path.join(SHARED, "audit/audit-2026-05.jsonl");

const DRY_RUN = process.argv.includes("--dry-run");

/** Append one structured line to the shared audit log. */
async function appendAudit(entry) {
  await fs.mkdir(path.dirname(AUDIT_FILE), { recursive: true });
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    tenant: "_shared",
    actor: "todo-reconciler",
    ...entry,
  });
  await fs.appendFile(AUDIT_FILE, line + "\n", "utf8");
}

/** Read a tenant's audit log as parsed events (best-effort, tolerant). */
async function tenantAuditEvents(tenant) {
  const f = path.join(BIZ, tenant, "audit-log.jsonl");
  if (!existsSync(f)) return [];
  try {
    const text = await fs.readFile(f, "utf8");
    return text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Pull explicit filenames a to-do names as its deliverable. We only trust
 * tight, well-known patterns so untrusted to-do text can't point us anywhere
 * surprising. Returns absolute paths (already constrained to the businesses
 * tree). Conservative: if nothing clean matches, returns [].
 */
function namedDeliverableFiles(todo) {
  const hay = `${todo.title}\n${todo.detail || ""}\n${
    todo.instructions ? JSON.stringify(todo.instructions) : ""
  }`;
  const found = new Set();

  // Pattern: a CSV the to-do says to drop into a tenant intake folder, named
  // exactly e.g. "lee-county.csv". The realty intake agent MOVES the file to
  // intake/processed/<ts>-<name> once ingested — so we check both spots.
  const csvMatches = hay.match(/"([a-z0-9][a-z0-9-]*\.csv)"/gi) || [];
  for (const raw of csvMatches) {
    const name = raw.replace(/"/g, "");
    if (!/^[a-z0-9][a-z0-9-]*\.csv$/i.test(name)) continue; // belt + braces
    const intakeDir = path.join(BIZ, todo.tenant, "intake");
    found.add(path.join(intakeDir, name));
    found.add(path.join(intakeDir, "processed", name)); // sentinel — see below
  }

  // Pattern: a brand-identity.json the to-do says should exist for a tenant.
  if (/brand-identity\.json/.test(hay)) {
    found.add(path.join(BIZ, todo.tenant, "brand-identity.json"));
  }

  return [...found];
}

/**
 * Look for a clear completion signal for one open to-do.
 * Returns { evidence: string } if found, else null.
 * NB: this NEVER changes status — it only produces an evidence string.
 */
async function findCompletionSignal(todo, auditCache) {
  // ── Signal 1: a file the to-do explicitly names now exists ───────────────
  for (const file of namedDeliverableFiles(todo)) {
    const base = path.basename(file);
    if (path.basename(path.dirname(file)) === "processed") {
      // The intake agent renames processed files to "<ts>-<name>", so an
      // exact path won't exist. Look for a "*-<name>" sibling instead.
      const dir = path.dirname(file);
      if (existsSync(dir)) {
        let siblings = [];
        try {
          siblings = await fs.readdir(dir);
        } catch {
          siblings = [];
        }
        const hit = siblings.find((s) => s.endsWith(`-${base}`) || s === base);
        if (hit) {
          return {
            evidence: `the file it names ("${base}") has been ingested — found ${path.join(
              "intake/processed",
              hit,
            )}`,
          };
        }
      }
      continue;
    }
    if (existsSync(file)) {
      const rel = path.relative(BIZ, file);
      return { evidence: `the file it names now exists — ${rel}` };
    }
  }

  // ── Signal 2: an audit-log entry that plainly matches ────────────────────
  // Only a STRONG, specific match counts. We look for an event whose detail
  // text contains a distinctive token from the to-do title.
  const events = auditCache[todo.tenant] || [];
  if (events.length) {
    const titleTokens = todo.title
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 5); // distinctive words only
    for (const ev of events) {
      const detail = String(ev.detail || "").toLowerCase();
      if (!detail) continue;
      const hits = titleTokens.filter((t) => detail.includes(t));
      // Require a substantial overlap so a stray word doesn't trigger a flag.
      if (titleTokens.length >= 3 && hits.length >= Math.ceil(titleTokens.length * 0.75)) {
        return {
          evidence: `an audit-log entry plainly matches — ${ev.actor || "agent"}/${
            ev.action || "event"
          } on ${(ev.ts || "").slice(0, 10)}`,
        };
      }
    }
  }

  return null;
}

async function main() {
  // ── Load + validate the to-do list ───────────────────────────────────────
  const data = await loadTodos(TODOS_FILE);
  const todos = data.todos;
  const openTodos = todos.filter((t) => t.status === "open");

  const merged = []; // { todo, keptId }
  const flagged = []; // { todo, evidence }
  const stillOpen = []; // todo
  let mutated = false;

  // ── Step 1: auto-merge exact duplicates ──────────────────────────────────
  // Group open to-dos by tenant, then within a tenant fold near-identical
  // titles. Keep the earliest (lowest seq) as canonical.
  const handledAsDup = new Set();
  const byTenant = new Map();
  for (const t of openTodos) {
    if (!byTenant.has(t.tenant)) byTenant.set(t.tenant, []);
    byTenant.get(t.tenant).push(t);
  }
  for (const [, group] of byTenant) {
    const sorted = [...group].sort((a, b) => (a.seq || 0) - (b.seq || 0));
    for (let i = 0; i < sorted.length; i++) {
      const keep = sorted[i];
      if (handledAsDup.has(keep.id)) continue;
      for (let j = i + 1; j < sorted.length; j++) {
        const cand = sorted[j];
        if (handledAsDup.has(cand.id)) continue;
        if (titlesMatch(keep.title, cand.title)) {
          // Auto-fix: this is the clear-cut case. Mark the later one merged.
          cand.status = "merged";
          cand.completed_at = new Date().toISOString();
          cand.reconciler_note = `Exact duplicate of ${keep.id} ("${keep.title}"). Merged by todo-reconciler — act on ${keep.id} instead.`;
          handledAsDup.add(cand.id);
          merged.push({ todo: cand, keptId: keep.id });
          mutated = true;
        }
      }
    }
  }

  // ── Step 2: flag completion signals on everything still open ─────────────
  const auditCache = {};
  const tenantsToScan = new Set(
    openTodos
      .filter((t) => !handledAsDup.has(t.id))
      .map((t) => t.tenant),
  );
  for (const tenant of tenantsToScan) {
    auditCache[tenant] = await tenantAuditEvents(tenant);
  }

  for (const t of openTodos) {
    if (handledAsDup.has(t.id)) continue; // already merged above
    const signal = await findCompletionSignal(t, auditCache);
    if (signal) {
      const note = `Looks done — ${signal.evidence}. Review and close.`;
      // Only count it as a NEW flag if the note isn't already there.
      if (t.reconciler_note !== note) {
        t.reconciler_note = note;
        mutated = true;
      }
      flagged.push({ todo: t, evidence: signal.evidence });
    } else {
      // Genuinely-open as far as we can tell. If a stale flag is sitting on it
      // from a prior run but the signal is gone, leave it — removing a note is
      // also a change and we stay conservative. Just classify it.
      stillOpen.push(t);
    }
  }

  // ── Step 3: write the human-readable report ──────────────────────────────
  const now = new Date();
  const lines = [];
  lines.push("# To-do reconciliation report");
  lines.push("");
  lines.push(`_Generated by todo-reconciler.mjs at ${now.toISOString()}_${
    DRY_RUN ? "  **(dry run — no changes written)**" : ""
  }`);
  lines.push("");
  lines.push(
    `Scanned ${todos.length} to-dos (${openTodos.length} open). ` +
      `Auto-merged ${merged.length} exact duplicate(s); ` +
      `flagged ${flagged.length} as looking done; ` +
      `${stillOpen.length} look genuinely open.`,
  );
  lines.push("");

  lines.push("## Auto-merged duplicates");
  lines.push("");
  if (merged.length === 0) {
    lines.push("_None — no exact-duplicate open to-dos found._");
  } else {
    lines.push(
      "These were exact duplicates (same tenant, near-identical title, both open). " +
        "The earliest was kept; the others are now `status: \"merged\"` and drop off the admin UI.",
    );
    lines.push("");
    for (const m of merged) {
      lines.push(
        `- **${m.todo.id}** (${m.todo.tenant}) — "${m.todo.title}" → merged into **${m.keptId}**`,
      );
    }
  }
  lines.push("");

  lines.push("## Flagged — looks done, needs Jack to review and close");
  lines.push("");
  if (flagged.length === 0) {
    lines.push("_None — no open to-do had a clear completion signal._");
  } else {
    lines.push(
      "These are still `status: \"open\"` and still visible in the admin UI — " +
        "the reconciler only added a `reconciler_note`. It will not auto-close them.",
    );
    lines.push("");
    for (const f of flagged) {
      lines.push(
        `- **${f.todo.id}** (${f.todo.tenant}) — "${f.todo.title}"`,
      );
      lines.push(`  - Evidence: ${f.evidence}`);
    }
  }
  lines.push("");

  lines.push("## Looks genuinely open");
  lines.push("");
  if (stillOpen.length === 0) {
    lines.push("_None._");
  } else {
    lines.push(
      "No completion signal found — left exactly as-is. When in doubt, the " +
        "reconciler changes nothing.",
    );
    lines.push("");
    for (const t of stillOpen) {
      lines.push(
        `- **${t.id}** (${t.tenant}, ${t.priority || "?"}) — "${t.title}"`,
      );
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    "_Conservative by design: only exact duplicates are changed automatically. " +
      "Everything else is flagged for human review — never silently closed, never deleted._",
  );
  lines.push("");

  const report = lines.join("\n");

  if (DRY_RUN) {
    console.log(report);
    console.log("\n[dry-run] no files written.");
    return;
  }

  // ── Step 4: persist (atomic) ─────────────────────────────────────────────
  if (mutated) {
    await saveTodos(data, TODOS_FILE);
  }
  await fs.mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await fs.writeFile(REPORT_FILE, report, "utf8");

  await appendAudit({
    action: "todos_reconciled",
    scanned: todos.length,
    open: openTodos.length,
    merged: merged.length,
    flagged: flagged.length,
    genuinely_open: stillOpen.length,
    changed: mutated,
  });

  console.log(
    `todo-reconciler: scanned ${todos.length}, merged ${merged.length}, ` +
      `flagged ${flagged.length}, genuinely-open ${stillOpen.length}.`,
  );
  console.log(`Report → ${REPORT_FILE}`);
}

main().catch((err) => {
  console.error("todo-reconciler failed:", err);
  process.exitCode = 1;
});
