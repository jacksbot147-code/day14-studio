/**
 * Intake form parser — turn raw form responses into structured dossier data.
 *
 * Implementation of the `intake-parser` skill.
 *
 * Supports multiple intake sources via a normalized internal schema.
 * Adds enrichment to the dossier's 00-intake.md and partially fills 01-brand.json.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { Sku, Vertical } from "./dossier";

const DAY14_CUSTOMERS_DIR = path.join(
  homedir(),
  "Documents/businesses/day14/customers"
);

export type IntakeSource = "typeform" | "notion" | "custom" | "manual";

export interface IntakeFieldMap {
  // Map from Day14's canonical field names to what arrived in the payload
  company_name: string;
  owner_name?: string;
  city?: string;
  service_radius?: string;
  phone: string;
  email: string;
  domain?: string;
  existing_website?: string;
  service_description?: string;
  typical_customer?: string;
  pricing?: string;
  how_customers_find?: string;
  contact_preference?: string;
  current_pain?: string;
  wish_for?: string;
  previous_bad_experience?: string;
  brand_colors?: string;
  avoid_colors?: string;
  liked_websites?: string;
  tone_preference?: string;
  logo_uploaded?: boolean;
  photos_uploaded_count?: number;
  takes_online_payments?: string;
  current_crm?: string;
  current_email_list?: string;
  timing_constraint?: string;
  launch_success_definition?: string;
  sku?: Sku;
  vertical?: Vertical;
  raw?: Record<string, unknown>;
}

export interface ParsedIntake {
  fields: IntakeFieldMap;
  validation_issues: string[];
  confidence: number;
}

/**
 * Parse a raw intake payload (varies by source) into the canonical shape.
 */
