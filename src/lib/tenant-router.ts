/**
 * tenant-router.ts
 *
 * Detect which tenant an inbound event belongs to. Used by webhook handlers
 * and the dispatcher to route customer service work to the right tenant's
 * folder and apply that tenant's CONSTITUTION.md voice rules.
 *
 * Detection signals (in priority order):
 *   1. Recipient email contains tenant slug or alias
 *   2. Subject line matches tenant keywords
 *   3. Body content matches tenant keywords
 *   4. Sender email previously associated with tenant in dossier
 *   5. Fallback: "day14" (the default global tenant)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const TENANTS_FILE = path.join(HOME, "Documents/businesses/_shared/tenants.json");

// Per-tenant keyword maps. Add new tenants here when they need routing.
// Keywords are matched case-insensitively against recipient email, subject, and body.
const TENANT_KEYWORDS: Record<string, { aliases: string[]; subject: RegExp[]; body: RegExp[] }> = {
  "hot-flash-co": {
    aliases: ["hotflash", "hot-flash", "hot.flash", "hotflashco", "hot-flash-co"],
    subject: [
      /perimenopaus/i,
      /menopaus/i,
      /hot flash/i,
      /hotflash/i,
      /power surge/i,
      /night sweat/i,
    ],
    body: [
      /mug.*menopaus|menopaus.*mug/i,
      /hot flash co/i,
      /hot-flash-co/i,
    ],
  },
  // Add other tenants here as they emerge
};

export interface TenantDetectionResult {
  tenant: string;
  confidence: number; // 0-1
  signals: string[];
}

export function detectTenant(input: {
  recipient_email?: string;
  sender_email?: string;
  subject?: string;
  body?: string;
}): TenantDetectionResult {
  const recipient = (input.recipient_email || "").toLowerCase();
  const subject = (input.subject || "");
  const body = (input.body || "").slice(0, 2000); // cap for perf

  const scores: Record<string, { score: number; signals: string[] }> = {};

  for (const [tenant, rules] of Object.entries(TENANT_KEYWORDS)) {
    const signals: string[] = [];
    let score = 0;

    // Recipient email match (strongest signal)
    for (const alias of rules.aliases) {
      if (recipient.includes(alias)) {
        score += 5;
        signals.push(`recipient-alias:${alias}`);
        break;
      }
    }

    // Subject pattern match
    for (const pat of rules.subject) {
      if (pat.test(subject)) {
        score += 3;
        signals.push(`subject-match:${pat.source.slice(0, 30)}`);
      }
    }

    // Body pattern match (weaker — could be incidental mention)
    for (const pat of rules.body) {
      if (pat.test(body)) {
        score += 1;
        signals.push(`body-match:${pat.source.slice(0, 30)}`);
      }
    }

    if (score > 0) {
      scores[tenant] = { score, signals };
    }
  }

  // Pick winner
  const sorted = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
  if (!sorted.length) {
    return { tenant: "day14", confidence: 0, signals: ["fallback:default-tenant"] };
  }
  const [tenant, { score, signals }] = sorted[0]!;
  // Confidence: 5+ = strong (1.0), 3-4 = medium (0.7), 1-2 = weak (0.4)
  const confidence = score >= 5 ? 1.0 : score >= 3 ? 0.7 : 0.4;
  return { tenant, confidence, signals };
}

/**
 * Loads the tenants.json registry. Returns tenant metadata or null.
 */
export async function getTenantMeta(slug: string): Promise<{
  slug: string;
  display_name?: string;
  type?: string;
} | null> {
  if (!existsSync(TENANTS_FILE)) return null;
  const data = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8"));
  const tenant = (data.tenants || []).find((t: { slug: string }) => t.slug === slug);
  return tenant || null;
}

/**
 * Reads a tenant's CONSTITUTION.md if it exists. Used by skills to apply
 * tenant-specific voice + rules.
 */
export async function loadTenantConstitution(slug: string): Promise<string | null> {
  const constPath = path.join(HOME, "Documents/businesses", slug, "CONSTITUTION.md");
  if (!existsSync(constPath)) return null;
  return fs.readFile(constPath, "utf8");
}
