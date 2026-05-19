#!/usr/bin/env node
/**
 * pinterest-pin-generator.mjs <tenant-slug>
 *
 * Pinterest is THE traffic driver for older female demos (menopause, wellness,
 * home, craft, food). Generates 3 vertical pin images (1000x1500) per run with:
 *   - Brand-aligned visual + title overlay (rendered into the image via Pollinations)
 *   - Pin title (50-100 chars, SEO-rich)
 *   - Pin description (200-500 chars, keyword-dense)
 *
 * Saves to ~/Documents/businesses/<tenant>/pinterest-pins/<date>/
 * Telegram-pings Jack with paths + ready-to-post text.
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  tenantSlug, loadEnv, loadTenant, audit, callGemini, parseJson, callPollinations, queueTelegram, BIZ,
} from "./_lib.mjs";

const PINS_PER_RUN = 3;

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

  const ctx = await loadTenant(slug);
  if (!ctx.constitution) throw new Error(`No CONSTITUTION.md for ${slug}`);

  console.log(`→ Generating ${PINS_PER_RUN} Pinterest pins for ${ctx.display_name}`);

  // 1. Generate pin concepts via Gemini
  const conceptsPrompt = `You are designing Pinterest pins for "${ctx.display_name}" (${ctx.niche}).

CONSTITUTION:
${ctx.constitution.slice(0, 3000)}

${ctx.identity ? `BRAND IDENTITY:\n${JSON.stringify(ctx.identity, null, 2).slice(0, 1500)}` : ""}

Pinterest demographic for this brand skews 35-55 female. Top-performing pin formula:
- BIG bold text on top half (curiosity hook)
- Visual / product / illustration on bottom half
- Title + description loaded with searchable keywords

Generate ${PINS_PER_RUN} pin concepts. Return STRICT JSON array:
[
  {
    "slug": "kebab-case-3-words",
    "hook_text": "BIG hook text that goes on the pin itself (max 8 words, all caps friendly)",
    "visual_direction": "what's visually below the text (1 sentence)",
    "title": "Pinterest SEO title (50-100 chars, keyword-rich)",
    "description": "Pinterest description (200-400 chars, keyword-dense, natural)"
  },
  ... ${PINS_PER_RUN} entries
]`;

  const concepts = parseJson(await callGemini(conceptsPrompt, env, { temp: 0.85 }));

  // 2. Generate pin images
  const date = new Date().toISOString().slice(0, 10);
  const pinsDir = path.join(BIZ, slug, "pinterest-pins", date);
  await fs.mkdir(pinsDir, { recursive: true });

  const results = [];
  for (let i = 0; i < concepts.length; i++) {
    const c = concepts[i];
    process.stdout.write(`[${i + 1}/${concepts.length}] ${c.slug.padEnd(30)} `);
    try {
      const imgPrompt = `Vertical Pinterest pin design, 2:3 aspect ratio. Top half: large bold typography reading exactly "${c.hook_text}". Bottom half: ${c.visual_direction}. Clean print-ready layout. Brand-appropriate for: ${ctx.niche}. No watermarks, no logos.`;
      const buf = await callPollinations(imgPrompt, { width: 1000, height: 1500, seed: 3000 + i });
      const imgPath = path.join(pinsDir, `${c.slug}.png`);
      await fs.writeFile(imgPath, buf);

      const copyPath = path.join(pinsDir, `${c.slug}.txt`);
      await fs.writeFile(
        copyPath,
        `TITLE:\n${c.title}\n\nDESCRIPTION:\n${c.description}\n\nIMAGE: ${imgPath}\n`
      );

      results.push({ ok: true, ...c, imgPath, copyPath });
      console.log("✓");
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 80)}`);
      results.push({ ok: false, ...c, error: err.message });
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 3. Telegram
  const ok = results.filter((r) => r.ok);
  const text =
    `📌 *${ok.length} Pinterest pins ready — ${ctx.display_name}*\n\n` +
    ok.slice(0, 3).map((r) => `• _"${r.hook_text}"_\n  ${r.title.slice(0, 60)}`).join("\n\n") +
    `\n\nFolder: \`open ${pinsDir}\``;
  await queueTelegram(env, slug, text);

  await audit(slug, { actor: "pinterest-pin-generator", action: "pins_generated", count: ok.length, folder: pinsDir });
  console.log(`\n✓ ${ok.length}/${results.length} pins generated → ${pinsDir}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
