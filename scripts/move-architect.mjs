#!/usr/bin/env node
/**
 * move-architect.mjs — turns a raw idea into a structured expansion spec.
 *
 * Encodes the Day14 "expand an idea into a shipped move" playbook (see the
 * move-architect skill). Given an idea it drafts, via the shared LLM helper:
 *   - the idea restated plainly
 *   - the clarifying questions that must be answered before building
 *   - honest constraints (what is NOT possible / must degrade gracefully)
 *   - a phased plan + an explicit file map
 *   - risks, a verification checklist, and a ship plan
 * ...and writes it to businesses/_shared/move-specs/ so every move is on
 * the record.
 *
 * Degrades cleanly: with no LLM key it still writes a spec stub laid out as
 * the playbook checklist for Jack to fill in by hand.
 *
 * CLI:  node move-architect.mjs "<idea>"
 * Bot:  Telegram "architect <idea>" / "plan <idea>" routes here.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { llmCall, parseJsonResponse } from "./_generic/llm-call.mjs";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const SPECS_DIR = path.join(SHARED, "move-specs");
const INDEX = path.join(SPECS_DIR, "index.json");
const LOG = path.join(SHARED, "founder-ops/move-architect.log");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

const METHODOLOGY = `You are the Day14 Move Architect. Take a raw idea from Jack and expand it into a precise, honest, executable spec using the Day14 build playbook.

THE PLAYBOOK — how every Day14 move is thought through:
1. CLARIFY FIRST. A request that sounds simple is usually underspecified. Identify the 1-3 real fork points — the decisions that actually change what gets built (data source, degrade-vs-require, scope of v1, where it lives) — and write each as a crisp question with options. Do not ask about things that don't change the build.
2. STUDY THE SYSTEM. Name the existing files, patterns, and constraints the move must fit. Build with the grain of what exists; never a parallel system.
3. EXPAND HONESTLY. State plainly what is NOT possible and where the feature must degrade gracefully. Never fake a capability.
4. DECOMPOSE. A short phased plan + an explicit file map (path, new or edit, purpose).
5. NAME RISKS. What could break a Vercel build (TypeScript, ESLint), what could regress, what needs a daemon/poller restart.
6. VERIFY. Concrete checks that prove it works — syntax check, a functional test, tsc, lint.
7. SHIP CLEAN. One paste-once deploy command; state what is live immediately vs needs a restart.

DAY14 HONESTY CONSTRAINTS — apply in step 3 every time:
- Official public records + licensed APIs only; never scrape Zillow/Redfin/county sites.
- A hosted (Vercel) dashboard cannot write to the Mac — route writes through Telegram.
- Prefer deterministic logic over API-quota-dependent logic; degrade cleanly with no key.
- The sandbox cannot git push — builds ship via a command Jack pastes.

Return STRICT JSON only, no prose outside it, this exact shape:
{
  "title": "short title for this move",
  "restated": "one paragraph — what the idea actually is",
  "clarifying_questions": [{"question":"...","why":"...","options":["...","..."]}],
  "honest_constraints": ["what is not possible / must degrade, and how"],
  "plan": [{"phase":"Phase 1 — ...","detail":"..."}],
  "file_map": [{"path":"...","change":"new","purpose":"..."}],
  "risks": ["..."],
  "verification": ["..."],
  "ship": "the shape of the one paste-once deploy + what needs a restart"
}`;

function slugify(s) {
  return (
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "move"
  );
}

async function loadEnvVar(name) {
  if (!existsSync(ENV_FILE)) return "";
  try {
    const t = await fs.readFile(ENV_FILE, "utf8");
    const m = t.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)\\s*$`, "m"));
    return m && m[1] ? m[1].replace(/^['"]|['"]$/g, "").trim() : "";
  } catch {
    return "";
  }
}

/** A spec stub laid out as the playbook checklist — used when no LLM is available. */
function fallbackSpec(idea) {
  return {
    title: idea.slice(0, 60),
    restated: idea,
    clarifying_questions: [
      { question: "What are the 1-3 fork points that change what gets built?", why: "Clarify before building.", options: [] },
    ],
    honest_constraints: ["Fill in: what is not possible / must degrade gracefully."],
    plan: [{ phase: "Phase 1", detail: "Decompose the move into phases." }],
    file_map: [{ path: "(map the files)", change: "new", purpose: "" }],
    risks: ["TypeScript / ESLint build break", "Regression", "Needs daemon/poller restart"],
    verification: ["node --check new .mjs", "functional test", "tsc --noEmit", "next lint --dir src"],
    ship: "One paste-once deploy command; note what needs a restart.",
    _stub: true,
  };
}

