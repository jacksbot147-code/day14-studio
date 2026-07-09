import type { Metadata } from "next";
import Link from "next/link";

import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";
import { PriceScramble } from "@/components/cinematic/PriceScramble";
import { GEO_TIERS, GEO_FOUNDING, type GeoTier } from "@/lib/pricing";
import { GEO_FAQ, GEO_PROMPT_COUNT } from "@/lib/geo-content";
import { SITE } from "@/lib/site";

/**
 * /geo — GEO (Generative Engine Optimization), the third service line.
 * Full cinematic build: hero + AI-answer demo, sample scorecard meters,
 * how-it-works steps, tier cards (same card system as /pricing), founding
 * banner, FAQ, closing CTA.
 *
 * PRICING INTEGRITY: every number flows from src/lib/pricing.ts
 * (GEO_TIERS + GEO_FOUNDING). `npm run check:prices` stays clean.
 *
 * HONESTY RAILS: the answer demo + scorecard are labelled illustrative —
 * no fabricated client, no fabricated testimonial. Case-study section
 * intentionally absent until client #0 data exists.
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

/** "$750" / "$1,250" from the tier's numbers — formatted, never hard-coded. */
function tierPrice(tier: GeoTier): string {
  const n = tier.oneTime ?? tier.monthly ?? 0;
  return `$${n.toLocaleString("en-US")}`;
}
function tierPriceUnit(tier: GeoTier): string {
  return tier.oneTime !== null ? "one-time" : "/mo";
}

/** Editorial tail on the unit line — copy, not pricing. */
const TIER_NOTE: Record<GeoTier["slug"], string> = {
  "geo-audit": "delivered in 5 days",
  "geo-essentials": "the retainer",
  "geo-growth": "whole service area",
};

/**
 * Sample scorecard — ILLUSTRATIVE ONLY (labelled in the UI). Percentages are
 * layout values for the meters, not client data; no business is named.
 */
