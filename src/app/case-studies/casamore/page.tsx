import type { Metadata } from "next";

import { SITE } from "@/lib/site";
import { SERVICE_TIERS } from "@/lib/pricing";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";

/**
 * /case-studies/casamore — the brand-led Local-tier exemplar, cinematic skin.
 *
 * Re-themed into the cinematic system (block 6/10). Same shared shell + detail
 * primitives; problem → build → result narrative mirroring the homepage proof
 * framing. Casamoré (houseoflove.co) is a real, live brand site — the Local-tier
 * exemplar for customers who need a brand more than a back office. Content
 * preserved from the prior surface; only the skin changes.
 *
 * PRICING INTEGRITY: the Local price label comes from pricing.ts (setupLabel),
 * never hard-coded, and the `$X + $Y/mo` tier shape is avoided so check:prices
 * stays clean. (The prior surface built a `$X + $Y/mo` string inline — removed.)
 */

// Local price comes from pricing.ts — the single source of truth.
const LOCAL_SETUP =
  SERVICE_TIERS.find((t) => t.slug === "local")?.setupLabel ??
  "at a fixed price";

const CASE = {
  name: "Casamoré",
  industry: "silent-disco events",
  location: "Southwest Florida",
  url: "https://houseoflove.co",
} as const;

export const metadata: Metadata = {
  title: `${CASE.name} — case study`,
  description: `How Day14 built ${CASE.name} as a brand-first Local build — full visual identity, 18 marketing pages, a blog essay library, a membership funnel, and merch presence.`,
  alternates: { canonical: "/case-studies/casamore" },
};

const SURFACES: Array<{ tag: string; name: string; body: string }> = [
  {
    tag: "Public",
    name: "Marketing website",
    body: "18 hand-designed pages — home, upcoming rituals, past events, about, FAQ, merch, zine, membership, contact, plus five event-detail templates. Every page is fully brand-system styled; no generic theme.",
  },
  {
    tag: "Content",
    name: "Essay & ritual library",
    body: "19 on-brand long-form essays anchoring the voice — manifesto pieces, event recaps, the philosophy of silent-disco-as-ritual. It works as both content marketing and brand bible.",
  },
  {
    tag: "Funnel",
    name: "Membership + email capture",
    body: "MailerLite-powered membership signup behind a custom form, with email automation, segmented audiences, and pre-event drip campaigns. A Cloudflare Worker handles the form bridge.",
  },
];

const FEATURES: string[] = [
  "Full visual system — palette, typography, motif language",
  "Custom logomark + secondary marks for sub-events",
  "Poster series with hand-illustrated assets",
  "Merch mockups (tees, totes, hats) and a printable zine",
  "Brand bible documenting voice rules, color tokens, do/don'ts",
  "18 hand-designed marketing pages, all mobile-optimized",
  "Event detail templates — date, venue, capacity, ticketing link",
  "Past-events gallery with photo carousels",
  "Custom 404 + on-brand landing transitions",
  "19 essay-length blog posts with a tag system + RSS",
  "OG image generation per post for shareable previews",
  "MailerLite list + automation flows (welcome, pre-event, recap)",
  "Cloudflare Worker form bridge for membership signup",
  "Segmented audience tags by event attended + interest",
  "Discord / WhatsApp community link routing for members",
  "Cloudflare-hosted static delivery + global CDN edge cache",
];

const STATS: Array<{ v: string; l: string }> = [
  { v: "18", l: "Marketing pages shipped" },
  { v: "19", l: "On-brand essays" },
  { v: "Local", l: "Tier — fast brand-led launch" },
  { v: "0", l: "Ongoing dev needed" },
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
            {CASE.industry} · live · {CASE.location}
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            A brand more than a back office.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            A complete event-business launch — visual identity, 18 marketing
            pages, a library of 19 on-brand essays, a poster series, merch
            mockups, a printable zine, and a MailerLite membership funnel. This is
            the Local-tier exemplar: brand-first, fast, and built for the operator
            to extend.
          </Reveal>
          <Reveal as="div" delayStep={3} className="cin-hcta cin-detail-cta">
            <a
              href={CASE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn cin-btn-solid"
              data-cta="open_casamore_live"
            >
              Open {new URL(CASE.url).host} ↗
            </a>
            <a
              href={SITE.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn"
              data-cta="book_casamore_hero"
            >
              Get one built like this
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
              Some businesses need a world, not a workflow.
            </Reveal>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              An events brand lives or dies on identity — the look, the voice, the
              ritual. A back-office portal does nothing for it. What it needs is a
              full visual system, a content engine to keep the world alive, and a
              membership funnel that turns curiosity into a list. The job was to
              ship all of that as one coherent brand the operator can run alone.
            </Reveal>
          </section>

          {/* The build */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              The build
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              Three surfaces, one brand world.
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
              A complete brand surface, every page live.
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
              Same engine as a marketplace. A brand world instead.
            </Reveal>
          </section>

          {/* Results */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              Results
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              A brand the operator can actually run.
            </Reveal>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              Casamoré launched live with a full brand surface, a content engine
              ready to scale, and a membership funnel collecting email from day
              one — built so the operator can add events, essays, and poster drops
              without touching a developer.
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
              Local tier starts {LOCAL_SETUP} — visual system, marketing pages, a
              blog engine, lead capture, AI chatbot, and email wired. Out fast.
            </Reveal>
          </section>
        </div>

        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
