/**
 * intake-parser — hand-coded impl.
 *
 * Takes a raw intake form payload (from Typeform, Notion, custom form),
 * normalizes field names to the canonical Day14 schema, validates required
 * fields, returns parsed + confidence + issues list.
 *
 * Used by /api/webhooks/intake and /api/intake routes.
 */

import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";

export interface IntakeFieldMap {
  company_name?: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  domain?: string;
  city?: string;
  service_radius?: string;
  service_description?: string;
  typical_customer?: string;
  pricing?: string;
  current_pain?: string;
  existing_website?: string;
  how_customers_find?: string;
  contact_preference?: string;
  notes?: string;
  vertical?: string;
  sku?: string;
}

export interface ParsedIntake {
  fields: IntakeFieldMap;
  confidence: number; // 0.0 - 1.0
  validation_issues: string[];
  is_complete: boolean;
}

// Map alternate field name spellings → canonical
const FIELD_ALIASES: Record<string, keyof IntakeFieldMap> = {
  business_name: "company_name",
  businessname: "company_name",
  business: "company_name",
  "business name": "company_name",
  company: "company_name",
  owner: "owner_name",
  name: "owner_name",
  "your name": "owner_name",
  full_name: "owner_name",
  e_mail: "email",
  "e-mail": "email",
  mail: "email",
  "your email": "email",
  phone_number: "phone",
  phonenumber: "phone",
  mobile: "phone",
  cell: "phone",
  website: "existing_website",
  current_site: "existing_website",
  url: "existing_website",
  area: "service_radius",
  radius: "service_radius",
  service_area: "service_radius",
  services: "service_description",
  description: "service_description",
  about: "service_description",
  what_you_do: "service_description",
  ideal_customer: "typical_customer",
  target_customer: "typical_customer",
  customer: "typical_customer",
  pain: "current_pain",
  pain_point: "current_pain",
  problem: "current_pain",
  challenge: "current_pain",
  industry: "vertical",
  category: "vertical",
  business_type: "vertical",
  comments: "notes",
  additional: "notes",
  anything_else: "notes",
};

const REQUIRED_FIELDS: Array<keyof IntakeFieldMap> = [
  "email",
  "company_name",
];

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function parseIntake(rawFields: Record<string, unknown>): ParsedIntake {
  const fields: IntakeFieldMap = {};
  const issues: string[] = [];
  let matchedCount = 0;
  let totalCount = 0;

  for (const [rawKey, rawValue] of Object.entries(rawFields)) {
    if (rawValue === null || rawValue === undefined || rawValue === "") continue;
    totalCount += 1;
    const val = String(rawValue).trim();
    const norm = normalizeKey(rawKey);

    // Direct match to canonical
    if (norm in fields || isCanonical(norm)) {
      (fields as Record<string, string>)[norm] = val;
      matchedCount += 1;
      continue;
    }

    // Alias match
    const aliased = FIELD_ALIASES[norm];
    if (aliased) {
      (fields as Record<string, string>)[aliased] = val;
      matchedCount += 1;
      continue;
    }
  }

  // Validate
  for (const req of REQUIRED_FIELDS) {
    if (!fields[req]) {
      issues.push(`Missing required field: ${req}`);
    }
  }
  if (fields.email && !isEmail(fields.email)) {
    issues.push(`Invalid email format: ${fields.email}`);
  }
  if (fields.phone && fields.phone.replace(/\D/g, "").length < 7) {
    issues.push(`Phone looks too short: ${fields.phone}`);
  }
  if (fields.domain && /^https?:/.test(fields.domain)) {
    // Normalize: strip protocol
    fields.domain = fields.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  const confidence =
    totalCount === 0 ? 0 : Math.min(1, matchedCount / totalCount);
  const isComplete = issues.length === 0;

  return {
    fields,
    confidence,
    validation_issues: issues,
    is_complete: isComplete,
  };
}

function isCanonical(key: string): boolean {
  const canonical: Array<keyof IntakeFieldMap> = [
    "company_name",
    "owner_name",
    "email",
    "phone",
    "domain",
    "city",
    "service_radius",
    "service_description",
    "typical_customer",
    "pricing",
    "current_pain",
    "existing_website",
    "how_customers_find",
    "contact_preference",
    "notes",
    "vertical",
    "sku",
  ];
  return (canonical as string[]).includes(key);
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as { fields?: Record<string, unknown> } | undefined;
  if (!inputs?.fields) {
    return {
      ok: false,
      skill: "intake-parser",
      path: "hand-coded",
      error: "missing required input: fields",
    };
  }
  const parsed = parseIntake(inputs.fields);
  return {
    ok: parsed.is_complete,
    skill: "intake-parser",
    path: "hand-coded",
    result: parsed,
    error: parsed.is_complete ? undefined : parsed.validation_issues.join("; "),
  };
}
