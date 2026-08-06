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


export interface CaptureTier {
  slug: "capture-audit" | "capture-essentials" | "capture-growth";
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
 * Capture — the fourth business line. An AI lead-capture / receptionist for
 * local service businesses: catches the calls and messages you're already
 * missing (nights, weekends, on a job) and books them. Closes the funnel:
 * build presence (web) + buy traffic (ads) + own AI visibility (GEO) +
 * capture the demand (Capture).
 *
 * Canonical prices set 2026-07-11. Stripe links not yet created — the env
 * vars below are reserved names; /capture CTAs route to /book until wired.
 * Honesty rail: "catches what you're missing," never "never miss a call."
 */
export const CAPTURE_TIERS: CaptureTier[] = [
  {
    slug: "capture-audit",
    name: "Call Leak Audit",
    oneTime: 250,
    monthly: null,
    priceLabel: "$250 one-time",
    tagline: "See exactly which calls and leads are slipping through today.",
    bestFor:
      "Any local service business that suspects it's losing jobs to missed calls — after hours, on a job, or during the lunch rush. Free for active Day14 clients.",
    features: [
      "Live missed-call test across your real scenarios: after-hours, on-a-job, second simultaneous caller",
      "Where each call goes today — ring-out, voicemail, or nowhere — with response times",
      "An honest estimate of the leads leaking per week and what they're worth",
      "Recording + AI-identification + Florida two-party disclosure compliance check",
      "A ranked fix list — what Capture would catch first",
    ],
    paymentLinkEnv: "STRIPE_PAYMENT_LINK_CAPTURE_AUDIT",
    featured: false,
  },
  {
    slug: "capture-essentials",
    name: "Capture Essentials",
    oneTime: null,
    monthly: 395,
    priceLabel: "$395/mo",
    tagline: "An AI receptionist that catches what you're missing.",
    bestFor:
      "Service businesses losing after-hours and overflow calls that want them caught, identified, and booked — without hiring a receptionist.",
    features: [
      "AI voice assistant that answers missed and after-hours calls, always identifying as automated",
      "Caller details captured and handed to you the moment a call is caught",
      "Florida-compliant recording disclosure on every greeting",
      "Missed-call text-back (once A2P is approved) so no lead goes cold",
      "Monthly report: calls caught, jobs booked, revenue attributed to source",
    ],
    paymentLinkEnv: "STRIPE_PAYMENT_LINK_CAPTURE_ESSENTIALS",
    featured: true,
  },
  {
    slug: "capture-growth",
    name: "Capture Growth",
    oneTime: null,
    monthly: 795,
    priceLabel: "$795/mo",
    tagline: "Everything caught, tuned, and booked across every channel.",
    bestFor:
      "Higher-volume businesses that want voice, SMS, and web chat working as one capture system with continuous tuning.",
    features: [
      "Everything in Essentials",
      "Website chat + SMS capture wired into the same assistant",
      "Speed-to-lead on ad and form inquiries",
      "Monthly transcript review + assistant tuning against the quality rubric",
      "Booking-attribution reporting: which channel caught which job",
    ],
    paymentLinkEnv: "STRIPE_PAYMENT_LINK_CAPTURE_GROWTH",
    featured: false,
  },
];

/**
 * Founding-client rate: replaces Capture Essentials' monthly for the first
 * three Capture clients, locked 12 months, in exchange for testimonial +
 * case-study rights. The $250 Call Leak Audit is free for active Day14 clients.
 */
export const CAPTURE_FOUNDING = {
  monthly: 295,
  appliesTo: "capture-essentials" as const,
  label: "$295/mo founding rate",
  terms:
    "Locked for 12 months. First 3 clients only, in exchange for a testimonial and case-study rights.",
} as const;


export interface MarqueTier {
  slug: "marque-starter" | "marque-essentials" | "marque-growth";
  name: string;
  oneTime: number | null; // one-time USD; null = subscription tier
  monthly: number | null; // monthly USD; null = one-time only
  priceLabel: string;
  tagline: string;
  bestFor: string;
  features: string[];
  paymentLinkEnv: string | null; // env var holding the Stripe payment link
  featured: boolean;
  /**
   * Minimum monthly MEDIA spend — paid to Meta/Google, never to Day14 — below
   * which this tier's creative cannot be evaluated. Published on /marque and on
   * the tier card; disclosed, NOT enforced at checkout. This is a readability
   * floor, not a performance promise. See MARQUE_SPEND_RULE.
   */
  spendFloorMonthly: number;
  /** Variants generated per month (the bench). */
  variantsPerMonth: number;
  /** Variants live in the auction at once (the disciplined number). */
  variantsLive: number;
}

/**
 * The published spend rule — the honest constraint behind every Marque tier.
 *
 * Meta's delivery system needs roughly 50 optimization events per AD SET per
 * week to exit "Learning Limited", and multiple ads inside one ad set SHARE a
 * single event pool. The working rule of thumb is a daily budget of at least
 * 5x the target cost-per-action, per live ad set. Below that, results are
 * noise and no creative — ours or anyone else's — can be told apart from any
 * other.
 *
 * We publish this because the alternative is a client spending $600/mo blaming
 * the creative for an under-spend problem. It also explains why Marque runs a
 * SMALL number of variants at once: piling a dozen ads into one ad set
 * fragments nothing (they share the pool) but spreading them across ad sets
 * splits the 50-event budget and keeps everything stuck in learning. The bench
 * is deep; the field is not.
 */
export const MARQUE_SPEND_RULE = {
  eventsPerAdSetPerWeek: 50,
  dailyBudgetMultipleOfCpa: 5,
  billing:
    "Media spend is billed to you by Meta or Google on your own ad account. Day14 never touches it.",
} as const;

/**
 * Marque — Day14's creative pipeline for paid ads, the fifth service line and
 * the "buy" motion in build -> buy -> own -> capture.
 *
 * POSITIONING (revised 2026-07-27, Jack): Marque sells a CREATIVE PIPELINE —
 * generation volume, variant tagging, fatigue detection, and brand consistency
 * — not ad management. Management survives only at Growth, where the fee can
 * carry it. Starter and Essentials deliver creative and the discipline around
 * it; the client runs the account. Every tier publishes a media-spend floor.
 *
 * Canonical prices set by Jack 2026-07-20 (his explicit call to price + expose)
 * and unchanged by the repositioning: $99 / $299 / $799 monthly.
 */
export const MARQUE_TIERS: MarqueTier[] = [
  {
    slug: "marque-starter",
    name: "Marque Starter",
    oneTime: null,
    monthly: 99,
    priceLabel: "$99/mo",
    tagline: "The bench — twelve tagged variants a month, in your brand.",
    bestFor:
      "Owners already running their own ads whose real bottleneck is creative going stale faster than they can replace it.",
    features: [
      "12 new ad variants a month — static and short-form video, sized for Meta and Google",
      "Every asset ships tagged: hook type, offer angle, format, aspect ratio — so you learn which angle won, not just which image",
      "A locked brand kit — palette, type, logo lockups, tone rules — that every generation runs through, so variant #40 still looks like you",
      "Run four at a time on a fixed swap cadence; the rest are bench depth",
      "You run them on your own accounts and keep every asset, including after you cancel",
      "Creative is the deliverable. No campaign management, no performance promise.",
    ],
    paymentLinkEnv: "STRIPE_PAYMENT_LINK_MARQUE_STARTER",
    featured: false,
    spendFloorMonthly: 900,
    variantsPerMonth: 12,
    variantsLive: 4,
  },
  {
    slug: "marque-essentials",
    name: "Marque Essentials",
    oneTime: null,
    monthly: 299,
    priceLabel: "$299/mo",
    tagline: "The full pipeline — generate, tag, detect fatigue, replace.",
    bestFor:
      "One offer on one channel, where you want the creative supply and the swap decisions handled but the account kept in your own hands.",
    features: [
      "24 new variants a month, tagged and filed into a library you can search by angle",
      "Read access to your ad account so fatigue is caught from real signal — frequency climb, CTR decay, CPM drift — not a calendar",
      "Four to six live at once; we name the one to retire and hand you its replacement the same week",
      "Monthly angle report: which hooks and offers held up, which died, and what we're generating next",
      "Brand consistency enforced across every variant — same kit, same voice, no drift",
      "You keep the account, the budget, and every asset. We never touch the money.",
    ],
    paymentLinkEnv: "STRIPE_PAYMENT_LINK_MARQUE_ESSENTIALS",
    featured: true,
    spendFloorMonthly: 1500,
    variantsPerMonth: 24,
    variantsLive: 6,
  },
  {
    slug: "marque-growth",
    name: "Marque Growth",
    oneTime: null,
    monthly: 799,
    priceLabel: "$799/mo",
    tagline: "The pipeline, plus our hands on the account.",
    bestFor:
      "Multiple offers or channels at once, where someone has to own both the creative supply and the campaign structure feeding it.",
    features: [
      "40+ variants a month across offers and channels, fully tagged",
      "Everything in Essentials, plus campaign setup, ad-set structure, and weekly optimization managed for you",
      "Eight live at a time, sequenced so your ad sets aren't splitting one event pool between them",
      "Landing-page and Capture handoff so the clicks you pay for actually get caught",
      "Priority queue and a monthly strategy review",
      "Spend still billed to you by the platform, still yours to set and pause.",
    ],
    paymentLinkEnv: "STRIPE_PAYMENT_LINK_MARQUE_GROWTH",
    featured: false,
    spendFloorMonthly: 4500,
    variantsPerMonth: 40,
    variantsLive: 8,
  },
];
