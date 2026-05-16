/**
 * Day14 — public build-log data.
 *
 * Single source of truth for every customer build the studio is running
 * or has shipped. The /builds index, /builds/[slug] per-customer pages,
 * and the homepage "Now building" widget all read from `BUILDS`.
 *
 * Conventions:
 * - Dates are ISO `YYYY-MM-DD`. Day numbers are 1-indexed against the
 *   14-day delivery promise (Day 1 = first build day, Day 14 = launch).
 * - `commits` are short-sha strings; the build-log treats them as opaque
 *   labels — no GitHub linking yet (private repos until customer go-live).
 * - `previewUrl` is the *.day14.dev preview that goes live on Day 2;
 *   `productionUrl` is the customer-owned domain after launch.
 */
import type { VerticalSlug } from "@/lib/site";

export type BuildStatus = "in-progress" | "shipped" | "paused";

export type BuildEntry = {
  /** Day number, 1-indexed against the 14-day promise. */
  day: number;
  /** ISO date for the day's work. */
  date: string;
  /** One-paragraph operator summary, same copy sent to the customer EOD. */
  summary: string;
  /** Short SHAs of the day's commits. Optional — early scaffolding days
   *  sometimes have a single commit. */
  commits?: string[];
  /** Public URL to a screenshot artifact for the day. Optional — when
   *  unset the per-customer page renders a placeholder tile. */
  screenshotUrl?: string;
};

export type Build = {
  slug: string;
  customerName: string;
  /** Vertical the customer falls into, or "custom" for one-offs that
   *  don't map cleanly to one of our productized verticals. */
  vertical: VerticalSlug | "custom";
  sku: "Site" | "Portal" | "Platform";
  /** ISO start date — Day 1 of the 14-day clock. */
  startDate: string;
  /** ISO target ship date — Day 14 by definition. */
  targetShipDate: string;
  /** ISO actual ship date once the build is live. */
  actualShipDate?: string;
  status: BuildStatus;
  /** *.day14.dev preview deployment. Null while waiting on intake. */
  previewUrl: string | null;
  /** Customer-owned production URL. Null until launch day. */
  productionUrl: string | null;
  /** Stack labels used on the per-customer page. Free-form short strings. */
  stack: string[];
  /** One-line current status. Shown on the index row and the "Now
   *  building" homepage widget. For shipped builds this is a one-line
   *  summary of what was delivered. */
  currentStatus: string;
  entries: BuildEntry[];
};

/* -------------------------------------------------------------------------- */
/* Splash Jacks Pools — Day14 customer #0, retrospective entries.             */
/* Reconstructs the actual two-week build from the case-study timeline.       */
/* -------------------------------------------------------------------------- */

