/**
 * Day14 — shared site content.
 *
 * Single source of truth for marketing copy. Edit copy here, not inside
 * the page components, so the homepage / case studies / OG images all
 * stay in sync.
 */

export const SITE = {
  brand: "Day14",
  tagline: "Real business platforms, owned by you. Built in 14 days.",
  domain: "day14.us",
  bookingUrl: "https://cal.com/day14/intro",
  email: "hello@day14.us",
  ownerHandle: "Jack",
  location: "Southwest Florida",
} as const;

/**
 * Headline stats — shown on the hero, in OG images, and referenced
 * throughout the copy. Update as the portfolio grows.
 */
export const STATS = {
  avgShipDays: 9,
  guaranteeDays: 14,
  liveBuilds: 3,
  startingPriceUsd: 2500,
} as const;

export const PITCH = {
  oneLiner:
    "Day14 builds you a complete branded business platform — marketing site, customer portal, billing, admin app, AI chatbot — in 14 days. Fixed price. You own the code, the domain, the data. Not a SaaS subscription. Not a Squarespace template. A real product, with your name on the repo.",
  vsSaaS:
    "Jobber rents you a back-office for $99/mo forever. Squarespace rents you a brochure. We build you something that is yours.",
  vsAgency:
    "Agencies bid $50k and ship in 9 months. MVP shops ship one piece in two weeks. We ship the whole stack in 14 days, fixed price.",
  founderAngle:
    "Built by an operator, not an agency. One builder who runs his own businesses and ships software for others who run theirs.",
} as const;

export type SkuId = "site" | "portal" | "platform";

export type Sku = {
  id: SkuId;
  name: string;
  blurb: string;
  oneTime: number;
  monthly: number;
  shipsIn: string;
  bestFor: string;
  features: string[];
  popular?: boolean;
};

export const SKUS: Sku[] = [
  {
    id: "site",
    name: "Site",
    blurb: "Marketing-only build. Real digital presence, no online ordering.",
    oneTime: 2500,
    monthly: 99,
    shipsIn: "7 days",
    bestFor:
      "Businesses that need a real website but don't take online bookings or payments yet — brand-heavy services, event companies, local shops.",
    features: [
      "Custom-designed homepage, services, pricing, about, contact, FAQ",
      "5 SEO landing pages for your service area or product lines",
      "Lead capture → your email + a simple dashboard",
      "AI chatbot trained on your services, pricing, and brand voice",
      "Mobile-optimized, PWA-ready, dynamic OG images",
      "Custom domain, SSL, hosting, MailerLite or Resend wired",
    ],
  },
  {
    id: "portal",
    name: "Portal",
    blurb: "Everything in Site, plus a customer portal with billing.",
    oneTime: 5000,
    monthly: 199,
    shipsIn: "14 days",
    popular: true,
    bestFor:
      "Service businesses with recurring customers — cleaners, groomers, salons, gyms, trainers, lawn care, pool service, dog walking.",
    features: [
      "Magic-link customer login (no passwords)",
      "Customer dashboard: account, history, invoices, messages",
      "Self-service: reschedule, pause, request quote, leave notes",
      "Stripe billing — customers pay through the portal",
      "Email + SMS notifications (included in monthly)",
      "Everything in Site",
    ],
  },
  {
    id: "platform",
    name: "Platform",
    blurb: "Everything in Portal, plus the full operator admin app.",
    oneTime: 10000,
    monthly: 399,
    shipsIn: "21 days",
    bestFor:
      "Service businesses and marketplaces ready to fully run on Day14 — the whole back office.",
    features: [
      "Customer + lead + visit/job CRUD with global search",
      "Auto-scheduling, day-of-week routing, role-based admin",
      "Photo proof with GPS + timestamp watermarking",
      "Quotes, invoicing, PDF receipts, Stripe milestone escrow (marketplaces)",
      "Daily admin digest, broadcast SMS, CSV exports",
      "'Needs attention' widgets, analytics dashboards",
      "Everything in Portal",
    ],
  },
];

