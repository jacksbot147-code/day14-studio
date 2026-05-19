#!/usr/bin/env node
/**
 * new-tenant.mjs
 *
 * Spin up a new tenant from a template.
 *
 * What it does:
 *   1. Appends an entry to ~/Documents/businesses/_shared/tenants.json
 *   2. Creates the customer dossier dir at _shared/customers/{slug}/
 *   3. Copies the template's intake schema + README into the dossier
 *   4. Initializes empty status, refunds, feedback files
 *   5. Logs to audit log
 *   6. Queues Telegram confirmation
 *
 * Usage:
 *   node new-tenant.mjs --slug naples-boat-detailing --name "Naples Boat Detailing" --template marine-services
 *   node new-tenant.mjs --slug naples-boat-detailing --name "Naples Boat Detailing" --template marine-services --domain naplesboatdetailing.com --tier site --monthly 497
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const REGISTRY = path.join(SHARED, "tenants.json");
const TEMPLATES_DIR = path.join(SHARED, "templates/tenants");
const CUSTOMERS_DIR = path.join(SHARED, "customers");
const OUTBOX = path.join(SHARED, "telegram/outbox");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--") && argv[i + 1] !== undefined) {
      args[a.slice(2)] = argv[++i];
    } else if (a.startsWith("--")) {
      args[a.slice(2)] = true;
    }
  }
  return args;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function readRegistry() {
  if (!existsSync(REGISTRY)) {
    return { schema_version: 1, tenants: [], tenant_types: {} };
  }
  return JSON.parse(await fs.readFile(REGISTRY, "utf8"));
}

async function writeRegistry(reg) {
  await fs.writeFile(REGISTRY, JSON.stringify(reg, null, 2), "utf8");
}

async function loadEnv() {
  const envPath = path.join(HOME, "Documents/studio/.env.local");
  if (!existsSync(envPath)) return {};
  const text = await fs.readFile(envPath, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) {
      env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
  return env;
}

async function queueTelegram(text, urgency = "P2") {
  const env = await loadEnv();
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!chatId) return; // silent if no telegram

  await fs.mkdir(OUTBOX, { recursive: true });
  await fs.writeFile(
    path.join(OUTBOX, `${Date.now()}-new-tenant.json`),
    JSON.stringify(
      {
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        urgency,
        queued_at: new Date().toISOString(),
        sent_at: null,
      },
      null,
      2
    )
  );
}

async function appendAudit(action, details) {
  const month = new Date().toISOString().slice(0, 7);
  const auditDir = path.join(SHARED, "audit");
  await fs.mkdir(auditDir, { recursive: true });
  const auditFile = path.join(auditDir, `audit-${month}.jsonl`);
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    actor: "jack@day14",
    actor_source: "cli",
    skill_invoked: "new-tenant",
    details,
  };
  await fs.appendFile(auditFile, JSON.stringify(entry) + "\n", "utf8");
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.slug || !args.name || !args.template) {
    console.error(
      "Usage: new-tenant.mjs --slug NAME --name 'Full Name' --template TEMPLATE [--domain D] [--tier T] [--monthly N]"
    );
    console.error("\nAvailable templates:");
    const templates = await fs.readdir(TEMPLATES_DIR);
    for (const t of templates) {
      console.error("  -", t);
    }
    process.exit(1);
  }

  const slug = slugify(args.slug);
  const name = String(args.name);
  const template = String(args.template);

  // Verify template exists
  const templateDir = path.join(TEMPLATES_DIR, template);
  if (!existsSync(templateDir)) {
    console.error(`✗ Template not found: ${template}`);
    console.error("Available:");
    const templates = await fs.readdir(TEMPLATES_DIR);
    templates.forEach((t) => console.error("  -", t));
    process.exit(1);
  }

  // Load registry, check for collision
  const registry = await readRegistry();
  if (registry.tenants.find((t) => t.slug === slug)) {
    console.error(`✗ Tenant slug already exists: ${slug}`);
    process.exit(1);
  }

  // Look up tenant type metadata
  const typeMeta = registry.tenant_types[template];
  const defaultSkillPacks =
    typeMeta?.default_skill_packs || [
      "customer-pipeline",
      "ops-monitoring",
      "revenue-ops",
    ];

  // Build tenant entry
  const monthly = args.monthly ? parseInt(String(args.monthly), 10) : 0;
  const tenant = {
    slug,
    name,
    type: template,
    status: "active",
    owner: "jack",
    enabled_skill_packs: defaultSkillPacks,
    billing: {
      stripe_account: "default",
      tier: args.tier || null,
      monthly_amount: monthly,
    },
    notes: `Created ${new Date().toISOString().slice(0, 10)} from template ${template}`,
  };
  if (args.domain) tenant.domain = String(args.domain);

  // Append
  registry.tenants.push(tenant);
  await writeRegistry(registry);

  // Scaffold dossier dir
  const dossierDir = path.join(CUSTOMERS_DIR, slug);
  await fs.mkdir(dossierDir, { recursive: true });

  // Copy template README + intake schema
  await fs.copyFile(
    path.join(templateDir, "README.md"),
    path.join(dossierDir, "00-template-readme.md")
  );
  if (existsSync(path.join(templateDir, "intake-schema.json"))) {
    await fs.copyFile(
      path.join(templateDir, "intake-schema.json"),
      path.join(dossierDir, "00-intake-schema.json")
    );
  }

  // Initialize 01-brand.json with tenant data
  const brand = {
    slug,
    name,
    type: template,
    domain: tenant.domain || null,
    status: "active",
    monthly_amount: monthly,
    tier: tenant.billing.tier,
    signup_date: new Date().toISOString(),
    enabled_skill_packs: defaultSkillPacks,
  };
  await fs.writeFile(
    path.join(dossierDir, "01-brand.json"),
    JSON.stringify(brand, null, 2),
    "utf8"
  );

  // Initialize empty status file
  await fs.writeFile(
    path.join(dossierDir, "02-status.md"),
    `# Status — ${name}\n\nstatus: active\nsignup: ${new Date().toISOString()}\ntemplate: ${template}\n\n## Initial state\nTenant scaffolded via new-tenant.mjs.\n`,
    "utf8"
  );

  // Empty refunds + feedback
  await fs.writeFile(
    path.join(dossierDir, "03-refunds.md"),
    `# Refunds — ${name}\n\n_(none yet)_\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(dossierDir, "04-feedback.md"),
    `# Feedback — ${name}\n\n_(none yet)_\n`,
    "utf8"
  );

  // Audit log
  await appendAudit("tenant_created", {
    slug,
    name,
    template,
    monthly_amount: monthly,
    domain: tenant.domain || null,
    skill_packs: defaultSkillPacks,
  });

  // Telegram confirmation
  await queueTelegram(
    `✅ *New tenant scaffolded*\n\n` +
      `Name: ${name}\n` +
      `Slug: \`${slug}\`\n` +
      `Template: ${template}\n` +
      (tenant.domain ? `Domain: ${tenant.domain}\n` : "") +
      (monthly ? `MRR: $${monthly}\n` : "") +
      `Skill packs: ${defaultSkillPacks.join(", ")}\n\n` +
      `Dossier: \`_shared/customers/${slug}/\`\n` +
      `View: http://localhost:3000/dashboard/tenants/${slug}`
  );

  console.log(`✓ Tenant ${slug} created`);
  console.log(`  Dossier: ${dossierDir}`);
  console.log(`  Registry entries: ${registry.tenants.length}`);
  console.log(`  View: http://localhost:3000/dashboard/tenants/${slug}`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
