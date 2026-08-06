import type { Metadata } from "next";
import Link from "next/link";

import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";
import { PriceScramble } from "@/components/cinematic/PriceScramble";
import {
  MARQUE_TIERS,
  MARQUE_SPEND_RULE,
  type MarqueTier,
} from "@/lib/pricing";
import { getPaymentLinks } from "@/lib/payment-links";
import { SITE } from "@/lib/site";

/**
 * /marque — Marque, Day14's creative pipeline for paid ads. Fifth service line.
 *
 * POSITIONING (revised 2026-07-27): Marque sells a CREATIVE PIPELINE — volume,
 * variant tagging, fatigue detection, brand consistency — not ad management.
 * Management appears only at Growth. Every tier publishes a media-spend floor.
 *
 * PRICING INTEGRITY: every number — prices, spend floors, variant counts —
 * flows from src/lib/pricing.ts. `npm run check:prices` stays clean.
 *
 * HONESTY RAILS: no fabricated client, no guaranteed outcome, no implied
 * control over the auction. Ad spend is billed by the platform directly and
 * stays under the owner's control. The spend floor is disclosed, not enforced.
 */

const TITLE = "Marque — a creative pipeline for your ads | Day14";
const DESCRIPTION =
  "Marque is Day14's ad-creative pipeline: dozens of on-brand variants a month, every one tagged by hook and angle, swapped out the moment fatigue shows in the numbers. Not an ad agency. Media-spend floor published up front.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/marque" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `https://${SITE.domain}/marque`,
    siteName: SITE.brand,
    type: "website",
  },
};

/** "$1,500" from a number — formatted, never hard-coded. */
function usd(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

/** The cheapest published floor, for the hero disclosure. */
const LOWEST_FLOOR = Math.min(...MARQUE_TIERS.map((t) => t.spendFloorMonthly));

/** The entry monthly fee, sourced from the tiers — never hard-coded. */
const ENTRY_FEE = Math.min(
  ...MARQUE_TIERS.map((t) => t.monthly ?? Number.POSITIVE_INFINITY),
);

/** Honest FAQ — inlined (no fabricated data). */
const MARQUE_FAQ = [
  {
    q: "How much do I need to be spending on ads for this to be worth it?",
    a: `At least ${usd(
      LOWEST_FLOOR,
    )}/month in media, and more if your cost per lead is high. Here is the actual math: Meta's delivery system needs roughly ${
      MARQUE_SPEND_RULE.eventsPerAdSetPerWeek
    } optimization events per ad set per week before it stops guessing — that is the "Learning Limited" warning you have probably seen. The working rule of thumb is a daily budget of at least ${
      MARQUE_SPEND_RULE.dailyBudgetMultipleOfCpa
    }x your target cost per lead, per live ad set. If leads cost you $40, that is roughly $200/day. Below the floor, one variant genuinely cannot be told apart from another — the numbers are noise — and no creative on earth fixes that.

The reason our published floors sit well below that $200/day figure is that ${MARQUE_SPEND_RULE.eventChoiceNote} Each tier's floor is ${MARQUE_SPEND_RULE.dailyBudgetMultipleOfCpa}x a stated target on a stated event, listed on the page. Choose a more expensive event and your floor rises with it — we will tell you by how much before you spend it.

We publish all of this because the alternative is you paying us and blaming the creative for a budget problem.`,
  },
  {
    q: "Do you guarantee leads or a cost-per-lead?",
    a: "No — and be careful with anyone who does. Marque controls the creative, the tagging, and the swap decisions. It does not control the auction, your offer, your pricing, or how fast you call people back. What we promise is a supply of on-brand creative, an honest read on which variant is dying, and the replacement ready before it does.",
  },
  {
    q: "Why only a handful of ads live at a time if you generate dozens?",
    a: "Because volume in the auction is counterproductive. Ads inside one ad set share a single pool of optimization events, and splitting them across ad sets splits the budget that pool is fed by — so running a dozen at once keeps everything stuck in learning. The right shape is a deep bench and a small field: generate broadly, run a few, replace on signal. Anyone selling you 'dozens of live AI variants' is selling you the cause of the problem.",
  },
  {
    q: "How do you know an ad is fatiguing?",
    a: "From the account, not a calendar — frequency climbing, click-through decaying, CPM drifting up on the same audience. On Essentials and Growth you give us read access so we watch the real signal. On Starter we do not see your account, so you get a fixed swap cadence instead. That is a real difference between the tiers and we would rather say so than blur it.",
  },
  {
    q: "Who pays for the ad spend?",
    a: `You do, billed directly by TikTok or Meta on your own ad account. ${MARQUE_SPEND_RULE.billing} Our fee covers the creative pipeline. You set the budget and can change or pause it any time.`,
  },
  {
    q: "Is the creative actually AI-made?",
    a: "Yes, generated and then human-reviewed against your brand kit before anything ships. You get the source assets and keep them, even if you cancel.",
  },
  {
    q: "How is this different from GEO?",
    a: "GEO earns you the free AI answer over time; Marque supplies the creative for the traffic you buy right now. Owners usually start one and add the other — build the site, buy the traffic with Marque, own the answer with GEO, and catch it all with Capture.",
  },
];

function serviceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Ad Creative Pipeline (Marque)",
    serviceType: "AI ad creative production, variant tagging and fatigue management",
    provider: {
      "@type": "Organization",
      name: SITE.brand,
      url: `https://${SITE.domain}`,
    },
    areaServed: "United States",
    offers: MARQUE_TIERS.map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: String(t.oneTime ?? t.monthly ?? ""),
      priceCurrency: "USD",
      description: t.tagline,
    })),
  };
}

