/**
 * payment-links.ts — server-side resolver for Stripe Payment Link URLs.
 *
 * Each service tier in pricing.ts names the env var that holds its Stripe
 * Payment Link (e.g. STRIPE_PAYMENT_LINK_SPARK). This reads those at render time
 * and returns a { slug -> url } map of the ones that are actually set, so the
 * pricing cards can show a real "Get started" checkout button when a link
 * exists, and gracefully fall back to "Book a 15-min look" when it doesn't.
 *
 * Server-only (reads process.env). Payment Link URLs are public by design, so
 * passing the resolved strings down to a client component is fine. Create the
 * links with scripts/create-stripe-payment-links.ts (run by Jack), then set the
 * env vars and rebuild.
 */

import { SERVICE_TIERS } from "./pricing";

export function getPaymentLinks(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tier of SERVICE_TIERS) {
    if (!tier.paymentLinkEnv) continue;
    const url = process.env[tier.paymentLinkEnv];
    if (url && /^https?:\/\//.test(url)) out[tier.slug] = url;
  }
  return out;
}