export const TIMELINE = [
  {
    day: "Day 0",
    title: "Intro call + order form",
    body: "30-minute call. We walk through the live demos. You pick a SKU. Signed order form same day, 50% deposit.",
  },
  {
    day: "Day 1",
    title: "Intake",
    body: "One-page form: business name, services, pricing, brand, photos, service area. That's the whole input.",
  },
  {
    day: "Day 2",
    title: "Preview URL goes live",
    body: "Marketing site is up on a *.day14.dev preview within 24 hours. You can watch the build progress live on a public build-log.",
  },
  {
    day: "Days 3–12",
    title: "Build",
    body: "Portal, billing, admin app, integrations. We ship every weekday. You get a daily one-paragraph update and the build-log shows every commit.",
  },
  {
    day: "Day 13",
    title: "QA + walkthrough",
    body: "Full review, polish pass, 5-minute Loom walkthrough sent to you. You sign off or flag changes.",
  },
  {
    day: "Day 14",
    title: "Launch — or your deposit back",
    body: "Domain pointed, Stripe live mode flipped, 30-minute training call. Live by day 14 or your deposit refunds in full and you keep everything we've shipped.",
  },
] as const;

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Why not just use Jobber, Housecall Pro, or GoHighLevel?",
    a: "Because you're renting. SaaS platforms charge $69–$329/mo forever, lock you into their templates, hold your customer data, and use their branding inside your customer-facing app. Day14 builds you something that is yours — your domain, your repo, your database, your customer relationships. You can cancel us anytime and self-host the result. Try canceling Jobber and keeping the customer portal.",
  },
  {
    q: "Do you only do service businesses?",
    a: "No. We've shipped service-business platforms (Splash Jacks Pools), brand-heavy event sites (Casamoré), and two-sided marketplaces (Buildbridge). Anything that fits in Site / Portal / Platform we'll quote on the call. If it doesn't fit, we'll tell you on the call instead of dragging it out.",
  },
  {
    q: "Do I own the code?",
    a: "Yes. The repo is yours from day one. If you cancel hosting we hand you a tarball and a migration runbook so you can take it in-house or to another developer.",
  },
  {
    q: "What if I cancel?",
    a: "30 days notice, no annual contract. You keep the code, the domain, and the customer data. We unwire the integrations and walk you through self-hosting if you want it.",
  },
  {
    q: "Who owns the domain?",
    a: "You. Always. We register it in your name, or you bring your own. We never hold a customer's domain hostage.",
  },
  {
    q: "Can I migrate off Day14 hosting?",
    a: "Yes. Everything we build runs on standard open-source infrastructure (Next.js, Postgres, Stripe). Any competent developer can take it over.",
  },
  {
    q: "Is this actually built by AI?",
    a: "It's built by one operator using Claude-based agents to do the heavy lifting. We review every line, write the architecture, and own every customer relationship. The agents are the leverage; the judgment is human.",
  },
  {
    q: "Why is it so much cheaper than an agency?",
    a: "Agencies have project managers, designers, frontend, backend, QA, account managers. We have one operator and a fleet of agents. Same output, no overhead. We pass the savings on.",
  },
  {
    q: "What about hosting and infrastructure costs?",
    a: "Included in your monthly fee. Vercel, Supabase, Resend, Twilio — all rolled in. No surprise bills, no separate vendor accounts to manage.",
  },
  {
    q: "What if I need changes after launch?",
    a: "Your monthly includes one hour of changes. Anything bigger is $200/hr with a 4-hour minimum, billed in advance. Major adds usually roll into a Platform upgrade.",
  },
  {
    q: "What's the 'launch by day 14 or deposit back' guarantee?",
    a: "Exactly what it sounds like. If your Portal isn't live and accepting real customer payments by the end of day 14, your $2,500 deposit refunds in full and you keep everything we've shipped — the repo, the preview deployment, the work in progress. We carry the timeline risk so you don't.",
  },
  {
    q: "Do you do logos and branding from scratch?",
    a: "Not from scratch. We use the logo and colors you already have. If you don't have a logo yet, we'll point you to a couple of designers we trust — they can usually turn one around inside our 14-day window.",
  },
];

