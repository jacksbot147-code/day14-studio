#!/usr/bin/env node
/**
 * brand-site-sweep.mjs <tenant-slug> [--rebuild]
 *
 * Full operational-readiness QA pass on a tenant's brand site — the same
 * kind of sweep done by hand on day14.us, but automated and repeatable.
 *
 * It will:
 *   1. Confirm the tenant's prerequisites (CONSTITUTION.md, brand identity).
 *   2. Ensure the full multi-page site exists — build it if missing
 *      (or always, with --rebuild).
 *   3. Audit every expected route file + the shared brand-data lib.
 *   4. Check content depth (published blog posts).
 *   5. Register the tenant in the public /brands manifest.
 *   6. File anything it can't fix itself to the operator to-do list.
 *   7. Write a sweep report + send a Telegram summary.
 *
 * Exit code is always 0 (a sweep reports problems, it doesn't fail the run).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tenantSlug, loadEnv, audit, queueTelegram, HOME, BIZ, TENANTS_FILE } from "./_lib.mjs";
import { addTodo } from "./operator-todos.mjs";

const STUDIO = path.join(HOME, "Documents/studio");
const SITE_BUILDER = path.join(STUDIO, "scripts/_generic/brand-site-builder.mjs");
const MANIFEST = path.join(STUDIO, "public/data/brand-sites.json");

const EXPECTED_ROUTES = [
  "theme.ts",
  "layout.tsx",
  "page.tsx",
  "products/page.tsx",
  "products/[id]/page.tsx",
  "blog/page.tsx",
  "blog/[slug]/page.tsx",
  "about/page.tsx",
  "contact/page.tsx",
  "sitemap.xml/route.ts",
];

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function tenantMeta(slug) {
  const reg = await readJson(TENANTS_FILE, { tenants: [] });
  const t = (reg.tenants || []).find((x) => x.slug === slug) || {};
  return {
    display_name: t.display_name || t.name || slug,
    tagline: t.tagline || t.notes || slug,
    type: t.type || "unknown",
  };
}

/** Add/update this tenant in the public /brands manifest. */
async function updateManifest(slug, meta) {
  const manifest = await readJson(MANIFEST, { schema_version: 1, sites: [] });
  if (!Array.isArray(manifest.sites)) manifest.sites = [];
  const entry = {
    slug,
    display_name: meta.display_name,
    tagline: meta.tagline,
    built_at: new Date().toISOString(),
  };
  const idx = manifest.sites.findIndex((s) => s.slug === slug);
  if (idx >= 0) manifest.sites[idx] = { ...manifest.sites[idx], ...entry };
  else manifest.sites.push(entry);
  await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
}

async function countPublishedPosts(slug) {
  const dir = path.join(BIZ, slug, "blog-drafts");
  if (!existsSync(dir)) return { published: 0, drafts: 0 };
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
  let published = 0;
  for (const f of files) {
    try {
      const text = await fs.readFile(path.join(dir, f), "utf8");
      if (/^\s*status:\s*"?live"?/m.test(text)) published++;
    } catch {
      /* skip */
    }
  }
  return { published, drafts: files.length };
}

