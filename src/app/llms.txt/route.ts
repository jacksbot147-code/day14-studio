/**
 * /llms.txt — machine-readable summary of the public Day14 site.
 * Prices come only from src/lib/pricing.ts.
 */

import { SERVICE_TIERS, GEO_TIERS, GEO_FOUNDING } from "@/lib/pricing";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const base = `https://${SITE.domain}`;

  const serviceLines = SERVICE_TIERS.map((t) => {
    const setup = t.setup === null ? t.setupLabel : `$${t.setup.toLocaleString("en-US")} build`;
    return `- ${t.name}: ${setup}, $${t.monthly}/mo. ${t.tagline} Best for: ${t.bestFor}`;
  }).join("\n");

  const geoLines = GEO_TIERS.map((t) => {
    const price =
      t.oneTime !== null
        ? `$${t.oneTime.toLocaleString("en-US")} one-time`
        : `$${(t.monthly ?? 0).toLocaleString("en-US")}/mo`;
    return `- ${t.name}: ${price}. ${t.tagline}`;
  }).join("\n");

  const body = `# ${SITE.brand}

> Software that runs a local service business, live in 14 days. Site, booking and quoting, customer portal, Stripe payments, scheduling, admin, an AI assistant, and SMS/email. Built by an operator in ${SITE.location} who runs Splash Jacks Pools on the same platform.

## Builds

${serviceLines}

Every build includes the first 3 months of ops. Details: ${base}/pricing

## GEO — AI search visibility

Getting a local service business recommended by ChatGPT, Perplexity, and Google AI Mode.

${geoLines}

Founding rate: first 3 clients, $${GEO_FOUNDING.monthly}/mo locked 12 months. Details: ${base}/geo

## Proof

- Splash Jacks Pools: ${base}/case-studies/splash-jacks-pools — live at https://splashjackspools.com
- AlignMD: ${base}/case-studies/alignmd — live at https://alignmd.vercel.app

## Also from Day14

- Marque / AdForge (ads): https://ad-forge-amber.vercel.app

## Key pages

- [Home](${base}/)
- [Platform](${base}/platform)
- [Pricing](${base}/pricing)
- [GEO](${base}/geo)
- [Book](${base}/book)
- [FAQ](${base}/faq)
- [Process](${base}/process)

## Contact

- Book a call: ${SITE.bookingUrl}
- Email: ${SITE.email}
- Site: ${base}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
