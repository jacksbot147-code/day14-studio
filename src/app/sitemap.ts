import type { MetadataRoute } from "next";
import { CAPABILITY_DETAILS } from "@/components/cinematic/capabilityDetail";

const BASE = "https://day14.us";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/platform`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    ...CAPABILITY_DETAILS.map((d) => ({
      url: `${BASE}/platform/${d.id}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/geo`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/book`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/case-studies/splash-jacks-pools`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/case-studies/alignmd`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/process`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/calculator`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/refunds`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  return core;
}
