import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE, VERTICALS, SKUS, CASE_STUDIES } from "@/lib/site";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { RoiCalculator } from "@/components/cinematic/RoiCalculator";

/** Maps a vertical slug to the ROI calculator's trade preset, when there's a
 *  clean 1:1 (the trade-specific pages). Broad lanes fall back to the default. */
const ROI_TRADE: Record<string, string> = {
  "pool-service": "pool",
  "lawn-care": "lawn",
  "pressure-washing": "pressure",
  handyman: "handyman",
  "mobile-detailing": "detailing",
};

/**
 * /verticals/[slug] — per-vertical landing page, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 9/10 of the rebuild). Composed
 * directly from the shared shell (CanvasField backdrop + fixed Nav + SiteFooter)
 * the way /platform/[slug] and /about are, rather than the old light
 * SiteHeader/SiteFooter — so no route-switch flashes a different theme. One
 * template, every vertical, driven by VERTICALS in site.ts. Layout mirrors the
 * /platform/[slug] detail template: crumb → hero → pain rail → ship list →
 * recommended SKUs → exemplar → final CTA.
 *
 * PRICING INTEGRITY: every price is read from SKUS, which is DERIVED from
 * src/lib/pricing.ts (SERVICE_TIERS). Nothing here is a hard-coded tier figure,
 * so `npm run check:prices` stays clean and a price change in pricing.ts flows
 * straight onto the page. The monthly line uses the SKU's numeric `monthly`
 * field, never a literal "$X + $Y/mo" string.
 */

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return VERTICALS.map((v) => ({ slug: v.slug }));
}

function findVertical(slug: string) {
  return VERTICALS.find((v) => v.slug === slug);
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const v = findVertical(params.slug);
  if (!v) return {};
  return {
    title: `${v.shortName} platforms`,
    description: `${v.name}. ${v.tagline}`,
    alternates: { canonical: `/verticals/${v.slug}` },
  };
}

