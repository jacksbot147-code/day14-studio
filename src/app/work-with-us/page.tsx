import type { Metadata } from "next";

import { SITE } from "@/lib/site";
import { SERVICE_TIERS } from "@/lib/pricing";
import { getPaymentLinks } from "@/lib/payment-links";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { Pricing } from "@/components/cinematic/Pricing";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";

/**
 * /work-with-us — the build-studio conversion page, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 3/10 of the rebuild). Composed
 * directly from the shared shell (CanvasField backdrop + fixed Nav + SiteFooter),
 * matching the `/pricing` + `/platform/[slug]` pattern: narrative blocks sit in
 * the 760px `.cin-detail` column for a readable measure, while the full-width
 * `<Pricing>` card grid spans edge-to-edge. The booking CTAs are real
 * (Cal.com intro → SITE.bookingUrl) and `data-cta` tagged for the delegated
 * analytics listener in CanvasField.
 *
 * Positioning matches the homepage: operator-built software for local service
 * businesses, shipped in days, hosted on Day14 OS. Copy is preserved from the
 * prior surface; only the skin changes.
 *
 * PRICING INTEGRITY: every number on this page derives from src/lib/pricing.ts
 * (SERVICE_TIERS) — the constants below are computed, and the tier cards render
 * through the `<Pricing>` component. Nothing is hard-coded, so
 * `npm run check:prices` stays clean.
 */

// Every price is derived from pricing.ts (SERVICE_TIERS) — single source of
// truth. No price is hard-coded.
const T = Object.fromEntries(SERVICE_TIERS.map((t) => [t.slug, t]));
const SPARK_PRICE = `$${T.spark!.setup!.toLocaleString()}`;
const LOCAL_PRICE = `$${T.local!.setup!.toLocaleString()}`;
const PORTAL_PRICE = `$${T.portal!.setup!.toLocaleString()}`;
const PLATFORM_PRICE = T.platform!.setupLabel; // "from $9,000"
const PLATFORM_FLOOR = `$${Number(
  T.platform!.setup ?? T.platform!.setupLabel.replace(/[^0-9]/g, ""),
).toLocaleString()}`;
const OPS_MIN = Math.min(...SERVICE_TIERS.map((t) => t.monthly));
const OPS_MAX = Math.max(...SERVICE_TIERS.map((t) => t.monthly));

