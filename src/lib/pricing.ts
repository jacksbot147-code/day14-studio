/**
 * pricing.ts — THE single source of truth for every price on day14.us.
 *
 * Rule (binding, from WEBSITE-OVERHAUL-SPEC): no page may hard-code a price.
 * Import from here. If a price isn't here, it doesn't exist.
 *
 * Value rationale (set 2026-06-11, Jack delegated pricing to Claude):
 * - Local $199/mo undercuts marketplace middlemen (GreenPal et al. take
 *   10–20% per job) at any realistic volume; setup is 1–2 jobs of revenue.
 * - Portal serves recurring-route businesses (300+ stop pool routes) where
 *   a customer portal directly cuts churn + phone load → higher ops fee.
 * - Platform is a full software business; the price is the qualifier.
 * - OS tiers are waitlist-only founder pricing; not purchasable yet.
 */

export interface ServiceTier {
  slug: "spark" | "local" | "portal" | "platform";
  name: string;
  setup: number | null; // one-time USD; null = custom quote
  setupLabel: string;
  monthly: number;
  monthlyLabel: string;
  tagline: string;
  bestFor: string;
  features: string[];
  paymentLinkEnv: string | null; // env var holding the Stripe payment link
  featured: boolean;
}

export const SERVICE_TIERS: ServiceTier[] = [
  {
    slug: "spark",
    name: "Spark",
    setup: 750,
    setupLabel: "$750 build",
    monthly: 49,
    monthlyLabel: "$49/mo",
    tagline: "Look established. Overnight.",
    bestFor:
      "Word-of-mouth businesses — tutors, coaches, trades. When someone hears your name and Googles you, they find a business, not a question mark.",
    features: [
      "A custom-designed page that looks agency-built — services, pricing, your story",
      "Your phone number front and center, click-to-call on every screen",
      "Your own domain, found on Google, perfect on phones",
      "Every edit handled for you — text a change, it goes live",
      "Live in 7 days, and it grows with you: upgrade anytime, pay only the difference",
    ],
    paymentLinkEnv: "STRIPE_PAYMENT_LINK_SPARK",
    featured: false,
  },
  {
    slug: "local",
    name: "Local",
    setup: 1500,
    setupLabel: "$1,500 build",
    monthly: 199,
    monthlyLabel: "$199/mo",
    tagline: "Your crew works. The paperwork runs itself.",
    bestFor:
      "Service businesses — lawn, pool, pressure washing — losing jobs to phone tag.",
    features: [
      "Custom site that turns visitors into quote requests",
      "Online quoting — no more phone tag",
      "Mon–Fri scheduling board built around your route",
      "Customer tracking + automatic follow-up",
      "Live in 14 days",
    ],
    paymentLinkEnv: "STRIPE_PAYMENT_LINK_SITE",
    featured: true,
  },
  {
    slug: "portal",
    name: "Portal",
    setup: 2500,
    setupLabel: "$2,500 build",
    monthly: 299,
    monthlyLabel: "$299/mo",
    tagline: "Everything in Local, plus your customers serve themselves.",
    bestFor:
      "Recurring-route businesses — customers log in, see visits, pay invoices.",
    features: [
      "Everything in Local",
      "Customer portal with login",
      "Visit history + photo proof",
      "Online invoice payment",
      "Route-density scheduling",
    ],
    paymentLinkEnv: "STRIPE_PAYMENT_LINK_PORTAL",
    featured: false,
  },
  {
    slug: "platform",
    name: "Platform",
    setup: null,
    setupLabel: "from $9,000",
    monthly: 499,
    monthlyLabel: "$499/mo",
    tagline: "The full software business.",
    bestFor:
      "Marketing site + customer portal + admin app + billing, wired live. Quoted in 48 hours.",
    features: [
      "Everything in Portal",
      "Full admin application",
      "Stripe billing wired live",
      "Staging + production deploys",
      "Team handoff + training",
    ],
    paymentLinkEnv: null, // custom quote → intake form
    featured: false,
  },
];

export interface OsTier {
  slug: "solo" | "portfolio" | "founder";
  name: string;
  monthly: number;
  tenants: string;
  bestFor: string;
  featured: boolean;
}

/** Waitlist-only. Founder pricing locks at 100 signups. NOT purchasable yet. */
export const OS_TIERS: OsTier[] = [
  {
    slug: "solo",
    name: "Solo",
    monthly: 79,
    tenants: "1 tenant",
    bestFor: "One operator, one business, wants the OS but only needs one slot.",
    featured: false,
  },
  {
    slug: "portfolio",
    name: "Portfolio",
    monthly: 299,
    tenants: "Up to 5 tenants",
    bestFor: "One operator, two to five businesses. The shape this OS was built for.",
    featured: true,
  },
  {
    slug: "founder",
    name: "Founder",
    monthly: 999,
    tenants: "Unlimited tenants",
    bestFor: "Heavy users. Onboarding session, direct line. Closes at 100 signups.",
    featured: false,
  },
];

export const PRICING_NOTES = {
  founderCap: "Founder pricing locks for the first 100 signups.",
  noGames: "No drip campaign. No upsell calls.",
  opsIncluded: "Every build includes the first 3 months of ops.",
} as const;