function renderMarkdown(spec, meta) {
  const L = [];
  L.push(`# Move spec — ${spec.title || meta.idea.slice(0, 60)}`);
  L.push("");
  L.push(`Generated: ${meta.generated_at}`);
  L.push(meta.degraded ? `Mode: STUB (no LLM key — fill in by hand)` : `Drafted by: ${meta.provider || "llm"}`);
  L.push("");
  L.push(`## Idea`);
  L.push(meta.idea);
  L.push("");
  if (spec.restated) {
    L.push(`## What this actually is`);
    L.push(spec.restated);
    L.push("");
  }
  L.push(`## Clarify first — fork points to answer`);
  const qs = spec.clarifying_questions || [];
  if (qs.length) {
    qs.forEach((q, i) => {
      L.push(`${i + 1}. **${q.question}**`);
      if (q.why) L.push(`   - Why it matters: ${q.why}`);
      if (q.options && q.options.length) L.push(`   - Options: ${q.options.join(" · ")}`);
    });
  } else {
    L.push("- (none identified)");
  }
  L.push("");
  L.push(`## Honest constraints`);
  for (const c of spec.honest_constraints || []) L.push(`- ${c}`);
  L.push("");
  L.push(`## Plan`);
  for (const p of spec.plan || []) L.push(`- **${p.phase}** — ${p.detail}`);
  L.push("");
  L.push(`## File map`);
  for (const f of spec.file_map || []) L.push(`- \`${f.path}\` *(${f.change})* — ${f.purpose}`);
  L.push("");
  L.push(`## Risks`);
  for (const r of spec.risks || []) L.push(`- ${r}`);
  L.push("");
  L.push(`## Verification`);
  for (const v of spec.verification || []) L.push(`- ${v}`);
  L.push("");
  L.push(`## Ship`);
  L.push(spec.ship || "One paste-once deploy command.");
  L.push("");
  return L.join("\n");
}

async function loadIndex() {
  if (!existsSync(INDEX)) return [];
  try {
    const d = JSON.parse(await fs.readFile(INDEX, "utf8"));
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

async function log(line) {
  try {
    await fs.mkdir(path.dirname(LOG), { recursive: true });
    await fs.appendFile(LOG, `[${new Date().toISOString()}] ${line}\n`);
  } catch {
    /* best-effort */
  }
}

async function notifyTelegram(spec, filename) {
  const chatId = await loadEnvVar("TELEGRAM_CHAT_ID");
  if (!chatId) return;
  try {
    await fs.mkdir(OUTBOX, { recursive: true });
    const qn = (spec.clarifying_questions || []).length;
    const fn = (spec.file_map || []).length;
    const text =
      `🧭 *Move spec ready — ${spec.title || "untitled"}*\n\n` +
      `${qn} clarifying question${qn === 1 ? "" : "s"} to answer first · ${fn} file${fn === 1 ? "" : "s"} mapped.\n\n` +
      `Spec: businesses/_shared/move-specs/${filename}`;
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-move-spec.json`),
      JSON.stringify(
        { chat_id: chatId, text, parse_mode: "Markdown", urgency: "P3", queued_at: new Date().toISOString(), sent_at: null },
        null,
        2
      )
    );
  } catch {
    /* best-effort */
  }
}

/** Run the playbook on an idea — returns { file, path, spec, degraded }. */
export async function architectMove(idea) {
  const clean = String(idea || "").trim();
  if (!clean) throw new Error("architectMove: idea is required");

  let spec;
  let degraded = false;
  let provider = "";
  const result = await llmCall({
    systemPrompt: METHODOLOGY,
    prompt: `IDEA:\n${clean}\n\nProduce the expansion spec as STRICT JSON.`,
    temperature: 0.4,
    maxTokens: 3500,
  });
  if (result.ok) {
    provider = result.provider || "llm";
    try {
      spec = parseJsonResponse(result.text);
    } catch {
      degraded = true;
    }
  } else {
    degraded = true;
  }
  if (degraded || !spec || typeof spec !== "object") {
    spec = fallbackSpec(clean);
    degraded = true;
  }

  const generated_at = new Date().toISOString();
  const filename = `${generated_at.slice(0, 10)}-${slugify(spec.title || clean)}.md`;
  const md = renderMarkdown(spec, { idea: clean, generated_at, degraded, provider });

  await fs.mkdir(SPECS_DIR, { recursive: true });
  await fs.writeFile(path.join(SPECS_DIR, filename), md);

  const index = await loadIndex();
  index.unshift({
    file: filename,
    title: spec.title || clean.slice(0, 80),
    idea: clean,
    created_at: generated_at,
    clarifying_questions: (spec.clarifying_questions || []).length,
    files_mapped: (spec.file_map || []).length,
    degraded,
  });
  await fs.writeFile(INDEX, JSON.stringify(index.slice(0, 200), null, 2));

  await log(
    `move-architect → spec drafted: ${spec.title || clean.slice(0, 50)}, ${(spec.clarifying_questions || []).length} clarifying questions, ${(spec.file_map || []).length} files mapped${degraded ? " [STUB]" : ""}`
  );
  await notifyTelegram(spec, filename);

  return { file: filename, path: path.join(SPECS_DIR, filename), spec, degraded };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const idea = process.argv.slice(2).join(" ").trim();
  if (!idea) {
    console.error('Usage: node move-architect.mjs "<idea>"');
    process.exit(1);
  }
  architectMove(idea)
    .then((r) => {
      console.log(`\n🧭 Move spec ${r.degraded ? "(stub — no LLM key)" : "drafted"}: ${r.spec.title}`);
      console.log(`   ${(r.spec.clarifying_questions || []).length} clarifying question(s) · ${(r.spec.file_map || []).length} file(s) mapped`);
      console.log(`   spec: businesses/_shared/move-specs/${r.file}\n`);
    })
    .catch((e) => {
      console.error("move-architect failed:", e.message);
      process.exit(1);
    });
}
