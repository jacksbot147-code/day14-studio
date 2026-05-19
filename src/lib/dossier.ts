/**
 * Customer dossier — filesystem operations.
 *
 * Implements the dossier-folder-initializer skill in real TypeScript.
 * Creates the 7-file dossier scaffold per customer + fills in known fields.
 *
 * Runs in Node runtime (file I/O). NOT edge-safe.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const BUSINESSES_DIR = path.join(homedir(), "Documents/businesses");
const DAY14_CUSTOMERS_DIR = path.join(BUSINESSES_DIR, "day14/customers");
const TEMPLATE_DIR = path.join(
  BUSINESSES_DIR,
  "_shared/templates/customer-dossier"
);

export type Sku = "site" | "portal" | "platform";
export type Vertical = "mobile-service" | "membership" | "food" | "custom";

export interface DossierInput {
  slug: string;
  company_name: string;
  email: string;
  phone?: string;
  sku: Sku;
  vertical?: Vertical;
  deposit_amount?: number;
}

export interface DossierResult {
  slug: string;
  path: string;
  created: boolean;
  alreadyExisted: boolean;
}

/**
 * Compute a kebab-case slug from a company name.
 * "Acme Pool Co." -> "acme-pool-co"
 * Handles collisions by suffixing -2, -3 etc.
 */
export async function computeSlug(companyName: string): Promise<string> {
  const base = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  // Check for existing slug
  let candidate = base;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidatePath = path.join(DAY14_CUSTOMERS_DIR, candidate);
    try {
      await fs.access(candidatePath);
      // exists — try next suffix
      candidate = `${base}-${suffix}`;
      suffix++;
      if (suffix > 50) {
        throw new Error(`Slug collision unresolvable for "${base}"`);
      }
    } catch {
      // doesn't exist — we have our slug
      return candidate;
    }
  }
}

/**
 * Initialize the dossier folder for a new customer.
 *
 * Idempotent: returns alreadyExisted=true if the folder is already there.
 * Does NOT overwrite existing files.
 */
export async function initializeDossier(
  input: DossierInput
): Promise<DossierResult> {
  const customerDir = path.join(DAY14_CUSTOMERS_DIR, input.slug);

  // Check if folder already exists
  let alreadyExisted = false;
  try {
    await fs.access(customerDir);
    alreadyExisted = true;
  } catch {
    // doesn't exist — we'll create it
  }

  if (alreadyExisted) {
    return {
      slug: input.slug,
      path: customerDir,
      created: false,
      alreadyExisted: true,
    };
  }

  // Verify template directory exists
  try {
    await fs.access(TEMPLATE_DIR);
  } catch {
    throw new Error(
      `Template directory missing at ${TEMPLATE_DIR}. Run bootstrap-day14-os.sh first.`
    );
  }

  // Create the customer dossier directory
  await fs.mkdir(customerDir, { recursive: true });

  // Copy each template file with placeholder substitution
  const templateFiles = [
    "README.md",
    "00-intake.md",
    "01-brand.json",
    "02-build-log.md",
    "03-approvals.md",
    "04-feedback.md",
    "05-launch.md",
  ];

  for (const filename of templateFiles) {
    const templatePath = path.join(TEMPLATE_DIR, filename);
    const targetPath = path.join(customerDir, filename);

    let content: string;
    try {
      content = await fs.readFile(templatePath, "utf8");
    } catch (err) {
      // Skip files that don't exist in the template — log and continue
      console.warn(`Template file missing: ${filename}, skipping`);
      continue;
    }

    // Substitute placeholders
    if (filename === "01-brand.json") {
      // brand.json is JSON — parse, mutate, stringify
      try {
        const brand = JSON.parse(content);
        brand.company = brand.company || {};
        brand.company.name = input.company_name;
        brand.company.slug = input.slug;
        brand.contact = brand.contact || {};
        brand.contact.email = input.email;
        if (input.phone) brand.contact.phone = input.phone;
        brand.sku = input.sku;
        if (input.vertical) brand.vertical = input.vertical;
        brand._meta = brand._meta || {};
        brand._meta.intake_completed_at = null;
        brand._meta.kickoff_call_at = null;
        brand._meta.last_edited_by = "dossier-folder-initializer";
        brand._meta.version = 1;
        content = JSON.stringify(brand, null, 2);
      } catch (err) {
        console.warn(`Failed to parse brand.json template, writing as-is`);
      }
    } else {
      // Markdown files — simple string replace
      content = content
        .replace(/\{\{company_name\}\}/g, input.company_name)
        .replace(/\{\{slug\}\}/g, input.slug)
        .replace(/\{\{email\}\}/g, input.email)
        .replace(/\{\{phone\}\}/g, input.phone ?? "")
        .replace(/\{\{sku\}\}/g, input.sku)
        .replace(/\{\{date\}\}/g, new Date().toISOString().slice(0, 10))
        .replace(/\{\{timestamp\}\}/g, new Date().toISOString());
    }

    await fs.writeFile(targetPath, content, "utf8");
  }

  // Append a Day 0 entry to 02-build-log.md
  const buildLogPath = path.join(customerDir, "02-build-log.md");
  const day0Entry = `\n## Day 0 — ${new Date().toISOString().slice(0, 10)}\n\n- Deposit cleared${input.deposit_amount ? ` ($${input.deposit_amount})` : ""}\n- Dossier created at ${customerDir}\n- Status: awaiting-intake\n- Next: customer fills intake form → kickoff call scheduled\n`;
  await fs.appendFile(buildLogPath, day0Entry, "utf8");

  return {
    slug: input.slug,
    path: customerDir,
    created: true,
    alreadyExisted: false,
  };
}
