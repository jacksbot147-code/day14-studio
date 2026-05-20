import type { MetadataRoute } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import { blogPosts } from "./brands/kennum-lawn-care/blog-posts";

const BASE = "https://day14.us";

const KENNUM = `${BASE}/brands/kennum-lawn-care`;

function kennumUrls(now: Date): MetadataRoute.Sitemap {
  return [
    { url: `${KENNUM}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${KENNUM}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${KENNUM}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${KENNUM}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...blogPosts.map((p) => ({
      url: `${KENNUM}/blog/${p.slug}`,
      lastModified: new Date(`${p.date}T12:00:00Z`),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}

async function brandSiteUrls(now: Date): Promise<MetadataRoute.Sitemap> {
  try {
    const f = path.join(process.cwd(), "public/data/brand-sites.json");
    const data = JSON.parse(await fs.readFile(f, "utf8")) as { sites?: Array<{ slug: string }> };
    return (data.sites || []).map((s) => ({
      url: `${BASE}/brands/${s.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/stack`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/builds`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/newsletter`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/press`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/tools`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/refunds`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/case-studies/splash-jacks-pools`, lastModified: now, priority: 0.8 },
    { url: `${BASE}/case-studies/casamore`, lastModified: now, priority: 0.7 },
    { url: `${BASE}/case-studies/buildbridge`, lastModified: now, priority: 0.7 },
    { url: `${BASE}/case-studies/hot-flash-co`, lastModified: now, priority: 0.7 },
    { url: `${BASE}/verticals/mobile-service`, lastModified: now, priority: 0.6 },
    { url: `${BASE}/verticals/membership`, lastModified: now, priority: 0.6 },
    { url: `${BASE}/verticals/food`, lastModified: now, priority: 0.6 },
    { url: `${BASE}/brands`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];
  return [...urls, ...kennumUrls(now), ...(await brandSiteUrls(now))];
}
