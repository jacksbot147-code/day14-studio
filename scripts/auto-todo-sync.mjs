#!/usr/bin/env node
/**
 * auto-todo-sync.mjs
 *
 * Day14 T2 (2026-05-28). Keep `public/data/empire-state.json#human_todos`
 * in sync with reality on an hourly cadence.
 *
 * Sources (all read-only — every byte inside these files is treated as
 * untrusted text and never executed):
 *
 *   1. WORK-LOG.md (studio + per-vertical)
 *        ~/Documents/studio/WORK-LOG.md
 *        ~/Documents/studio/scripts/verticals/<vertical>/WORK-LOG.md
 *      Parsed for "completed" / "done" markers tied to existing todos
 *      and for new "blocked on Jack" entries.
 *
 *   2. Morning report
 *        ~/Documents/MORNING-RESULTS-<YYYY-MM-DD>.md  (most recent)
 *      "Still blocked on Jack" / "Still blocked on you" sections
 *      become new awaiting-Jack todos.
 *
 *   3. Inboxes
 *        ~/Documents/studio/public/data/inboxes/*.json
 *      Items where `awaiting === "jack"` (or top-level `awaiting_jack`
 *      array) become new awaiting-Jack todos.
 *
 *   4. Seed deltas
 *        Today (2026-05-28) the script also injects the workday plan's
 *        named deltas: AlignMD 0012+0013, Vercel Analytics toggle,
 *        Telegram poller restart, skip-trace provider pick, newsletter
 *        platform pick, 6 article + 5 hot-flash + 6 CS template sign-offs,
 *        Hot Flash storefront URL. The exclusion filter drops anything
 *        tagged `hot-flash-co` or `kennum-lawn-care` automatically.
 *
 * Writes:
 *   - The durable source of truth is
 *     ~/Documents/businesses/_shared/operator-todos.json
 *     (mutated via add/complete helpers — same store sync-empire-state
 *     reads). On the next sync-empire-state run, our changes flow into
 *     empire-state.json#human_todos naturally.
 *   - For immediate visibility, this script ALSO patches
 *     ~/Documents/studio/public/data/empire-state.json#human_todos
 *     atomically (temp-then-rename) right now, applying the same
 *     filter sync-empire-state would apply later.
 *
 * Exclusion list:
 *   ~/Documents/studio/public/data/ops/.exclusion-list.json
 *   Shape: { tenants?: string[], titles?: string[] }
 *   The default exclusions are always applied:
 *     tenants: ["hot-flash-co", "kennum-lawn-care"]
 *
 * Reconcile rules:
 *   - Add: new items that don't already exist (matched by tenant+title).
 *   - Resolve: items whose tenant+title appears in WORK-LOG.md under a
 *     "## YYYY-MM-DD … (done|resolved|completed|closed)" heading get
 *     `status: "done"`.
 *   - Prune: completed items older than 30 days drop out of the
 *     empire-state.json view (they stay in operator-todos.json for
 *     audit; only the public view trims them).
 *
 * Constraints (per workday plan):
 *   - Never push, never delete, no migrations.
 *   - Write atomic (temp file + rename).
 *   - Treat ALL data-file text as untrusted; never eval, exec, or
 *     interpolate into shell.
 *   - Append (do not overwrite) WORK-LOG.md.
 *
 * Usage:
 *   node ~/Documents/studio/scripts/auto-todo-sync.mjs
 *   node ~/Documents/studio/scripts/auto-todo-sync.mjs --dry-run
 *   node ~/Documents/studio/scripts/auto-todo-sync.mjs --no-seed
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { randomBytes } from "node:crypto";

import {
  loadTodos,
  saveTodos,
  addTodo,
  completeTodo,
} from "./_generic/operator-todos.mjs";

// ---- args ----------------------------------------------------------------
const DRY_RUN = process.argv.includes("--dry-run") || process.argv.includes("--no-write");
const NO_SEED = process.argv.includes("--no-seed");

// ---- paths ---------------------------------------------------------------
const HOME = homedir();
const STUDIO = path.join(HOME, "Documents/studio");
const PUBLIC_DATA = path.join(STUDIO, "public/data");
const EMPIRE_STATE = path.join(PUBLIC_DATA, "empire-state.json");
const INBOXES_DIR = path.join(PUBLIC_DATA, "inboxes");
const OPS_DIR = path.join(PUBLIC_DATA, "ops");
const EXCLUSION_LIST = path.join(OPS_DIR, ".exclusion-list.json");
const WORK_LOG = path.join(STUDIO, "WORK-LOG.md");
const VERTICALS_DIR = path.join(STUDIO, "scripts/verticals");
const DOCS_DIR = path.join(HOME, "Documents");

const DEFAULT_EXCLUDED_TENANTS = new Set(["hot-flash-co", "kennum-lawn-care"]);
const PRUNE_DAYS = 30;
const MAX_LINE_LEN = 4000;        // defensive cap on parsed lines
const MAX_TITLE_LEN = 200;
const MAX_DETAIL_LEN = 2000;

// ---- helpers -------------------------------------------------------------
async function readFileSafe(p) {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function readJsonSafe(p) {
  const raw = await readFileSafe(p);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function listDirSafe(p) {
  try {
    return await fs.readdir(p, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Defensive string cleaner — strips control chars, caps length. */
