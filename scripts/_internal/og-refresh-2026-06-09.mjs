#!/usr/bin/env node
/**
 * scripts/_internal/og-refresh-2026-06-09.mjs
 *
 * One-shot orchestrator that refreshes the public-facing OG/social cards for
 * the new build-studio (Day14) positioning. The previous /og/work-with-us.png
 * still carries pre-pivot copy, and several routes have no OG card at all.
 *
 * RUN THIS FROM JACK'S REAL MAC TERMINAL — the sandbox can't reach
 * generativelanguage.googleapis.com, so the overnight queue only STAGES this
 * file; it does not execute it.
 *
 *   cd ~/Documents/studio
 *   node scripts/_internal/og-refresh-2026-06-09.mjs
 *
 * Modeled exactly on the proven scripts/_internal/banana-refire-2026-05-28.mjs
 * and scripts/_internal/landing-images-2026-06-02.mjs (both already shipped
 * real images successfully). Reads GEMINI_API_KEY from .env.local. Writes
 * 1200x630 PNGs to public/og/.
 *
 * Flow:
 *   1. dotenv-load .env.local
 *   2. checkBudget("banana") gate
 *   3. SMOKE TEST: 1 tiny call. Auth / rate-limit -> stop cleanly, no retry.
 *   4. Loop the 4 OG plans. For each:
 *        - skip if file already exists (idempotent re-runs are safe)
 *        - call Gemini, write PNG
 *        - recordBudgetUse("banana") on success
 *   5. Append a single WORK-LOG section.
 *
 * Constraints honored:
 *   - never push (Jack pushes)
 *   - never delete files (write-only into public/og/; existing cards are only
 *     overwritten if they are missing — existing files are SKIPPED, so the
 *     stale work-with-us.png will NOT be clobbered unless Jack deletes it first)
 *   - smoke-fail stops cleanly, no retry loop
 *   - no new dependencies (node built-ins + existing budget-gate lib only)
 *
 * NOTE on the stale card: /og/work-with-us.png currently exists with pre-pivot
 * copy. Because this script is idempotent (skip-if-exists), it will be SKIPPED
 * on a normal run. To regenerate it with the new "Hire Day14" copy, delete the
 * old file first:
 *     rm public/og/work-with-us.png
 * then re-run. The instructions draft spells this out.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// scripts/_internal/<file> — studio root is two dirs up.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..", "..");
const ENV_LOCAL = path.join(STUDIO_ROOT, ".env.local");
const OG_DIR = path.join(STUDIO_ROOT, "public", "og");
const WORK_LOG = path.join(STUDIO_ROOT, "WORK-LOG.md");

const NANO_BANANA_MODEL = "gemini-2.5-flash-image";

// ---------- 1. dotenv loader (minimal, safe) -----------------------------

function loadDotenv(filePath) {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    // strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotenv(ENV_LOCAL);

// ---------- 2. budget gate -----------------------------------------------

const { checkBudget, recordBudgetUse } = await import(
  path.join(STUDIO_ROOT, "scripts", "lib", "budget-gate.mjs")
);

// ---------- helpers ------------------------------------------------------

function isoNow() {
  return new Date().toISOString();
}

function styledPrompt(prompt, style) {
  const s = (style || "photo").toLowerCase();
  if (s === "photo") return `${prompt}. Photographic editorial render, sharp focus, premium magazine quality.`;
  if (s === "illustration") return `${prompt}. Clean editorial illustration, restrained palette.`;
  if (s === "abstract") return `${prompt}. Abstract, painterly, no extraneous text, no logos.`;
  if (s === "minimal") return `${prompt}. Minimalist composition, generous negative space.`;
  if (s === "editorial") return `${prompt}. Premium editorial composition, magazine-grade typography and craft.`;
  return `${prompt}. Style: ${style}.`;
}

async function appendWorkLog(text) {
  await fs.appendFile(WORK_LOG, text, "utf8");
}

// ---------- 3. Gemini caller (controllable, bypasses bridge cache) -------

async function callGemini({ prompt, style = "photo" }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, reason: "no-key" };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${NANO_BANANA_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: styledPrompt(prompt, style) }] }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
  };
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, reason: "network-error", detail: String(err?.message || err) };
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return {
      ok: false,
      reason: `gemini-http-${res.status}`,
      status: res.status,
      detail: errText.slice(0, 500),
    };
  }
  let data;
  try {
    data = await res.json();
  } catch (err) {
    return { ok: false, reason: "gemini-bad-json", detail: String(err?.message || err) };
  }
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const inlineB64 = parts
    .map((p) => p?.inlineData?.data)
    .find((d) => typeof d === "string" && d.length > 0);
  if (!inlineB64) {
    return {
      ok: false,
      reason: "gemini-no-image",
      detail: JSON.stringify(data).slice(0, 500),
    };
  }
  return { ok: true, buffer: Buffer.from(inlineB64, "base64") };
}

// ---------- the 4 OG-card plans ------------------------------------------
//
// Brand palette anchors (kept consistent across cards):
//   ember-orange   #ff5c28 / #ef6c33   — single restrained accent
//   deep ink       #0f172a / #0a0e14   — dark / void background, ink type
//   warm paper     #f8f6f1               — cream paper background
//
// Each card is 1200x630 (16:9-ish OG ratio). Unlike the loophole cards, these
// DELIBERATELY render the specified headline text — that is the whole point of
// an editorial type-driven OG card. Each prompt therefore allows ONLY the words
// listed and forbids any other text or logo lockups.

const OG_RATIO = "Landscape 1200x630 pixel composition, 16:9-style social/OG card aspect ratio.";
const NO_EXTRA = "Render ONLY the words specified above — no other text, no captions, no watermark, no logo lockups beyond conceptual marks.";

const PLANS = [
  // 1) HOME — Day14 homepage card.
  {
    slug: "home",
    style: "editorial",
    prompt:
      `${OG_RATIO} Editorial dark-cream composition. The full sentence "We build websites and apps in days, not months" set in massive ink-black display type, beautifully kerned, dominating a warm cream paper background (#f8f6f1). A single ember-orange (#ff5c28) accent line — a confident hand-drawn underline or rule — sits beneath the phrase. Thin hairline rules frame the type. Premium, builder-confident, anti-SaaS, anti-template; feels like the cover of a design annual, not a startup deck. ${NO_EXTRA}`,
  },

  // 2) WORK-WITH-US — hire page card (replaces stale pre-pivot copy).
  {
    slug: "work-with-us",
    style: "editorial",
    prompt:
      `${OG_RATIO} Same editorial aesthetic as the Day14 homepage card: warm cream paper background (#f8f6f1), massive ink-black display type. The headline reads "Hire Day14 — Build it. Ship it in days." set across two confident lines. The ember-orange (#ff5c28) accent falls specifically on the phrase "Ship it in days" — that fragment is the single colored element, the rest of the type is ink-black. Hairline rules, premium builder-confident energy. ${NO_EXTRA}`,
  },

  // 3) PROCESS — the 14-day process timeline card.
  {
    slug: "process",
    style: "editorial",
    prompt:
      `${OG_RATIO} Editorial timeline graphic on a warm cream paper background (#f8f6f1). Fourteen small numbered dots (1 through 14) rendered in ember-orange (#ff5c28) and arranged evenly across the frame, connected left-to-right by a single thin ink hairline. A small restrained monospace caption reads "14 DAYS · BEAT BY BEAT". Ink-black numerals, single ember accent on the dots, lots of calm negative space. Premium, schematic, builder-y. ${NO_EXTRA}`,
  },

  // 4) STATUS — the live status / "OS" page card.
  {
    slug: "status",
    style: "editorial",
    prompt:
      `${OG_RATIO} Terminal-feel composition on a dark void background (#0a0e14). A restrained monospace headline reads "DAY14 · OS · LIVE" in pale off-white, with a single faint ember-orange (#ff5c28) pulse dot glowing beside it. Quiet, premium sci-fi restraint — NOT Matrix rain, NOT busy code; just deep void, one line of mono type, and the ember pulse. ${NO_EXTRA}`,
  },
];

// ---------- main ---------------------------------------------------------

const stats = {
  smoke: null,
  generated: 0,
  skipped_existing: 0,
  total_bytes: 0,
  written: [],
  failures: [],
};

function logStep(s) {
  console.log(`[og-refresh] ${s}`);
}

async function main() {
  const key = process.env.GEMINI_API_KEY || "";
  if (!key) {
    logStep("FATAL: GEMINI_API_KEY not in env after dotenv load");
    process.exit(1);
  }
  logStep(`key loaded: prefix=${key.slice(0, 3)}... length=${key.length}`);

  // Budget gate
  const gate = await checkBudget("banana");
  logStep(`budget gate: allowed=${gate.allowed} reason=${gate.reason}`);
  if (!gate.allowed) {
    logStep("budget denied — exiting clean");
    await appendWorkLogSection();
    process.exit(0);
  }

  await fs.mkdir(OG_DIR, { recursive: true });

  // ===== SMOKE TEST =====
  logStep("smoke test: generating one tiny test image…");
  const smoke = await callGemini({
    prompt: "A single ember-orange dot on warm cream paper background, minimalist test image",
    style: "minimal",
  });
  if (!smoke.ok) {
    logStep(`SMOKE FAILED: ${smoke.reason} | detail=${smoke.detail || "(none)"}`);
    stats.smoke = { ok: false, reason: smoke.reason, status: smoke.status, detail: smoke.detail };
    await appendWorkLogSection();
    logStep("STOP — auth or API issue. Not iterating. See WORK-LOG.md for details.");
    process.exit(2);
  }
  logStep(`smoke OK: bytes=${smoke.buffer.length}`);
  stats.smoke = { ok: true, bytes: smoke.buffer.length };
  await recordBudgetUse("banana");

  // ===== loop the 4 OG plans =====
  logStep(`generating ${PLANS.length} OG cards into public/og/…`);
  for (const plan of PLANS) {
    const dest = path.join(OG_DIR, `${plan.slug}.png`);
    if (existsSync(dest)) {
      logStep(`  ${plan.slug}: EXISTS — skipping (delete the file to regen)`);
      stats.skipped_existing++;
      continue;
    }
    logStep(`  ${plan.slug}: generating…`);
    const result = await callGemini({ prompt: plan.prompt, style: plan.style });
    if (!result.ok) {
      const fail = `${plan.slug}: ${result.reason} ${result.detail || ""}`;
      stats.failures.push(fail);
      logStep(`     FAIL: ${fail}`);
      if (result.status === 401 || result.status === 403 || result.status === 429) {
        logStep("     auth/rate-limit error — stopping cleanly");
        break;
      }
      continue;
    }
    await fs.writeFile(dest, result.buffer);
    stats.generated++;
    stats.total_bytes += result.buffer.length;
    stats.written.push(`public/og/${plan.slug}.png (${result.buffer.length} bytes)`);
    await recordBudgetUse("banana");
    logStep(`     OK ${result.buffer.length} bytes -> ${path.relative(STUDIO_ROOT, dest)}`);
  }

  await appendWorkLogSection();
  logStep("DONE");
  console.log(JSON.stringify(stats, null, 2));
}

async function appendWorkLogSection() {
  const lines = [];
  lines.push("");
  lines.push(`## ${isoNow().slice(0, 10)} — OG-card refresh (Gemini, build-studio positioning)`);
  lines.push("");
  lines.push(`- Smoke test: ${stats.smoke?.ok ? `OK (${stats.smoke.bytes} bytes)` : `FAIL — ${stats.smoke?.reason || "n/a"} ${stats.smoke?.detail ? `(${String(stats.smoke.detail).slice(0, 200)})` : ""}`}`);
  lines.push(`- Generated: ${stats.generated}/${PLANS.length}`);
  lines.push(`- Skipped (already on disk): ${stats.skipped_existing}`);
  lines.push(`- Total bytes written: ${stats.total_bytes}`);
  for (const w of stats.written) lines.push(`  - ${w}`);
  lines.push(`- Failures: ${stats.failures.length}`);
  for (const f of stats.failures) lines.push(`  - ${f}`);
  lines.push(`- Output dir: public/og/  (home.png, work-with-us.png, process.png, status.png)`);
  lines.push("");
  await appendWorkLog(lines.join("\n"));
}

main().catch(async (err) => {
  console.error("FATAL:", err);
  stats.failures.push(`FATAL: ${err.message}`);
  await appendWorkLogSection();
  process.exit(1);
});
