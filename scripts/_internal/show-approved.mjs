#!/usr/bin/env node
/**
 * show-approved.mjs — surface every inbox item with status="approved" so Jack
 * can act on the chosen variants in one sitting (instead of one-at-a-time
 * from /admin/inbox).
 *
 * v1: read-only printer. Groups by kind, shows the chosen variant text,
 * shows the destination file Jack needs to edit (when known).
 *
 * v2 (future): auto-apply chosen variants for the kinds where the destination
 * mapping is mechanical (landing-headline-pick → write LANDING-OVERRIDES.json
 * → page.tsx reads it). For now: print, copy-paste, edit.
 *
 * Run from studio root:
 *   node scripts/_internal/show-approved.mjs
 *   node scripts/_internal/show-approved.mjs --kind=landing-headline-pick
 *   node scripts/_internal/show-approved.mjs --mark-applied   # bulk mark status="applied"
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..", "..");
const INBOX_DIR = path.join(STUDIO_ROOT, "public/data/inboxes");

// Per-kind metadata: what "apply" means, where the destination lives.
const KIND_META = {
  "landing-headline-pick": {
    title: "Landing-page headline picks",
    destination: "src/app/page.tsx (Hero H1 + subhead)",
    apply_hint: "Find <Hero> headline in page.tsx, replace with the chosen H1 + subhead",
    show: (item) => ({
      chosen_id: item.chosen_variant_id || "(none chosen — bulk-signoff may not capture variant id)",
      variants_file: item.variants_file,
    }),
  },
  "headline-pick": {
    title: "Life Loophole article headlines",
    destination: "content/life-loophole/drafts/<slug>.md frontmatter `title:`",
    apply_hint: "Update the draft markdown's title field",
    show: (item) => ({ summary: item.summary, source_ref: item.source_ref }),
  },
  "cs-body-pick": {
    title: "CS reply template bodies",
    destination: "public/data/cs-templates/<id>.md (template body)",
    apply_hint: "Replace the template body with the chosen variant",
    show: (item) => ({ summary: item.summary, source_ref: item.source_ref }),
  },
  "subject-line-pick": {
    title: "Newsletter / email subject lines",
    destination: item => item.source_ref || "(unknown)",
    apply_hint: "Update the source-of-truth file with the chosen subject",
    show: (item) => ({ summary: item.summary, current_subject: item.current_subject }),
  },
  "brand-hero-pick": {
    title: "Brand-site hero images",
    destination: "public/data/inboxes/<tenant>.json (mark real_image: true once swapped in cache)",
    apply_hint: "Copy chosen variant PNG to canonical /public/og/ slot for tenant",
    show: (item) => ({ variants_count: item.variants?.length ?? 0 }),
  },
  "og-card-pick": {
    title: "OG cards (social share)",
    destination: "public/og/<slug>.png",
    apply_hint: "Swap chosen variant into public/og/",
    show: (item) => ({ variants_count: item.variants?.length ?? 0 }),
  },
  "decision-pick": {
    title: "Open decisions (claude-mem etc.)",
    destination: "(decision — record answer in the referenced doc)",
    apply_hint: "Answer the question + update the referenced planning doc",
    show: (item) => ({ summary: item.summary, reference: item.payload?.reference }),
  },
};

function parseArgs() {
  const out = { kind: null, markApplied: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--mark-applied") out.markApplied = true;
    else if (a.startsWith("--kind=")) out.kind = a.slice(7);
  }
  return out;
}

async function readJsonOrNull(p) {
  if (!existsSync(p)) return null;
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}

async function atomicWrite(p, data) {
  const tmp = `${p}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n");
  await fs.rename(tmp, p);
}

async function main() {
  const args = parseArgs();
  const inboxFiles = (await fs.readdir(INBOX_DIR)).filter((f) => f.endsWith(".json"));
  const approved = []; // { tenant, item }
  for (const f of inboxFiles) {
    const tenant = f.replace(/\.json$/, "");
    const inbox = await readJsonOrNull(path.join(INBOX_DIR, f));
    const items = inbox?.items ?? (Array.isArray(inbox) ? inbox : []);
    for (const it of items) {
      if (it.status !== "approved") continue;
      if (args.kind && it.kind !== args.kind) continue;
      approved.push({ tenant, item: it });
    }
  }
  if (approved.length === 0) {
    console.log(args.kind
      ? `No approved items found with kind="${args.kind}".`
      : "No approved items found.");
    process.exit(0);
  }
  // Group by kind for printing
  const byKind = {};
  for (const a of approved) {
    (byKind[a.item.kind] = byKind[a.item.kind] || []).push(a);
  }
  console.log(`\n${approved.length} approved item(s) ready to apply:\n`);
  for (const [kind, group] of Object.entries(byKind)) {
    const meta = KIND_META[kind] || { title: kind, destination: "(unknown)", apply_hint: "(unknown)", show: () => ({}) };
    console.log(`\n── ${meta.title} (${group.length}) ──`);
    console.log(`   destination: ${typeof meta.destination === "function" ? "(per-item)" : meta.destination}`);
    console.log(`   apply hint: ${meta.apply_hint}`);
    for (const { tenant, item } of group) {
      console.log(`\n   [${tenant}] ${item.id}`);
      console.log(`     title: ${item.title || "(no title)"}`);
      const detail = meta.show(item);
      for (const [k, v] of Object.entries(detail)) {
        console.log(`     ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
      }
    }
  }
  console.log("");
  if (args.markApplied) {
    console.log("\n--mark-applied flag set — updating status to \"applied\"...");
    for (const f of inboxFiles) {
      const tenant = f.replace(/\.json$/, "");
      const fp = path.join(INBOX_DIR, f);
      const inbox = await readJsonOrNull(fp);
      if (!inbox) continue;
      const items = inbox.items ?? (Array.isArray(inbox) ? inbox : null);
      if (!items) continue;
      let changed = 0;
      for (const it of items) {
        if (it.status === "approved" && (!args.kind || it.kind === args.kind)) {
          it.status = "applied";
          it.applied_at = new Date().toISOString();
          changed++;
        }
      }
      if (changed > 0) {
        await atomicWrite(fp, inbox);
        console.log(`  ${tenant}: marked ${changed} item(s) as applied`);
      }
    }
  } else {
    console.log("Re-run with --mark-applied once you've made the edits.");
  }
}

main().catch((err) => { console.error("FATAL:", err?.message ?? err); process.exit(1); });