function sanitize(s, max = MAX_LINE_LEN) {
  if (typeof s !== "string") return "";
  // eslint-disable-next-line no-control-regex
  const cleaned = s.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  return cleaned.length > max ? cleaned.slice(0, max) + "…" : cleaned;
}

/** Atomic write: temp file in same dir, then rename. */
async function writeAtomic(targetPath, contents) {
  const dir = path.dirname(targetPath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(targetPath)}.tmp-${randomBytes(6).toString("hex")}`
  );
  await fs.writeFile(tmp, contents);
  await fs.rename(tmp, targetPath);
}

async function loadExclusions() {
  const tenants = new Set(DEFAULT_EXCLUDED_TENANTS);
  const titles = new Set();
  const data = await readJsonSafe(EXCLUSION_LIST);
  if (data && typeof data === "object") {
    if (Array.isArray(data.tenants)) {
      for (const t of data.tenants) if (typeof t === "string") tenants.add(t);
    }
    if (Array.isArray(data.titles)) {
      for (const t of data.titles) if (typeof t === "string") titles.add(t);
    }
  }
  return { tenants, titles };
}

function isExcluded(item, exclusions) {
  if (!item) return true;
  if (item.tenant && exclusions.tenants.has(item.tenant)) return true;
  if (item.title && exclusions.titles.has(item.title)) return true;
  return false;
}

// ---- WORK-LOG parsing -----------------------------------------------------
const RESOLVE_RE = /\b(done|resolved|completed|closed)\b/i;
const TODO_REF_RE = /\btodo[- ]?#?(\d+)\b/i;

async function gatherWorkLogResolutions() {
  /**
   * Walks WORK-LOG.md + per-vertical logs. Returns a Set of seq numbers
   * to mark done — anything mentioned in an entry from the last 24h whose
   * heading or body contains a resolve marker AND a todo-N reference.
   */
  const out = new Set();
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const logs = [WORK_LOG];
  for (const ent of await listDirSafe(VERTICALS_DIR)) {
    if (!ent.isDirectory()) continue;
    const p = path.join(VERTICALS_DIR, ent.name, "WORK-LOG.md");
    if (existsSync(p)) logs.push(p);
  }
  for (const logPath of logs) {
    const raw = await readFileSafe(logPath);
    if (!raw) continue;
    // Each entry starts with "## YYYY-MM-DD …". Split on those headings.
    const sections = raw.split(/(?=^##\s)/m);
    for (const sec of sections) {
      const head = (sec.match(/^##\s+(.*)$/m) || [, ""])[1];
      const dateMatch = head.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (!dateMatch) continue;
      // Heuristic timestamp = midnight UTC of that date.
      const ts = Date.UTC(+dateMatch[1], +dateMatch[2] - 1, +dateMatch[3]);
      // Allow same-day entries (no time) — give them a 36h grace window.
      if (ts < since - 12 * 60 * 60 * 1000) continue;
      if (!RESOLVE_RE.test(sec)) continue;
      for (const m of sec.matchAll(/todo[- ]?#?(\d+)/gi)) {
        out.add(parseInt(m[1], 10));
      }
    }
  }
  return out;
}

// ---- morning-report parsing ----------------------------------------------
async function findLatestMorningReport() {
  let best = null;
  for (const ent of await listDirSafe(DOCS_DIR)) {
    if (!ent.isFile()) continue;
    const m = ent.name.match(/^MORNING-RESULTS-(\d{4}-\d{2}-\d{2})\.md$/);
    if (!m) continue;
    if (!best || m[1] > best.date) {
      best = { date: m[1], path: path.join(DOCS_DIR, ent.name) };
    }
  }
  return best;
}

function parseStillBlocked(markdown) {
  /**
   * Extracts the "Still blocked on" section (h2) and yields each bullet
   * line as a {title, detail} candidate.
   */
  const out = [];
  if (!markdown) return out;
  // Find the heading, then pull until the next ## heading or end of file.
  const headRe = /^##\s+Still blocked on[^\n]*$/im;
  const headMatch = markdown.match(headRe);
  if (!headMatch || headMatch.index === undefined) return out;
  const afterHead = markdown.slice(headMatch.index + headMatch[0].length);
  // Next ## heading (or end of string).
  const nextRe = /\n##\s/m;
  const nextMatch = afterHead.match(nextRe);
  const body =
    nextMatch && nextMatch.index !== undefined
      ? afterHead.slice(0, nextMatch.index)
      : afterHead;
  // Bullets begin with "-" at column 0. Each bullet may have a multi-line
  // continuation indented with 2 spaces; we keep it simple and use the
  // first line as title.
  const lines = body.split(/\r?\n/);
  for (const ln of lines) {
    const b = ln.match(/^-\s+(.*)$/);
    if (!b) continue;
    // Pull bold title `**X**` if present.
    let title = b[1];
    let detail = "";
    const boldMatch = title.match(/^\*\*(.+?)\*\*\s*[—:-]?\s*(.*)$/);
    if (boldMatch) {
      title = boldMatch[1];
      detail = boldMatch[2];
    }
    title = sanitize(title, MAX_TITLE_LEN);
    detail = sanitize(detail, MAX_DETAIL_LEN);
    if (title) out.push({ title, detail });
  }
  return out;
}

// ---- inbox parsing --------------------------------------------------------
async function gatherInboxItems() {
  const out = [];
  for (const ent of await listDirSafe(INBOXES_DIR)) {
    if (!ent.isFile() || !ent.name.endsWith(".json")) continue;
    const data = await readJsonSafe(path.join(INBOXES_DIR, ent.name));
    if (!data) continue;
    const tenant = sanitize(
      data.tenant || ent.name.replace(/\.json$/, ""),
      80
    );
    const items = Array.isArray(data.awaiting_jack)
      ? data.awaiting_jack
      : Array.isArray(data.items)
        ? data.items
        : [];
    for (const it of items) {
      if (!it || typeof it !== "object") continue;
      const awaiting = String(it.awaiting || it.status || "").toLowerCase();
      if (
        !Array.isArray(data.awaiting_jack) &&
        awaiting !== "jack" &&
        awaiting !== "awaiting-jack"
      )
        continue;
      const title = sanitize(it.title || it.summary || "", MAX_TITLE_LEN);
      if (!title) continue;
      out.push({
        tenant,
        title,
        detail: sanitize(it.detail || it.description || "", MAX_DETAIL_LEN),
        category: sanitize(it.category || "review", 40),
        priority: ["high", "medium", "low"].includes(it.priority)
          ? it.priority
          : "medium",
        source: "inbox",
      });
    }
  }
  return out;
}

// ---- seed deltas (workday plan, 2026-05-28) ------------------------------
function seedDeltas() {
  return [
    {
      tenant: "alignmd",
      title: "Run AlignMD Supabase migration 0012_saved_jobs.sql",
      detail:
        "Paste ~/Documents/alignmd/APPLY-MIGRATIONS-0011-0013.sql (block 0012) into Supabase SQL editor and run. Gates job-feed v2 deploy.",
      category: "migration",
      priority: "high",
      source: "workday-t02-seed",
    },
    {
      tenant: "alignmd",
      title: "Run AlignMD Supabase migration 0013_clinician_portal.sql",
      detail:
        "Paste the 0013 block of APPLY-MIGRATIONS-0011-0013.sql into Supabase SQL editor and run. Gates the clinician portal polish deploy (block 3).",
      category: "migration",
      priority: "high",
      source: "workday-t02-seed",
    },
    {
      tenant: "day14",
      title: "Toggle Vercel Web Analytics ON for studio project",
      detail:
        "Vercel dashboard → studio project → Analytics tab → enable Web Analytics. The <Analytics /> component is a no-op until this toggle flips. Then run `npm install` so @vercel/analytics resolves and src/types/vercel-analytics.d.ts can be removed.",
      category: "settings",
      priority: "high",
      source: "workday-t02-seed",
      instructions: {
        steps: [
          "Open vercel.com/<team>/studio/analytics",
          "Click Enable Web Analytics",
          "cd ~/Documents/studio && npm install",
          "Optional: rm src/types/vercel-analytics.d.ts once the package resolves",
        ],
        links: [
          { label: "Vercel Analytics docs", url: "https://vercel.com/docs/analytics" },
        ],
      },
    },
    {
      tenant: "day14",
      title: "Restart Telegram poller LaunchAgent",
      detail:
        "The Telegram poller's env changed (new key paths + bot config). Kick the LaunchAgent so it re-reads .env.local.",
      category: "ops",
      priority: "medium",
      source: "workday-t02-seed",
      instructions: {
        code: "launchctl unload ~/Library/LaunchAgents/com.day14.telegram-poller.plist 2>/dev/null; launchctl load ~/Library/LaunchAgents/com.day14.telegram-poller.plist",
      },
    },
    {
      tenant: "day14-realty",
      title: "Pick a skip-trace provider for re-skip-trace.mjs",
      detail:
        "scripts/verticals/real-estate/re-skip-trace.mjs is a stub. Pick a provider (BatchSkipTracing, REI Skip, Skip Genie, etc.), wire it in, and set SKIP_TRACE_API_KEY in .env.local + Vercel. Until then the realty outreach pipeline can't enrich phone numbers.",
      category: "decision",
      priority: "medium",
      source: "workday-t02-seed",
    },
    {
      tenant: "day14",
      title: "Pick a newsletter platform (MailerLite vs ConvertKit vs Beehiiv)",
      detail:
        "Newsletter signup forms are wired and inert. Pick the platform so we can lock in the API key. MailerLite already has a todo for the key; ConvertKit/Beehiiv would replace it.",
      category: "decision",
      priority: "medium",
      source: "workday-t02-seed",
    },
    {
      tenant: "life-loophole",
      title: "Sign off on Life Loophole article draft 1 of 6",
      detail:
        "Drafts live under ~/Documents/studio/content/life-loophole/drafts/. Review and tap the inbox approval card so the draft can publish.",
      category: "review",
      priority: "medium",
      source: "workday-t02-seed",
    },
    {
      tenant: "life-loophole",
      title: "Sign off on Life Loophole article draft 2 of 6",
      detail: "See draft 1 of 6 for the review flow.",
      category: "review",
      priority: "medium",
      source: "workday-t02-seed",
    },
    {
      tenant: "life-loophole",
      title: "Sign off on Life Loophole article draft 3 of 6",
      detail: "See draft 1 of 6 for the review flow.",
      category: "review",
      priority: "medium",
      source: "workday-t02-seed",
    },
    {
      tenant: "life-loophole",
      title: "Sign off on Life Loophole article draft 4 of 6",
      detail: "See draft 1 of 6 for the review flow.",
      category: "review",
      priority: "medium",
      source: "workday-t02-seed",
    },
    {
      tenant: "life-loophole",
      title: "Sign off on Life Loophole article draft 5 of 6",
      detail: "See draft 1 of 6 for the review flow.",
      category: "review",
      priority: "medium",
      source: "workday-t02-seed",
    },
    {
      tenant: "life-loophole",
      title: "Sign off on Life Loophole article draft 6 of 6",
      detail: "See draft 1 of 6 for the review flow.",
      category: "review",
      priority: "medium",
      source: "workday-t02-seed",
    },
    // Hot Flash items intentionally included; exclusion filter drops them.
    {
      tenant: "hot-flash-co",
      title: "Sign off on Hot Flash listing draft 1 of 5",
      detail: "Will be dropped by exclusion filter (tenant excluded today).",
      category: "review",
      priority: "low",
      source: "workday-t02-seed",
    },
    {
      tenant: "hot-flash-co",
      title: "Sign off on Hot Flash listing draft 2 of 5",
      detail: "Will be dropped by exclusion filter.",
      category: "review",
      priority: "low",
      source: "workday-t02-seed",
    },
    {
      tenant: "hot-flash-co",
      title: "Sign off on Hot Flash listing draft 3 of 5",
      detail: "Will be dropped by exclusion filter.",
      category: "review",
      priority: "low",
      source: "workday-t02-seed",
    },
    {
      tenant: "hot-flash-co",
      title: "Sign off on Hot Flash listing draft 4 of 5",
      detail: "Will be dropped by exclusion filter.",
      category: "review",
      priority: "low",
      source: "workday-t02-seed",
    },
    {
      tenant: "hot-flash-co",
      title: "Sign off on Hot Flash listing draft 5 of 5",
      detail: "Will be dropped by exclusion filter.",
      category: "review",
      priority: "low",
      source: "workday-t02-seed",
    },
    {
      tenant: "hot-flash-co",
      title: "Set the Hot Flash storefront URL",
      detail:
        "Printify pop-up store URL needed to wire the brand site CTAs. Excluded today by tenant rule.",
      category: "settings",
      priority: "low",
      source: "workday-t02-seed",
    },
    {
      tenant: "day14",
      title: "Sign off on CS reply template 1 of 6",
      detail:
        "Templates live in ~/Documents/studio/content/cs-templates/. Review and approve via /admin/inbox.",
      category: "review",
      priority: "medium",
      source: "workday-t02-seed",
    },
    {
      tenant: "day14",
      title: "Sign off on CS reply template 2 of 6",
      detail: "See template 1 of 6 for the review flow.",
      category: "review",
      priority: "medium",
      source: "workday-t02-seed",
    },
    {
      tenant: "day14",
      title: "Sign off on CS reply template 3 of 6",
      detail: "See template 1 of 6 for the review flow.",
      category: "review",
      priority: "medium",
      source: "workday-t02-seed",
    },
    {
      tenant: "day14",
      title: "Sign off on CS reply template 4 of 6",
      detail: "See template 1 of 6 for the review flow.",
      category: "review",
      priority: "medium",
      source: "workday-t02-seed",
    },
    {
      tenant: "day14",
      title: "Sign off on CS reply template 5 of 6",
      detail: "See template 1 of 6 for the review flow.",
      category: "review",
      priority: "medium",
      source: "workday-t02-seed",
    },
    {
      tenant: "day14",
      title: "Sign off on CS reply template 6 of 6",
      detail: "See template 1 of 6 for the review flow.",
      category: "review",
      priority: "medium",
      source: "workday-t02-seed",
    },
  ];
}

// ---- main reconcile -------------------------------------------------------
async function reconcile() {
  const exclusions = await loadExclusions();
  const beforeStore = await loadTodos();
  const beforeOpen = beforeStore.todos.filter((t) => t.status === "open");

  // Collect candidates from every source.
  const candidates = [];

  if (!NO_SEED) candidates.push(...seedDeltas());

  const morning = await findLatestMorningReport();
  if (morning) {
    const md = await readFileSafe(morning.path);
    for (const c of parseStillBlocked(md)) {
      candidates.push({
        tenant: "day14",
        title: c.title,
        detail: c.detail,
        category: "blocked",
        priority: "high",
        source: `morning-report:${morning.date}`,
      });
    }
  }

  candidates.push(...(await gatherInboxItems()));

  // Resolve from work-log heuristics.
  const toResolve = await gatherWorkLogResolutions();

  // Apply changes through the store helpers (durable source of truth).
  const added = [];
  const skipped = [];
  for (const c of candidates) {
    if (isExcluded(c, exclusions)) {
      skipped.push(c);
      continue;
    }
    // De-dupe against any open item with same tenant+title.
    const dup = beforeStore.todos.find(
      (t) => t.status === "open" && t.tenant === c.tenant && t.title === c.title
    );
    if (dup) continue;
    if (DRY_RUN) {
      added.push({ ...c, dry: true });
      continue;
    }
    const added1 = await addTodo({
      tenant: c.tenant,
      title: c.title,
      detail: c.detail || "",
      category: c.category || "general",
      priority: c.priority || "medium",
      source: c.source || "auto-todo-sync",
      instructions: c.instructions || null,
    });
    added.push(added1);
  }

  const resolved = [];
  for (const seq of toResolve) {
    if (DRY_RUN) {
      const t = beforeStore.todos.find((x) => x.seq === seq);
      if (t && t.status === "open") resolved.push({ seq, title: t.title, dry: true });
      continue;
    }
    const t = await completeTodo(seq);
    if (t) resolved.push(t);
  }

  // Re-read durable store and build the empire-state view.
  const afterStore = DRY_RUN ? beforeStore : await loadTodos();
  const cutoff = Date.now() - PRUNE_DAYS * 24 * 60 * 60 * 1000;
  const view = afterStore.todos
    .filter((t) => {
      if (isExcluded(t, exclusions)) return false;
      if (t.status === "done") {
        const done = t.completed_at ? Date.parse(t.completed_at) : 0;
        if (!done || done < cutoff) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Open before done, then priority, then seq.
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      const rank = { high: 0, medium: 1, low: 2 };
      const r = (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
      if (r) return r;
      return (a.seq || 0) - (b.seq || 0);
    });

  // Patch empire-state.json atomically. Read latest contents fresh so we
  // don't clobber a concurrent sync-empire-state run's other fields.
  let pruned = 0;
  if (!DRY_RUN) {
    const empire = (await readJsonSafe(EMPIRE_STATE)) || {};
    const prevCount = Array.isArray(empire.human_todos)
      ? empire.human_todos.length
      : 0;
    empire.human_todos = view;
    empire.generated_at = new Date().toISOString();
    await writeAtomic(EMPIRE_STATE, JSON.stringify(empire, null, 2));
    // Pruning count = items in store that did NOT make the view because of
    // the 30-day rule (excluding tenant-filtered ones, which are
    // categorized as "dropped" not pruned).
    pruned = afterStore.todos.filter((t) => {
      if (isExcluded(t, exclusions)) return false;
      if (t.status !== "done") return false;
      const done = t.completed_at ? Date.parse(t.completed_at) : 0;
      return !done || done < cutoff;
    }).length;
  }

  // Append to WORK-LOG.md
  const stamp = new Date().toISOString();
  const droppedTenants = new Map();
  for (const s of skipped) {
    droppedTenants.set(s.tenant, (droppedTenants.get(s.tenant) || 0) + 1);
  }
  const lines = [];
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`## ${stamp} — auto-todo-sync`);
  lines.push("");
  lines.push(`- before: ${beforeOpen.length} open todos`);
  lines.push(`- added: ${added.length}`);
  for (const a of added) {
    lines.push(`  - #${a.seq ?? "?"} [${a.tenant}] ${a.title}`);
  }
  lines.push(`- resolved: ${resolved.length}`);
  for (const r of resolved) {
    lines.push(`  - #${r.seq} ${r.title}`);
  }
  lines.push(`- pruned (≥${PRUNE_DAYS}d done): ${pruned}`);
  lines.push(
    `- dropped by exclusion (tenant filter): ${skipped.length}` +
      (droppedTenants.size
        ? ` — ${[...droppedTenants.entries()].map(([k, v]) => `${k}:${v}`).join(", ")}`
        : "")
  );
  lines.push(`- empire-state.json#human_todos length: ${view.length}`);
  if (DRY_RUN) lines.push(`- DRY RUN (no writes)`);
  lines.push("");

  if (!DRY_RUN) {
    await fs.appendFile(WORK_LOG, lines.join("\n"));
  }

  return {
    added: added.length,
    resolved: resolved.length,
    dropped: skipped.length,
    pruned,
    viewLen: view.length,
    droppedTenants: Object.fromEntries(droppedTenants),
    dryRun: DRY_RUN,
  };
}

// ---- entrypoint -----------------------------------------------------------
(async () => {
  try {
    const result = await reconcile();
    console.log("auto-todo-sync ✓", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("auto-todo-sync ✗", err?.stack || err?.message || String(err));
    process.exitCode = 1;
  }
})();
