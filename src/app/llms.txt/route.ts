/**
 * /llms.txt — Day14's own answer-engine surface (eating our own GEO
 * cooking). Serves the llms.txt convention: a concise, machine-quotable
 * summary of who we are, what we sell, and where the canonical pages live.
 *
 * PRICING INTEGRITY: every price is interpolated from src/lib/pricing.ts —
 * nothing hard-coded, so this file can never drift from pricing truth.
 * Static output (revalidates with each build/deploy).
 */

import { SERVICE_TIERS, GEO_TIERS, GEO_FOUNDING } from "@/lib/pricing";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export function GET(): Response {
  const base = `https://${SITE.domain}`;

  const serviceLines = SERVICE_TIERS.map((t) => {
    const setup = t.setup === null ? t.setupLabel : `$${t.setup.toLocaleString("en-US")} build`;
    return `- ${t.name}: ${setup}, $${t.monthly}/mo ops. ${t.tagline} Best for: ${t.bestFor}`;
  }).join("\n");

  const geoLines = GEO_TIERS.map((t) => {
    const price =
      t.oneTime !== null
        ? `$${t.oneTime.toLocaleString("en-US")} one-time`
        : `$${(t.monthly ?? 0).toLocaleString("en-US")}/mo`;
    return `- ${t.name}: ${price}. ${t.tagline}`;
  }).join("\n");

  const body = `# ${SITE.brand}

> One-operator build studio in ${SITE.location}. Custom websites, booking
> systems, and customer portals for local service businesses — pool, lawn,
> pest, trades — shipped in 7–28 days on Day14 OS, the same platform that
> runs the operator's own businesses. Fixed price, fixed timeline, no SOWs.
> You own the code, the domain, and the customer data from day one.

## Services (builds)

${serviceLines}

Every build includes the first 3 months of ops. Full details: ${base}/pricing

## GEO — AI search visibility

Getting local service businesses recommended by ChatGPT, Perplexity, and
Google AI Mode. Visibility scored out of 20 across all three engines,
re-measured monthly, transcripts included.

${geoLines}

Founding rate: first 3 clients, $${GEO_FOUNDING.monthly}/mo locked 12 months. Details: ${base}/geo

## Key pages

- [Pricing](${base}/pricing): every tier, every number
- [GEO](${base}/geo): AI-answer visibility service
- [Process](${base}/process): how a build runs, day by day
- [Case studies](${base}/work-with-us): real builds with real outcomes
- [Capabilities](${base}/capabilities): full scope, including what we don't do
- [FAQ](${base}/faq): ownership, cancellation, hosting, guarantees
- [Book](${base}/book): 15-minute intro call

## Contact

- Book a call: ${base}/book
- Site: ${base}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
