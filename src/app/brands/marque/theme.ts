// Brand theme + content for Marque (formerly AdForge) — Day14's sister company
// for brand-grade short-form video ads. Marque runs its own standalone product
// site (separate repo on disk: ~/Claude/Projects/AdForge, Vercel project
// "ad-forge"); this page is the Day14-side presence that introduces it and links
// out. (The product was renamed AdForge -> Marque on 2026-07-07; the repo folder
// still reads "AdForge" until Jack renames it.)
//
// HONESTY RULES (inherited from both repos): no fabricated customers,
// metrics, or testimonials. The proof stats below are REAL predictor output
// for a clearly-fictional demo brand (Everdew) — say so wherever they appear.
// NO hard-coded pricing here: pricing lives in the product repo's
// src/lib/pricing.ts single source of truth; this page links out instead
// (also keeps Day14's check:prices guard happy).
import type { BrandTheme } from "@/components/brand/theme";

export const brandTheme = {
  slug: "marque",
  displayName: "Marque",
  tagline: "Make your mark.",
  colors: {
    primary: "#1b160b",
    secondary: "#9a6a12",
    accent: "#f1e7cf",
    bg: "#faf7ef",
    surface: "#ffffff",
    text: "#2a2416",
    muted: "#6f6753",
  },
  fonts: {
    heading: "'Archivo', system-ui, -apple-system, sans-serif",
    body: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  },
} satisfies BrandTheme;

/**
 * The standalone product site. IMPORTANT: ad-forge.vercel.app (no suffix) is
 * NOT ours — it serves a third-party app ("AdsFuel"). Our project's public
 * domain is ad-forge-amber.vercel.app (verified via Vercel API 2026-07-06).
 * This becomes marque.day14.us once Jack points that subdomain at the project.
 */
export const MARQUE_URL = "https://ad-forge-amber.vercel.app";

export const steps = [
  {
    title: "Paste a product or business",
    blurb:
      "A URL, or a name and one line of copy — DTC product or local service business. That's the whole brief.",
  },
  {
    title: "A batch is built",
    blurb:
      "Distinct hooks — problem-agitate, UGC, demo, pattern-interrupt — scripted, voiced, and cut 9:16 for TikTok, Reels, and Shorts.",
  },
  {
    title: "Every ad is scored before spend",
    blurb:
      "A virality prediction on each ad — hook strength, retention risk, overall rank — so the losers are flagged before a dollar of media is bought.",
  },
] as const;

/**
 * REAL improve-loop proof (2026-07-06). Real Marketing Studio generations,
 * real virality-predictor scores. The advertised brand (Everdew) is a
 * fictional demo — the pipeline and the numbers are not.
 */
export const improveLoop = {
  v1: { hook: 32, overall: 49, sustain: 100 },
  v2: { hook: 39, overall: 53, sustain: 100 },
  whatChanged: "One concept change — the hook payoff moved to second 0 — then regenerated and rescored.",
  disclaimer:
    "Real AI generations and real predictor scores for a fictional demo brand. No customer data.",
} as const;
