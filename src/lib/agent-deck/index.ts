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
