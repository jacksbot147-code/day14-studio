import type { MetadataRoute } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import { blogPosts } from "./brands/kennum-lawn-care/blog-posts";

const BASE = "https://day14.us";

const KENNUM = `${BASE}/brands/kennum-lawn-care`;
const HFC = `${BASE}/brands/hot-flash-co`;
const LIFELOOP = `${BASE}/brands/life-loophole`;

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

function hotFlashCoUrls(now: Date): MetadataRoute.Sitemap {
  // Static surface for hot-flash-co. Live products and blog posts are
  // enumerated dynamically by /brands/hot-flash-co/sitemap.xml.
  return [
    { url: `${HFC}/products`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${HFC}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${HFC}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${HFC}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}

function lifeLoopholeUrls(now: Date): MetadataRoute.Sitemap {
  return [
    { url: `${LIFELOOP}/advisor`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
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

  // Primary marketing surface — build-studio positioning. Priorities and
  // changeFrequency per the T7 spec: 1.0 for home; 0.8 for the three core
  // conversion/proof pages (work-with-us, process, status); 0.6 for the
  // rest. lastModified is the build time so crawlers see a fresh stamp.
  const primary: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/work-with-us`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/process`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/status`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/stack`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/compare`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/case-studies/alignmd`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/case-studies/casamore`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/case-studies/buildbridge`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/case-studies/splash-jacks-pools`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/case-studies/hot-flash-co`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/brands`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/press`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  // Secondary / utility routes kept from the prior sitemap so existing
  // coverage doesn't regress. Not part of the T7 primary-route spec.
  const secondary: MetadataRoute.Sitemap = [
    { url: `${BASE}/builds`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/newsletter`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/tools`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/verticals/mobile-service`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/verticals/membership`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/verticals/food`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/refunds`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  return [
    ...primary,
    ...secondary,
    ...kennumUrls(now),
    ...hotFlashCoUrls(now),
    ...lifeLoopholeUrls(now),
    ...(await brandSiteUrls(now)),
  ];
}