const SPLASH_JACKS_ENTRIES: BuildEntry[] = [
  {
    day: 1,
    date: "2026-04-21",
    summary:
      "Repo + scaffold day. Next.js 14 App Router, TypeScript strict with noUncheckedIndexedAccess, Tailwind tokens, Prisma + Supabase wired, Vercel preview pushed end-of-day. Homepage skeleton loads on the *.day14.dev preview URL by 5pm.",
    commits: ["a3f9b21", "c1d4e80", "7b2af19"],
  },
  {
    day: 2,
    date: "2026-04-22",
    summary:
      "Customer + visit + chemistry data model. Prisma schema for customers, addresses, visits, chemistry readings, photos, invoices. Seed script with 30 fake Naples-area customers so the admin app has something to render against from day one.",
    commits: ["e2c7503", "9f1d6a4"],
  },
  {
    day: 3,
    date: "2026-04-23",
    summary:
      "Operator admin app — customer + lead CRUD with global search, list views, and a detail page per customer. Role-based gate via Supabase auth so only the operator can hit /admin. First commit of the visit-logging form.",
    commits: ["44a8c12", "b03e9f7", "2fd7c30"],
  },
  {
    day: 4,
    date: "2026-04-24",
    summary:
      "Photo-upload pipeline end-to-end. sharp resize + exifr GPS extraction + timestamp + service-area watermarking. Server actions bumped to 50MB body limit so a tech can drop ten phone photos and have them processed inline.",
    commits: ["d6e1b22", "ff04a18"],
  },
  {
    day: 5,
    date: "2026-04-25",
    summary:
      "Visit logging UI: chemistry input with normalization and flag thresholds, photo proof attached to each visit, notes-for-the-customer field. Operator can now log a complete visit from the field on a phone in under 90 seconds.",
    commits: ["aa3729d", "1c8e6b0", "5e9a774"],
  },
  {
    day: 6,
    date: "2026-04-26",
    summary:
      "Auto-scheduler. Day-of-week routing keyed off customer zone + service tier, with a route-aware ordering pass. Operator can pull up Wednesday and see the full route in optimal order. Drag-to-reorder for the days the model gets it wrong.",
    commits: ["73b1d09", "ce4f221"],
  },
  {
    day: 7,
    date: "2026-04-27",
    summary:
      "Daily admin digest email — yesterday completed, today's route, customers needing attention, chemistry flags, photos awaiting upload. Sent at 6am via Resend. The operator now reads the business in 90 seconds over coffee.",
    commits: ["18ff902", "c92d6e5"],
  },
  {
    day: 8,
    date: "2026-04-28",
    summary:
      "Customer portal. Magic-link auth via Supabase, no passwords. Visit history with photos and chemistry, account info, invoice list, self-reschedule + pause + leave-note-for-tech flows. Mobile-first responsive, PWA-installable.",
    commits: ["b8073cc", "207ae1f", "9d3c5b2"],
  },
  {
    day: 9,
    date: "2026-04-29",
    summary:
      "Stripe integration. Subscription products for weekly + bi-weekly tiers, invoicing for one-off chemicals, webhook handlers for invoice.paid / customer.subscription.updated, branded invoice PDF generation. Test mode end-to-end working.",
    commits: ["41e8b3f", "76c0a91"],
  },
  {
    day: 10,
    date: "2026-04-30",
    summary:
      "Marketing surface fleshed out. Five SEO city landing pages (Naples, Bonita Springs, Estero, Fort Myers, Cape Coral), per-city OG images via @vercel/og, AI chatbot grounded in services + pricing + chemistry knowledge base.",
    commits: ["55a92c6", "18d077b", "e0fb441"],
  },
  {
    day: 11,
    date: "2026-05-01",
    summary:
      "Twilio SMS — 24h-before reminders for each scheduled visit, en-route notifications when the tech taps Start Route, plus a broadcast tool for ops messages. Resend transactional templates branded for Splash Jacks.",
    commits: ["3a14e7b", "b8d9214"],
  },
  {
    day: 12,
    date: "2026-05-02",
    summary:
      "Analytics dashboards: revenue, churn, chemistry-trend overlays. The “Needs attention” widget surfaces overdue customers, unhealthy chemistry, and stalled invoices. CSV exports for the accountant.",
    commits: ["c5e0738", "9a213ff", "d7b6c20"],
  },
  {
    day: 13,
    date: "2026-05-03",
    summary:
      "QA + polish day. Mobile audit, performance pass (LCP under 1.5s on 4G), copy review across the marketing surface, accessibility audit, broken-link scan. Five-minute Loom walkthrough recorded for the customer.",
    commits: ["fa3e1d8", "2c7e09b"],
  },
  {
    day: 14,
    date: "2026-05-04",
    summary:
      "Launch day. Domain pointed to Vercel, Stripe live mode flipped, SSL provisioned, robots.txt opened to indexers, first paying customer signed up through the portal at 2:14pm. Operator runs the entire business — route, chemistry, photo proof, billing — from the admin app.",
    commits: ["00abcde", "1f4e602", "9001b14"],
  },
];

export const BUILDS: Build[] = [
  {
    slug: "splash-jacks-pools",
    customerName: "Splash Jacks Pools",
    vertical: "mobile-service",
    sku: "Platform",
    startDate: "2026-04-21",
    targetShipDate: "2026-05-04",
    actualShipDate: "2026-05-04",
    status: "shipped",
    previewUrl: "https://splash-jacks-pools.day14.dev",
    productionUrl: "https://splashjackspools.com",
    stack: [
      "Next.js 14",
      "TypeScript (strict)",
      "Tailwind CSS",
      "Postgres (Supabase)",
      "Prisma",
      "Supabase Auth",
      "Stripe",
      "Resend",
      "Twilio",
      "sharp + exifr",
      "Anthropic SDK",
      "Vercel",
    ],
    currentStatus:
      "Live, indexed, and processing real customer payments. Operator runs route, chemistry, photo proof, and billing from the admin app.",
    entries: SPLASH_JACKS_ENTRIES,
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Find a build by slug. Returns undefined if no build matches; callers
 * should `notFound()` from next/navigation when used in route handlers.
 */
export function getBuildBySlug(slug: string): Build | undefined {
  return BUILDS.find((b) => b.slug === slug);
}

/**
 * Compute the build's day-of-14 counter. For shipped builds returns 14
 * (or the actual day count if the build slipped past 14). For paused
 * builds returns the day of the most recent entry. For in-progress
 * builds returns the entry count, capped at 14 so the UI doesn't read
 * "Day 17 of 14" mid-slip.
 */
export function dayOfFourteen(build: Build): number {
  const lastEntry = build.entries.at(-1);
  const lastDay = lastEntry ? lastEntry.day : 0;
  if (build.status === "shipped") {
    return Math.max(14, lastDay);
  }
  return Math.min(14, Math.max(1, lastDay));
}

export function formatBuildDate(iso: string): string {
  // Use UTC to keep server / client renders identical regardless of
  // the operator's tz — the day-of-build is calendar-day, not wall-time.
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
