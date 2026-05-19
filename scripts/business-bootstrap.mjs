#!/usr/bin/env node
/**
 * business-bootstrap.mjs
 *
 * THE platform-level orchestrator. Spawns a new business of ANY archetype.
 *
 * For a pod-store: same as new-store-bootstrap.mjs.
 * For a saas / agency / course / newsletter / etc: scaffolds the right stack
 * AND auto-attaches merch (because Day14 default = every business sells merch).
 *
 * USAGE:
 *   node scripts/business-bootstrap.mjs \
 *     --slug "quiet-revolt" \
 *     --display-name "Quiet Revolt" \
 *     --niche "introvert humor for over-stimulated people" \
 *     [--archetype pod-store]   (defaults to pod-store)
 *     [--skip-merch]            (skip default merch attachment)
 *     [--skip-research]         (skip competitor research step)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { addTodo } from "./_generic/operator-todos.mjs";

const HOME = homedir();
const STUDIO = path.join(HOME, "Documents/studio");
const SCRIPTS = path.join(STUDIO, "scripts");
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const ARCHETYPES_FILE = path.join(SHARED, "business-archetypes.json");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const SHARED_OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(STUDIO, ".env.local");

function args() {
  const a = process.argv.slice(2);
  const o = { archetype: "pod-store", skip_merch: false, skip_research: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--slug") o.slug = a[++i];
    else if (a[i] === "--display-name") o.display_name = a[++i];
    else if (a[i] === "--niche") o.niche = a[++i];
    else if (a[i] === "--archetype") o.archetype = a[++i];
    else if (a[i] === "--skip-merch") o.skip_merch = true;
    else if (a[i] === "--skip-research") o.skip_research = true;
    else if (a[i] === "--product-type") o.product_type = a[++i];
  }
  if (!o.slug || !o.display_name || !o.niche) {
    console.error("Usage: business-bootstrap.mjs --slug X --display-name X --niche X [--archetype pod-store|saas|course|newsletter|...]");
    process.exit(1);
  }
  return o;
}

async function loadEnv() {
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function loadArchetypes() {
  if (!existsSync(ARCHETYPES_FILE)) throw new Error(`missing ${ARCHETYPES_FILE}`);
  return JSON.parse(await fs.readFile(ARCHETYPES_FILE, "utf8"));
}

/**
 * Create a MailerLite group for this tenant so signups from the brand site
 * route to a dedicated list instead of the empire-wide default.
 */
async function createMailerLiteGroup(env, displayName) {
  if (!env.MAILERLITE_API_KEY) return null;
  try {
    const res = await fetch("https://connect.mailerlite.com/api/groups", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.MAILERLITE_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ name: displayName }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.id || null;
  } catch { return null; }
}

function runStep(label, cmd, args) {
  console.log(`\n━━━ ${label} ━━━`);
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: STUDIO });
  if (r.status !== 0) {
    console.warn(`  ! ${label} returned status ${r.status} — continuing`);
    return false;
  }
  return true;
}

async function registerTenant(slug, display_name, archetype, niche) {
  let data = { tenants: [], tenant_types: {} };
  if (existsSync(TENANTS_FILE)) data = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8"));
  if (data.tenants.some((t) => t.slug === slug)) return;
  data.tenants.push({
    slug,
    display_name,
    type: archetype,
    domain: null,
    tagline: niche,
    stage: "launching",
    channels: [],
    notes: `Bootstrapped via business-bootstrap.mjs on ${new Date().toISOString()}`,
  });
  await fs.writeFile(TENANTS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Hand off everything the agents can't finish themselves to Jack's
 * operator to-do list (rendered on the day14.us/admin empire homescreen).
 * Returns the number of items queued.
 */
async function queueOperatorTodos(a, archetype, results) {
  const steps = [
    {
      title: `Review & approve ${a.display_name} brand identity`,
      detail: `Open ~/Documents/businesses/${a.slug}/brand-identity.json and confirm the name, voice, palette, and tagline before the agents run with it.`,
      category: "review",
      priority: "high",
    },
  ];
  const sellsMerch =
    a.archetype === "pod-store" || (!a.skip_merch && archetype.merch_attached);
  if (sellsMerch) {
    steps.push({
      title: `Publish ${a.display_name} product drafts`,
      detail: `Agents created product drafts for ${a.display_name}. Open Printify, review them, and publish to the storefront so they go live.`,
      category: "publish",
      priority: "high",
    });
  }
  steps.push({
    title: `Point a domain at ${a.display_name} (optional)`,
    detail: `Brand site is live at day14.us/brands/${a.slug}. To use a custom domain, add it via Cloudflare + Vercel.`,
    category: "domain",
    priority: "low",
  });
  for (const r of results) {
    if (!r.ok) {
      steps.push({
        title: `Re-run failed bootstrap step: ${r.label} (${a.display_name})`,
        detail: `The auto-bootstrap step "${r.label}" returned a non-zero status. Re-run it or check the logs.`,
        category: "fix",
        priority: "medium",
      });
    }
  }
  let added = 0;
  for (const s of steps) {
    try {
      await addTodo({ tenant: a.slug, source: "business-bootstrap", ...s });
      added++;
    } catch (e) {
      console.warn(`  ! could not queue to-do "${s.title}": ${e.message}`);
    }
  }
  console.log(`\n  ✓ ${added} item(s) added to your operator to-do list`);
  return added;
}

async function celebrate(env, args, archetype, results, todoCount = 0) {
  if (!env.TELEGRAM_CHAT_ID) return;
  await fs.mkdir(SHARED_OUTBOX, { recursive: true });
  const lines = [
    `🚀 *New business launched: ${args.display_name}*`,
    ``,
    `Archetype: ${archetype.display_name}`,
    `Niche: ${args.niche}`,
    `Slug: \`${args.slug}\``,
    ``,
    `Steps completed:`,
    ...results.map((r) => `  ${r.ok ? "✓" : "✗"} ${r.label}`),
    ``,
    `📋 ${todoCount} item(s) added to your to-do list — see day14.us/admin`,
    ``,
    `Brand site: day14.us/brands/${args.slug}`,
    `Constitution: ~/Documents/businesses/${args.slug}/CONSTITUTION.md`,
    `Brand identity: ~/Documents/businesses/${args.slug}/brand-identity.json`,
  ];
  await fs.writeFile(
    path.join(SHARED_OUTBOX, `${Date.now()}-business-bootstrap-${args.slug}.json`),
    JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: lines.join("\n"),
      parse_mode: "Markdown",
      urgency: "P2",
      queued_at: new Date().toISOString(),
      sent_at: null,
      tenant: args.slug,
    }, null, 2)
  );
}