const SAMPLE_METERS = [
  { engine: "ChatGPT", before: 15, after: 70 },
  { engine: "Perplexity", before: 25, after: 80 },
  { engine: "Google AI Mode", before: 10, after: 60 },
] as const;

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
        {/* ============ Hero ============ */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-kicker">
            GEO · AI search visibility
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            When someone asks ChatGPT who to hire, one business gets named.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            Your customers stopped scrolling ten blue links. They ask ChatGPT,
            Perplexity, and Google AI Mode — and the engine answers with a
            name. GEO is the work that makes it yours: measured every month,
            transcripts included, no black box.
          </Reveal>
          <Reveal as="div" delayStep={3}>
            <a className="cin-btn cin-btn-glow" href="#geo-pricing" data-cta="geo_hero">
              See the offers →
            </a>
          </Reveal>
        </header>

        {/* ============ The problem — answer demo ============ */}
        <section className="cin-section">
          <div className="cin-sys-head">
            <Reveal as="div" className="cin-kicker">
              The shift
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-h2">
              There is no page two in an AI answer.
            </Reveal>
          </div>

          <div className="cin-frow">
            <Reveal className="cin-ftext">
              <div className="cin-ftext-n cin-mono">01 / the question</div>
              <h3>&ldquo;Best pool service in Naples?&rdquo;</h3>
              <p>
                Ask an AI engine and it names two or three businesses. Not ten.
                Not a map with twenty pins. If you&rsquo;re not one of the
                names, you don&rsquo;t exist in that conversation — and the
                engines mostly decide from things you already control: whether
                your business data agrees with itself across the web, and
                whether your site answers real questions in a form a machine
                can quote.
              </p>
            </Reveal>
            <Reveal delayStep={1}>
              {/* Illustrative answer card — no real client named. */}
              <div className="cin-card" aria-label="Illustrative AI answer">
                <div className="cin-mono" style={{ fontSize: 12, opacity: 0.6 }}>
                  illustrative — what an AI answer looks like
                </div>
                <p style={{ marginTop: 12 }}>
                  &ldquo;For weekly pool service in Naples, two companies come
                  up consistently: <b>[competitor A]</b>, praised for
                  reliability, and <b>[competitor B]</b>, known for transparent
                  pricing…&rdquo;
                </p>
                <p style={{ opacity: 0.6 }}>
                  Your business: <b>not mentioned.</b> That&rsquo;s the gap GEO
                  closes — and the first thing the audit measures.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="cin-frow cin-frow-rev">
            <Reveal className="cin-ftext">
              <div className="cin-ftext-n cin-mono">02 / the measurement</div>
              <h3>Scored out of 20. Transcripts included.</h3>
              <p>
                Every engagement runs the same {GEO_PROMPT_COUNT}-prompt pack —
                real buyer questions, localized to your city and service —
                across all three engines, and records every answer. Same
                prompts every month, so movement is real movement. If the
                engines already recommend you everywhere, the audit says so,
                and you stop at one fixed fee.
              </p>
            </Reveal>
            <Reveal delayStep={1}>
              {/* Sample scorecard — meters, labelled illustrative. */}
              <div className="cin-card" aria-label="Sample visibility scorecard">
                <div className="cin-mono" style={{ fontSize: 12, opacity: 0.6 }}>
                  sample scorecard — illustrative, not client data
                </div>
                {SAMPLE_METERS.map((m) => (
                  <div key={m.engine} style={{ marginTop: 14 }}>
                    <div className="cin-meter-foot" style={{ marginTop: 0 }}>
                      <span>{m.engine}</span>
                      <span>
                        month 0 → month 3
                      </span>
                    </div>
                    <div className="cin-meter" style={{ marginTop: 6 }}>
                      <b style={{ width: `${m.before}%` }} />
                    </div>
                    <div className="cin-meter" style={{ marginTop: 4 }}>
                      <b style={{ width: `${m.after}%` }} />
                    </div>
                  </div>
                ))}
                <div className="cin-meter-foot">
                  <span>mentioned rate per engine</span>
                  <span>measured monthly</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============ How it works ============ */}
        <div className="cin-detail">
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              How it works
            </Reveal>
            <ol className="cin-detail-steps">
              <li>
                <span className="cin-detail-step-n">01</span>
                <div>
                  <h3>Baseline audit</h3>
                  <p>
                    The full prompt pack runs against all three engines. You
                    get your score out of 20, every transcript, and a
                    competitor comparison — who gets named instead of you, and
                    why. Delivered in five days.
                  </p>
                </div>
              </li>
              <li>
                <span className="cin-detail-step-n">02</span>
                <div>
                  <h3>Fix the foundations</h3>
                  <p>
                    Business-data cleanup across the sources engines actually
                    read, plus llms.txt and structured data on your site.
                    Engines exclude businesses whose information disagrees
                    with itself — this is the fastest movement, usually inside
                    60 days.
                  </p>
                </div>
              </li>
              <li>
                <span className="cin-detail-step-n">03</span>
                <div>
                  <h3>Answer the questions</h3>
                  <p>
                    Every zero-scoring prompt becomes a content target: FAQ
                    and service pages written the way engines quote. Not blog
                    filler — direct answers to the questions your buyers
                    actually ask.
                  </p>
                </div>
              </li>
              <li>
                <span className="cin-detail-step-n">04</span>
                <div>
                  <h3>Re-measure, every month</h3>
                  <p>
                    Same prompts, fresh answers, honest delta — in both
                    directions. The score is the deliverable; the transcripts
                    keep it auditable.
                  </p>
                </div>
              </li>
            </ol>
          </section>
        </div>

        {/* ============ Pricing cards — same card system as /pricing ============ */}
        <section id="geo-pricing" className="cin-pricing">
          <Reveal as="h2" className="cin-price-h">
            Fixed prices. Honest measurement.
          </Reveal>
          <Reveal as="p" className="cin-price-sub" delayStep={1}>
            Start with the audit. Stay only if the number should move.
          </Reveal>

          <div className="cin-cards">
            {GEO_TIERS.map((tier, i) => (
              <Reveal
                key={tier.slug}
                delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
                className={`cin-card${tier.featured ? " cin-card-feat" : ""}`}
              >
                <span className="cin-badge">
                  {tier.featured ? "founding rate — 3 slots" : ""}
                </span>
                <div className="cin-nm">{tier.name}</div>
                <div className="cin-pr">
                  <PriceScramble final={tierPrice(tier)} />{" "}
                  <small>{tierPriceUnit(tier)}</small>
                </div>
                <div className="cin-mo">{TIER_NOTE[tier.slug]} · {tier.tagline}</div>
                <ul role="list">
                  {tier.features.slice(0, 4).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a
                  className={`cin-card-cta${tier.featured ? "" : " cin-card-cta-ghost"}`}
                  href="#book"
                  data-cta={`geo_book_${tier.slug}`}
                >
                  Book a 15-min look →
                </a>
              </Reveal>
            ))}
          </div>

          <Reveal as="p" className="cin-platform">
            Founding rate: the first three GEO clients get{" "}
            {GEO_TIERS.find((t) => t.slug === GEO_FOUNDING.appliesTo)?.name ??
              "Essentials"}{" "}
            at ${GEO_FOUNDING.monthly}/mo, locked for 12 months, in exchange
            for a testimonial and case-study rights.{" "}
            <a href="#book">Take a slot.</a>
          </Reveal>
        </section>

        {/* ============ Trifecta ============ */}
        <div className="cin-detail">
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

          {/* ============ FAQ ============ */}
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

        {/* Closing CTA — Cal.com booking + email fallback (anchor #book). */}
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
