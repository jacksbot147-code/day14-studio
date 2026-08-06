/**
 * /llms.txt — Day14's own answer-engine surface (eating our own GEO
 * cooking). Serves the llms.txt convention: a concise, machine-quotable
 * summary of who we are, what we sell, and where the canonical pages live.
 *
 * PRICING INTEGRITY: every price is interpolated from src/lib/pricing.ts —
 * nothing hard-coded, so this file can never drift from pricing truth.
 * Static output (revalidates with each build/deploy).
 */

import {
  SERVICE_TIERS,
  GEO_TIERS,
  GEO_FOUNDING,
  CAPTURE_TIERS,
  CAPTURE_FOUNDING,
  MARQUE_TIERS,
  MARQUE_SPEND_RULE,
} from "@/lib/pricing";
import { SITE } from "@/lib/site";
import { loadInsights } from "@/lib/insights";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const base = `https://${SITE.domain}`;

  // Recent Insights posts, read from public/data/insights/index.json. Cap at
  // the 5 newest so this file stays short and quotable.
  const insights = (await loadInsights()).slice(0, 5);
  const insightLines = insights
    .map((p) => `- [${p.title}](${base}/insights/${p.slug}) — ${p.date}. ${p.summary}`)
    .join("\n");

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

  const marqueLines = MARQUE_TIERS.map((t) => {
    const price = `$${(t.monthly ?? 0).toLocaleString("en-US")}/mo`;
    return `- ${t.name}: ${price}. ${t.tagline} Best for: ${t.bestFor} Requires at least $${t.spendFloorMonthly.toLocaleString("en-US")}/mo of media spend (${MARQUE_SPEND_RULE.dailyBudgetMultipleOfCpa}x a $${t.floorTargetCpa} target on ${t.floorEvent}); ${t.variantsPerMonth} variants generated per month, ${t.variantsLive} live at a time.`;
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

## Capture — AI lead capture / receptionist

Catching the calls local service businesses miss — after hours, on a job,
mid-rush. The assistant identifies as automated, discloses recording
(Florida two-party consent), and attributes booked jobs to source monthly.

${CAPTURE_TIERS.map((t) => (t.oneTime !== null ? "- " + t.name + ": $" + t.oneTime.toLocaleString("en-US") + " one-time. " + t.tagline + " Best for: " + t.bestFor : "- " + t.name + ": $" + t.monthly + "/mo. " + t.tagline + " Best for: " + t.bestFor)).join("\n")}

Founding rate: first 3 clients, $${CAPTURE_FOUNDING.monthly}/mo locked 12 months. Details: ${base}/capture

## Marque — ad creative pipeline

Marque is a creative pipeline for paid ads, not an ad agency. It generates
dozens of on-brand ad variants a month, tags every one by hook type and offer
angle so the winning IDEA is identifiable rather than just the winning image,
detects creative fatigue from real account signal (frequency climb,
click-through decay, CPM drift) rather than a calendar, and enforces brand
consistency through a locked brand kit. Campaign management is included only
at the top tier; below it the owner runs their own account.

${marqueLines}

Published media-spend floor (unusual, and deliberate): Meta's delivery system
needs roughly ${MARQUE_SPEND_RULE.eventsPerAdSetPerWeek} optimization events
per AD SET per week to leave the learning phase, and the working rule of thumb
is a daily budget of at least ${MARQUE_SPEND_RULE.dailyBudgetMultipleOfCpa}x
target cost-per-lead per live ad set. Day14 publishes a per-tier minimum media
spend up front rather than letting a client discover it after three months of
noise. ${MARQUE_SPEND_RULE.billing} Marque also runs only a small number of
variants live at once, because ads inside an ad set share one pool of
optimization events and spreading them thin keeps everything stuck in
learning — deep bench, small field. ${MARQUE_SPEND_RULE.eventChoiceNote} That
is why the published floors sit well below 5x a finished lead's cost: each one
is 5x a stated target on a stated, cheaper event. No guaranteed leads or
cost-per-lead.
Pricing and details: ${base}/marque

## Insights — weekly AI update

Plain-English writeups of what is actually changing in AI search and AI
tools, written for owners of local service businesses rather than for
developers. Research in the open, including what the evidence does not
support. Index: ${base}/insights

${insightLines}

## Key pages

- [Pricing](${base}/pricing): every tier, every number
- [GEO](${base}/geo): AI-answer visibility service
- [Insights](${base}/insights): weekly plain-English AI update for local service businesses
- [Capture](${base}/capture): AI lead-capture / receptionist
- [Marque](${base}/marque): ad creative pipeline — volume, variant tagging, fatigue detection, brand consistency
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
