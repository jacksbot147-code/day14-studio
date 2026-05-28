/**
 * brand-extractor — hand-coded impl.
 *
 * Triangulates brand assets from any subset of: existing website URL,
 * Facebook page, Google Business profile URL, Instagram handle. This
 * implementation focuses on the deterministic synthesis step: given
 * caller-provided raw signals, emit partial 01-brand.json fields with
 * confidence ranks. Network fetches are out of scope (callers do that).
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export interface BrandRawSignals {
  current_site_url?: string;
  current_site_html?: string; // raw HTML if caller fetched
  facebook_url?: string;
  google_business_url?: string;
  instagram_handle?: string;
  logo_dominant_hex?: string;
  facebook_cover_dominant_hex?: string;
  meta_theme_color?: string; // from <meta name="theme-color">
}

export interface BrandPartial {
  colors?: { primary?: string; accent?: string };
  social?: {
    facebook?: string;
    google_business?: string;
    instagram?: string;
  };
  logo?: { source_hint?: string };
  fonts?: { display?: string; body?: string; mono?: string };
  confidence: {
    colors_primary?: "logo" | "meta" | "facebook" | "asked";
    social: "high" | "medium" | "low";
    logo: "uploaded" | "extracted" | "missing";
  };
  needs_followup: string[];
}

function pickPrimary(signals: BrandRawSignals): { hex?: string; source: BrandPartial["confidence"]["colors_primary"] } {
  if (signals.logo_dominant_hex) return { hex: signals.logo_dominant_hex.toLowerCase(), source: "logo" };
  if (signals.meta_theme_color) return { hex: signals.meta_theme_color.toLowerCase(), source: "meta" };
  if (signals.facebook_cover_dominant_hex) return { hex: signals.facebook_cover_dominant_hex.toLowerCase(), source: "facebook" };
  return { hex: undefined, source: "asked" };
}

function pullMetaThemeColor(html?: string): string | undefined {
  if (!html) return undefined;
  const m = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i);
  return m?.[1];
}

export function extractBrand(signals: BrandRawSignals): BrandPartial {
  const merged: BrandRawSignals = {
    ...signals,
    meta_theme_color: signals.meta_theme_color || pullMetaThemeColor(signals.current_site_html),
  };
  const primary = pickPrimary(merged);
  const social: BrandPartial["social"] = {};
  if (merged.facebook_url) social.facebook = merged.facebook_url;
  if (merged.google_business_url) social.google_business = merged.google_business_url;
  if (merged.instagram_handle) {
    const h = merged.instagram_handle.replace(/^@/, "");
    social.instagram = `https://instagram.com/${h}`;
  }
  const socialCount = Object.keys(social).length;
  const socialConfidence: BrandPartial["confidence"]["social"] = socialCount >= 2 ? "high" : socialCount === 1 ? "medium" : "low";

  const needs: string[] = [];
  if (!primary.hex) needs.push("colors.primary — ask customer for brand color hex");
  if (!social.google_business) needs.push("social.google_business — fetch GBP URL");
  if (!signals.logo_dominant_hex) needs.push("logo — request from customer or fetch from site favicon/header");

  return {
    colors: primary.hex ? { primary: primary.hex } : undefined,
    social: socialCount ? social : undefined,
    logo: signals.logo_dominant_hex ? { source_hint: "extracted from logo upload" } : { source_hint: "missing — request from customer" },
    fonts: { display: "Inter", body: "Inter", mono: "JetBrains Mono" },
    confidence: {
      colors_primary: primary.source,
      social: socialConfidence,
      logo: signals.logo_dominant_hex ? "extracted" : "missing",
    },
    needs_followup: needs,
  };
}

export async function invokeBrandExtractor(signals: BrandRawSignals): Promise<BrandPartial> {
  const out = extractBrand(signals);
  await auditLog({
    action: "brand_extracted",
    actor: "automated:brand-extractor",
    details: { has_primary: !!out.colors?.primary, social_count: Object.keys(out.social ?? {}).length, logo_status: out.confidence.logo },
    skill_invoked: "brand-extractor",
    actor_source: "skill-runner",
  });
  return out;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = (ctx.inputs as Partial<BrandRawSignals> | undefined) ?? {};
  const result = await invokeBrandExtractor(input);
  return {
    ok: true,
    skill: "brand-extractor",
    path: "hand-coded",
    result,
    next_actions: result.needs_followup.length > 0 ? result.needs_followup : ["proceed to template-forker"],
  };
}
