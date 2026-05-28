/**
 * customer-readiness-check — hand-coded impl.
 *
 * Preflight check before build-day-1 bootstrap. Verifies the customer's
 * dossier has the minimum required fields. Pure-Node JSON checker.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();
const CUSTOMERS_BASE = path.join(HOME, "Documents/businesses");

export interface ReadinessCheckInput {
  customer_slug: string;
  tenant?: string; // default day14
}

export interface ReadinessGap {
  field: string;
  source: "01-brand.json" | "dossier-file" | "intake";
  severity: "blocker" | "warning";
  hint: string;
}

export interface ReadinessResult {
  ready: boolean;
  gaps: ReadinessGap[];
  blocker_count: number;
  warning_count: number;
  dossier_path: string;
  checked_at: string;
}

interface BrandJson {
  company?: { name?: string; slug?: string };
  contact?: { phone?: string; email?: string; hours?: Record<string, string> };
  colors?: { primary?: string; accent?: string };
  logo?: { svg_path?: string; png_path?: string };
  social?: { google_business?: string };
  sku?: string;
}

const REQUIRED_FILES = ["01-brand.json", "02-build-log.md", "03-customer-comms.md"];

async function readJsonSafe<T>(p: string): Promise<T | null> {
  if (!existsSync(p)) return null;
  try {
    const text = await fs.readFile(p, "utf8");
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function checkReadiness(input: ReadinessCheckInput): Promise<ReadinessResult> {
  const tenant = input.tenant || "day14";
  const dossierDir = path.join(CUSTOMERS_BASE, tenant, "customers", input.customer_slug);
  const gaps: ReadinessGap[] = [];

  if (!existsSync(dossierDir)) {
    return {
      ready: false,
      gaps: [
        {
          field: "dossier_dir",
          source: "dossier-file",
          severity: "blocker",
          hint: `Run dossier-folder-initializer for ${input.customer_slug} first`,
        },
      ],
      blocker_count: 1,
      warning_count: 0,
      dossier_path: dossierDir,
      checked_at: new Date().toISOString(),
    };
  }

  for (const f of REQUIRED_FILES) {
    if (!existsSync(path.join(dossierDir, f))) {
      gaps.push({
        field: f,
        source: "dossier-file",
        severity: f === "01-brand.json" ? "blocker" : "warning",
        hint: `Missing ${f} in dossier`,
      });
    }
  }

  const brand = await readJsonSafe<BrandJson>(path.join(dossierDir, "01-brand.json"));
  if (brand) {
    if (!brand.company?.name) gaps.push({ field: "company.name", source: "01-brand.json", severity: "blocker", hint: "Brand company.name missing" });
    if (!brand.company?.slug) gaps.push({ field: "company.slug", source: "01-brand.json", severity: "blocker", hint: "Brand company.slug missing" });
    if (!brand.contact?.phone) gaps.push({ field: "contact.phone", source: "01-brand.json", severity: "blocker", hint: "contact.phone missing" });
    if (!brand.contact?.email) gaps.push({ field: "contact.email", source: "01-brand.json", severity: "blocker", hint: "contact.email missing" });
    if (!brand.colors?.primary) gaps.push({ field: "colors.primary", source: "01-brand.json", severity: "warning", hint: "Primary color missing — defaults will be used" });
    if (!brand.logo?.svg_path && !brand.logo?.png_path) gaps.push({ field: "logo", source: "01-brand.json", severity: "warning", hint: "No logo path; will use brand initials fallback" });
    const hoursDays = Object.values(brand.contact?.hours ?? {}).filter(Boolean).length;
    if (hoursDays < 5) gaps.push({ field: "contact.hours", source: "01-brand.json", severity: "warning", hint: `Only ${hoursDays} days of hours; need ≥5 (closed days count)` });
    if (!brand.sku) gaps.push({ field: "sku", source: "01-brand.json", severity: "blocker", hint: "SKU missing (site/portal/platform)" });
    if (!brand.social?.google_business) gaps.push({ field: "social.google_business", source: "01-brand.json", severity: "warning", hint: "GBP URL missing — SEO impact" });
  }

  const blockerCount = gaps.filter((g) => g.severity === "blocker").length;
  const warningCount = gaps.filter((g) => g.severity === "warning").length;
  return {
    ready: blockerCount === 0,
    gaps,
    blocker_count: blockerCount,
    warning_count: warningCount,
    dossier_path: dossierDir,
    checked_at: new Date().toISOString(),
  };
}

export async function invokeCustomerReadinessCheck(
  input: ReadinessCheckInput
): Promise<ReadinessResult> {
  const result = await checkReadiness(input);
  await auditLog({
    action: "customer_readiness_checked",
    actor: "automated:customer-readiness-check",
    customer_slug: input.customer_slug,
    details: { ready: result.ready, blockers: result.blocker_count, warnings: result.warning_count },
    skill_invoked: "customer-readiness-check",
    actor_source: "skill-runner",
  });
  return result;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<ReadinessCheckInput> | undefined;
  const slug = input?.customer_slug || ctx.customer_slug;
  if (!slug) {
    return {
      ok: false,
      skill: "customer-readiness-check",
      path: "hand-coded",
      error: "missing required input: customer_slug",
    };
  }
  const result = await invokeCustomerReadinessCheck({ customer_slug: slug, tenant: input?.tenant });
  return {
    ok: result.ready,
    skill: "customer-readiness-check",
    path: "hand-coded",
    result,
    jack_tap_required: !result.ready && result.blocker_count > 0,
    next_actions: result.ready ? ["proceed to customer-build-day-1-bootstrap"] : ["queue intake-clarification-needed"],
  };
}
