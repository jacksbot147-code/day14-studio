#!/usr/bin/env node
/**
 * scripts/_internal/landing-images-2026-06-02.mjs
 *
 * One-shot orchestrator that generates the 8 cinematic landing-page images
 * Jack wants integrated into day14.us. Modeled on banana-refire-2026-05-28
 * (which already shipped 16 real images successfully).
 *
 * RUN THIS FROM JACK'S REAL MAC TERMINAL — the sandbox can't reach
 * generativelanguage.googleapis.com.
 *
 *   cd ~/Documents/studio
 *   node scripts/_internal/landing-images-2026-06-02.mjs
 *
 * Reads GEMINI_API_KEY from .env.local. Writes PNGs to
 *   public/images/landing/<slug>.png
 *
 * Flow:
 *   1. dotenv-load .env.local
 *   2. checkBudget("banana") gate
 *   3. SMOKE TEST: 1 tiny call. Auth/rate-limit -> stop.
 *   4. Loop the 8 image plans. For each:
 *        - skip if file exists (idempotent re-runs are safe)
 *        - call Gemini, write file
 *        - recordBudgetUse("banana") on success
 *   5. Append a WORK-LOG section.
 *
 * Constraints honored:
 *   - never push (Jack pushes)
 *   - never delete files (write-only into public/images/landing/)
 *   - smoke-fail stops cleanly, no retry loop
 *   - hot-flash + kennum NOT used as tenants here (but hot-flash-co's
 *     case-card image IS generated because it appears on the landing page —
 *     content is editorial atmosphere, not new tenant work)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..", "..");
const ENV_LOCAL = path.join(STUDIO_ROOT, ".env.local");
const OUT_DIR = path.join(STUDIO_ROOT, "public", "images", "landing");
const WORK_LOG = path.join(STUDIO_ROOT, "WORK-LOG.md");

const NANO_BANANA_MODEL = "gemini-2.5-flash-image";

// ---------- dotenv -------------------------------------------------------

function loadDotenv(filePath) {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
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

const { checkBudget, recordBudgetUse } = await import(
  path.join(STUDIO_ROOT, "scripts", "lib", "budget-gate.mjs")
);

// ---------- helpers ------------------------------------------------------

function isoNow() {
  return new Date().toISOString();
}

function styledPrompt(prompt, style) {
  const s = (style || "photo").toLowerCase();
  if (s === "photo") return `${prompt}. Photographic, natural lighting, sharp focus.`;
  if (s === "illustration") return `${prompt}. Clean editorial illustration, restrained palette.`;
  if (s === "abstract") return `${prompt}. Abstract, painterly, no text, no logos.`;
  if (s === "minimal") return `${prompt}. Minimalist composition, generous negative space.`;
  if (s === "cinematic") return `${prompt}. Cinematic editorial render, dramatic light, premium magazine quality.`;
  return `${prompt}. Style: ${style}.`;
}

async function appendWorkLog(text) {
  await fs.appendFile(WORK_LOG, text, "utf8");
}

// ---------- Gemini caller ------------------------------------------------

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

// ---------- the 8 image plans -------------------------------------------
//
// Brand palette anchors (used across prompts to keep visual cohesion):
//   ember-orange   #ef6c33 / #ff5c28   — accent (single, restrained)
//   deep ink       #0f172a / #0a0e14   — dark background
//   warm paper     #f8f6f1               — light paper background
//   muted teal     #0f766e               — Loophole/clinical secondary
//
// Every prompt explicitly forbids text and logos because Gemini's
// gemini-2.5-flash-image happily renders both unless told not to.

const PLANS = [
  // 1) HERO AMBIENT — sits behind the mesh gradient. Dark cosmic editorial
  // art with ember accents. Will be blended via mix-blend-mode: screen at
  // 55% opacity, so even pretty saturated source survives the integration.
  {
    slug: "hero-ambient",
    style: "cinematic",
    prompt:
      "Ultra-wide editorial hero image, 16:9 landscape composition, deeply atmospheric. A vast obsidian-black void with a single luminous orange ember filament (#ef6c33) drawing a curved gravitational arc across the frame, surrounded by faint constellation pinpricks of warm white light. In the background, suggested but not literal, the silhouette of a brutalist architectural lattice in dark indigo (#0f172a). Heavy atmospheric haze, volumetric god-rays cutting through from the upper-right. Cinematic anamorphic lens flare on the ember filament. Premium editorial, magazine-quality, evokes the cover of a futurist architecture annual. Absolutely NO text, NO logos, NO UI elements, NO people. Style references: Drew Struzan poster painting meets Ridley Scott Blade Runner cinematography.",
  },

  // 2) ALIGNMD CASE TILE — cool blue clinical-modern atmosphere.
  {
    slug: "case-alignmd",
    style: "cinematic",
    prompt:
      "Editorial product-marketing image for a healthcare-tech SaaS, 4:3 landscape, cinematic depth-of-field. A modern minimalist operating-theater-meets-startup-office abstraction — clean white surfaces, soft cool morning light filtering through louvered glass, a single matte-black tablet device resting on a brushed-aluminum surface with a faint cool blue (#3b82f6) data-glow emanating from beneath it. In the deep background, blurred and abstract, the suggestion of overlapping translucent acrylic dashboards floating mid-air, edges catching the cool light. Restrained, premium, evokes a Vogue Business profile on a healthcare unicorn. Color palette: pale ice blue, paper white, brushed steel, with a single deep cobalt accent. NO text, NO UI, NO logos, NO people.",
  },

  // 3) HOT-FLASH-CO CASE TILE — warm peach D2C wellness atmosphere.
  {
    slug: "case-hot-flash-co",
    style: "cinematic",
    prompt:
      "Editorial D2C wellness brand image, 4:3 landscape, cinematic warmth. A still-life composition on a warm linen surface bathed in golden-hour Mediterranean light. Soft volumetric pink and peach gradient atmosphere — like sun through a sheer pink curtain. In the foreground, abstract organic forms in matte terracotta and warm peach (#f472b6 desaturated), reading as bottles or sculptural objects but never literal. Pressed botanical shadows fall across the surface. The image feels like the editorial spread in a quarterly magazine about a buzzy menopause-positive direct-to-consumer brand. Aspirational, calm, premium, distinctly grown-up. NO text, NO UI, NO logos, NO faces.",
  },

  // 4) LIFE-LOOPHOLE CASE TILE — editorial gold finance paper atmosphere.
  {
    slug: "case-life-loophole",
    style: "cinematic",
    prompt:
      "Editorial financial-publication cover image, 4:3 landscape, cinematic gravitas. A still-life on aged ivory paper — overlapping translucent layers of vellum and parchment, each carrying faint architectural-blueprint hairline geometries (not legible as text, purely abstract linework). Single shaft of warm afternoon light cutting across the upper-right, catching the edges of the layers and casting long honey-gold shadows. A single antique brass paperweight or geometric metal object anchors the composition in the lower-left, with a quiet ember-gold (#ca8a04) glint. Recalls the cover of a Lapham's Quarterly issue on money, or a Wallpaper magazine spread on archival design. NO text, NO numbers, NO logos, NO charts.",
  },

  // 5) STEP 01 — ADD A TENANT. A glowing orb spawning from a central node.
  {
    slug: "step-01-tenant",
    style: "abstract",
    prompt:
      "Abstract editorial illustration, 4:3 landscape, conceptual diagram aesthetic. A deep midnight-indigo (#0f172a) background. In the center, a single bright ember-orange (#ef6c33) glowing sphere connected by a luminous hairline orange filament to a smaller secondary sphere being born off to the upper-right — clearly 'spawning'. Around them, three faint ghost-rings suggest more spheres to come. Soft volumetric glow around each sphere, lens-flare halos. The composition reads instantly as 'add a new node to a network'. Premium futurist editorial, like a diagram in a Nature paper but rendered with cinematic light. NO text, NO labels, NO UI.",
  },

  // 6) STEP 02 — SCHEDULE THE AGENTS. Orbital clockwork rendering.
  {
    slug: "step-02-schedule",
    style: "abstract",
    prompt:
      "Abstract editorial illustration, 4:3 landscape, conceptual mechanical diagram. A deep midnight-indigo (#0f172a) background. Three concentric translucent orbital rings rendered as thin glowing hairlines in warm ember-orange (#ef6c33), each ring at a different tilt. On each ring, a single luminous tick-mark or small node, positioned at different angular positions like the hands of an orrery. Faint motion-trail arcs suggest the rings are slowly rotating. In the dead center, a single tiny incandescent ember-white point of light. The image reads as 'time, orbits, scheduled events'. Looks like a still from a futuristic Hayao-Miyazaki-meets-Kubrick astronomy sequence. NO text, NO clock face, NO numbers, NO UI.",
  },

  // 7) STEP 03 — LIVE IN THE INBOX. One luminous card centered in void.
  {
    slug: "step-03-inbox",
    style: "abstract",
    prompt:
      "Abstract editorial illustration, 4:3 landscape, conceptual minimalist composition. A deep midnight-indigo (#0f172a) background falling away into perfect black at the edges. Centered in the frame, a single luminous floating rectangle — proportions like an index card — rendered in warm cream (#f8f6f1) with a soft outer glow. The card has no contents, no text, just pristine paper-white with the faintest ember-orange (#ef6c33) shadow along its lower edge. Behind the card, the suggestion of dozens more ghost-cards receding into the deep background, blurred and dimmed almost out of existence. The composition feels meditative — 'the inbox is empty because everything else was handled'. Reads like a Wim Wenders frame: quiet, sacred, almost reverent. NO text, NO UI, NO icons.",
  },

  // 8) FOOTER CIRCUIT — dark cinematic backdrop for the legacy-SKU CTA.
  {
    slug: "footer-circuit",
    style: "cinematic",
    prompt:
      "Ultra-wide cinematic hero image, 16:9 landscape, dramatic macro photography. Extreme close-up of a single ember-orange (#ef6c33) glowing filament tracing across a matte-black brushed-graphite circuit-board surface, like a vein of fire moving through obsidian. Volumetric mist or smoke drifts across the foreground. The filament splits into three smaller branching paths near the right edge, each terminating in a tiny incandescent point of light. Background fades to perfect deep ink (#0a0e14). The image evokes the inside of a futurist machine — the soul of a system, breathing. Recalls the macro photography in Apple's M-series chip film, but with editorial warmth. NO text, NO logos, NO labels, NO computer chips that are legibly Apple/Intel/etc.",
  },
];

// ---------- main ---------------------------------------------------------

const stats = {
  smoke: null,
  generated: 0,
  skipped_existing: 0,
  total_bytes: 0,
  failures: [],
};

function logStep(s) {
  console.log(`[landing-images] ${s}`);
}

async function main() {
  const key = process.env.GEMINI_API_KEY || "";
  if (!key) {
    logStep("FATAL: GEMINI_API_KEY not in env after dotenv load");
    process.exit(1);
  }
  logStep(`key loaded: prefix=${key.slice(0, 3)}... length=${key.length}`);

  const gate = await checkBudget("banana");
  logStep(`budget gate: allowed=${gate.allowed} reason=${gate.reason}`);
  if (!gate.allowed) {
    logStep("budget denied — exiting clean");
    await appendWorkLogSection();
    process.exit(0);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  // SMOKE TEST
  logStep("smoke test: tiny call…");
  const smoke = await callGemini({
    prompt: "A single brand-teal circle on warm paper background, minimalist test image",
    style: "minimal",
  });
  if (!smoke.ok) {
    logStep(`SMOKE FAILED: ${smoke.reason} | detail=${smoke.detail || "(none)"}`);
    stats.smoke = { ok: false, reason: smoke.reason, status: smoke.status, detail: smoke.detail };
    await appendWorkLogSection();
    logStep("STOP — auth or API issue. See WORK-LOG.md.");
    process.exit(2);
  }
  logStep(`smoke OK: bytes=${smoke.buffer.length}`);
  stats.smoke = { ok: true, bytes: smoke.buffer.length };
  await recordBudgetUse("banana");

  // The 8 plans
  for (const plan of PLANS) {
    const dest = path.join(OUT_DIR, `${plan.slug}.png`);
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
  lines.push(`## ${isoNow().slice(0, 10)} — Landing-page cinematic images (Gemini)`);
  lines.push("");
  lines.push(`- Smoke test: ${stats.smoke?.ok ? `OK (${stats.smoke.bytes} bytes)` : `FAIL — ${stats.smoke?.reason || "n/a"} ${stats.smoke?.detail ? `(${String(stats.smoke.detail).slice(0, 200)})` : ""}`}`);
  lines.push(`- Generated: ${stats.generated}/${PLANS.length}`);
  lines.push(`- Skipped (already on disk): ${stats.skipped_existing}`);
  lines.push(`- Total bytes written: ${stats.total_bytes}`);
  lines.push(`- Failures: ${stats.failures.length}`);
  for (const f of stats.failures) lines.push(`  - ${f}`);
  lines.push(`- Output dir: public/images/landing/`);
  lines.push("");
  await appendWorkLog(lines.join("\n"));
}

main().catch(async (err) => {
  console.error("FATAL:", err);
  stats.failures.push(`FATAL: ${err.message}`);
  await appendWorkLogSection();
  process.exit(1);
});
