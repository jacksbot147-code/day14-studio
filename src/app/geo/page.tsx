import type { Metadata } from "next";
import Link from "next/link";

import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";
import { GEO_TIERS, GEO_FOUNDING } from "@/lib/pricing";
import { GEO_FAQ, GEO_PROMPT_COUNT } from "@/lib/geo-content";
import { SITE } from "@/lib/site";

/**
 * /geo — the GEO (Generative Engine Optimization) service line. Third leg
 * of the trifecta: build presence (studio) + buy traffic (AI ads) + own
 * AI-answer visibility (GEO).
 *
 * Cinematic skin, composed like /pricing (shared shell + cin-detail
 * column). PRICING INTEGRITY: every number flows from src/lib/pricing.ts
 * (GEO_TIERS + GEO_FOUNDING) — nothing hard-coded, `npm run check:prices`
 * stays clean.
 *
 * PHASE 2 TODO (blocked on Jack re-providing day14-geo-complete.zip):
 * fold in the polished case-study section + report sample from the earlier
 * GEO UI build, reconcile day14-geo-tokens.css into the design system.
 * Case-study section is intentionally absent until real client #0 data
 * exists (never fabricate customers).
 */

const TITLE = "GEO — be the answer when AI gets asked | Day14";
const DESCRIPTION =
  "When someone asks ChatGPT, Perplexity, or Google AI who to hire, one business gets named. GEO is the work that makes it yours — measured monthly, transcripts included.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/geo" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `https://${SITE.domain}/geo`,
    siteName: SITE.brand,
    type: "website",
  },
};

/** FAQPage JSON-LD from the canonical FAQ content. */
function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GEO_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Service JSON-LD; offer prices flow from pricing.ts. */
function serviceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Generative Engine Optimization (GEO)",
    serviceType: "AI search visibility optimization",
    provider: {
      "@type": "Organization",
      name: SITE.brand,
      url: `https://${SITE.domain}`,
    },
    areaServed: "Southwest Florida",
    offers: GEO_TIERS.map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: String(t.oneTime ?? t.monthly ?? ""),
      priceCurrency: "USD",
      description: t.tagline,
    })),
  };
}

export default function GeoPage() {
  return (
    <div className="cinematic" id="top">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd()) }}
      />
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        {/* Hero — the 10-second answer for a Naples pool owner. */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-kicker">
            GEO · AI search visibility
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            When someone asks ChatGPT who to hire, one business gets named.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            Your customers stopped scrolling ten blue links. They ask
            ChatGPT, Perplexity, and Google AI Mode — and the engine answers
            with a name. GEO is the work that makes it yours: measured every
            month, transcripts included, no black box.
          </Reveal>
        </header>

        <div className="cin-detail">
          {/* Why this exists — plain-spoken problem statement. */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              There is no page two in an AI answer
            </Reveal>
            <div className="cin-prose">
              <p>
                Ask an AI engine &ldquo;best pool service in Naples&rdquo; and
                it names two or three businesses. Not ten. Not a map with
                twenty pins. If you&rsquo;re not one of the names, you
                don&rsquo;t exist in that conversation — and these engines
                mostly decide from things you already control: whether your
                business data agrees with itself across the web, whether your
                site answers real questions in a form a machine can quote,
                and whether the sources engines trust have heard of you.
              </p>
              <p>
                That&rsquo;s mechanical work with a measurable result. It is
                what I sell here, the same way I sell builds: fixed scope,
                honest measurement, no retainers-for-vibes.
              </p>
            </div>
          </section>

          {/* How it's measured — the honesty wedge vs. snake-oil GEO shops. */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Measured, not vibes
            </Reveal>
            <div className="cin-prose">
              <p>
                Every engagement runs the same {GEO_PROMPT_COUNT}-prompt pack
                — real buyer questions, localized to your city and service —
                across all three engines, and records every answer. You get a
                visibility score out of 20 and the raw transcripts. Same
                prompts every month, so movement is real movement. If the
                engines already recommend you everywhere, the audit tells you
                that too, and you stop at one fixed fee.
              </p>
            </div>
          </section>

          {/* Offers — every number from pricing.ts. */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Three ways in
            </Reveal>
            <div className="cin-prose">
              {GEO_TIERS.map((tier) => (
                <div key={tier.slug}>
                  <h3>
                    {tier.name} — {tier.priceLabel}
                  </h3>
                  <p>
                    <em>{tier.tagline}</em> {tier.bestFor}
                  </p>
                  <ul>
                    {tier.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Founding rate — scarcity that is actually true. */}
          <section className="cin-detail-block cin-detail-outcome">
            <Reveal as="p">
              Founding rate: the first three GEO clients get Essentials at{" "}
              {GEO_FOUNDING.label.replace(" founding rate", "")}.{" "}
              {GEO_FOUNDING.terms} When the three slots are gone, they&rsquo;re
              gone.
            </Reveal>
          </section>

          {/* The trifecta cross-link — GEO feeds and is fed by the builds. */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Built to stack with the rest
            </Reveal>
            <div className="cin-prose">
              <p>
                GEO works best on a site built to be quoted — which is what{" "}
                <Link href="/pricing">every Day14 build</Link> ships as. And
                the visibility baseline doubles as ad intelligence: the
                prompts where competitors beat you are exactly where paid
                placement earns its keep. One operator, three motions, one
                system.
              </p>
            </div>
          </section>

          {/* FAQ — same static accordion pattern as /pricing. */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Questions owners actually ask
            </Reveal>
            <div className="cin-detail-faqs">
              {GEO_FAQ.map((f) => (
                <details key={f.q} className="cin-detail-faq">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Closing CTA — Cal.com booking + email fallback, wired in ClosingCTA. */}
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
