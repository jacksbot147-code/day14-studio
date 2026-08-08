/**
 * insights.ts — the /insights content store.
 *
 * Weekly "AI update" articles for local service-business owners. Content
 * lives in public/data/insights/ as plain Markdown, with index.json as the
 * manifest — same shape as the other public/data surfaces (changelog.json,
 * brand-sites.json) so a post is published by adding a file and one manifest
 * entry, no code change.
 *
 * Why this exists: unlinked brand mentions correlate far more strongly with
 * AI-answer citation than backlinks do, so an indexed, regularly-updated
 * surface on the owned domain is the highest-leverage GEO asset Day14 has.
 * It also dogfoods the GEO product.
 *
 *   public/data/insights/index.json                 the manifest
 *   public/data/insights/<date>-<slug>.md           one article per file
 *
 * The body filename is derived as `${date}-${slug}.md` (with a bare
 * `${slug}.md` fallback), so the manifest carries no path and can never
 * drift from the file it names.
 *
 * Loaders are shared by the /insights pages, sitemap.ts, and llms.txt so all
 * three read one source of truth.
 */

import fs from "node:fs/promises";
import path from "node:path";

export type InsightPost = {
  /** URL segment: /insights/<slug>. Lowercase, digits and dashes only. */
  slug: string;
  title: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** One or two sentences, used on the index, in metadata, and in llms.txt. */
  summary: string;
  tags: string[];
  readingMinutes: number;
};

export type InsightsManifest = { posts: InsightPost[] };

const INSIGHTS_DIR = path.join(process.cwd(), "public", "data", "insights");

/** Slugs are path segments AND filename fragments — keep them boring. */
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidPost(value: unknown): value is InsightPost {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.slug === "string" &&
    SAFE_SLUG.test(p.slug) &&
    typeof p.title === "string" &&
    typeof p.date === "string" &&
    ISO_DATE.test(p.date) &&
    typeof p.summary === "string" &&
    Array.isArray(p.tags) &&
    p.tags.every((t) => typeof t === "string") &&
    typeof p.readingMinutes === "number"
  );
}

/**
 * Every published post, newest first. Returns [] (never throws) when the
 * manifest is missing or malformed, so a bad edit degrades to an empty page
 * instead of a 500 — same posture as loadChangelog().
 */
export async function loadInsights(): Promise<InsightPost[]> {
  try {
    const raw = await fs.readFile(path.join(INSIGHTS_DIR, "index.json"), "utf-8");
    const parsed = JSON.parse(raw) as Partial<InsightsManifest>;
    const posts = Array.isArray(parsed.posts) ? parsed.posts : [];
    return posts
      .filter(isValidPost)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  } catch {
    return [];
  }
}

/** One post by slug, or null when the slug isn't published. */
export async function getInsight(slug: string): Promise<InsightPost | null> {
  if (!SAFE_SLUG.test(slug)) return null;
  const posts = await loadInsights();
  return posts.find((p) => p.slug === slug) ?? null;
}

/**
 * The Markdown body for a post. Tries `<date>-<slug>.md` first (the filing
 * convention), then `<slug>.md`. Returns null when neither exists.
 */
export async function loadInsightBody(post: InsightPost): Promise<string | null> {
  const candidates = [`${post.date}-${post.slug}.md`, `${post.slug}.md`];
  for (const name of candidates) {
    try {
      return await fs.readFile(path.join(INSIGHTS_DIR, name), "utf-8");
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/** "July 27, 2026" — noon UTC so the date never slips a day by timezone. */
export function formatInsightDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function insightPath(slug: string): string {
  return `/insights/${slug}`;
}