export function parseIntakePayload(
  payload: Record<string, unknown>,
  source: IntakeSource
): ParsedIntake {
  const issues: string[] = [];

  let fields: IntakeFieldMap;
  switch (source) {
    case "typeform":
      fields = parseTypeform(payload, issues);
      break;
    case "notion":
      fields = parseNotion(payload, issues);
      break;
    case "custom":
      fields = parseCustomForm(payload, issues);
      break;
    case "manual":
      // Already in our canonical shape
      fields = payload as unknown as IntakeFieldMap;
      break;
    default:
      throw new Error(`Unknown intake source: ${source}`);
  }

  // Validation
  if (!fields.email || !/^[^@]+@[^@]+\.[^@]+$/.test(fields.email)) {
    issues.push("Missing or invalid email");
  }
  if (!fields.company_name || fields.company_name.trim().length < 2) {
    issues.push("Missing or invalid company name");
  }
  if (fields.phone) {
    // Normalize to E.164 — strip non-digits, prepend +1 if 10 digits
    const digits = fields.phone.replace(/\D/g, "");
    if (digits.length === 10) {
      fields.phone = `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      fields.phone = `+${digits}`;
    } else {
      issues.push(`Phone format unclear: ${fields.phone}`);
    }
  }

  const confidence = issues.length === 0 ? 0.95 : 0.95 - issues.length * 0.1;

  return { fields, validation_issues: issues, confidence };
}

function parseTypeform(
  payload: Record<string, unknown>,
  issues: string[]
): IntakeFieldMap {
  // Typeform sends { form_response: { answers: [{ field: { id, ref }, type, ... }] } }
  // Simplified: assume the form has been set up with `ref` matching our canonical names.
  const fr = (payload.form_response ?? payload) as Record<string, unknown>;
  const answers = (fr.answers ?? []) as Array<Record<string, unknown>>;

  const map: Record<string, unknown> = {};
  for (const a of answers) {
    const field = a.field as { ref?: string; id?: string } | undefined;
    const ref = field?.ref ?? field?.id;
    if (!ref) continue;

    // Typeform answer value lives in a different field per type
    const val =
      a.text ??
      a.email ??
      a.phone_number ??
      a.url ??
      a.number ??
      (a.choice as { label?: string } | undefined)?.label ??
      (a.boolean as boolean | undefined);
    map[ref] = val;
  }

  return {
    company_name: String(map.company_name ?? ""),
    owner_name: String(map.owner_name ?? "") || undefined,
    email: String(map.email ?? ""),
    phone: String(map.phone ?? ""),
    city: String(map.city ?? "") || undefined,
    service_description: String(map.service_description ?? "") || undefined,
    typical_customer: String(map.typical_customer ?? "") || undefined,
    pricing: String(map.pricing ?? "") || undefined,
    current_pain: String(map.current_pain ?? "") || undefined,
    wish_for: String(map.wish_for ?? "") || undefined,
    brand_colors: String(map.brand_colors ?? "") || undefined,
    tone_preference: String(map.tone_preference ?? "") || undefined,
    sku: map.sku as Sku | undefined,
    vertical: map.vertical as Vertical | undefined,
    raw: payload,
  };
}

function parseNotion(
  payload: Record<string, unknown>,
  issues: string[]
): IntakeFieldMap {
  // Notion database webhook — properties keyed by column name
  const props = payload.properties as Record<string, unknown> | undefined;
  if (!props) {
    issues.push("Notion payload missing properties");
    return { company_name: "", email: "", phone: "", raw: payload };
  }

  // Helper to read Notion property values
  const read = (key: string): string | undefined => {
    const prop = props[key] as Record<string, unknown> | undefined;
    if (!prop) return undefined;
    // Notion returns props as { type: 'rich_text', rich_text: [{ plain_text }] } etc.
    const type = prop.type as string;
    if (type === "title" || type === "rich_text") {
      const arr = (prop[type] as Array<{ plain_text?: string }>) ?? [];
      return arr.map((x) => x.plain_text ?? "").join("");
    }
    if (type === "email") return prop.email as string;
    if (type === "phone_number") return prop.phone_number as string;
    if (type === "select")
      return (prop.select as { name?: string } | undefined)?.name;
    if (type === "url") return prop.url as string;
    return undefined;
  };

  return {
    company_name: read("Company Name") ?? "",
    owner_name: read("Owner Name"),
    email: read("Email") ?? "",
    phone: read("Phone") ?? "",
    city: read("City"),
    service_description: read("Service Description"),
    sku: read("SKU") as Sku | undefined,
    vertical: read("Vertical") as Vertical | undefined,
    raw: payload,
  };
}

function parseCustomForm(
  payload: Record<string, unknown>,
  issues: string[]
): IntakeFieldMap {
  // Day14's own intake form posts flat JSON matching the canonical field names
  return {
    company_name: String(payload.company_name ?? ""),
    owner_name: payload.owner_name ? String(payload.owner_name) : undefined,
    email: String(payload.email ?? ""),
    phone: String(payload.phone ?? ""),
    city: payload.city ? String(payload.city) : undefined,
    service_description: payload.service_description
      ? String(payload.service_description)
      : undefined,
    typical_customer: payload.typical_customer
      ? String(payload.typical_customer)
      : undefined,
    pricing: payload.pricing ? String(payload.pricing) : undefined,
    current_pain: payload.current_pain
      ? String(payload.current_pain)
      : undefined,
    wish_for: payload.wish_for ? String(payload.wish_for) : undefined,
    brand_colors: payload.brand_colors
      ? String(payload.brand_colors)
      : undefined,
    tone_preference: payload.tone_preference
      ? String(payload.tone_preference)
      : undefined,
    sku: payload.sku as Sku | undefined,
    vertical: payload.vertical as Vertical | undefined,
    raw: payload,
  };
}

/**
 * Apply parsed intake to a customer's dossier:
 * - Fill in 00-intake.md (answer-by-answer)
 * - Update 01-brand.json with intake-derivable fields
 */
export async function applyIntakeToDossier(
  slug: string,
  parsed: ParsedIntake
): Promise<{ files_updated: string[] }> {
  const customerDir = path.join(DAY14_CUSTOMERS_DIR, slug);
  const filesUpdated: string[] = [];

  // 1. Update 00-intake.md — append the responses
  const intakePath = path.join(customerDir, "00-intake.md");
  let intakeContent: string;
  try {
    intakeContent = await fs.readFile(intakePath, "utf8");
  } catch {
    intakeContent = "# Intake responses\n\n";
  }

  const responseBlock = `\n## Responses (received ${new Date().toISOString()})\n\n${formatFieldsAsMarkdown(parsed.fields)}\n${parsed.validation_issues.length > 0 ? `\n### Validation issues\n\n${parsed.validation_issues.map((i) => `- ${i}`).join("\n")}\n` : ""}`;

  await fs.writeFile(intakePath, intakeContent + responseBlock, "utf8");
  filesUpdated.push("00-intake.md");

  // 2. Update 01-brand.json with intake-derivable fields
  const brandPath = path.join(customerDir, "01-brand.json");
  let brand: Record<string, unknown> = {};
  try {
    brand = JSON.parse(await fs.readFile(brandPath, "utf8"));
  } catch {
    // brand.json may not exist yet; create
  }

  const company =
    (brand.company as Record<string, unknown> | undefined) ?? {};
  const contact =
    (brand.contact as Record<string, unknown> | undefined) ?? {};
  const meta = (brand._meta as Record<string, unknown> | undefined) ?? {};

  company.name = parsed.fields.company_name;
  if (parsed.fields.owner_name) {
    company.owner_name = parsed.fields.owner_name;
  }
  contact.email = parsed.fields.email;
  contact.phone = parsed.fields.phone;
  if (parsed.fields.city) {
    contact.address = contact.address ?? {};
    (contact.address as Record<string, unknown>).city = parsed.fields.city;
  }
  if (parsed.fields.sku) brand.sku = parsed.fields.sku;
  if (parsed.fields.vertical) brand.vertical = parsed.fields.vertical;

  meta.intake_completed_at = new Date().toISOString();
  meta.intake_confidence = parsed.confidence;

  brand.company = company;
  brand.contact = contact;
  brand._meta = meta;

  await fs.writeFile(brandPath, JSON.stringify(brand, null, 2), "utf8");
  filesUpdated.push("01-brand.json");

  return { files_updated: filesUpdated };
}

function formatFieldsAsMarkdown(fields: IntakeFieldMap): string {
  const skip = new Set(["raw"]);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (skip.has(key) || value === undefined || value === null || value === "")
      continue;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`**${label}:** ${value}`);
    lines.push("");
  }
  return lines.join("\n");
}
