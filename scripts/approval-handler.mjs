#!/usr/bin/env node
/**
 * approval-handler.mjs
 *
 * Detects approval-pattern replies in Telegram inbox and executes them.
 * Patterns:
 *   - "approve <skill-name>"  → move draft from docs/seeds/skills/_drafts/<name>/ to docs/seeds/skills/<name>/
 *   - "skip <name>"           → delete draft
 *   - "publish <slug>"        → mark Printify product visible (across active tenants)
 *   - "publish all <tenant>"  → mark ALL drafts visible for that tenant
 *   - "bootstrap now"         → process oldest queued new-business request
 *
 * Called by bot-brain when intent indicates approval/skip/publish.
 *
 * Used as a library + as CLI for testing.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { homedir } from "node:os";

const HOME = homedir();
const STUDIO = path.join(HOME, "Documents/studio");
const SCRIPTS = path.join(STUDIO, "scripts");
const SKILLS_DIR = path.join(STUDIO, "docs/seeds/skills");
const SKILLS_DRAFTS = path.join(SKILLS_DIR, "_drafts");
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const EXPANSION_INBOX = path.join(SHARED, "expansion-requests");
const ENV_FILE = path.join(STUDIO, ".env.local");
const PRINTIFY_API = "https://api.printify.com/v1";

async function loadEnv() {
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

export async function detectPattern(text) {
  const t = text.trim().toLowerCase();

  const approveMatch = t.match(/^approve\s+([a-z][a-z0-9-]+)\s*$/);
  if (approveMatch) return { action: "approve-skill", name: approveMatch[1] };

  const approvePostMatch = t.match(/^approve\s+post\s+([a-z0-9][a-z0-9-]+(?:-[a-z][a-z0-9_]+)?-[a-z0-9-]+)\s*$/);
  if (approvePostMatch) return { action: "approve-post", id: approvePostMatch[1] };

  if (t === "approve all") return { action: "approve-all-posts" };
  if (t === "approve all posts") return { action: "approve-all-posts" };

  const skipMatch = t.match(/^skip\s+([a-z][a-z0-9-]+)\s*$/);
  if (skipMatch) return { action: "skip-skill", name: skipMatch[1] };

  const pubAllMatch = t.match(/^publish\s+all\s+([a-z][a-z0-9-]+)\s*$/);
  if (pubAllMatch) return { action: "publish-all", tenant: pubAllMatch[1] };

  const pubMatch = t.match(/^publish\s+([0-9a-f]{8,})\s*$/i);
  if (pubMatch) return { action: "publish-product", productId: pubMatch[1] };

  const pubSlugMatch = t.match(/^publish\s+([a-z][a-z0-9-]+)\s*$/);
  if (pubSlugMatch) return { action: "publish-slug", slug: pubSlugMatch[1] };

  if (t === "bootstrap now") return { action: "bootstrap-now" };

  const bootstrapPitchMatch = t.match(/^bootstrap-pitch\s+([a-z0-9][a-z0-9-]+)\s*$/);
  if (bootstrapPitchMatch) return { action: "bootstrap-pitch", id: bootstrapPitchMatch[1] };

  const skipPitchMatch = t.match(/^skip-pitch\s+([a-z0-9][a-z0-9-]+)\s*$/);
  if (skipPitchMatch) return { action: "skip-pitch", id: skipPitchMatch[1] };

  const showPitchMatch = t.match(/^show\s+pitch\s+([a-z0-9][a-z0-9-]+)\s*$/);
  if (showPitchMatch) return { action: "show-pitch", id: showPitchMatch[1] };

  const autoModeMatch = t.match(/^(enable|disable)\s+auto\s+([a-z_]+)\s+([a-z][a-z0-9-]+)\s*$/);
  if (autoModeMatch) return { action: "set-auto-mode", verb: autoModeMatch[1], platform: autoModeMatch[2], tenant: autoModeMatch[3] };

  return { action: null };
}

export async function approveSkill(name) {
  const draftDir = path.join(SKILLS_DRAFTS, name);
  if (!existsSync(draftDir)) return { ok: false, reason: `no draft found: ${name}` };
  const liveDir = path.join(SKILLS_DIR, name);
  if (existsSync(liveDir)) return { ok: false, reason: `skill already live: ${name}` };
  await fs.rename(draftDir, liveDir);
  // Regenerate registry
  try {
    execSync("node scripts/generate-skill-registry.mjs", { cwd: STUDIO, stdio: "pipe" });
  } catch (e) {
    return { ok: true, reason: `moved but registry regen failed: ${e.message.slice(0, 100)}` };
  }
  return { ok: true, reason: `${name} now live + registry regenerated` };
}

export async function skipSkill(name) {
  const draftDir = path.join(SKILLS_DRAFTS, name);
  if (!existsSync(draftDir)) return { ok: false, reason: `no draft: ${name}` };
  await fs.rm(draftDir, { recursive: true, force: true });
  return { ok: true, reason: `draft ${name} trashed` };
}

export async function publishPrintifyProduct(productId, env) {
  if (!env.PRINTIFY_API_KEY) return { ok: false, reason: "no PRINTIFY_API_KEY" };
  // Get shop
  const shopsRes = await fetch(`${PRINTIFY_API}/shops.json`, {
    headers: { Authorization: `Bearer ${env.PRINTIFY_API_KEY}` },
  });
  const shops = await shopsRes.json();
  if (!shops.length) return { ok: false, reason: "no shops" };
  const shopId = shops[0].id;
  // Publish
  const res = await fetch(`${PRINTIFY_API}/shops/${shopId}/products/${productId}/publish.json`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.PRINTIFY_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title: true, description: true, images: true, variants: true, tags: true }),
  });
  if (!res.ok) return { ok: false, reason: `publish ${res.status}: ${(await res.text()).slice(0, 100)}` };
  return { ok: true, reason: `${productId} published` };
}

export async function publishAllForTenant(tenant, env) {
  if (!env.PRINTIFY_API_KEY) return { ok: false, reason: "no PRINTIFY_API_KEY" };
  // Read manifest if exists
  const manifestPath = path.join(HOME, "Documents/businesses", tenant, "launch-manifest.json");
  let productIds = [];
  if (existsSync(manifestPath)) {
    const m = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    productIds = (m.results || []).filter((r) => r.ok).map((r) => r.productId);
  }
  if (productIds.length === 0) {
    // Fall back: list all products for shop and publish drafts
    const shopsRes = await fetch(`${PRINTIFY_API}/shops.json`, {
      headers: { Authorization: `Bearer ${env.PRINTIFY_API_KEY}` },
    });
    const shops = await shopsRes.json();
    if (!shops.length) return { ok: false, reason: "no shops" };
    const productsRes = await fetch(`${PRINTIFY_API}/shops/${shops[0].id}/products.json?limit=50`, {
      headers: { Authorization: `Bearer ${env.PRINTIFY_API_KEY}` },
    });
    const data = await productsRes.json();
    productIds = (data.data || []).filter((p) => p.visible === false).map((p) => p.id);
  }
  if (productIds.length === 0) return { ok: false, reason: "no drafts to publish" };

  const results = [];
  for (const id of productIds) {
    const r = await publishPrintifyProduct(id, env);
    results.push({ id, ...r });
    await new Promise((r) => setTimeout(r, 800));
  }
  const ok = results.filter((r) => r.ok).length;
  return { ok: true, reason: `${ok}/${results.length} published for ${tenant}` };
}

export async function bootstrapNow() {
  if (!existsSync(EXPANSION_INBOX)) return { ok: false, reason: "no expansion inbox" };
  const files = (await fs.readdir(EXPANSION_INBOX)).filter((f) => f.endsWith(".json")).sort();
  for (const f of files) {
    const filePath = path.join(EXPANSION_INBOX, f);
    let req;
    try { req = JSON.parse(await fs.readFile(filePath, "utf8")); } catch { continue; }
    if (req.type !== "new-business" || req.status !== "pending") continue;

    const ex = req.extracted || {};
    const slug = ex.slug || (ex.niche || "new").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
    const displayName = ex.display_name || (ex.niche || "New Business").replace(/\b\w/g, (c) => c.toUpperCase());
    const niche = ex.niche || "TBD";
    const archetype = ex.archetype || "pod-store";

    const args = [
      path.join(SCRIPTS, "business-bootstrap.mjs"),
      "--slug", slug,
      "--display-name", displayName,
      "--niche", niche,
      "--archetype", archetype,
    ];
    const child = spawn("node", args, { detached: true, stdio: "ignore" });
    child.unref();

    req.status = "bootstrapping";
    req.spawned_at = new Date().toISOString();
    req.spawned_args = args;
    await fs.writeFile(filePath, JSON.stringify(req, null, 2));
    return { ok: true, reason: `bootstrapping ${slug} (${archetype}): ${niche}` };
  }
  return { ok: false, reason: "no pending business requests" };
}

async function approvePost(postId) {
  // Find the matching state file across all tenants
  const tenantsRoot = path.join(HOME, "Documents/businesses");
  const tenants = (await fs.readdir(tenantsRoot, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
    .map((d) => d.name);
  for (const t of tenants) {
    const queueRoot = path.join(tenantsRoot, t, "social-queue");
    if (!existsSync(queueRoot)) continue;
    const platforms = await fs.readdir(queueRoot);
    for (const p of platforms) {
      const platformDir = path.join(queueRoot, p);
      const files = (await fs.readdir(platformDir).catch(() => [])).filter((f) => f.endsWith(".json"));
      for (const f of files) {
        try {
          const data = JSON.parse(await fs.readFile(path.join(platformDir, f), "utf8"));
          if (data.id === postId || data.content?.slug === postId) {
            data.status = "approved";
            data.approved_at = new Date().toISOString();
            data.approved_by = "jack-telegram";
            await fs.writeFile(path.join(platformDir, f), JSON.stringify(data, null, 2));
            return { ok: true, reason: `approved ${data.platform}/${data.content?.slug} — publisher will pick it up` };
          }
        } catch {}
      }
    }
  }
  return { ok: false, reason: `no queued post matching: ${postId}` };
}

async function approveAllPosts() {
  const tenantsRoot = path.join(HOME, "Documents/businesses");
  const tenants = (await fs.readdir(tenantsRoot, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
    .map((d) => d.name);
  let approved = 0;
  for (const t of tenants) {
    const queueRoot = path.join(tenantsRoot, t, "social-queue");
    if (!existsSync(queueRoot)) continue;
    for (const p of await fs.readdir(queueRoot)) {
      const platformDir = path.join(queueRoot, p);
      const files = (await fs.readdir(platformDir).catch(() => [])).filter((f) => f.endsWith(".json"));
      for (const f of files) {
        try {
          const data = JSON.parse(await fs.readFile(path.join(platformDir, f), "utf8"));
          if (data.status === "queued") {
            data.status = "approved";
            data.approved_at = new Date().toISOString();
            data.approved_by = "jack-telegram-bulk";
            await fs.writeFile(path.join(platformDir, f), JSON.stringify(data, null, 2));
            approved += 1;
          }
        } catch {}
      }
    }
  }
  return { ok: true, reason: `${approved} posts approved — publishers will pick up on next run` };
}

async function bootstrapPitch(id) {
  const oppFile = path.join(HOME, "Documents/businesses/_shared/opportunities", `${id}.json`);
  if (!existsSync(oppFile)) return { ok: false, reason: `opportunity not found: ${id}` };
  const opp = JSON.parse(await fs.readFile(oppFile, "utf8"));
  const slug = id.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
  const displayName = (opp.niche || id).split(" ").slice(0, 5).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
  const archetype = opp.suggested_archetype || "pod-store";
  const child = spawn("node", [
    path.join(SCRIPTS, "business-bootstrap.mjs"),
    "--slug", slug,
    "--display-name", displayName,
    "--niche", opp.niche || "TBD",
    "--archetype", archetype,
  ], { detached: true, stdio: "ignore" });
  child.unref();
  opp.status = "launching";
  opp.launched_at = new Date().toISOString();
  opp.launched_slug = slug;
  await fs.writeFile(oppFile, JSON.stringify(opp, null, 2));
  return { ok: true, reason: `bootstrapping ${slug} (${archetype}): ${opp.niche}` };
}

async function skipPitch(id) {
  const oppFile = path.join(HOME, "Documents/businesses/_shared/opportunities", `${id}.json`);
  if (!existsSync(oppFile)) return { ok: false, reason: `opportunity not found: ${id}` };
  const opp = JSON.parse(await fs.readFile(oppFile, "utf8"));
  opp.status = "skipped";
  opp.skipped_at = new Date().toISOString();
  await fs.writeFile(oppFile, JSON.stringify(opp, null, 2));
  return { ok: true, reason: `${id} retired` };
}

async function showPitch(id) {
  const pitchPath = path.join(HOME, "Documents/businesses/_shared/pitches", `${id}.md`);
  if (!existsSync(pitchPath)) return { ok: false, reason: `pitch not found: ${id}` };
  const text = await fs.readFile(pitchPath, "utf8");
  // Return first ~1500 chars so Telegram message fits
  return { ok: true, reason: text.slice(0, 1800) };
}

export async function handle(text) {
  const pattern = await detectPattern(text);
  if (!pattern.action) return null;
  const env = await loadEnv();

  switch (pattern.action) {
    case "approve-skill":      return await approveSkill(pattern.name);
    case "approve-post":       return await approvePost(pattern.id);
    case "approve-all-posts":  return await approveAllPosts();
    case "skip-skill":         return await skipSkill(pattern.name);
    case "publish-product":    return await publishPrintifyProduct(pattern.productId, env);
    case "publish-all":        return await publishAllForTenant(pattern.tenant, env);
    case "publish-slug":       return { ok: false, reason: `slug→productId lookup TBD: ${pattern.slug}` };
    case "bootstrap-now":      return await bootstrapNow();
    case "bootstrap-pitch":    return await bootstrapPitch(pattern.id);
    case "skip-pitch":         return await skipPitch(pattern.id);
    case "show-pitch":         return await showPitch(pattern.id);
    case "set-auto-mode":      return await setAutoMode(pattern.tenant, pattern.platform, pattern.verb);
  }
  return null;
}

async function setAutoMode(tenant, platform, verb) {
  try {
    const { setMode } = await import(path.join(SCRIPTS, "_generic/auto-post-config.mjs"));
    const mode = verb === "enable" ? "auto" : "review";
    await setMode(tenant, platform, mode);
    return { ok: true, reason: `${tenant}/${platform} = ${mode}` };
  } catch (e) { return { ok: false, reason: e.message }; }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const text = process.argv.slice(2).join(" ");
  const result = await handle(text);
  console.log(result ? JSON.stringify(result, null, 2) : "no pattern matched");
}