const TITLE = `Hire Day14 — Sites and apps shipped in days, not months`;
const DESCRIPTION = `I build operator-built software for local service businesses, founders, and small teams. From ${SPARK_PRICE} single-page sites to ${PLATFORM_FLOOR}+ platforms. Hosted on Day14 OS. Fixed price, no SOWs, shipped in days.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/work-with-us" },
  openGraph: {
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
    url: `https://${SITE.domain}/work-with-us`,
    siteName: SITE.brand,
    type: "website",
    images: [
      {
        url: "/og/work-with-us.png",
        width: 1200,
        height: 630,
        alt: `${TITLE} — ${SITE.brand}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
    images: ["/og/work-with-us.png"],
  },
};

/* What we build — three build shapes, all running on one operating system. */
const BUILDS: { label: string; body: string }[] = [
  {
    label: "Sites",
    body: `Single-page sites for local businesses and solo professionals (Spark, ${SPARK_PRICE}, live in 7 days). Multi-page sites with online quoting and route scheduling for service businesses (Local, ${LOCAL_PRICE}, 14 days). Custom design every time — no templates with my markup on top.`,
  },
  {
    label: "Apps",
    body: `Customer-portal builds (Portal, ${PORTAL_PRICE}) and full software platforms — marketing site + customer portal + admin app + billing, wired live (Platform, ${PLATFORM_PRICE}, 4 weeks). The same stack I run my own businesses on. Built so you can operate it, not so it looks good in a screenshot.`,
  },
  {
    label: "Custom",
    body: "Multi-tenant platforms, marketplaces, industry-specific workflows. Full Day14 OS access — scheduled agents, evidence verifier, work-log — scoped to your business. Quote back in 48 hours, shipped in 6–12 weeks.",
  },
];

/* Who it's for — good fit gets the cyan-check feature list, not-a-fit gets the
   muted pain markers. Copy preserved from the prior surface. */
const GOOD_FIT: string[] = [
  "Local service businesses — lawn, pool, pressure washing, trades — losing jobs to phone tag and needing a site that captures leads.",
  "Solo professionals, tutors, and coaches who need a real site when someone Googles their name — not a $40 template.",
  "Founders launching a brand or SaaS who want a real marketing site (or full platform) without paying agency markups for eight weeks of meetings.",
  "Operators who need a customer portal, billing flow, or admin app shipped without standing up an in-house dev team.",
];
const NOT_FIT: string[] = [
  "Teams who want a Figma file, six weeks of discovery, and an agency-style change-order process.",
  "Anyone shopping for a SaaS subscription. We build code you own, not seats you rent — Day14 OS hosting is optional after launch, not a subscription.",
  "Stealth-mode ideas that won't talk to a real customer for six months. We ship things that go live and get used.",
];

/* The 14-day process — three steps, fixed price, fixed timeline. */
const PROCESS: { title: string; body: string }[] = [
  {
    title: "Scope — 20-minute call, fixed quote in 48 hours",
    body: "We pin down what you actually need, not what an agency would scope. You leave knowing the tier, the timeline, and the total. No SOWs, no “let's get on a discovery follow-up.”",
  },
  {
    title: "Build — 5 to 28 days, depending on tier",
    body: "We design and build on Day14 OS — the same stack that runs my own businesses. A private staging URL by Day 3 (Day 1 for Spark), and a daily update so you see progress without having to ask.",
  },
  {
    title: "Launch + Live — ships at your domain",
    body: `Hosted on Day14 OS. Scheduled agents handle the boring stuff — deploys, content drafts, briefings — so the thing runs without you. After the bundled ops window, ongoing ops is $${OPS_MIN}–$${OPS_MAX}/mo flat, depending on tier.`,
  },
];

export default function WorkWithUsPage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        {/* Hero — editorial header in the 760px column. */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-kicker">
            Work with {SITE.brand}
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            Hire {SITE.brand} to build it. Ship it in days.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            I&rsquo;m Jack. I build operator-built software for local service
            businesses, founders, and small teams — from {SPARK_PRICE}{" "}
            single-page sites up to {PLATFORM_FLOOR}+ platforms. Every build runs
            on Day14 OS, the system I built to run my own businesses.
          </Reveal>
          <Reveal as="div" delayStep={3} className="cin-hcta cin-detail-cta">
            <a
              href={SITE.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn cin-btn-solid"
              data-cta="book_wwu_hero"
            >
              Book a 15-min intro call
            </a>
            <a href="/intake" className="cin-btn" data-cta="intake_wwu_hero">
              Or fill out the intake form
            </a>
          </Reveal>
        </header>

        {/* Narrative blocks — services, fit, process — in the readable column. */}
        <div className="cin-detail">
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              What we build
            </Reveal>
            <Reveal as="p" delayStep={1} className="cin-detail-body">
              Three sizes of build, one operating system. Whether you need a
              single page that captures leads or a full platform with portal and
              billing, the work ships on Day14 OS — same hardened stack, same
              scheduled agents, same evidence-verified deploy. Just different
              scope.
            </Reveal>
            <div className="cin-detail-cases">
              {BUILDS.map((b) => (
                <Reveal key={b.label} className="cin-detail-case">
                  <div className="cin-detail-case-v">{b.label}</div>
                  <p>{b.body}</p>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Who it&rsquo;s for
            </Reveal>
            <Reveal as="p" delayStep={1} className="cin-detail-body">
              I don&rsquo;t pretend to fit every brief. If you see your business
              below, the intro call will be fast.
            </Reveal>
            <ul className="cin-detail-features" role="list">
              {GOOD_FIT.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              Not a fit:
            </Reveal>
            <ul className="cin-detail-pain" role="list">
              {NOT_FIT.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>

          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              The 14-day process
            </Reveal>
            <Reveal as="p" delayStep={1} className="cin-detail-body">
              The whole point of the 14-day promise is that you know the shape on
              day one. No surprises, no scope creep, no &ldquo;we&rsquo;ll need to
              invoice for that.&rdquo;
            </Reveal>
            <ol className="cin-detail-steps" role="list">
              {PROCESS.map((s, i) => (
                <Reveal
                  as="li"
                  key={s.title}
                  delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
                >
                  <span className="cin-detail-step-n">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </section>
        </div>

        {/* Tiers — full-width card grid, every number from pricing.ts. */}
        <Pricing links={getPaymentLinks()} />

        {/* What's included framing, in the readable column. */}
        <div className="cin-detail">
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              What every build includes
            </Reveal>
            <ul className="cin-detail-features" role="list">
              <li>Custom design — no templates, no markup on top.</li>
              <li>Fixed price, fixed timeline — no SOWs, no scope creep.</li>
              <li>
                Hosted on Day14 OS with the first months of ops bundled in.
              </li>
              <li>You own the code, the domain, and the customer data.</li>
              <li>Scheduled agents running deploys, drafts, and briefings.</li>
              <li>
                After the bundled window, ops is ${OPS_MIN}–${OPS_MAX}/mo flat —
                no retainer, no surprise invoices.
              </li>
            </ul>
          </section>

          <section className="cin-detail-block cin-detail-outcome">
            <Reveal as="p">
              Tell me what you want built. Fifteen-minute intro call, a fixed
              quote back in 48 hours, and a shipped build in days — not months.
            </Reveal>
          </section>
        </div>

        {/* Closing CTA — book (Cal.com) + email fallback. Renders #book, which
            the Pricing cards' fallback links resolve to. */}
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