export type VerticalSlug = "mobile-service" | "membership" | "food";

export type Vertical = {
  slug: VerticalSlug;
  name: string;
  /** Short label for nav menus and chip badges. */
  shortName: string;
  tagline: string;
  /** The businesses this vertical covers. */
  examples: string[];
  /** Which SKUs are the natural fit. */
  recommendedSkus: SkuId[];
  /** The customer's biggest pain points before Day14. */
  painPoints: string[];
  /** What we ship for this vertical specifically. */
  features: string[];
  /** A nearby Day14 case study to reference. */
  exemplarSlug: "splash-jacks-pools" | "casamore" | "buildbridge";
  /** Anchor color tone for the vertical hero (uses Tailwind tokens). */
  accent: "ember" | "shipped" | "ink";
};

export const VERTICALS: Vertical[] = [
  {
    slug: "mobile-service",
    name: "Mobile services with recurring customers",
    shortName: "Mobile service",
    tagline:
      "Pool care, lawn care, HVAC, cleaning, mobile detailing, dog grooming — anyone driving from job to job.",
    examples: [
      "Pool service",
      "Lawn + landscape",
      "HVAC tune-ups",
      "House cleaning",
      "Mobile detailing",
      "Mobile pet grooming",
      "Dog walking",
      "Pest control",
    ],
    recommendedSkus: ["portal", "platform"],
    painPoints: [
      "Customer details live in your head, on paper, or in a Google Sheet",
      "Photo proof of work happens in a text thread that nobody can find later",
      "Invoices are emailed manually, payments chased manually",
      "Reschedules and pauses become phone tag every Sunday night",
      "There's no website that explains what you actually do",
    ],
    features: [
      "Branded customer portal with magic-link login (no passwords)",
      "Visit history with photos, notes, and chemistry / measurements",
      "Self-reschedule, pause, request quote — customer doesn't text you on Sunday",
      "Auto-scheduling with day-of-week routing (Platform tier)",
      "Photo proof pipeline with GPS + timestamp watermarks",
      "Stripe subscription billing + auto-invoicing",
      "SMS reminders the day before each visit",
      "AI chatbot trained on your services + pricing",
    ],
    exemplarSlug: "splash-jacks-pools",
    accent: "ember",
  },
  {
    slug: "membership",
    name: "Membership businesses with recurring billing",
    shortName: "Membership",
    tagline:
      "Salons, med spas, gyms, yoga studios, massage, personal training — anyone with packages, classes, or recurring billing.",
    examples: [
      "Hair salons + barbers",
      "Med spas + aesthetics",
      "Gyms + CrossFit boxes",
      "Yoga + pilates studios",
      "Massage practices",
      "Personal trainers",
      "Tutoring + lessons",
      "Coaching practices",
    ],
    recommendedSkus: ["portal", "platform"],
    painPoints: [
      "Booking lives on Calendly or paper — no membership tier logic",
      "Mindbody / Vagaro fees eat 4–6% of every transaction plus monthly",
      "Customer portal looks like a vendor's product, not yours",
      "Class capacity and waitlists are managed by hand",
      "Membership perks aren't visible to the customer who's paying for them",
    ],
    features: [
      "Membership tier signup (monthly / quarterly / annual)",
      "Class + appointment booking with capacity + waitlist",
      "Customer dashboard: upcoming classes, package balance, payment history",
      "Stripe subscriptions with proration + pause + cancel-flow",
      "Branded customer portal — your name on every screen",
      "Operator dashboard with attendance, no-show flags, retention metrics",
      "SMS + email reminders 24h before each booking",
      "AI chatbot trained on your services, package options, and pricing",
    ],
    exemplarSlug: "splash-jacks-pools",
    accent: "shipped",
  },
  {
    slug: "food",
    name: "Small food + hospitality businesses",
    shortName: "Food + hospitality",
    tagline:
      "Restaurants, cafés, food trucks, bakeries, mobile bars — anyone who can't justify Toast or Square for Restaurants but needs more than a Squarespace menu.",
    examples: [
      "Independent restaurants",
      "Cafés + coffee shops",
      "Food trucks",
      "Bakeries + pastry shops",
      "Mobile bars + caterers",
      "Ghost kitchens",
      "Pop-up dinners",
      "Specialty food retailers",
    ],
    recommendedSkus: ["site", "portal"],
    painPoints: [
      "Toast charges $69/mo + 2.5% — and you don't own the customer relationship",
      "Online ordering plugins look generic and don't match the brand",
      "Loyalty programs are a separate app the customer has to download",
      "Catering inquiries land in DMs and emails with no system",
      "Specials and menu updates require a developer or a long Squarespace edit",
    ],
    features: [
      "Branded menu + ordering site, editable by you in plain English",
      "Pickup + delivery routing (uses Stripe + a courier integration or your own driver)",
      "Loyalty + return-customer tracking baked in — no separate app",
      "Catering inquiry form → operator dashboard with quote workflow",
      "Specials + events page editable without code",
      "AI chatbot answering hours, menu, dietary, and order-status questions",
      "Email list capture wired to Resend or MailerLite",
      "Mobile-first PWA — orderable from a phone in 3 taps",
    ],
    exemplarSlug: "casamore",
    accent: "ink",
  },
];