async function main() {
  const a = args();
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

  const archetypes = await loadArchetypes();
  const archetype = archetypes.archetypes[a.archetype];
  if (!archetype) {
    console.error(`Unknown archetype "${a.archetype}". Available: ${Object.keys(archetypes.archetypes).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  Day14 Business Bootstrap                            ║`);
  console.log(`║                                                      ║`);
  console.log(`║  ${a.display_name.padEnd(50)}║`);
  console.log(`║  Archetype: ${archetype.display_name.padEnd(40)} ║`);
  console.log(`║  Niche: ${a.niche.slice(0, 44).padEnd(44)} ║`);
  console.log(`╚══════════════════════════════════════════════════════╝`);

  const tenantDir = path.join(BIZ, a.slug);
  if (existsSync(tenantDir)) {
    console.error(`\nTenant "${a.slug}" already exists at ${tenantDir} — aborting`);
    process.exit(1);
  }
  await fs.mkdir(tenantDir, { recursive: true });
  await registerTenant(a.slug, a.display_name, a.archetype, a.niche);

  // Create MailerLite group (best-effort; non-blocking)
  const mlGroupId = await createMailerLiteGroup(env, a.display_name);
  if (mlGroupId) {
    await fs.writeFile(path.join(tenantDir, "mailerlite-group.json"), JSON.stringify({ group_id: mlGroupId, name: a.display_name, created_at: new Date().toISOString() }, null, 2));
    console.log(`  ✓ MailerLite group created: ${mlGroupId}`);
  }

  const results = [];

  // 1. Brand identity (always)
  const r1 = runStep("STEP 1: Brand identity", "node", [
    path.join(SCRIPTS, "brand-identity-generator.mjs"),
    "--slug", a.slug,
    "--display-name", a.display_name,
    "--niche", a.niche,
  ]);
  results.push({ label: "Brand identity", ok: r1 });

  // 2. Competitor research (optional)
  if (!a.skip_research) {
    const r2 = runStep("STEP 2: Competitor research", "node", [
      path.join(SCRIPTS, "competitor-researcher.mjs"),
      "--slug", a.slug,
      "--niche", a.niche,
      "--archetype", a.archetype,
    ]);
    results.push({ label: "Competitor research", ok: r2 });
  }

  // 3. Archetype-specific bootstrap
  // For pod-store: full product launch via new-store-bootstrap
  // For others: stub the constitution + brand site, mark for human review
  if (a.archetype === "pod-store") {
    const r3 = runStep("STEP 3: POD store bootstrap (10 products + agents)", "node", [
      path.join(SCRIPTS, "new-store-bootstrap.mjs"),
      "--slug", a.slug,
      "--display-name", a.display_name,
      "--niche", a.niche,
      "--product-type", a.product_type || archetype.default_product_type || "mug",
    ]);
    results.push({ label: "POD store bootstrap", ok: r3 });
  } else {
    // For non-pod archetypes: scaffold a constitution + brand site stub
    console.log(`\n━━━ STEP 3: Constitution + site scaffold for ${archetype.display_name} ━━━`);
    // The new-store-bootstrap generates constitution + site already. Call it with --skip-products.
    const r3 = runStep(`STEP 3: ${archetype.display_name} scaffold`, "node", [
      path.join(SCRIPTS, "new-store-bootstrap.mjs"),
      "--slug", a.slug,
      "--display-name", a.display_name,
      "--niche", a.niche,
      "--skip-products",
    ]);
    results.push({ label: `${archetype.display_name} scaffold`, ok: r3 });
  }

  // 4. Merch attachment (DEFAULT for every archetype unless --skip-merch)
  if (!a.skip_merch && archetype.merch_attached && a.archetype !== "pod-store") {
    const r4 = runStep("STEP 4: Merch attachment (5 brand-aligned products)", "node", [
      path.join(SCRIPTS, "merch-attacher.mjs"),
      "--slug", a.slug,
      "--count", "5",
      "--product-type", "mug",
    ]);
    results.push({ label: "Merch (5 mug drafts)", ok: r4 });
  }

  // Everything the agents can't do themselves -> Jack's operator to-do list.
  const todoCount = await queueOperatorTodos(a, archetype, results);

  await celebrate(env, a, archetype, results, todoCount);

  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  ${a.display_name} launched.                          `);
  console.log(`║  ${results.filter((r) => r.ok).length}/${results.length} steps succeeded`);
  console.log(`╚══════════════════════════════════════════════════════╝`);
  console.log(`\nNext: tap publish on Printify drafts, customize brand-identity.json,`);
  console.log(`then push studio repo to deploy day14.us/brands/${a.slug}`);
}

main().catch((err) => { console.error("\nFATAL:", err.message); process.exit(1); });
