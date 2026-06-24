import { SITE, PITCH } from "@/lib/site";
import { SERVICE_TIERS } from "@/lib/pricing";

/**
 * StructuredData — JSON-LD for day14.us.
 *
 * Emits a single schema.org @graph so crawlers (Google rich results, LLM
 * answer engines) understand what Day14 is, where it operates, and what it
 * sells. Server-rendered; no client JS.
 *
 * Pricing-integrity: every Offer price is read from SERVICE_TIERS
 * (src/lib/pricing.ts — the single source of truth). No price literal lives
 * here, so the pricing guard stays clean and a pricing.ts edit flows straight
 * into the structured data.
 *
 * Three nodes:
 *   - Organization  — the brand identity (logo, founder, contact).
 *   - WebSite       — the site itself (enables sitelinks search box later).
 *   - ProfessionalService (a LocalBusiness subtype) — the service business in
 *     Southwest Florida, with areaServed + an OfferCatalog of the build tiers.
 */

const BASE = `https://${SITE.domain}`;

// SW Florida service area — the towns Day14 builds for. Named explicitly so
// "near me" / city-level queries can match.
const SERVICE_AREA = [
  "Naples",
  "Bonita Springs",
  "Estero",
  "Fort Myers",
  "Cape Coral",
  "Marco Island",
  "Lee County",
  "Collier County",
];

export function StructuredData() {
  const offers = SERVICE_TIERS.map((t) => ({
    "@type": "Offer",
    name: `${t.name} — ${t.tagline}`,
    description: t.bestFor,
    category: "Web & software development",
    // setup is a number|null in pricing.ts; null tiers are custom-quoted.
    ...(t.setup !== null
      ? {
          price: t.setup,
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: t.monthly,
            priceCurrency: "USD",
            unitText: "MONTH",
            referenceQuantity: {
              "@type": "QuantitativeValue",
              value: 1,
              unitCode: "MON",
            },
          },
        }
      : { priceCurrency: "USD" }),
    availability: "https://schema.org/InStock",
    url: `${BASE}/#pricing`,
  }));

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE}/#organization`,
        name: SITE.brand,
        url: BASE,
        email: SITE.email,
        logo: `${BASE}/icon`,
        description: PITCH.founderAngle,
        founder: { "@type": "Person", name: "Jack Boppington" },
        areaServed: SITE.location,
        sameAs: [] as string[],
      },
      {
        "@type": "WebSite",
        "@id": `${BASE}/#website`,
        url: BASE,
        name: SITE.brand,
        description: SITE.tagline,
        publisher: { "@id": `${BASE}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "ProfessionalService",
        "@id": `${BASE}/#localbusiness`,
        name: SITE.brand,
        image: `${BASE}/opengraph-image`,
        url: BASE,
        email: SITE.email,
        description: PITCH.oneLiner,
        parentOrganization: { "@id": `${BASE}/#organization` },
        priceRange: "$$",
        currenciesAccepted: "USD",
        paymentAccepted: "Credit Card, Stripe",
        knowsLanguage: "en-US",
        address: {
          "@type": "PostalAddress",
          addressRegion: "FL",
          addressCountry: "US",
          addressLocality: "Naples",
        },
        areaServed: SERVICE_AREA.map((name) => ({
          "@type": "City",
          name,
        })),
        serviceType: [
          "Web design",
          "Custom software development",
          "Business platform development",
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Day14 build tiers",
          itemListElement: offers,
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here (no user input); React escaping of
      // </script> is handled by serializing the closing-tag sequence.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
      }}
    />
  );
}