export type CaseStudy = {
  slug: string;
  name: string;
  industry: string;
  location: string;
  sku: "Site" | "Portal" | "Platform";
  timeline: string;
  /** Public URL — null if not yet linkable (e.g. SSO-gated previews). */
  url: string | null;
  /** Short label shown on listings ("Live" / "Preview" / "Internal"). */
  state: "Live" | "Preview" | "Internal";
  summary: string;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "splash-jacks-pools",
    name: "Splash Jacks Pools",
    industry: "Pool Service · Recurring B2C",
    location: "Naples & Bonita Springs, FL",
    sku: "Platform",
    timeline: "14 days",
    url: "https://splashjackspools.com",
    state: "Live",
    summary:
      "Complete service-business platform built from zero in two weeks. Marketing site, SEO city pages, AI chatbot, customer portal with visit history and self-reschedule, operator admin app with route scheduler and photo proof, Stripe billing end-to-end. The founder runs this business himself.",
  },
  {
    slug: "casamore",
    name: "Casamoré",
    industry: "Events · Brand-heavy B2C",
    location: "Southwest Florida",
    sku: "Site",
    timeline: "Site tier — fast brand-led launch",
    url: "https://houseoflove.co",
    state: "Live",
    summary:
      "Silent disco events brand with a full visual identity, 18 marketing pages, 19 on-brand blog essays, poster series, merch mockups, zine, and a MailerLite-powered membership funnel. This is the Site tier exemplar — for customers who need a brand more than a back office.",
  },
  {
    slug: "buildbridge",
    name: "Buildbridge",
    industry: "Two-sided Marketplace · B2B2C",
    location: "Southwest Florida",
    sku: "Platform",
    timeline: "Platform tier — multi-week regional build",
    url: null,
    state: "Preview",
    summary:
      "Two-sided home-services marketplace with Stripe milestone escrow, atomic role-based user provisioning, multi-county permit-portal integrations (Lee, Collier, Charlotte), and a regionally-defensible Storm Mode feature (NOAA tracker → pre-approved contractor panel → one-tap mobilization). Native iOS + Android wrappers via Capacitor. Preview is currently SSO-gated; ask on the call for a walkthrough.",
  },
];