export default function VerticalPage({ params }: { params: Params }) {
  const v = findVertical(params.slug);
  if (!v) notFound();

  const exemplar = CASE_STUDIES.find((cs) => cs.slug === v.exemplarSlug);
  // Guard a renamed SkuId in site.ts: if no recommended SKU resolves, degrade
  // to the full SKU list rather than rendering an orphan "the natural fit
  // is ." sentence and an empty pricing grid. Byte-identical today (every
  // vertical resolves >=2 SKUs) — a soft fallback instead of a broken section.
  const recommendedSkus = SKUS.filter((s) => v.recommendedSkus.includes(s.id));
  const matchingSkus = recommendedSkus.length > 0 ? recommendedSkus : SKUS;

  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main className="cin-detail">
        <Reveal as="nav" className="cin-detail-crumb" aria-label="Breadcrumb">
          <a href="/#work">← All verticals</a>
        </Reveal>

        {/* Hero */}
        <header className="cin-detail-hero">
          <Reveal as="div" className="cin-kicker">
            {v.shortName}
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-detail-h1">
            {v.name}
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-detail-lede">
            {v.tagline}
          </Reveal>
          <Reveal as="div" delayStep={3} className="cin-hcta cin-detail-cta">
            <a
              href={SITE.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn cin-btn-solid"
              data-cta="book_vertical_hero"
            >
              Book a 30-min intro call
            </a>
            {exemplar ? (
              <a
                href={`/case-studies/${exemplar.slug}`}
                className="cin-btn"
                data-cta="case_vertical_hero"
              >
                See the {exemplar.name} case study →
              </a>
            ) : null}
          </Reveal>
        </header>

        {/* Businesses in this lane */}
        <section className="cin-detail-block">
          <Reveal as="div" className="cin-kicker">
            Businesses we&rsquo;ve built for in this lane
          </Reveal>
          <ul className="cin-detail-features" role="list">
            {v.examples.map((ex) => (
              <li key={ex}>{ex}</li>
            ))}
          </ul>
        </section>

        {/* What's broken */}
        <section className="cin-detail-block">
          <Reveal as="div" className="cin-kicker">
            What&rsquo;s broken today
          </Reveal>
          <Reveal as="h2" delayStep={1} className="cin-detail-h2">
            You know the pattern.
          </Reveal>
          <ul className="cin-detail-pain" role="list">
            {v.painPoints.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        {/* What Day14 ships */}
        <section className="cin-detail-block">
          <Reveal as="div" className="cin-kicker">
            What Day14 ships
          </Reveal>
          <Reveal as="h2" delayStep={1} className="cin-detail-h2">
            Here&rsquo;s how it&rsquo;s fixed.
          </Reveal>
          <ul className="cin-detail-features" role="list">
            {v.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>

        {/* Recommended SKUs — prices from SKUS (derived from pricing.ts) */}
        <section className="cin-detail-block">
          <Reveal as="div" className="cin-kicker">
            Recommended SKUs
          </Reveal>
          <Reveal as="h2" delayStep={1} className="cin-detail-h2">
            The right shape, productized.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-detail-body">
            For {v.shortName.toLowerCase()}, the natural fit is{" "}
            {matchingSkus.map((s, i) => (
              <span key={s.id}>
                <strong>{s.name}</strong>
                {i < matchingSkus.length - 2
                  ? ", "
                  : i === matchingSkus.length - 2
                  ? " or "
                  : ""}
              </span>
            ))}
            . Pricing fixed; what&rsquo;s in each SKU is below.
          </Reveal>

          <div className="cin-cards">
            {matchingSkus.map((sku, i) => (
              <Reveal
                key={sku.id}
                delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
                className="cin-card"
              >
                <div className="cin-nm">{sku.name}</div>
                <div className="cin-pr">
                  {sku.fromPrice ? "from " : ""}$
                  {sku.oneTime.toLocaleString()} <small>build</small>
                </div>
                <div className="cin-mo">
                  + ${sku.monthly.toLocaleString()}/mo hosting + maintenance ·
                  ships in {sku.shipsIn}
                </div>
                <ul role="list">
                  <li>{sku.blurb}</li>
                </ul>
                <a
                  className="cin-card-cta cin-card-cta-ghost"
                  href={SITE.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cta={`book_vertical_${sku.id}`}
                >
                  Book intro call →
                </a>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Exemplar case study */}
        {exemplar ? (
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              Closest case study
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              The build that proves it.
            </Reveal>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              {exemplar.summary}
            </Reveal>
            <Reveal as="div" delayStep={3} className="cin-hcta">
              <a
                href={`/case-studies/${exemplar.slug}`}
                className="cin-btn cin-btn-solid"
                data-cta="case_vertical_exemplar"
              >
                Read the {exemplar.name} case study →
              </a>
              {exemplar.url ? (
                <a
                  href={exemplar.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cin-btn"
                  data-cta="live_vertical_exemplar"
                >
                  Open the live build ↗
                </a>
              ) : null}
            </Reveal>
          </section>
        ) : null}

        {/* ROI estimator — defaults to this vertical's trade where there's a match */}
        <RoiCalculator initialTrade={ROI_TRADE[v.slug]} />

        {/* Final CTA */}
        <section className="cin-detail-block cin-detail-final">
          <Reveal as="h2" className="cin-detail-h2">
            Run a {v.shortName.toLowerCase()} business in {SITE.location}?
          </Reveal>
          <Reveal as="p" delayStep={1} className="cin-detail-body">
            30-min intro call. Live demo. Fixed price. Signed order form same day
            if it&rsquo;s a fit.
          </Reveal>
          <Reveal as="div" delayStep={2} className="cin-hcta">
            <a
              href={SITE.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn cin-btn-solid"
              data-cta="book_vertical_final"
            >
              Book a 30-min intro call
            </a>
            <a href="/#pricing" className="cin-btn" data-cta="pricing_vertical_final">
              See all pricing
            </a>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
