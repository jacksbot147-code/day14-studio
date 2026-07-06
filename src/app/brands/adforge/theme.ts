// Brand theme + content for AdForge — Day14's sister company for scored
// short-form video ads. AdForge runs its own standalone product site (separate
// repo: ~/Claude/Projects/AdForge, Vercel project "ad-forge"); this page is
// the Day14-side presence that introduces it and links out.
//
// HONESTY RULES (inherited from both repos): no fabricated customers,
// metrics, or testimonials. The proof stats below are REAL predictor output
// for a clearly-fictional demo brand (Everdew) — say so wherever they appear.
// NO hard-coded pricing here: pricing lives in the AdForge repo's
// src/lib/pricing.ts single source of truth; this page links out instead
// (also keeps Day14's check:prices guard happy).
import type { BrandTheme } from "@/components/brand/theme";

export const brandTheme = {
  slug: "adforge",
  displayName: "AdForge",
  tagline: "Know which ad wins before you spend a cent.",
  colors: {
    primary: "#be185d",
    secondary: "#ec4899",
    accent: "#fce7f1",
    bg: "#fdf2f8",
    surface: "#ffffff",
    text: "#52122f",
    muted: "#8a4a66",
  },
  fonts: {
    heading: "'Archivo', system-ui, -apple-system, sans-serif",
    body: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  },
} satisfies BrandTheme;

/** The standalone product site (pre-launch: behind Vercel Deployment Protection until Jack ships). */
export const ADFORGE_URL = "https://ad-forge.vercel.app";

export const steps = [
  {
    title: "Paste a product or business",
    blurb:
      "A URL, or a name and one line of copy — DTC product or local service business. That's the whole brief.",
  },
  {
    title: "A batch is forged",
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
