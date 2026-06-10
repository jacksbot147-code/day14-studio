import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BuildReveal } from "@/components/landing/build-reveal";
import { CmdKPalette } from "@/components/landing/cmd-k-palette";
import { StatusLine } from "@/components/landing/status-line";
import { ProfessionalHero } from "@/components/landing/professional-hero";
import { WorkLogTicker } from "@/components/landing/work-log-ticker";
import { DeployStrip } from "@/components/deploy-strip";
import { LoomDemo } from "@/components/home/loom-demo";
import { CaseStudies } from "@/components/home/case-studies";
import { HowItWorks } from "@/components/home/how-it-works";
import { Pricing } from "@/components/home/pricing";
import { Waitlist } from "@/components/home/waitlist";
import { FooterCta } from "@/components/home/footer-cta";

/**
 * Home page — Day14 OS pivot day, May 29 2026.
 *
 * Pitches Day14 OS as the multi-tenant operating system for one operator
 * running several businesses. Existing build-studio messaging moves to
 * /work-with-us (still linked from the footer). The pivot copy here is
 * the public bet — landing page + Loom + manifesto + waitlist.
 *
 * Composition only — each section lives in src/components/home/*.
 * Constraints honored: NO new dependencies, reuse design tokens, single
 * page, framer-motion via the existing motion/* components.
 */

// Page-level metadata overrides the layout defaults for the home route.
// Other routes (case studies, about, etc.) keep the layout defaults.
const TITLE = "Day14 — Sites and apps for small businesses. Live in 14 days.";
const DESCRIPTION =
  "I'm Jack. I build sites and apps for small businesses in 14 days, then $149/mo keeps them running on Day14 OS — the same stack I use for six of my own. Now booking 3 builds for July.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: SITE.brand,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function HomePage() {
  return (
    <>
      {/* No load curtain — the hero text spawns itself in place via
          TypeIn (line-by-line type with a cursor walking down the lines)
          starting at 120ms after page mount. */}
      <SiteHeader />
      <main>
        {/* ProfessionalHero — clear, calm, expensive-looking. Plain-English
            headline a non-technical buyer understands in 5 seconds. The
            terminal aesthetic moved to peripheral elements (StatusLine,
            PathCrumbs, CmdKPalette, mono details) where it's personality,
            not a comprehension tax. See professional-hero.tsx. */}
        <ProfessionalHero />
        {/* DeployStrip hidden — internal-ops messages confused non-tech
            buyers. Keep the import so the component file stays referenced. */}
        {/* <DeployStrip /> */}
        {/* WorkLogTicker — live work-log feed from /data/changelog.json.
            Replaces the empty-Loom-slot "trust gap" identified in the
            2026-06-04 persona audit. Real proof, not faked. */}
        <BuildReveal><WorkLogTicker /></BuildReveal>
        {/* BuildReveal wraps each section so its content fades up cleanly
            on viewport entry (opacity 0 → 1 + 12px translate). Blur and
            scale were removed for clarity. */}
        <BuildReveal><LoomDemo /></BuildReveal>
        <BuildReveal><CaseStudies /></BuildReveal>
        <BuildReveal><HowItWorks /></BuildReveal>
        <BuildReveal><Pricing /></BuildReveal>
        <BuildReveal><Waitlist /></BuildReveal>
        <BuildReveal><FooterCta /></BuildReveal>
      </main>
      <SiteFooter />
      {/* Phase C — interactive Cmd+K palette. Floating "Ask anything" pill
          bottom-right; press ⌘K (or Ctrl+K) anywhere to open. 14 real-feeling
          Day14 OS commands, live fuzzy filter, faked "execute" with toast.
          Hidden on mobile per persona audit — Marisol + Tasha bounced on
          terminal/CLI accents; no keyboard on phones makes this irrelevant. */}
      <div className="hidden md:block">
        <CmdKPalette />
      </div>
      {/* Vim-style status line fixed at the bottom of every viewport.
          Live scroll-position percent + current section + ⌘K hint.
          Hidden on mobile — eats vertical space on the smallest screens. */}
      <div className="hidden md:block">
        <StatusLine />
      </div>
    </>
  );
}
