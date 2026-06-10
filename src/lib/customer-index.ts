/**
 * customer-index — cached in-memory lookup over customer dossiers.
 *
 * Replaces the O(n)-file-reads-per-lookup pattern of scanning every
 * ~/Documents/businesses/_shared/customers/{slug}/01-brand.json to
 * resolve a customer by email / stripe_customer_id.
 *
 * Builds the index from each customer's 01-brand.json on first use,
 * caches it in module memory, and invalidates on:
 *   - 60s TTL expiry, OR
 *   - the customers directory mtime changing (new/removed dossiers)
 *
 * Writers that create dossiers can call invalidateCustomerIndex() to
 * force a rebuild on the next lookup.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import { logError } from "./work-register";

export interface CustomerIndexEntry {
  slug: string;
  email?: string;
  stripe_customer_id?: string;
  brand: Record<string, unknown>;
}

interface IndexCache {
  customersDir: string;
  builtAt: number;
  dirMtimeMs: number;
  bySlug: Map<string, CustomerIndexEntry>;
  byEmail: Map<string, CustomerIndexEntry>;
  byStripeId: Map<string, CustomerIndexEntry>;
}

const TTL_MS = 60_000;

let cache: IndexCache | null = null;

function customersDir(): string {
  // Computed at call time (not module load) so tests can point HOME at a tmp dir.
  return path.join(homedir(), "Documents/businesses/_shared/customers");
}

/** Drop the cached index; next lookup rebuilds from disk. */
export function invalidateCustomerIndex(): void {
  cache = null;
}

async function buildIndex(dir: string): Promise<IndexCache> {
  const bySlug = new Map<string, CustomerIndexEntry>();
  const byEmail = new Map<string, CustomerIndexEntry>();
  const byStripeId = new Map<string, CustomerIndexEntry>();

  let dirMtimeMs = 0;
  let slugs: string[] = [];
  try {
    const stat = await fs.stat(dir);
    dirMtimeMs = stat.mtimeMs;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    // No customers dir yet — empty index is valid
  }

  for (const slug of slugs) {
    const brandPath = path.join(dir, slug, "01-brand.json");
    let brand: Record<string, unknown>;
    try {
      brand = JSON.parse(await fs.readFile(brandPath, "utf8")) as Record<string, unknown>;
    } catch (err) {
      // Missing 01-brand.json is normal for half-initialized dossiers;
      // malformed JSON is worth surfacing.
      if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
        await logError("customer-index", err, `customer-${slug}`, "malformed 01-brand.json");
      }
      continue;
    }

    const entry: CustomerIndexEntry = {
      slug,
      email: typeof brand.email === "string" ? brand.email : undefined,
      stripe_customer_id:
        typeof brand.stripe_customer_id === "string" ? brand.stripe_customer_id : undefined,
      brand,
    };
    bySlug.set(slug, entry);
    if (entry.email) byEmail.set(entry.email.toLowerCase(), entry);
    if (entry.stripe_customer_id) byStripeId.set(entry.stripe_customer_id, entry);
  }

  return {
    customersDir: dir,
    builtAt: Date.now(),
    dirMtimeMs,
    bySlug,
    byEmail,
    byStripeId,
  };
}

async function getIndex(): Promise<IndexCache> {
  const dir = customersDir();

  if (cache && cache.customersDir === dir && Date.now() - cache.builtAt < TTL_MS) {
    // Within TTL: still do a cheap dir-mtime check so brand-new dossiers
    // (added/removed folders) appear immediately rather than after 60s.
    try {
      const stat = await fs.stat(dir);
      if (stat.mtimeMs === cache.dirMtimeMs) return cache;
    } catch {
      // dir missing — fall through to rebuild (empty index)
    }
  }

  cache = await buildIndex(dir);
  return cache;
}

export async function lookupByEmail(email: string): Promise<CustomerIndexEntry | null> {
  if (!email) return null;
  const idx = await getIndex();
  return idx.byEmail.get(email.toLowerCase()) ?? null;
}

export async function lookupByStripeId(
  stripeCustomerId: string
): Promise<CustomerIndexEntry | null> {
  if (!stripeCustomerId) return null;
  const idx = await getIndex();
  return idx.byStripeId.get(stripeCustomerId) ?? null;
}

export async function lookupBySlug(slug: string): Promise<CustomerIndexEntry | null> {
  if (!slug) return null;
  const idx = await getIndex();
  return idx.bySlug.get(slug) ?? null;
}

/** All indexed customers (read-only view over the cached index). */
export async function listCustomers(): Promise<CustomerIndexEntry[]> {
  const idx = await getIndex();
  return [...idx.bySlug.values()];
}

/**
 * Substring search over slug, email, and 01-brand.json string fields
 * (name, vertical, status, etc.). Case-insensitive.
 */
export async function searchCustomers(query: string): Promise<CustomerIndexEntry[]> {
  const q = query.trim().toLowerCase();
  const all = await listCustomers();
  if (!q) return all;
  return all.filter((entry) => {
    if (entry.slug.toLowerCase().includes(q)) return true;
    if (entry.email && entry.email.toLowerCase().includes(q)) return true;
    return Object.values(entry.brand).some(
      (v) => typeof v === "string" && v.toLowerCase().includes(q)
    );
  });
}
