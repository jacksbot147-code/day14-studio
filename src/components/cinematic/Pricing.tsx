"use client";

/**
 * cinematic/Pricing — the `#pricing` section (task 6/8).
 *
 * Port of the locked prototype's pricing block: three cards (Spark / Local /
 * Portal, Local featured) + the "Platform — let's talk" line.
 *
 * PRICING INTEGRITY (binding, from src/lib/pricing.ts): this component renders
 * EVERY number from SERVICE_TIERS — the build price, the monthly, the tier name
 * and the feature bullets all come from pricing.ts. Nothing here is hard-coded,
 * so `npm run check:prices` stays clean and a price change in pricing.ts flows
 * straight onto the page.
 *
 * The scramble-in price animation lives in <PriceScramble> (reduced-motion safe).
 * The featured card is driven by `tier.featured`, not a hard-coded slug.
 */

import { SERVICE_TIERS, type ServiceTier } from "@/lib/pricing";
import { Reveal } from "./Reveal";
import { PriceScramble } from "./PriceScramble";

/** Cards shown on the homepage, in order. Platform is the "let's talk" line. */
const CARD_SLUGS: ServiceTier["slug"][] = ["spark", "local", "portal"];

/**
 * Editorial tail on the monthly line (the "· live in 7 days" half). This is
 * COPY, not pricing — the monthly figure itself comes from pricing.ts. Faithful
 * to the prototype's per-card phrasing.
 */
const MONTHLY_NOTE: Record<string, string> = {
  spark: "live in 7 days",
  local: "live in 14 days",
  portal: "recurring customers",
};

/** "$1,500" from the tier's numeric setup — formatted, never hard-coded. */
function buildPrice(tier: ServiceTier): string {
  return tier.setup === null
    ? tier.setupLabel
    : `$${tier.setup.toLocaleString("en-US")}`;
}

function bySlug(slug: ServiceTier["slug"]): ServiceTier {
  const tier = SERVICE_TIERS.find((t) => t.slug === slug);
  if (!tier) throw new Error(`pricing: missing tier "${slug}"`);
  return tier;
}

export function Pricing() {
  const cards = CARD_SLUGS.map(bySlug);

  return (
    <section id="pricing" className="cin-pricing">
      <Reveal as="h2" className="cin-price-h">
        Start where it makes sense.
      </Reveal>
      <Reveal as="p" className="cin-price-sub" delayStep={1}>
        One system, one bill. Move up when you&apos;re ready.
      </Reveal>

      <div className="cin-cards">
        {cards.map((tier, i) => (
          <Reveal
            key={tier.slug}
            delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
            className={`cin-card${tier.featured ? " cin-card-feat" : ""}`}
          >
            <span className="cin-badge">
              {tier.featured ? "most start here" : ""}
            </span>
            <div className="cin-nm">{tier.name}</div>
            <div className="cin-pr">
              <PriceScramble final={buildPrice(tier)} />{" "}
              <small>build</small>
            </div>
            <div className="cin-mo">
              + {tier.monthlyLabel} · {MONTHLY_NOTE[tier.slug] ?? tier.tagline}
            </div>
            <ul role="list">
              {tier.features.slice(0, 3).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>

      <Reveal as="p" className="cin-platform">
        Need the full software business — admin app, billing, the works?{" "}
        <a href="#book">Platform — let&apos;s talk.</a>
      </Reveal>
    </section>
  );
}

export default Pricing;
