import type { Metadata } from "next";

import { SITE } from "@/lib/site";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";

/**
 * /case-studies/splash-jacks-pools — the flagship case study, cinematic skin.
 *
 * Re-themed into the cinematic system (block 6/10 of the rebuild). Composed
 * from the shared shell (CanvasField backdrop + fixed Nav + SiteFooter +
 * ClosingCTA) and the `.cin-detail*` editorial primitives, matching the /about
 * (block 4) pattern. Narrative runs problem → build → result, mirroring the
 * homepage proof framing ("same engine, different businesses"). Content is
 * preserved from the prior surface; only the skin changes.
 *
 * HONESTY RAIL: Splash Jacks Pools is genuinely live and paying — the operator
 * (Jack) runs his own pool route on it. Metrics below are the same operator-
 * provided figures the prior surface carried; nothing is invented.
 *
 * PRICING INTEGRITY: this page quotes no tier price (CTA only), so the
 * check:prices guard has nothing to flag here.
 */

const CASE = {
  name: "Splash Jacks Pools",
  industry: "field service",
  location: "Naples & Bonita Springs, FL",
  timeline: "14 days",
  url: "https://splashjackspools.com",
} as const;

export const metadata: Metadata = {
  title: `${CASE.name} — case study`,
  description: `How Day14 shipped a full platform (marketing + portal + admin app + billing) for ${CASE.name} in ${CASE.timeline} — the live, paying field-service flagship.`,
  alternates: { canonical: "/case-studies/splash-jacks-pools" },
};

const SURFACES: Array<{ tag: string; name: string; body: string }> = [
  {
    tag: "Public",
    name: "Marketing site",
    body: "Custom homepage, services & pricing, five city-targeted landing pages, an AI chatbot trained on services + chemistry, lead capture, mobile-first, PWA-installable, dynamic OG images per page.",
  },
  {
    tag: "Customer",
    name: "Customer portal",
    body: "Magic-link sign-in (no passwords), visit history with photos + chemistry readings, invoices, and the ability to reschedule, pause, request a quote, or leave a note for the tech.",
  },
  {
    tag: "Operator",
    name: "Admin app",
    body: "Customer + lead + visit CRUD, a route-aware day-of-week scheduler, GPS + timestamp-watermarked photo proof, PDF invoicing, a daily ops digest, broadcast SMS, and analytics dashboards.",
  },
];

const FEATURES: string[] = [
  "Custom homepage with hero, services, pricing, trust strip",
  "5 SEO city landing pages with per-city OG images",
  "Free homeowner calculators (chlorine, salt cell, gallons, chemistry)",
  "AI chatbot grounded in services + pricing",
  "Lead capture form → ops dashboard + operator email",
  "Supabase magic-link auth — no passwords, no support tickets",
  "Visit history with photos + chemistry readings + notes",
  "Live next-visit ETA when a tech is en route",
  "Self-reschedule, pause, request quote, leave note for tech",
  "Route-aware auto-scheduler keyed off day-of-week and zone",
  "Photo proof pipeline: EXIF GPS + timestamp watermarked on upload",
  "Quotes → invoices → PDF receipt generation",
  "Daily admin digest email summarizing the day's ops",
  "Broadcast SMS to filtered customer segments",
  "Stripe subscriptions + invoicing + webhook handlers",
  "Analytics dashboards (revenue, churn, chemistry trends)",
];

const STATS: Array<{ v: string; l: string }> = [
  { v: "14 days", l: "To first paying customer" },
  { v: "~25k", l: "Lines of TS/TSX shipped" },
  { v: "0", l: "Vendor accounts the operator manages" },
  { v: "all", l: "Spreadsheets replaced" },
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
            The route I run myself — on the exact software you&rsquo;d get.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            {CASE.name} went from a blank repo to a paying-customer launch in two
            weeks. Marketing site, SEO city pages, AI chatbot, customer portal
            with self-reschedule, an operator admin app with a route scheduler
            and photo proof, and Stripe billing — wired end to end.
          </Reveal>
          <Reveal as="div" delayStep={3} className="cin-hcta cin-detail-cta">
            <a
              href={CASE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn cin-btn-solid"
              data-cta="open_splash_live"
            >
              Open {new URL(CASE.url).host} ↗
            </a>
            <a
              href={SITE.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn"
              data-cta="book_splash_hero"
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
              A real service business runs on spreadsheets and scribbled
              chemistry sheets.
            </Reveal>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              Route scheduling in one place, chemistry readings on paper,
              invoicing by hand, photo proof lost in a camera roll, and customers
              with no way to see their own visit history. The work is real; the
              system around it is duct tape. The job was to replace all of it
              with one platform an operator can actually run from a phone.
            </Reveal>
          </section>

          {/* The build — three surfaces */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              The build
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              Three surfaces, one operating system.
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

          {/* What shipped — feature checklist */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Every one of these is live.
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
              Same engine. Different business. This is the one I run myself.
            </Reveal>
          </section>

          {/* Results */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              Results
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              Live, public, paying.
            </Reveal>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              The site has been live since launch day and real customers pay
              through it. The operator runs the entire business — route,
              chemistry, photo proof, billing — from the admin app. No
              spreadsheets, no manual invoicing.
            </Reveal>
            <div className="cin-stats">
              {STATS.map((s) => (
                <div key={s.l} className="cin-stat">
                  <div className="cin-stat-v">{s.v}</div>
                  <div className="cin-stat-l">{s.l}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
