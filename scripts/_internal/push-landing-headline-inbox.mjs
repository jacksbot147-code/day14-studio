#!/usr/bin/env node
/**
 * push-landing-headline-inbox.mjs — N4 / T9 close-out.
 *
 * Reads the 3 landing-variants manifests at
 *   public/data/brand-landings/{day14,day14-realty,alignmd}.landing-variants.json
 * and pushes one `landing-headline-pick` item per tenant into the canonical
 * inbox at
 *   public/data/inboxes/<tenant>.json
 *
 * Idempotent — re-running detects the existing item by id and no-ops.
 * Atomic temp-then-rename writes (concurrent-safe under empire sync churn).
 *
 * Run once from studio root:
 *   node scripts/_internal/push-landing-headline-inbox.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..", "..");
const VARIANTS_DIR = path.join(STUDIO_ROOT, "public/data/brand-landings");
const INBOX_DIR = path.join(STUDIO_ROOT, "public/data/inboxes");

const TENANTS = ["day14", "day14-realty", "alignmd"];

async function atomicWriteJson(target, data) {
  const tmp = `${target}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n");
  await fs.rename(tmp, target);
}

async function readJsonOrFresh(p, fallback) {
  if (!existsSync(p)) return fallback;
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return fallback; }
}

function buildInboxItem(tenant, manifest) {
  const today = new Date().toISOString().slice(0, 10);
  const variantCount = Array.isArray(manifest.variants) ? manifest.variants.length : 0;
  const firstVariant = variantCount ? manifest.variants[0] : null;
  return {
    id: `inbox-${tenant}-${today}-landing-headline-pick`,
    kind: "landing-headline-pick",
    tenant,
    title: `Pick landing-page headline — ${tenant}`,
    summary: `${variantCount} variants generated for ${tenant} landing hero. Current H1: "${manifest.originalH1 ?? manifest.original?.headline ?? "(unknown)"}".`,
    source_ref: manifest.source?.page || "(unknown)",
    variants_file: `public/data/brand-landings/${tenant}.landing-variants.json`,
    variant_count: variantCount,
    current_headline: manifest.originalH1 ?? manifest.original?.headline ?? null,
    first_variant_preview: firstVariant ? (firstVariant.h1 || firstVariant.headline) : null,
    created_at: new Date().toISOString(),
    status: "awaiting-jack",
    priority: "medium",
    auto_replace_in_source: false,
  };
}

async function pushOne(tenant) {
  const manifestPath = path.join(VARIANTS_DIR, `${tenant}.landing-variants.json`);
  if (!existsSync(manifestPath)) {
    console.log(`[push-landing-inbox] ${tenant}: SKIP — manifest missing at ${manifestPath}`);
    return { tenant, skipped: true, reason: "no manifest" };
  }
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const item = buildInboxItem(tenant, manifest);

  const inboxPath = path.join(INBOX_DIR, `${tenant}.json`);
  const inbox = await readJsonOrFresh(inboxPath, { schema_version: 1, items: [] });
  if (!Array.isArray(inbox.items)) inbox.items = [];

  const existingIdx = inbox.items.findIndex((i) => i.id === item.id);
  if (existingIdx >= 0) {
    console.log(`[push-landing-inbox] ${tenant}: idempotent no-op (item ${item.id} exists)`);
    return { tenant, idempotent: true };
  }
  inbox.items.push(item);
  await atomicWriteJson(inboxPath, inbox);
  console.log(`[push-landing-inbox] ${tenant}: ✓ pushed item ${item.id} (variants=${item.variant_count})`);
  return { tenant, pushed: true, item_id: item.id, variant_count: item.variant_count };
}

async function main() {
  console.log(`[push-landing-inbox] starting at ${new Date().toISOString()}`);
  const results = [];
  for (const t of TENANTS) results.push(await pushOne(t));
  console.log(`\n[push-landing-inbox] summary:`);
  for (const r of results) console.log("  ", JSON.stringify(r));
  console.log("\n[push-landing-inbox] DONE");
}

main().catch((err) => { console.error("FATAL:", err?.message ?? err); process.exit(1); });
