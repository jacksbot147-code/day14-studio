import type { MetadataRoute } from "next";

const BASE = "https://day14.us";

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
    { url: `${BASE}/brands/hot-flash-co`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];
  return urls;
}
