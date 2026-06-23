import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { SERVICE_TIERS } from "@/lib/pricing";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Every price on this page is derived from pricing.ts (SERVICE_TIERS) — the
// single source of truth. No price is hard-coded.
const T = Object.fromEntries(SERVICE_TIERS.map((t) => [t.slug, t]));
const SPARK_PRICE = `$${T.spark!.setup!.toLocaleString()}`;
const LOCAL_PRICE = `$${T.local!.setup!.toLocaleString()}`;
const PORTAL_PRICE = `$${T.portal!.setup!.toLocaleString()}`;
const PLATFORM_PRICE = T.platform!.setupLabel; // "from $9,000"
const PLATFORM_FLOOR = `$${Number(
  T.platform!.setup ?? T.platform!.setupLabel.replace(/[^0-9]/g, ""),
).toLocaleString()}`;
const OPS_MIN = Math.min(...SERVICE_TIERS.map((t) => t.monthly));
const OPS_MAX = Math.max(...SERVICE_TIERS.map((t) => t.monthly));
const TIMELINE_BY_SLUG: Record<string, string> = {
  spark: "7 days",
  local: "14 days",
  portal: "3 weeks",
  platform: "4 weeks",
};

const TITLE = `Hire Day14 — Sites and apps shipped in days, not months`;
const DESCRIPTION = `I build custom websites and apps for local businesses, founders, and small teams. From ${SPARK_PRICE} single-page sites to ${PLATFORM_FLOOR}+ platforms. Hosted on Day14 OS forever. Fixed price, no SOWs, shipped in days.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/work-with-us" },
  openGraph: {
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
    url: `https://${SITE.domain}/work-with-us`,
    siteName: SITE.brand,
    type: "website",
    images: [
      {
        url: "/og/work-with-us.png",
        width: 1200,
        height: 630,
        alt: `${TITLE} — ${SITE.brand}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
    images: ["/og/work-with-us.png"],
  },
};

export default function WorkWithUsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <WhatWeBuild />
        <WhoItsFor />
        <HowWeShip />
        <PricingRecap />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="container-page pt-14 pb-12 sm:pt-20">
      <div className="eyebrow mb-6">Work with {SITE.brand}</div>
      <h1 className="max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
        Hire {SITE.brand} to build it.
        <br className="hidden sm:block" /> Ship it in days.
      </h1>
      <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
        I&rsquo;m Jack. I build custom websites and apps in days, not months &mdash; from {SPARK_PRICE} single-page sites for local businesses up to {PLATFORM_FLOOR}+ platforms. Every build runs on Day14 OS, the platform I built to run my own six businesses.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <a href={SITE.bookingUrl} className="btn-ember">
          Book a 15-min intro call
        </a>
        <Link href="/intake" className="btn-ghost">
          Or fill out the intake form
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function WhatWeBuild() {
  const layers = [
    {
      label: "Sites",
      title: "Beautiful, fast, conversion-ready.",
      body: `Single-page sites for local businesses and solo professionals (Spark, ${SPARK_PRICE}, 7 days). Multi-page sites with online quoting and scheduling for service businesses (Local, ${LOCAL_PRICE}, 14 days). Custom design every time, no Webflow templates with my markup on top.`,
    },
    {
      label: "Apps",
      title: "Customer portals, admin, billing.",
      body: `Customer-portal builds (Portal, ${PORTAL_PRICE}) and full software platforms with marketing site + customer portal + admin app + billing wired live (Platform, ${PLATFORM_PRICE}, 4 weeks). Same stack I run my six businesses on. Built so you can actually operate it, not so it looks good in a screenshot.`,
    },
    {
      label: "Custom",
      title: "Multi-tenant, marketplaces, anything bespoke.",
      body: "Multi-tenant platforms, marketplaces, industry-specific workflows. Full Day14 OS access — scheduled agents, evidence verifier, work-log. Scoped to your business. Quote back in 48 hours, shipped in 6&ndash;12 weeks.",
    },
  ];

  return (
    <section className="container-page py-16">
      <div className="rule mb-12" />
      <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
        <div>
          <div className="eyebrow mb-4">What we build</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Three sizes of build. One operating system.
          </h2>
          <p className="mt-5 text-ink-500">
            Whether you need a single page that captures leads for your local business or a full platform with portal and billing, the work ships on Day14 OS. Same hardened stack, same scheduled agents, same evidence-verified deploy &mdash; just different scope.
          </p>
        </div>

        <div className="space-y-6">
          {layers.map((l) => (
            <div
              key={l.label}
              className="rounded-lg border border-ink-100 bg-paper-50 p-6"
            >
              <div className="font-mono text-xs uppercase tracking-widest text-ember-600">
                {l.label}
              </div>
              <h3 className="mt-2 text-xl font-bold tracking-tightest text-ink">
                {l.title}
              </h3>
              <p className="mt-3 text-ink-700">{l.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function WhoItsFor() {
  const fits = [
    "Local businesses, tutors, contractors, and solo professionals who need a real site that captures leads &mdash; not a $40 Squarespace template.",
    "Founders launching a brand or SaaS who want a real marketing site (or full platform) without paying agency markups for 8 weeks of meetings.",
    "Operators with an existing business who need a customer portal, billing flow, or admin app and want it shipped without an in-house dev team.",
  ];
  const notFits = [
    "Teams who want a Figma file, six weeks of discovery, and an agency-style change-order process.",
    `Anyone shopping for a SaaS subscription. We build code you own, not seats you rent. (Day14 OS hosting is $${OPS_MIN}&ndash;$${OPS_MAX}/mo after launch &mdash; that's optional, not a subscription.)`,
    "Stealth-mode ideas that won't talk to a real customer for six months. We ship things that go live and get used.",
  ];

  return (
    <section className="border-y border-ink-100 bg-paper-50/60 py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4 justify-center">Who it&rsquo;s for</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Three buyer shapes, one studio.
          </h2>
          <p className="mt-5 text-ink-500">
            We don&rsquo;t pretend to fit every brief. The page above shows the
            shapes that work; the page below shows the shapes that don&rsquo;t.
            If you see your business in the left column, the intro call will
            be fast.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="card-pop">
            <div className="font-mono text-xs uppercase tracking-widest text-ember-600">
              Good fit
            </div>
            <ul className="mt-4 space-y-3">
              {fits.map((f) => (
                <li key={f} className="flex gap-3 text-sm text-ink-700">
                  <span
                    aria-hidden
                    className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500"
                  />
                  <span dangerouslySetInnerHTML={{ __html: f }} />
                </li>
              ))}
            </ul>
          </div>
          <div className="card-pop">
            <div className="font-mono text-xs uppercase tracking-widest text-ink-400">
              Not a fit
            </div>
            <ul className="mt-4 space-y-3">
              {notFits.map((f) => (
                <li key={f} className="flex gap-3 text-sm text-ink-700">
                  <span
                    aria-hidden
                    className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300"
                  />
                  <span dangerouslySetInnerHTML={{ __html: f }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function HowWeShip() {
  const steps = [
    {
      n: "01",
      label: "Scope",
      title: "20-minute call. Fixed quote in 48 hours.",
      body: "We pin down what you actually need (not what a typical agency would scope). You leave the call knowing the tier, the timeline, and the total. No SOWs, no &ldquo;let's get on a discovery follow-up.&rdquo;",
    },
    {
      n: "02",
      label: "Build",
      title: "5&ndash;28 days, depending on tier.",
      body: "We design and build on Day14 OS &mdash; the same stack that runs our six businesses. You get a daily Loom update so you see progress without having to ask. A private staging URL by Day 3 (or Day 1 for Spark).",
    },
    {
      n: "03",
      label: "Launch + Live",
      title: "Site or app ships at your domain.",
      body: `Hosted on Day14 OS. Scheduled agents handle the boring stuff (deploys, content drafts, briefings) so the thing runs without you. $${OPS_MIN}&ndash;$${OPS_MAX}/mo after the bundled ops window, depending on tier.`,
    },
  ];

  return (
    <section className="container-page py-20">
      <div className="max-w-2xl">
        <div className="eyebrow eyebrow-rule mb-5">How we ship</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
          Three steps. Fixed price. Fixed timeline.
        </h2>
        <p className="mt-5 text-ink-500">
          The whole point of the 14-day promise is that you know the shape on day one. No surprises, no scope creep, no &ldquo;we&rsquo;ll need to invoice for that.&rdquo;
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="card-pop">
            <div className="flex items-baseline justify-between">
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-ember-600 tnum">
                {s.n}
              </div>
              <div className="font-mono text-xs uppercase tracking-widest text-ink-400">
                {s.label}
              </div>
            </div>
            <h3 className="mt-3 text-xl font-bold tracking-tightest text-ink" dangerouslySetInnerHTML={{ __html: s.title }} />
            <p className="mt-3 text-sm text-ink-700" dangerouslySetInnerHTML={{ __html: s.body }} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function PricingRecap() {
  const tiers = [
    ...SERVICE_TIERS.map((t) => ({
      name: t.name,
      price: t.setup === null ? t.setupLabel : `$${t.setup.toLocaleString()}`,
      timeline: TIMELINE_BY_SLUG[t.slug] ?? "",
      body: t.tagline,
    })),
    { name: "Custom", price: "Talk to us", timeline: "6–12 weeks", body: "Multi-tenant, marketplaces, anything bespoke. Quote back in 48 hours." },
  ];

  return (
    <section className="container-page pb-20">
      <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
        <div>
          <div className="eyebrow mb-4">Pricing</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            {SPARK_PRICE} to scoped.
          </h2>
          <p className="mt-5 text-ink-500">
            Fixed price, fixed timeline, no SOWs. The tiers below cover the
            shape of most builds. Custom is for everything else.
          </p>
          <p className="mt-3 text-sm text-ink-500">
            <Link
              href="/#pricing"
              className="font-medium text-ink underline decoration-ember-300 underline-offset-4 transition-colors hover:decoration-ember-500"
            >
              See the full pricing breakdown on the homepage
            </Link>
            &nbsp;for what&rsquo;s included at each tier.
          </p>
        </div>

        <div className="space-y-3">
          {tiers.map((t) => (
            <div key={t.name} className="flex items-baseline justify-between gap-4 rounded-lg border border-ink-100 bg-paper p-5">
              <div className="flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-lg font-bold tracking-tightest text-ink">{t.name}</span>
                  <span className="font-mono text-xs uppercase tracking-widest text-ink-400">{t.timeline}</span>
                </div>
                <p className="mt-1.5 text-sm text-ink-700">{t.body}</p>
              </div>
              <div className="font-mono text-base font-bold tracking-tightest text-ember-600 tnum whitespace-nowrap">
                {t.price}
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-ink-100 bg-paper-50 p-5 text-sm text-ink-500">
            All tiers include 3&ndash;12 months of Day14 OS hosting bundled. After the bundled window, ongoing ops is {`$${OPS_MIN}`}&ndash;{`$${OPS_MAX}`}/mo flat &mdash; depending on tier complexity. No retainer, no surprise invoices.
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="container-page pb-24">
      <div className="overflow-hidden rounded-xl bg-ink p-10 text-paper sm:p-14">
        <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">
              Tell us what you want built.
            </h2>
            <p className="mt-4 max-w-xl text-paper-200">
              15-minute intro call. We come back with a fixed quote in 48 hours and a shipped build in 14 days. Three slots open for July.
            </p>
          </div>
          <div>
            <a
              href={SITE.bookingUrl}
              className="btn-ember w-full justify-center text-base"
            >
              Book a 15-min intro call
            </a>
            <Link
              href="/intake"
              className="mt-3 inline-flex w-full items-center justify-center rounded border border-paper-200/40 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-paper/10 focus-visible:ring-offset-ink"
            >
              Or fill out the intake form
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
