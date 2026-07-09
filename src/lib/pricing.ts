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

export interface GeoTier {
  slug: "geo-audit" | "geo-essentials" | "geo-growth";
  name: string;
  oneTime: number | null; // one-time USD; null = subscription tier
  monthly: number | null; // monthly USD; null = one-time only
  priceLabel: string;
  tagline: string;
  bestFor: string;
  features: string[];
  paymentLinkEnv: string | null; // env var holding the Stripe payment link
  featured: boolean;
}

/**
 * GEO (Generative Engine Optimization) — the third business line.
 * Getting local service businesses recommended by ChatGPT, Perplexity,
 * and Google AI Mode. Completes the trifecta: build presence (web
 * agency) + buy traffic (AI ads) + own AI-answer visibility (GEO).
 *
 * Canonical prices set by Jack 2026-07-09. Stripe links not yet created —
 * the env vars below are reserved names; /geo CTAs route to /book until
 * Jack wires them.
 */
export const GEO_TIERS: GeoTier[] = [
  {
    slug: "geo-audit",
    name: "AI Visibility Audit",
    oneTime: 750,
    monthly: null,
    priceLabel: "$750 one-time",
    tagline: "Find out what the AI engines say when someone asks about you.",
    bestFor:
      "Any local service business that has never checked whether ChatGPT, Perplexity, or Google AI Mode recommends them — or a competitor.",
    features: [
      "20-prompt visibility baseline across ChatGPT, Perplexity, and Google AI Mode",
      "Your visibility score out of 20, with every transcript included",
      "Competitor comparison — who the engines name instead of you, and why",
      "Entity + citation audit: the inconsistencies that keep AI from trusting you",
      "Ranked fix list — what to change first, in plain English",
    ],
    paymentLinkEnv: "STRIPE_PAYMENT_LINK_GEO_AUDIT",
    featured: false,
  },
  {
    slug: "geo-essentials",
    name: "GEO Essentials",
    oneTime: null,
    monthly: 595,
    priceLabel: "$595/mo",
    tagline: "The monthly work that makes AI engines recommend you.",
    bestFor:
      "Service businesses that want steady AI-answer visibility handled for them — the GEO equivalent of a retainer.",
    features: [
      "Everything in the Audit, re-run monthly with score tracking",
      "llms.txt + structured data (Organization, Service, FAQ) built and maintained",
      "Citation + entity cleanup across the directories AI engines actually read",
      "Answer-ready FAQ and service content, written to be quoted by AI",
      "Monthly report: score, movement, and what changed",
    ],
    paymentLinkEnv: "STRIPE_PAYMENT_LINK_GEO_ESSENTIALS",
    featured: true,
  },
  {
    slug: "geo-growth",
    name: "GEO Growth",
    oneTime: null,
    monthly: 1250,
    priceLabel: "$1,250/mo",
    tagline: "Own the answer across your whole service area.",
    bestFor:
      "Businesses competing across multiple cities or service lines that want AI answers, ads, and content working as one system.",
    features: [
      "Everything in Essentials",
      "Per-city and per-service visibility tracking (the full prompt matrix)",
      "New answer-content published monthly, targeted at the gaps",
      "Competitor displacement work — the prompts where they beat you get priority",
      "Quarterly strategy review with the full transcript archive",
    ],
    paymentLinkEnv: "STRIPE_PAYMENT_LINK_GEO_GROWTH",
    featured: false,
  },
];

/**
 * Founding-client rate: replaces GEO Essentials' monthly for the first
 * three GEO clients, locked 12 months, in exchange for testimonial +
 * case-study rights. [Assumption 2026-07-09: applies to Essentials —
 * confirm with Jack before quoting it against Growth.]
 */
export const GEO_FOUNDING = {
  monthly: 495,
  appliesTo: "geo-essentials" as const,
  label: "$495/mo founding rate",
  terms:
    "Locked for 12 months. First 3 clients only, in exchange for a testimonial and case-study rights.",
} as const;

export const PRICING_NOTES = {
  founderCap: "Founder pricing locks for the first 100 signups.",
  noGames: "No drip campaign. No upsell calls.",
  opsIncluded: "Every build includes the first 3 months of ops.",
} as const;
