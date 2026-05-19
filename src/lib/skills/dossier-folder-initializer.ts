/**
 * dossier-folder-initializer — hand-coded impl.
 *
 * Creates the canonical customer dossier folder structure for a new tenant.
 * Idempotent: if folder exists, fills in missing files only.
 *
 * Used by webhook handlers (Stripe checkout.session.completed for new
 * customers) and by /new-tenant.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const SHARED = path.join(homedir(), "Documents/businesses/_shared");

export interface DossierInit {
  slug: string;
  name: string;
  email?: string;
  phone?: string;
  domain?: string;
  tier?: string;
  vertical?: string;
  monthly_amount?: number;
  stripe_customer_id?: string;
  source?: "stripe-webhook" | "intake-form" | "new-tenant-cli" | "manual";
}

const CANONICAL_FILES = [
  "00-intake.md",
  "01-brand.json",
  "02-status.md",
  "03-refunds.md",
  "04-feedback.md",
  "05-launch.md",
];

export async function initializeDossier(init: DossierInit): Promise<{
  dir: string;
  files_created: string[];
  files_existed: string[];
}> {
  const dir = path.join(SHARED, "customers", init.slug);
  await fs.mkdir(dir, { recursive: true });

  const created: string[] = [];
  const existed: string[] = [];

  // 01-brand.json — most important, holds all the structured metadata
  const brandPath = path.join(dir, "01-brand.json");
  if (!existsSync(brandPath)) {
    const brand = {
      slug: init.slug,
      name: init.name,
      email: init.email ?? null,
      phone: init.phone ?? null,
      domain: init.domain ?? null,
      tier: init.tier ?? null,
      vertical: init.vertical ?? null,
      monthly_amount: init.monthly_amount ?? 0,
      stripe_customer_id: init.stripe_customer_id ?? null,
      status: "active",
      signup_date: new Date().toISOString(),
      source: init.source ?? "manual",
    };
    await fs.writeFile(brandPath, JSON.stringify(brand, null, 2), "utf8");
    created.push(brandPath);
  } else {
    existed.push(brandPath);
  }

  // 00-intake.md — empty stub for intake form data to flow into
  const intakePath = path.join(dir, "00-intake.md");
  if (!existsSync(intakePath)) {
    await fs.writeFile(
      intakePath,
      `# Intake — ${init.name}\n\nSource: ${init.source ?? "manual"}\nCreated: ${new Date().toISOString()}\n\n_(Intake form data will populate here)_\n`,
      "utf8"
    );
    created.push(intakePath);
  } else {
    existed.push(intakePath);
  }

  // 02-status.md
  const statusPath = path.join(dir, "02-status.md");
  if (!existsSync(statusPath)) {
    await fs.writeFile(
      statusPath,
      `# Status — ${init.name}\n\nstatus: active\nsignup: ${new Date().toISOString()}\nsource: ${init.source ?? "manual"}\n`,
      "utf8"
    );
    created.push(statusPath);
  } else {
    existed.push(statusPath);
  }

  // 03-refunds.md, 04-feedback.md, 05-launch.md — empty stubs
  const stubs = [
    ["03-refunds.md", `# Refunds — ${init.name}\n\n_(none yet)_\n`],
    ["04-feedback.md", `# Feedback — ${init.name}\n\n_(none yet)_\n`],
    ["05-launch.md", `# Launch — ${init.name}\n\n_(pre-launch)_\n`],
  ] as const;
  for (const [filename, content] of stubs) {
    const p = path.join(dir, filename);
    if (!existsSync(p)) {
      await fs.writeFile(p, content, "utf8");
      created.push(p);
    } else {
      existed.push(p);
    }
  }

  // Audit log
  await auditLog({
    action: "dossier_initialized",
    actor: `automated:dossier-folder-initializer`,
    customer_slug: init.slug,
    details: {
      source: init.source,
      files_created: created.length,
      domain: init.domain,
      tier: init.tier,
    },
    skill_invoked: "dossier-folder-initializer",
    actor_source: init.source ?? "manual",
  });

  return { dir, files_created: created, files_existed: existed };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<DossierInit> | undefined;
  if (!inputs?.slug || !inputs.name) {
    return {
      ok: false,
      skill: "dossier-folder-initializer",
      path: "hand-coded",
      error: "missing required inputs: slug + name",
    };
  }
  const result = await initializeDossier({
    slug: inputs.slug,
    name: inputs.name,
    email: inputs.email,
    phone: inputs.phone,
    domain: inputs.domain,
    tier: inputs.tier,
    vertical: inputs.vertical,
    monthly_amount: inputs.monthly_amount,
    stripe_customer_id: inputs.stripe_customer_id,
    source: inputs.source ?? "manual",
  });
  return {
    ok: true,
    skill: "dossier-folder-initializer",
    path: "hand-coded",
    result,
    artifacts: result.files_created,
  };
}
