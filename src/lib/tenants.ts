/**
 * tenants — registry + loader.
 *
 * Reads ~/Documents/businesses/_shared/tenants.json. Provides typed
 * access to tenant list and tenant-type metadata. Used by dashboard,
 * dispatcher, and per-tenant skills.
 *
 * The file is the source of truth — edit it (or use the Telegram /new-tenant
 * command once wired) rather than hand-editing per-tenant in code.
 */

import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

const REGISTRY_PATH = path.join(
  homedir(),
  "Documents/businesses/_shared/tenants.json"
);

export type TenantStatus = "active" | "paused" | "archived";

export interface TenantBilling {
  stripe_account: string;
  tier: string | null;
  monthly_amount: number;
}

export interface Tenant {
  slug: string;
  name: string;
  type: string;
  status: TenantStatus;
  owner: string;
  domain?: string;
  primary_color?: string;
  intake_form?: string;
  enabled_skill_packs: string[];
  billing: TenantBilling;
  notes?: string;
}

export interface TenantType {
  label: string;
  intake_fields: string[];
  default_skill_packs: string[];
}

export interface TenantRegistry {
  schema_version: number;
  tenants: Tenant[];
  tenant_types: Record<string, TenantType>;
}

let _cache: { registry: TenantRegistry; loadedAt: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30s

function loadRegistry(): TenantRegistry {
  const now = Date.now();
  if (_cache && now - _cache.loadedAt < CACHE_TTL_MS) {
    return _cache.registry;
  }
  try {
    const text = fs.readFileSync(REGISTRY_PATH, "utf8");
    const parsed = JSON.parse(text) as TenantRegistry;
    _cache = { registry: parsed, loadedAt: now };
    return parsed;
  } catch {
    // No registry yet — return empty
    return { schema_version: 1, tenants: [], tenant_types: {} };
  }
}

/**
 * Map a `stage` value (newer-schema entries use this) to a dashboard
 * `status` bucket when an explicit `status` is absent.
 *   active   → active   ·  launching → active (in-market)
 *   planning → paused   ·  anything else → active (so it never hides)
 */
function stageToStatus(stage: unknown): TenantStatus {
  if (stage === "active" || stage === "launching") return "active";
  if (stage === "planning") return "paused";
  if (stage === "paused" || stage === "archived") return stage;
  return "active";
}

/**
 * Coerce any registry entry into a complete Tenant. Older entries use
 * `name`/`status`/`billing`; newer ones use `display_name`/`stage` and omit
 * billing. Without this, an entry missing `status` falls into no dashboard
 * bucket and silently disappears, and a missing `name` renders blank.
 */
function normalizeTenant(raw: Tenant & { display_name?: string; stage?: string }): Tenant {
  return {
    ...raw,
    name: raw.name ?? raw.display_name ?? raw.slug,
    status: raw.status ?? stageToStatus(raw.stage),
    owner: raw.owner ?? "jack",
    enabled_skill_packs: raw.enabled_skill_packs ?? [],
    billing: raw.billing ?? { stripe_account: "default", tier: null, monthly_amount: 0 },
  };
}

export function getTenants(): Tenant[] {
  return loadRegistry().tenants.map((t) => normalizeTenant(t));
}

export function getActiveTenants(): Tenant[] {
  return getTenants().filter((t) => t.status === "active");
}

export function getTenant(slug: string): Tenant | undefined {
  return getTenants().find((t) => t.slug === slug);
}

export function getTenantTypes(): Record<string, TenantType> {
  return loadRegistry().tenant_types;
}

export function getTenantType(typeKey: string): TenantType | undefined {
  return getTenantTypes()[typeKey];
}

export function getTotalMonthlyRevenue(): number {
  return getActiveTenants().reduce(
    (sum, t) => sum + (t.billing?.monthly_amount || 0),
    0
  );
}

/**
 * Mutate the registry (server-side only).
 * Adds, updates, or removes a tenant. Persists synchronously.
 */
export function upsertTenant(tenant: Tenant): void {
  const registry = loadRegistry();
  const idx = registry.tenants.findIndex((t) => t.slug === tenant.slug);
  if (idx >= 0) {
    registry.tenants[idx] = tenant;
  } else {
    registry.tenants.push(tenant);
  }
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
  _cache = null; // invalidate
}

export function archiveTenant(slug: string): boolean {
  const registry = loadRegistry();
  const t = registry.tenants.find((x) => x.slug === slug);
  if (!t) return false;
  t.status = "archived";
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
  _cache = null;
  return true;
}