function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: MARQUE_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** "$99" from the tier's number — formatted, never hard-coded. */
function tierPrice(tier: MarqueTier): string {
  const n = tier.oneTime ?? tier.monthly ?? 0;
  return usd(n);
}
function tierPriceUnit(tier: MarqueTier): string {
  return tier.oneTime !== null ? "one-time" : "/mo";
}

/** Editorial tail on the unit line — copy, not pricing. */
const TIER_NOTE: Record<MarqueTier["slug"], string> = {
  "marque-starter": "creative only",
  "marque-essentials": "full pipeline",
  "marque-growth": "pipeline + managed",
};

export default function MarquePage() {
  const links = getPaymentLinks();

  return (
    <div className="cinematic" id="top">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        {/* ============ Hero ============ */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-kicker">
            Marque · ad creative pipeline
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            Your ads don&rsquo;t stop working. Your creative does.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            Marque is a creative pipeline, not an ad agency. It generates dozens
            of on-brand variants a month, tags every one by hook and angle so
            you can see which idea actually worked, watches the numbers for
            fatigue, and hands you the replacement before the winner dies. You
            keep the account. You keep the budget. You keep the assets.
          </Reveal>
          <Reveal as="p" delayStep={3} className="cin-page-lede">
            One thing we say before you buy, not after: this only works above{" "}
            <strong>{usd(LOWEST_FLOOR)}/month in media spend</strong>, and more
            if your leads are expensive.{" "}
            <a href="#marque-floor">Here&rsquo;s the math.</a>
          </Reveal>
          <Reveal as="div" delayStep={3}>
            <a
              className="cin-btn cin-btn-glow"
              href="#marque-pricing"
              data-cta="marque_hero"
            >
              See the offers →
            </a>
          </Reveal>
        </header>

        {/* ============ How it works ============ */}
        <div className="cin-detail">
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              How the pipeline works
            </Reveal>
            <ol className="cin-detail-steps">
              <li>
                <span className="cin-detail-step-n">01</span>
                <div>
                  <h3>Lock the brand</h3>
                  <p>
                    Palette, type, logo lockups, and tone rules go into a brand
                    kit that every generation runs through. It is the reason
                    variant number forty still looks like it came from the same
                    company as variant number one — the failure mode of every
                    AI creative tool people try on their own.
                  </p>
                </div>
              </li>
              <li>
                <span className="cin-detail-step-n">02</span>
                <div>
                  <h3>Generate the bench</h3>
                  <p>
                    Dozens of variants a month — vertical video and static,
                    sized for TikTok and Meta, human-reviewed before anything
                    ships. Volume is for the bench, not the field. It exists so
                    the replacement is already made on the day you need it.
                  </p>
                </div>
              </li>
              <li>
                <span className="cin-detail-step-n">03</span>
                <div>
                  <h3>Tag it, run a few</h3>
                  <p>
                    Every asset ships tagged by hook type, offer angle, format,
                    and aspect ratio. A handful run at a time — not dozens,
                    because ads share one pool of optimization events and
                    flooding it keeps everything stuck in learning. Small field,
                    deep bench. When one wins, the tags tell you{" "}
                    <em>which idea</em> won, not just which picture.
                  </p>
                </div>
              </li>
              <li>
                <span className="cin-detail-step-n">04</span>
                <div>
                  <h3>Swap on fatigue, not on a calendar</h3>
                  <p>
                    Click-through decaying against its own peak, three-second
                    hold rate collapsing, CPM drifting up on the same audience —
                    those are the tells, and each one is measured against that
                    variant&rsquo;s own history rather than against the others,
                    because budgets move and a variant compared to itself is the
                    only fair comparison. We name the ad to retire and hand over
                    its replacement the same week. No guaranteed outcome, no
                    black box: the number we acted on is in the report.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          {/* ============ The spend floor — published up front ============ */}
          <section className="cin-detail-block" id="marque-floor">
            <Reveal as="h2" className="cin-detail-h2">
              What it costs to run, and why we publish it
            </Reveal>
            <div className="cin-prose">
              <p>
                Most ad shops let you find this out three months in. Meta&rsquo;s
                delivery system needs roughly{" "}
                <strong>
                  {MARQUE_SPEND_RULE.eventsPerAdSetPerWeek} optimization events
                  per ad set per week
                </strong>{" "}
                before it stops guessing — that is the &ldquo;Learning
                Limited&rdquo; warning. The working rule of thumb is a daily
                budget of at least{" "}
                <strong>
                  {MARQUE_SPEND_RULE.dailyBudgetMultipleOfCpa}&times; your target
                  cost per lead
                </strong>
                , per live ad set. If a lead is worth $40 to you, that is roughly
                $200/day.
              </p>
              <p>
                Under that number, the results are noise. One variant genuinely
                cannot be told apart from another, and no creative — ours or
                anyone else&rsquo;s — changes that. A business paying us{" "}
                {usd(ENTRY_FEE)} a month while putting {usd(600)} a year behind
                it will blame the ads for a budget problem, and they would be
                half right: we would have taken the money knowing it could not
                work.
              </p>
              <p>
                Which raises the obvious question about the numbers below —{" "}
                <em>
                  if a $40 lead needs $200 a day, how is the entry floor{" "}
                  {usd(LOWEST_FLOOR)} a month?
                </em>{" "}
                Because <strong>the optimization event is a choice</strong>, and
                it is the lever almost nobody names. Fifty <em>purchases</em> a
                week before delivery settles is real money. Fifty{" "}
                <em>landing-page views</em> a week is not — and it still buys
                you a readable answer about which creative works. So each floor
                below is 5&times; a stated target, on a stated event. Pick a
                more expensive event and your floor goes up with it; we will
                tell you by how much before you spend it.
              </p>
              <p>So here are the floors, per tier, before you buy:</p>
              <ul>
                {MARQUE_TIERS.map((t) => (
                  <li key={t.slug}>
                    <strong>{t.name}</strong> — from{" "}
                    {usd(t.spendFloorMonthly)}/mo in media spend, which is{" "}
                    {MARQUE_SPEND_RULE.dailyBudgetMultipleOfCpa}&times; a{" "}
                    {usd(t.floorTargetCpa)} target on {t.floorEvent} ·{" "}
                    {t.variantsPerMonth} variants generated, {t.variantsLive}{" "}
                    live at a time
                  </li>
                ))}
              </ul>
              <p>
                These are readability floors, not gates — nobody is stopped at
                checkout. If you are under them, the honest answer is to fix the
                offer and the site first (
                <Link href="/pricing">that is what a Day14 build is for</Link>)
                and come back for ads when there is budget behind them. We would
                rather turn down {usd(ENTRY_FEE)} a month than
                be the reason you decide advertising doesn&rsquo;t work.
              </p>
              <p>
                <small>{MARQUE_SPEND_RULE.billing}</small>
              </p>
            </div>
          </section>
        </div>

        {/* ============ Pricing cards — same card system as /pricing ============ */}
        <section id="marque-pricing" className="cin-pricing">
          <Reveal as="h2" className="cin-price-h">
            Fixed fee for the pipeline. Spend you control.
          </Reveal>
          <Reveal as="p" className="cin-price-sub" delayStep={1}>
            The fee buys the creative, the tagging, and the swap decisions. The
            media spend is yours, billed by the platform, and every tier says up
            front what it takes to run.
          </Reveal>

          <div className="cin-cards">
            {MARQUE_TIERS.map((tier, i) => (
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
                  <PriceScramble final={tierPrice(tier)} />{" "}
                  <small>{tierPriceUnit(tier)}</small>
                </div>
                <div className="cin-mo">
                  {TIER_NOTE[tier.slug]} · {tier.tagline}
                </div>
                <div className="cin-mo">
                  <strong>
                    Needs {usd(tier.spendFloorMonthly)}/mo+ in media spend
                  </strong>{" "}
                  · {tier.variantsPerMonth} generated, {tier.variantsLive} live
                </div>
                <ul role="list">
                  {tier.features.slice(0, 4).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {links[tier.slug] ? (
                  <a
                    className={`cin-card-cta${tier.featured ? "" : " cin-card-cta-ghost"}`}
                    href={links[tier.slug]}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cta={`marque_buy_${tier.slug}`}
                  >
                    Get started →
                  </a>
                ) : (
                  <a
                    className={`cin-card-cta${tier.featured ? "" : " cin-card-cta-ghost"}`}
                    href="#book"
                    data-cta={`marque_book_${tier.slug}`}
                  >
                    Book a 15-min look →
                  </a>
                )}
              </Reveal>
            ))}
          </div>

          <Reveal as="p" className="cin-platform">
            Media spend is billed to you by TikTok or Meta directly —
            Marque&rsquo;s fee covers the creative pipeline only. Campaign
            management is included at Growth; at Starter and Essentials you run
            the account and we supply and steer the creative. Start or stop on 30
            days&rsquo; notice. <a href="#book">Talk it through.</a>
          </Reveal>
        </section>

        {/* ============ Trifecta ============ */}
        <div className="cin-detail">
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              One system, four motions
            </Reveal>
            <div className="cin-prose">
              <p>
                Build the presence with{" "}
                <Link href="/pricing">a Day14 site</Link>, feed the traffic you
                buy with Marque, own the AI answer with{" "}
                <Link href="/geo">GEO</Link>, and catch every lead with{" "}
                <Link href="/capture">Capture</Link>. One operator, one stack:
                build → buy → own → capture.
              </p>
            </div>
          </section>

          {/* ============ FAQ ============ */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Questions owners actually ask
            </Reveal>
            <div className="cin-detail-faqs">
              {MARQUE_FAQ.map((f) => (
                <details key={f.q} className="cin-detail-faq">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Closing CTA — Cal.com booking + email fallback (anchor #book). */}
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
