#!/usr/bin/env node
/**
 * hot-flash-co-marketing-engine.mjs
 *
 * Daily marketing draft engine for Hot Flash Co.
 *
 * Each run:
 *   1. Pulls top-N most recent published products from Printify
 *   2. Picks ONE focus product (rotates daily)
 *   3. Generates 3 social drafts:
 *      - Pinterest pin caption + title (best org traffic for menopause demo)
 *      - TikTok script (15-30s hook + reveal)
 *      - Instagram carousel concept (3-slide story)
 *   4. Queues Telegram Jack-tap card with all 3 drafts
 *
 * Jack copies + posts. Voice strictly per CONSTITUTION.md.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const TENANT = "hot-flash-co";
const TENANT_DIR = path.join(HOME, "Documents/businesses", TENANT);
const CONSTITUTION = path.join(TENANT_DIR, "CONSTITUTION.md");
const AUDIT_LOG = path.join(TENANT_DIR, "audit-log.jsonl");
const STATE_FILE = path.join(TENANT_DIR, "marketing-state.json");
const DRAFTS_DIR = path.join(TENANT_DIR, "marketing-drafts");
const SHARED_OUTBOX = path.join(HOME, "Documents/businesses/_shared/telegram/outbox");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

const PRINTIFY_API = "https://api.printify.com/v1";
const GEMINI_MODEL = "gemini-2.5-flash";

async function loadEnv() {
  const text = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function audit(record) {
  const line = JSON.stringify({ ts: new Date().toISOString(), tenant: TENANT, ...record }) + "\n";
  await fs.mkdir(TENANT_DIR, { recursive: true });
  await fs.appendFile(AUDIT_LOG, line);
}

async function loadState() {
  if (!existsSync(STATE_FILE)) return { last_focus_product_ids: [] };
  return JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
}

async function saveState(s) {
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2));
}

async function getShopId(printifyKey) {
  const res = await fetch(`${PRINTIFY_API}/shops.json`, {
    headers: { Authorization: `Bearer ${printifyKey}` },
  });
  if (!res.ok) throw new Error(`shops ${res.status}`);
  const shops = await res.json();
  if (!shops.length) throw new Error("no shops");
  return shops[0].id;
}

async function listProducts(printifyKey, shopId) {
  const res = await fetch(`${PRINTIFY_API}/shops/${shopId}/products.json?limit=20&page=1`, {
    headers: { Authorization: `Bearer ${printifyKey}` },
  });
  if (!res.ok) throw new Error(`products ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.data || []).filter((p) => p.visible !== false); // skip hidden/draft-only
}

async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function generateDrafts(env, product) {
  const constitution = await fs.readFile(CONSTITUTION, "utf8");
  const productTitle = product.title || "Hot Flash Co mug";
  const productDescription = product.description || "";

  const prompt = `You are drafting social media content for Hot Flash Co. Read the constitution. Match the voice EXACTLY. No emojis on copy unless the platform's culture demands it. No exclamation points unless ironic.

CONSTITUTION:
${constitution.slice(0, 3000)}

FOCUS PRODUCT:
Title: ${productTitle}
Description: ${productDescription.slice(0, 400)}

TASK — draft three pieces of content, each promoting this product:

1. **PINTEREST PIN** (#1 traffic driver for menopause demographic)
   - Title: 50-80 chars, SEO-rich, very searchable
   - Description: 200-400 chars, hook + value + searchable keywords

2. **TIKTOK SCRIPT** (15-30s)
   - Voiceover script: 35-55 words, conversational, lands punchline at end
   - Visual cue: one sentence describing what's on screen
   - First-line hook: must stop scroll in 2 seconds

3. **INSTAGRAM CAROUSEL** (3 slides)
   - Slide 1 text: hook (max 8 words)
   - Slide 2 text: setup (max 20 words)
   - Slide 3 text: punchline + soft product mention (max 20 words)
   - Caption: 80-150 words, story-led, no link-in-bio reminder

Return STRICT JSON only:
{
  "pinterest": { "title": "...", "description": "..." },
  "tiktok": { "hook": "...", "script": "...", "visual": "..." },
  "instagram": { "slide1": "...", "slide2": "...", "slide3": "...", "caption": "..." }
}`;

  const raw = await callGemini(prompt, env.GEMINI_API_KEY);
  const json = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const start = json.indexOf("{");
  const end = json.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`could not parse JSON: ${raw.slice(0, 200)}`);
  return JSON.parse(json.slice(start, end + 1));
}

async function queueJackTap(env, product, drafts, draftPath) {
  if (!env.TELEGRAM_CHAT_ID) return;
  await fs.mkdir(SHARED_OUTBOX, { recursive: true });
  const text =
    `📣 *Hot Flash Co marketing drafts ready*\n\n` +
    `Product: ${product.title.slice(0, 60)}\n\n` +
    `*Pinterest title:*\n${drafts.pinterest.title}\n\n` +
    `*TikTok hook:*\n_"${drafts.tiktok.hook}"_\n\n` +
    `*IG slide 1:*\n${drafts.instagram.slide1}\n\n` +
    `Full drafts: \`${draftPath}\`\n\n` +
    `Reply *post pinterest*, *post tiktok*, or *post ig* to confirm posted.`;
  await fs.writeFile(
    path.join(SHARED_OUTBOX, `${Date.now()}-hot-flash-marketing.json`),
    JSON.stringify(
      {
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
        urgency: "P3",
        queued_at: new Date().toISOString(),
        sent_at: null,
        tap_required: true,
        tenant: TENANT,
      },
      null,
      2
    )
  );
}

async function main() {
  console.log("=== Hot Flash Co marketing engine ===");
  await fs.mkdir(DRAFTS_DIR, { recursive: true });

  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  if (!env.PRINTIFY_API_KEY) throw new Error("PRINTIFY_API_KEY missing");

  const state = await loadState();
  const shopId = await getShopId(env.PRINTIFY_API_KEY);
  const products = await listProducts(env.PRINTIFY_API_KEY, shopId);
  if (!products.length) {
    console.log("no products yet — skipping");
    return;
  }

  // Pick one NOT in last 5 focus rotations
  const recent = new Set((state.last_focus_product_ids || []).slice(-5));
  const candidates = products.filter((p) => !recent.has(p.id));
  const focus = (candidates.length ? candidates : products)[
    Math.floor(Math.random() * (candidates.length ? candidates.length : products.length))
  ];

  console.log(`→ Focus product: ${focus.title}`);
  console.log("→ Generating 3 drafts...");
  const drafts = await generateDrafts(env, focus);

  // Save drafts to markdown
  const slug = focus.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const draftPath = path.join(DRAFTS_DIR, `${new Date().toISOString().slice(0, 10)}-${slug}.md`);
  const lines = [
    `# Marketing drafts — ${focus.title}`,
    ``,
    `*Generated ${new Date().toISOString()}*`,
    ``,
    `**Product**: ${focus.title}`,
    `**Product ID**: ${focus.id}`,
    `**Storefront URL**: https://printify.com/app/products/${focus.id}`,
    ``,
    `---`,
    ``,
    `## Pinterest`,
    ``,
    `**Title**: ${drafts.pinterest.title}`,
    ``,
    `**Description**:`,
    ``,
    drafts.pinterest.description,
    ``,
    `---`,
    ``,
    `## TikTok`,
    ``,
    `**Hook**: ${drafts.tiktok.hook}`,
    ``,
    `**Script**:`,
    ``,
    drafts.tiktok.script,
    ``,
    `**Visual**: ${drafts.tiktok.visual}`,
    ``,
    `---`,
    ``,
    `## Instagram Carousel`,
    ``,
    `**Slide 1**: ${drafts.instagram.slide1}`,
    `**Slide 2**: ${drafts.instagram.slide2}`,
    `**Slide 3**: ${drafts.instagram.slide3}`,
    ``,
    `**Caption**:`,
    ``,
    drafts.instagram.caption,
  ];
  await fs.writeFile(draftPath, lines.join("\n"));
  console.log(`  saved ${draftPath}`);

  await queueJackTap(env, focus, drafts, draftPath);

  state.last_focus_product_ids = [...(state.last_focus_product_ids || []), focus.id].slice(-20);
  await saveState(state);
  await audit({
    actor: "marketing-engine",
    action: "drafts_generated",
    product_id: focus.id,
    product_title: focus.title,
    draft_path: draftPath,
  });
  console.log("\n✓ Jack-tap queued.");
}

main().catch(async (err) => {
  await audit({ actor: "marketing-engine", action: "fatal_error", error: err.message }).catch(() => {});
  console.error("FATAL:", err.message);
  process.exit(1);
});
