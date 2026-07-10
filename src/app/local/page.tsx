import type { Metadata } from "next";
import Link from "next/link";

import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";
import { PriceScramble } from "@/components/cinematic/PriceScramble";
import { SERVICE_TIERS, type ServiceTier } from "@/lib/pricing";
import { SITE } from "@/lib/site";

/**
 * /local — the SWFL home-services landing page. Named a public product in
 * the 2026-06-23 positioning north-star ("a Naples pool owner knows in 10s
 * what you sell and that you're one of them") but never built on the
 * cinematic line; the old trip-bundle version is superseded. Built fresh
 * here in the cinematic skin, same pattern as /geo.
 *
 * This is the FRONT DOOR for cold local traffic: it sells the Local build
 * tier (setup + monthly, both from SERVICE_TIERS) to service operators losing
 * jobs to phone tag. PRICING INTEGRITY: every number flows from
 * SERVICE_TIERS in src/lib/pricing.ts — check:prices stays clean.
 *
 * HONESTY: no fabricated customers or testimonials. Splash Jacks (Jack's
 * own live platform) is the ONE real proof point and is referenced as
 * such, linking to its existing case study — nothing invented.
 */

const TITLE = "Local — a real website for your service business, live in 14 days | Day14";
const DESCRIPTION =
  "Lawn, pool, pressure washing in Southwest Florida? Stop losing jobs to phone tag. A custom site with online quoting and a scheduling board built around your route — $1,500 build, $199/mo, live in 14 days.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/local" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `https://${SITE.domain}/local`,
    siteName: SITE.brand,
    type: "website",
  },
};

function localTier(): ServiceTier {
  const t = SERVICE_TIERS.find((x) => x.slug === "local");
  if (!t) throw new Error("pricing: missing Local tier");
  return t;
}

function serviceJsonLd(tier: ServiceTier) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Local — website + booking for service businesses",
    serviceType: "Website design and booking software for local service businesses",
    provider: {
      "@type": "Organization",
      name: SITE.brand,
      url: `https://${SITE.domain}`,
    },
    areaServed: "Southwest Florida",
    offers: {
      "@type": "Offer",
      price: String(tier.setup ?? ""),
      priceCurrency: "USD",
      description: `${tier.setupLabel} + ${tier.monthlyLabel}. ${tier.tagline}`,
    },
  };
}

export default function LocalPage() {
  const tier = localTier();
  return (
    <div className="cinematic" id="top">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd(tier)) }}
      />
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        {/* Hero — the 10-second answer for a SWFL operator. */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-kicker">
            Local · websites for service businesses
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            Your crew works. The paperwork runs itself.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            If you do lawn, pool, or pressure washing in Southwest Florida and
            you&rsquo;re still booking jobs by phone tag, you&rsquo;re losing
            work you never hear about. Local is a real website with online
            quoting and a scheduling board built around your route — live in
            14 days. Built by an operator who runs one himself.
          </Reveal>
          <Reveal as="div" delayStep={3}>
            <a className="cin-btn cin-btn-glow" href="#local-pricing" data-cta="local_hero">
              See what it costs →
            </a>
          </Reveal>
        </header>

        <div className="cin-detail">
          {/* Problem — named plainly. */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              The jobs you&rsquo;re losing are the quiet ones
            </Reveal>
            <div className="cin-prose">
              <p>
                Someone in your service area searches for what you do, finds a
                Facebook page with no prices and no way to book, and calls the
                next name on the list. You never knew they were looking. A
                site that answers the question and takes the request — while
                you&rsquo;re on a job — is the difference between that lead and
                the competitor&rsquo;s.
              </p>
            </div>
          </section>

          {/* What you get — from pricing.ts features. */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              What Local is
            </Reveal>
            <ul className="cin-detail-features">
              {tier.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>

          {/* How it works — 4 steps. */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              How the 14 days go
            </Reveal>
            <ol className="cin-detail-steps">
              <li>
                <span className="cin-detail-step-n">01</span>
                <div>
                  <h3>One call, no forms</h3>
                  <p>
                    You tell me what you do, where you work, and how you like
                    to take jobs. Fifteen minutes. No RFP, no statement of work.
                  </p>
                </div>
              </li>
              <li>
                <span className="cin-detail-step-n">02</span>
                <div>
                  <h3>I build it on Day14 OS</h3>
                  <p>
                    Your site, your quoting flow, and a scheduling board shaped
                    to your route — on the same platform that runs my own
                    field-service business, not a template with your logo
                    dropped in.
                  </p>
                </div>
              </li>
              <li>
                <span className="cin-detail-step-n">03</span>
                <div>
                  <h3>You review, I adjust</h3>
                  <p>
                    You see it before it&rsquo;s live and tell me what&rsquo;s
                    wrong. Text a change after launch and it goes live — no
                    ticket queue.
                  </p>
                </div>
              </li>
              <li>
                <span className="cin-detail-step-n">04</span>
                <div>
                  <h3>Live in 14 days</h3>
                  <p>
                    On your own domain, found on Google, working on every
                    phone. The first three months of ops are included.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          {/* Pricing — single card, all numbers from pricing.ts. */}
          <section id="local-pricing" className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              One price, no surprises
            </Reveal>
            <div className="cin-cards" style={{ marginTop: 8 }}>
              <div className="cin-card cin-card-feat">
                <span className="cin-badge">most service businesses start here</span>
                <div className="cin-nm">{tier.name}</div>
                <div className="cin-pr">
                  <PriceScramble final={`$${(tier.setup ?? 0).toLocaleString("en-US")}`} />{" "}
                  <small>build</small>
                </div>
                <div className="cin-mo">
                  + {tier.monthlyLabel} · live in 14 days
                </div>
                <ul role="list">
                  {tier.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a className="cin-card-cta" href="#book" data-cta="local_book">
                  Book a 15-min look →
                </a>
              </div>
            </div>
            <div className="cin-prose" style={{ marginTop: 20 }}>
              <p>
                Bigger operation — customers logging in, paying invoices
                online, a full admin app? That&rsquo;s{" "}
                <Link href="/pricing">Portal and Platform</Link>. Want AI
                engines to recommend you when buyers ask?{" "}
                <Link href="/geo">That&rsquo;s GEO.</Link> Want AI video
                ads scored before you spend?{" "}
                <Link href="/brands/marque">That&rsquo;s Marque.</Link>
              </p>
            </div>
          </section>

          {/* Proof — the ONE real reference, no fabrication. */}
          <section className="cin-detail-block cin-detail-outcome">
            <Reveal as="p">
              I built and run Splash Jacks Pools on this exact stack — it&rsquo;s
              the field-service platform Local is lifted from, not a demo.{" "}
              <Link href="/case-studies/splash-jacks-pools">See how it works →</Link>
            </Reveal>
          </section>
        </div>

        {/* Closing CTA — Cal.com booking (anchor #book). */}
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
