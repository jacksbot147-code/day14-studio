#!/usr/bin/env node
/**
 * scripts/_internal/banana-refire-2026-05-28.mjs
 *
 * One-shot orchestrator to re-fire T16 / T17 / T18 banana image generation
 * against the real Gemini API now that GEMINI_API_KEY (AQ. prefix format)
 * is present in studio/.env.local.
 *
 * Strategy:
 *   1. Load GEMINI_API_KEY from .env.local manually (bridge does not dotenv).
 *   2. checkBudget("banana") once before starting. If !allowed -> log + exit.
 *   3. SMOKE TEST: 1 small Gemini call. If 401/403/auth -> STOP, log, exit.
 *      No retry loop.
 *   4. Regenerate:
 *        - 6 life-loophole hero placeholders (overwrite at same sha256 path)
 *        - 3 brand-hero placeholders (v1/calm-authority per tenant for day14,
 *          day14-realty, alignmd)
 *        - 7 OG cards (1 work-with-us + 6 loophole, written to public/og/)
 *   5. Per-success: flip is_placeholder=false, set real_image=true,
 *      generated_at=<iso>, gen_reason="real-gemini" on the inbox item;
 *      recordBudgetUse("banana").
 *   6. Append a single WORK-LOG section.
 *
 * Constraints honored:
 *   - never push, never delete files (overwrite of placeholder bytes is fine).
 *   - hot-flash + kennum NOT touched.
 *   - if Gemini rate-limits mid-run, stop cleanly.
 *   - if auth fails at smoke, do not iterate.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// scripts/_internal/<file> — studio root is two dirs up.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..", "..");
const ENV_LOCAL = path.join(STUDIO_ROOT, ".env.local");
const CACHE_DIR = path.join(STUDIO_ROOT, "public", "data", "cache", "banana");
const OG_DIR = path.join(STUDIO_ROOT, "public", "og");
const OG_LOOPHOLE_DIR = path.join(OG_DIR, "life-loophole");
const INBOX_DIR = path.join(STUDIO_ROOT, "public", "data", "inboxes");
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
    if (!(key in process.env)) {
      process.env[key] = val;
    }
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

async function readJSON(p) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

async function writeJSON(p, obj) {
  await fs.writeFile(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function styledPrompt(prompt, style) {
  const s = (style || "photo").toLowerCase();
  if (s === "photo") return `${prompt}. Photographic, natural lighting, sharp focus.`;
  if (s === "illustration") return `${prompt}. Clean vector illustration, flat shading.`;
  if (s === "abstract") return `${prompt}. Abstract, painterly, no text.`;
  if (s === "minimal") return `${prompt}. Minimalist composition, generous negative space.`;
  return `${prompt}. Style: ${style}.`;
}

async function appendWorkLog(text) {
  await fs.appendFile(WORK_LOG, text, "utf8");
}

// ---------- 3. Gemini caller (controllable, bypasses bridge cache) ------

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

// ---------- main ---------------------------------------------------------

const stats = {
  smoke: null,
  loophole_regen: 0,
  brand_regen: 0,
  og_regen: 0,
  inbox_updates: 0,
  failures: [],
};

function logStep(s) {
  console.log(`[banana-refire] ${s}`);
}

async function main() {
  // Confirm key
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
    logStep(`budget denied — exiting clean`);
    await appendWorkLogSection({
      smoke: { ran: false, reason: "budget denied: " + gate.reason },
      stats,
    });
    process.exit(0);
  }

  // ===== SMOKE TEST =====
  logStep("smoke test: generating one tiny test image…");
  const smoke = await callGemini({
    prompt: "A single brand-teal circle on warm paper background, minimalist test image",
    style: "minimal",
  });
  if (!smoke.ok) {
    logStep(`SMOKE FAILED: ${smoke.reason} | detail=${smoke.detail || "(none)"}`);
    stats.smoke = { ok: false, reason: smoke.reason, status: smoke.status, detail: smoke.detail };
    await appendWorkLogSection({ smoke: stats.smoke, stats });
    logStep("STOP — auth or API issue. Not iterating. See WORK-LOG.md for details.");
    process.exit(2);
  }
  logStep(`smoke OK: bytes=${smoke.buffer.length}`);
  stats.smoke = { ok: true, bytes: smoke.buffer.length };
  // Record the smoke call against budget
  await recordBudgetUse("banana");

  // ===== T16: 6 life-loophole hero images =====
  logStep("T16: regenerating 6 life-loophole hero images…");
  const lpPath = path.join(INBOX_DIR, "life-loophole.json");
  const lp = await readJSON(lpPath);
  const lpItems = Array.isArray(lp) ? lp : lp.items;
  const heroItems = lpItems.filter((x) => x.kind === "hero-image-pick");
  logStep(`  found ${heroItems.length} hero-image-pick items`);

  for (const item of heroItems) {
    const dest = path.join(STUDIO_ROOT, item.generatedPath);
    logStep(`  -> ${item.draftId} -> ${path.basename(dest)}`);
    const result = await callGemini({
      prompt: item.prompt,
      style: item.requested_style || "illustration",
    });
    if (!result.ok) {
      const fail = `T16/${item.draftId}: ${result.reason} ${result.detail || ""}`;
      stats.failures.push(fail);
      logStep(`     FAIL: ${fail}`);
      if (result.status === 401 || result.status === 403 || result.status === 429) {
        logStep("     auth/rate-limit error — stopping cleanly");
        break;
      }
      continue;
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, result.buffer);
    item.is_placeholder = false;
    item.real_image = true;
    item.generated_at = isoNow();
    item.gen_reason = "real-gemini";
    item.cached = false;
    item.bytes = result.buffer.length;
    stats.loophole_regen++;
    stats.inbox_updates++;
    await recordBudgetUse("banana");
    logStep(`     OK ${result.buffer.length} bytes`);
  }
  await writeJSON(lpPath, lp);

  // ===== T17: 3 brand hero images (1 per tenant, v1 candidate) =====
  logStep("T17: regenerating brand-hero candidate v1 for day14, day14-realty, alignmd…");
  const BRAND_TENANTS = ["day14", "day14-realty", "alignmd"];
  for (const tenant of BRAND_TENANTS) {
    const inboxPath = path.join(INBOX_DIR, `${tenant}.json`);
    const inbox = await readJSON(inboxPath);
    const items = Array.isArray(inbox) ? inbox : inbox.items;
    const brandItem = items.find((x) => x.kind === "brand-hero-pick");
    if (!brandItem) {
      stats.failures.push(`T17/${tenant}: no brand-hero-pick item found`);
      logStep(`  ${tenant}: no item, skipping`);
      continue;
    }
    if (!brandItem.candidates || brandItem.candidates.length === 0) {
      stats.failures.push(`T17/${tenant}: no candidates array`);
      continue;
    }
    const cand = brandItem.candidates[0]; // v1 — calm authority
    const dest = path.join(STUDIO_ROOT, cand.generatedPath);
    logStep(`  ${tenant}: candidate v1 -> ${path.basename(dest)}`);
    const result = await callGemini({
      prompt: cand.prompt,
      style: cand.requested_style || "photo",
    });
    if (!result.ok) {
      const fail = `T17/${tenant}: ${result.reason} ${result.detail || ""}`;
      stats.failures.push(fail);
      logStep(`     FAIL: ${fail}`);
      if (result.status === 401 || result.status === 403 || result.status === 429) {
        logStep("     auth/rate-limit error — stopping cleanly");
        await writeJSON(inboxPath, inbox);
        break;
      }
      continue;
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, result.buffer);
    cand.is_placeholder = false;
    cand.real_image = true;
    cand.generated_at = isoNow();
    cand.gen_reason = "real-gemini";
    cand.cached = false;
    cand.bytes = result.buffer.length;
    // also flip top-level summary flag
    brandItem.real_image = true;
    brandItem.last_regen_at = isoNow();
    stats.brand_regen++;
    stats.inbox_updates++;
    await recordBudgetUse("banana");
    logStep(`     OK ${result.buffer.length} bytes`);
    await writeJSON(inboxPath, inbox);
  }

  // ===== T18: 7 OG cards (1 work-with-us + 6 loophole) =====
  logStep("T18: regenerating 7 OG cards (1200x630)…");

  const ogTargets = [
    {
      tenant: "day14",
      slug: "work-with-us",
      file: path.join(OG_DIR, "work-with-us.png"),
      prompt:
        "OG/social card image for Day14 — Work with us page. Day14 is a productized build studio that ships full branded business platforms (marketing site, customer portal, billing, admin app, AI chatbot) in 14 days. The image is a landscape composition (1200x630, 16:9 aspect-ish) featuring a confident, premium editorial illustration on warm paper background (#F8F6F1) with hairline ink linework forming an architectural schematic of layered platforms. One restrained ember-orange (#FF5C28) accent. No text, no logos, no UI. Anti-SaaS, anti-agency, builder-y, builder-confident. Photographic-quality editorial render.",
      style: "photo",
    },
  ];

  // Loophole OG targets — pull from the same hero items so prompt/headline align,
  // but rewrite for landscape OG composition.
  const lpHeroById = {};
  for (const h of heroItems) lpHeroById[h.draftId] = h;
  const loopholeOgPlan = [
    { draftId: "ll-2026-05-28-001-hsa-contribution", title: "The HSA is the only triple-tax-advantaged account in the code" },
    { draftId: "ll-2026-05-28-002-traditional-ira", title: "The Traditional IRA deduction: a quiet line on Schedule 1 that pays for itself" },
    { draftId: "ll-2026-05-28-003-roth-ira", title: "The Roth IRA trade: no break today, every break later" },
    { draftId: "ll-2026-05-28-004-employer-401k", title: "Workplace 401(k): the only loophole your employer pays you to use" },
    { draftId: "ll-2026-05-28-005-child-tax-credit", title: "The Child Tax Credit, decoded: who qualifies and what's refundable" },
    { draftId: "ll-2026-05-28-006-education-credits", title: "Two education credits, one tuition bill: how to pick AOTC vs Lifetime Learning" },
  ];
  for (const p of loopholeOgPlan) {
    ogTargets.push({
      tenant: "life-loophole",
      slug: p.draftId,
      file: path.join(OG_LOOPHOLE_DIR, `${p.draftId}.png`),
      prompt: `OG/social card image for a Life Loophole article: "${p.title}". Landscape 1200x630 composition, editorial illustration, clean, brand-tealwarm palette (deep teal #0F766E + warm paper #F8F6F1 + ember-orange #FF5C28 accent). Conceptually evokes the article topic without literal financial-document imagery — abstract metaphor: layers, doors, ladders, or other quiet symbols. Generous negative space, hairline ink linework. NO TEXT, no numbers, no logos. Premium editorial, builder-y, restrained.`,
      style: "illustration",
      draftId: p.draftId,
      title: p.title,
    });
  }

  // Build a new inbox-section for og-card-pick items (per tenant).
  const ogInboxByTenant = { day14: [], "life-loophole": [] };

  for (const t of ogTargets) {
    logStep(`  OG ${t.slug} -> ${path.basename(t.file)}`);
    const result = await callGemini({ prompt: t.prompt, style: t.style });
    if (!result.ok) {
      const fail = `T18/${t.slug}: ${result.reason} ${result.detail || ""}`;
      stats.failures.push(fail);
      logStep(`     FAIL: ${fail}`);
      if (result.status === 401 || result.status === 403 || result.status === 429) {
        logStep("     auth/rate-limit error — stopping cleanly");
        break;
      }
      continue;
    }
    await fs.mkdir(path.dirname(t.file), { recursive: true });
    await fs.writeFile(t.file, result.buffer);
    stats.og_regen++;
    await recordBudgetUse("banana");
    logStep(`     OK ${result.buffer.length} bytes`);

    const inboxItem = {
      id: `inbox-${t.tenant}-2026-05-28-og-${t.slug}`,
      kind: "og-card-pick",
      tenant: t.tenant,
      tags: [t.tenant, "og-card", "T18"],
      title:
        t.tenant === "day14"
          ? `Review OG card — ${t.slug}`
          : `Review OG card — ${t.title || t.slug}`,
      summary: `OG card (1200x630) regenerated via real Gemini for ${t.slug}. Saved to ${path.relative(STUDIO_ROOT, t.file)}.`,
      slug: t.slug,
      draftId: t.draftId,
      generatedPath: path.relative(STUDIO_ROOT, t.file),
      prompt: t.prompt,
      requested_size: "1200x630",
      requested_style: t.style,
      is_placeholder: false,
      real_image: true,
      generated_at: isoNow(),
      gen_reason: "real-gemini",
      cached: false,
      bytes: result.buffer.length,
      status: "awaiting-jack",
      priority: "medium",
    };
    ogInboxByTenant[t.tenant].push(inboxItem);
    stats.inbox_updates++;
  }

  // Append OG inbox items
  for (const tenant of Object.keys(ogInboxByTenant)) {
    const newItems = ogInboxByTenant[tenant];
    if (newItems.length === 0) continue;
    const p = path.join(INBOX_DIR, `${tenant}.json`);
    const inbox = await readJSON(p);
    const items = Array.isArray(inbox) ? inbox : inbox.items;
    // dedup: drop any existing items with same id
    const existingIds = new Set(items.map((x) => x.id));
    for (const it of newItems) {
      if (!existingIds.has(it.id)) items.push(it);
    }
    if (!Array.isArray(inbox)) inbox.items = items;
    await writeJSON(p, inbox);
  }

  await appendWorkLogSection({ smoke: stats.smoke, stats });
  logStep("DONE");
  console.log(JSON.stringify(stats, null, 2));
}

async function appendWorkLogSection({ smoke, stats }) {
  const lines = [];
  lines.push("");
  lines.push("## 2026-05-28 ~23:00 — Banana re-fire (real Gemini)");
  lines.push("");
  lines.push(`- Smoke test: ${smoke?.ok ? `OK (${smoke.bytes} bytes)` : `FAIL — ${smoke?.reason || "n/a"} ${smoke?.detail ? `(${String(smoke.detail).slice(0,200)})` : ""}`}`);
  lines.push(`- Loophole heroes regenerated: ${stats.loophole_regen}/6`);
  lines.push(`- Brand-site heroes regenerated: ${stats.brand_regen}/3`);
  lines.push(`- OG cards regenerated: ${stats.og_regen}/7`);
  lines.push(`- Inbox items updated/added: ${stats.inbox_updates}`);
  lines.push(`- Failures: ${stats.failures.length}`);
  for (const f of stats.failures) lines.push(`  - ${f}`);
  lines.push("");
  await appendWorkLog(lines.join("\n"));
}

main().catch(async (err) => {
  console.error("FATAL:", err);
  stats.failures.push(`FATAL: ${err.message}`);
  await appendWorkLogSection({ smoke: stats.smoke, stats });
  process.exit(1);
});