async function main() {
  const slug = tenantSlug();
  const rebuild = process.argv.includes("--rebuild");
  const env = await loadEnv();
  const meta = await tenantMeta(slug);
  const tenantDir = path.join(BIZ, slug);
  const siteDir = path.join(STUDIO, "src/app/brands", slug);

  console.log(`\n━━━ Brand site sweep — ${meta.display_name} (${slug}) ━━━`);

  const gaps = [];
  const fixed = [];

  // 1. Prerequisites
  const hasConstitution = existsSync(path.join(tenantDir, "CONSTITUTION.md"));
  const hasIdentity = existsSync(path.join(tenantDir, "brand-identity.json"));

  if (!hasConstitution) {
    gaps.push("No CONSTITUTION.md — the brand has no operating charter.");
    await addTodo({
      tenant: slug,
      title: `Re-bootstrap ${meta.display_name} — no brand charter`,
      detail: `${slug} has no CONSTITUTION.md, so its site can't be built. Re-run: node scripts/business-bootstrap.mjs --slug ${slug} --display-name "${meta.display_name}" --niche "${meta.tagline}"`,
      category: "fix",
      priority: "high",
      source: "brand-site-sweep",
    });
    await writeReport(tenantDir, slug, meta, gaps, fixed, { published: 0, drafts: 0 }, []);
    await queueTelegram(env, slug, `🧹 *Sweep: ${meta.display_name}*\n\n⚠️ Blocked — no CONSTITUTION.md. Filed a to-do to re-bootstrap.`, "P2");
    console.log("  ⚠️ no CONSTITUTION.md — filed a to-do, stopping.");
    return;
  }

  if (!hasIdentity) {
    gaps.push("No brand-identity.json — site uses fallback colors/fonts.");
    await addTodo({
      tenant: slug,
      title: `Generate brand identity for ${meta.display_name}`,
      detail: `${slug} has no brand-identity.json, so the site falls back to default colors and fonts. Run: node scripts/brand-identity-generator.mjs --slug ${slug} --display-name "${meta.display_name}" --niche "${meta.tagline}"`,
      category: "review",
      priority: "medium",
      source: "brand-site-sweep",
    });
  }

  // 2. Ensure the site exists
  let siteExists = existsSync(path.join(siteDir, "page.tsx"));
  if (!siteExists || rebuild) {
    console.log(`  → ${siteExists ? "rebuilding" : "building"} multi-page site…`);
    const r = spawnSync("node", [SITE_BUILDER, slug], { stdio: "inherit", cwd: STUDIO });
    if (r.status === 0) {
      fixed.push(siteExists ? "Rebuilt the full multi-page site." : "Built the full multi-page site.");
      siteExists = existsSync(path.join(siteDir, "page.tsx"));
    } else {
      gaps.push("brand-site-builder failed — site not generated.");
      await addTodo({
        tenant: slug,
        title: `Brand site build failed for ${meta.display_name}`,
        detail: `node scripts/_generic/brand-site-builder.mjs ${slug} returned a non-zero status. Check the logs and re-run.`,
        category: "fix",
        priority: "high",
        source: "brand-site-sweep",
      });
    }
  }

  // 3. Audit route files
  const missing = [];
  if (siteExists) {
    for (const rel of EXPECTED_ROUTES) {
      if (!existsSync(path.join(siteDir, rel))) missing.push(rel);
    }
  }
  if (missing.length) {
    gaps.push(`Missing route files: ${missing.join(", ")}`);
    await addTodo({
      tenant: slug,
      title: `Repair ${meta.display_name} brand site — ${missing.length} page(s) missing`,
      detail: `Missing: ${missing.join(", ")}. Re-run: node scripts/_generic/brand-site-builder.mjs ${slug}`,
      category: "fix",
      priority: "high",
      source: "brand-site-sweep",
    });
  }

  // brand-data lib (shared dependency of every generated page)
  if (!existsSync(path.join(STUDIO, "src/lib/brand-data.ts"))) {
    gaps.push("src/lib/brand-data.ts missing — brand pages will not compile.");
    await addTodo({
      tenant: slug,
      title: "Restore src/lib/brand-data.ts",
      detail: "Every brand site imports @/lib/brand-data. Re-run brand-site-builder for any tenant to regenerate it.",
      category: "fix",
      priority: "high",
      source: "brand-site-sweep",
    });
  }

  // 4. Content depth
  const posts = await countPublishedPosts(slug);
  if (posts.published === 0) {
    gaps.push(`No published blog posts (${posts.drafts} draft(s) waiting).`);
    await addTodo({
      tenant: slug,
      title: `Publish blog content for ${meta.display_name}`,
      detail:
        posts.drafts > 0
          ? `${posts.drafts} blog draft(s) exist in businesses/${slug}/blog-drafts but none are marked status: live. Review and publish them — the blog page is empty until then.`
          : `No blog drafts yet for ${slug}. The daily content engine will generate them; confirm its LaunchAgent is installed.`,
      category: "content",
      priority: "medium",
      source: "brand-site-sweep",
    });
  }

  // 5. Register in the public /brands manifest
  await updateManifest(slug, meta);
  fixed.push("Registered in the /brands directory.");

  // 6. Report + notify
  await writeReport(tenantDir, slug, meta, gaps, fixed, posts, missing);
  await audit(slug, {
    actor: "brand-site-sweep",
    action: "site_swept",
    gaps: gaps.length,
    fixed: fixed.length,
  });

  const status = gaps.length === 0 ? "✅ fully operational" : `⚠️ ${gaps.length} gap(s) filed to your to-do list`;
  await queueTelegram(
    env,
    slug,
    `🧹 *Sweep: ${meta.display_name}*\n\n${status}\n\n` +
      `Fixed: ${fixed.length}\nPublished posts: ${posts.published}\n\n` +
      `Site: day14.us/brands/${slug}`,
    "P3"
  );
  console.log(`\n✓ Sweep complete — ${gaps.length} gap(s), ${fixed.length} auto-fixed.`);
}

async function writeReport(tenantDir, slug, meta, gaps, fixed, posts, missing) {
  const lines = [
    `# Brand site sweep — ${meta.display_name}`,
    ``,
    `Slug: ${slug}`,
    `Swept: ${new Date().toISOString()}`,
    `Site: https://day14.us/brands/${slug}`,
    ``,
    `## Auto-fixed (${fixed.length})`,
    ...(fixed.length ? fixed.map((f) => `- ${f}`) : ["- (nothing needed fixing)"]),
    ``,
    `## Gaps filed to operator to-do list (${gaps.length})`,
    ...(gaps.length ? gaps.map((g) => `- ${g}`) : ["- None — site is fully operational."]),
    ``,
    `## Content`,
    `- Published blog posts: ${posts.published}`,
    `- Blog drafts: ${posts.drafts}`,
    `- Missing route files: ${missing.length ? missing.join(", ") : "none"}`,
    ``,
  ];
  try {
    await fs.mkdir(tenantDir, { recursive: true });
    await fs.writeFile(path.join(tenantDir, "site-sweep-report.md"), lines.join("\n"));
  } catch {
    /* best-effort */
  }
}

main().catch((err) => {
  console.error("sweep error:", err.message);
  process.exit(0);
});
