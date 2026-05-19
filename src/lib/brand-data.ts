/**
 * brand-data.ts — server-side data fetchers used by /brands/[slug]/* pages.
 * Pulls products from Printify, blog posts from filesystem, etc.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const PRINTIFY_API = "https://api.printify.com/v1";

interface PrintifyProduct {
  id: string;
  title: string;
  description?: string;
  visible?: boolean;
  images?: Array<{ src: string }>;
  variants?: Array<{ price: number; is_enabled: boolean }>;
  minPrice?: number | null;
}

async function fetchAllProducts(): Promise<PrintifyProduct[]> {
  const apiKey = process.env.PRINTIFY_API_KEY;
  if (!apiKey) return [];
  try {
    const sR = await fetch(`${PRINTIFY_API}/shops.json`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    });
    if (!sR.ok) return [];
    const shops = (await sR.json()) as Array<{ id: number }>;
    if (!shops.length) return [];
    const pR = await fetch(`${PRINTIFY_API}/shops/${shops[0]!.id}/products.json?limit=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    });
    if (!pR.ok) return [];
    const data = (await pR.json()) as { data?: PrintifyProduct[] };
    return (data.data || []).filter((p) => p.visible !== false).map((p) => ({
      ...p,
      minPrice: (() => {
        const enabled = (p.variants || []).filter((v) => v.is_enabled);
        if (!enabled.length) return null;
        return Math.min(...enabled.map((v) => v.price));
      })(),
    }));
  } catch {
    return [];
  }
}

export async function fetchTenantProducts(_slug: string) {
  return await fetchAllProducts();
}

export async function fetchProduct(_slug: string, id: string) {
  const all = await fetchAllProducts();
  return all.find((p) => p.id === id) || null;
}

interface BlogPost { slug: string; title: string; date: string; meta_description: string; word_count: number; html: string; }

async function loadBlogDrafts(slug: string): Promise<BlogPost[]> {
  const dir = path.join(BIZ, slug, "blog-drafts");
  if (!existsSync(dir)) return [];
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
  const posts: BlogPost[] = [];
  for (const f of files) {
    try {
      const text = await fs.readFile(path.join(dir, f), "utf8");
      const fm = text.match(/^---([\s\S]+?)---/);
      if (!fm) continue;
      const meta: Record<string, string> = {};
      for (const line of fm[1]!.split("\n")) {
        const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
        if (m) meta[m[1]!] = m[2]!.replace(/^"|"$/g, "");
      }
      if (meta.status !== "live") continue; // only published posts
      const body = text.replace(/^---[\s\S]+?---/, "").trim();
      posts.push({
        slug: meta.slug || f.replace(/\.md$/, ""),
        title: meta.title || "Untitled",
        date: meta.date || "",
        meta_description: meta.meta_description || "",
        word_count: parseInt(meta.word_count || "0", 10),
        html: body.replace(/\n\n/g, "</p><p>").replace(/^/, "<p>") + "</p>",
      });
    } catch {}
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchBlogPosts(slug: string) { return await loadBlogDrafts(slug); }
export async function fetchLatestBlogPosts(slug: string, n: number) { return (await loadBlogDrafts(slug)).slice(0, n); }
export async function fetchBlogPost(slug: string, postSlug: string) {
  const posts = await loadBlogDrafts(slug);
  return posts.find((p) => p.slug === postSlug) || null;
}

export async function fetchTenantAbout(slug: string): Promise<string> {
  const constPath = path.join(BIZ, slug, "CONSTITUTION.md");
  if (!existsSync(constPath)) return "<p>About info coming soon.</p>";
  const text = await fs.readFile(constPath, "utf8");
  const sec = text.match(/## What this business is\s*\n+([\s\S]+?)(\n## |$)/);
  const body = (sec?.[1] || text.slice(0, 1500)).trim();
  return body.replace(/\n\n/g, "</p><p>").replace(/^/, "<p>") + "</p>";
}
