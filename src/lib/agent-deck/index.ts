/**
 * agent-deck — the service entry every surface calls.
 *
 * Picks the storage adapter behind the DeckRepository contract. Today: file.
 * When a Platform customer needs hosted isolation, set DAY14_DECK_BACKEND=supabase
 * and add a SupabaseDeckRepository implementing the same interface — no caller
 * (page, API, write path) changes.
 *
 *   const state = await getDeck(null);           // god-view (admin of admins)
 *   const state = await getDeck("splash-jacks");  // one tenant, scoped
 *   await resolveDeckTap(tenant, "todo", id, "approve");
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { DeckRepository, DeckState, TapKind, TapResult } from "./types";
import { FileDeckRepository } from "./file-repository";

export * from "./types";

/** Known tenant slugs (from tenants.json today; the Supabase adapter will own this later). */
export async function isKnownTenant(slug: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(path.join(homedir(), "Documents/businesses/_shared/tenants.json"), "utf8");
    const d = JSON.parse(raw) as { tenants?: Array<{ slug?: string }> };
    return Array.isArray(d.tenants) && d.tenants.some((t) => t.slug === slug);
  } catch {
    return false;
  }
}

/** All known tenants (slug + display name) for the god-view tenant switcher. */
export async function listTenants(): Promise<Array<{ slug: string; name: string }>> {
  try {
    const raw = await fs.readFile(path.join(homedir(), "Documents/businesses/_shared/tenants.json"), "utf8");
    const d = JSON.parse(raw) as { tenants?: Array<{ slug?: string; display_name?: string; name?: string }> };
    return (Array.isArray(d.tenants) ? d.tenants : [])
      .filter((t): t is { slug: string; display_name?: string; name?: string } => typeof t.slug === "string")
      .map((t) => ({ slug: t.slug, name: t.display_name || t.name || t.slug }));
  } catch {
    return [];
  }
}

const DEFAULT_ACCENT = "#56b3ff";

/** Per-tenant white-label brand (display name + accent) so the deck wears the
 *  customer's identity, not Day14's. Sourced from tenants.json today. */
export async function getTenantBrand(slug: string | null): Promise<import("./types").TenantBrand> {
  if (!slug) return { name: "Day14", accent: DEFAULT_ACCENT };
  try {
    const raw = await fs.readFile(path.join(homedir(), "Documents/businesses/_shared/tenants.json"), "utf8");
    const d = JSON.parse(raw) as { tenants?: Array<{ slug?: string; display_name?: string; name?: string; primary_color?: string }> };
    const t = Array.isArray(d.tenants) ? d.tenants.find((x) => x.slug === slug) : undefined;
    const name = t?.display_name || t?.name || slug;
    let accent = DEFAULT_ACCENT;
    const raw6 = (t?.primary_color || "").replace(/^#/, "");
    if (/^[0-9a-f]{6}$/i.test(raw6)) accent = `#${raw6}`;
    return { name, accent };
  } catch {
    return { name: slug, accent: DEFAULT_ACCENT };
  }
}

let repo: DeckRepository | null = null;

function getRepository(): DeckRepository {
  if (repo) return repo;
  const backend = process.env.DAY14_DECK_BACKEND || "file";
  switch (backend) {
    // case "supabase": repo = new SupabaseDeckRepository(); break;  // future
    case "file":
    default:
      repo = new FileDeckRepository();
  }
  return repo;
}

export function getDeck(tenant: string | null = null): Promise<DeckState> {
  return getRepository().getState(tenant);
}

export function resolveDeckTap(
  tenant: string | null,
  kind: TapKind,
  id: string,
  decision: "approve" | "deny",
): Promise<TapResult> {
  return getRepository().resolveTap(tenant, kind, id, decision);
}
