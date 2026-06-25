import type { Metadata } from "next";

import { SITE } from "@/lib/site";
import { SERVICE_TIERS } from "@/lib/pricing";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";

/**
 * /case-studies/buildbridge — the Platform-tier reference build, cinematic skin.
 *
 * Re-themed into the cinematic system (block 6/10). Same shared shell + detail
 * primitives; problem → build → result narrative mirroring the homepage proof
 * framing.
 *
 * HONESTY RAIL: Buildbridge is a Platform-tier REFERENCE BUILD — the preview is
 * SSO-gated and it is NOT presented as a live, paying customer. It demonstrates
 * the most complex tier (two-sided escrow marketplace) the system can ship; the
 * CTA is a guided walkthrough, not a public live link. No fabricated metrics —
 * the figures below are structural facts about what was built (counties, notify
 * channels, native platforms, SQL migrations).
 *
 * PRICING INTEGRITY: the Platform price label comes from pricing.ts (setupLabel),
 * never hard-coded, and the `$X + $Y/mo` tier shape is avoided so check:prices
 * stays clean. (The prior surface built a `$X + $Y/mo` string inline — removed.)
 */

// Platform price comes from pricing.ts — the single source of truth.
const PLATFORM_SETUP =
  SERVICE_TIERS.find((t) => t.slug === "platform")?.setupLabel ??
  "at a fixed price";

const CASE = {
  name: "Buildbridge",
  industry: "contractor marketplace",
  location: "Southwest Florida",
} as const;

export const metadata: Metadata = {
  title: `${CASE.name} — case study`,
  description: `How Day14 built ${CASE.name} as a Platform-tier reference build — Stripe milestone escrow, multi-county permit-portal integrations, a Storm Mode regional moat, and native iOS + Android wrappers. Preview is SSO-gated.`,
  alternates: { canonical: "/case-studies/buildbridge" },
};

const SURFACES: Array<{ tag: string; name: string; body: string }> = [
  {
    tag: "Homeowner",
    name: "Public + customer surface",
    body: "Marketing site, scope-builder tool, license + permit + HOA lookups, request-a-bid flow, an escrow-managed project dashboard, plus native iOS and Android wrappers for the mobile-first audience.",
  },
  {
    tag: "Contractor",
    name: "Pro surface",
    body: "Onboarding with license + insurance verification, a lead inbox, bid management, a milestone-tracked job board, a payout dashboard, and a Storm Mode opt-in panel.",
  },
  {
    tag: "Operator",
    name: "Admin + marketplace ops",
    body: "Atomic role-based user provisioning, escrow dispute resolution, lead routing, county-permit data pipeline ops, a NOAA storm-tracker control room, 4-channel notify fan-out, and analytics dashboards.",
  },
];

const FEATURES: string[] = [
  "Atomic role-based user provisioning in a single transaction",
  "Stripe milestone escrow — funds held, released per phase signoff",
  "Bid request → contractor matching → quote → award flow",
  "License + insurance verification gate on contractor onboarding",
  "Multi-step project state machine, request through close",
  "Dispute escalation with an operator-facing resolution panel",
  "NOAA storm RSS + active-storm RPC feeds (Storm Mode)",
  "Pre-approved Storm Mode contractor panel with on-call opt-in",
  "One-tap mobilization across SMS, email, push, and in-app",
  "Lee County Accela permit-portal scrapers",
  "Collier County CityView integration",
  "Charlotte County ePermitting bridge",
  "Free tools shelf — 9 public lead-magnet tools",
  "Native iOS + Android wrappers via Capacitor with push",
  "Supabase Postgres with 14 numbered SQL migrations",
  "Vercel hosting with preview deploys per branch",
];

const STATS: Array<{ v: string; l: string }> = [
  { v: "3", l: "Counties integrated" },
  { v: "4", l: "Notify channels" },
  { v: "iOS + Android", l: "Native platforms" },
  { v: "14", l: "SQL migrations" },
];

export default function CaseStudyPage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        {/* Hero */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-detail-crumb">
            <a href="/#work">← All work</a>
          </Reveal>
          <Reveal as="div" className="cin-kicker">
            {CASE.industry} · reference build · preview (SSO-gated)
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            A regionally-defensible marketplace, end to end.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            A two-sided home-services marketplace with Stripe milestone escrow,
            atomic role-based provisioning, multi-county permit-portal
            integrations, a regionally-defensible Storm Mode, and native iOS and
            Android wrappers. Built as the Platform-tier reference for B2B2C
            marketplaces in coastal markets.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-detail-body">
            This is a reference build, not a paying tenant — the preview is
            SSO-gated. Ask on the intro call for a guided walkthrough and
            we&rsquo;ll screen-share the full operator, contractor, and homeowner
            flows live.
          </Reveal>
          <Reveal as="div" delayStep={3} className="cin-hcta cin-detail-cta">
            <a
              href={SITE.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn cin-btn-solid"
              data-cta="book_buildbridge_walkthrough"
            >
              Book a walkthrough
            </a>
            <a href="/#work" className="cin-btn" data-cta="work_buildbridge_hero">
              See the other work
            </a>
          </Reveal>
        </header>

        <div className="cin-detail">
          {/* Problem */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              The problem
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              Marketplaces are the hardest thing to ship — and the easiest to
              clone.
            </Reveal>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              A two-sided marketplace needs escrow, role-based provisioning,
              dispute handling, and native mobile before it does anything useful.
              And once it exists, a generic out-of-state competitor can copy the
              surface. The job was to prove the system can ship the hard part —
              and to wire in region-specific moats a clone can&rsquo;t cheaply
              reproduce.
            </Reveal>
          </section>

          {/* The build */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              The build
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              Three surfaces, plus a regional moat.
            </Reveal>
            <div className="cin-detail-cases">
              {SURFACES.map((s, i) => (
                <Reveal
                  key={s.name}
                  className="cin-detail-case"
                  delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
                >
                  <div className="cin-detail-case-v">{s.tag}</div>
                  <h3
                    style={{
                      fontWeight: 400,
                      fontSize: "18px",
                      margin: "0 0 6px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {s.name}
                  </h3>
                  <p>{s.body}</p>
                </Reveal>
              ))}
            </div>
          </section>

          {/* What shipped */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              What was actually built.
            </Reveal>
            <ul className="cin-detail-features" role="list">
              {FEATURES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>

          {/* Same engine line */}
          <section className="cin-detail-block cin-detail-outcome">
            <Reveal as="p">
              Same engine as a pool route. The most complex tier it can ship.
            </Reveal>
          </section>

          {/* Results */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              By the numbers
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              A real marketplace, with real defenses.
            </Reveal>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              Buildbridge proves Day14 can ship the most operationally complex
              tier — two-sided marketplaces with escrow, native mobile, and
              region-specific integrations that lock out generic competitors. The
              Storm Mode and multi-county permit pieces are non-trivial to
              reproduce and locally defensible for years.
            </Reveal>
            <div className="cin-stats">
              {STATS.map((s) => (
                <div key={s.l} className="cin-stat">
                  <div className="cin-stat-v">{s.v}</div>
                  <div className="cin-stat-l">{s.l}</div>
                </div>
              ))}
            </div>
            <Reveal as="p" delayStep={1} className="cin-detail-body">
              Platform tier starts {PLATFORM_SETUP} — two-sided flows, escrow,
              native mobile, region-specific integrations. Out in four weeks, or
              the deposit refunds.
            </Reveal>
          </section>
        </div>

        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
