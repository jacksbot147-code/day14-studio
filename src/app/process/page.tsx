import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const TITLE = `${SITE.brand} — how we ship in 14 days, beat by beat`;
const DESCRIPTION = `The 14-day build process, publicly documented. Every day, every deliverable, every milestone.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/process" },
  openGraph: {
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
    url: `https://${SITE.domain}/process`,
    siteName: SITE.brand,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
  },
};

export default function ProcessPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Timeline />
        <WhatYouReceive />
        <WhatWeNeed />
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
      <div className="eyebrow mb-6">How we ship</div>
      <h1 className="max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
        14 days, beat by beat.
      </h1>
      <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
        The work isn&rsquo;t a mystery. Here&rsquo;s exactly what happens between
        deposit and launch.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <a href={SITE.bookingUrl} className="btn-ember">
          Book a 15-min intro call
        </a>
        <a href="#timeline" className="btn-ghost">
          See the 14 beats
        </a>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

type Beat = {
  day: number;
  title: string;
  body: string;
};

const WEEK_ONE: Beat[] = [
  {
    day: 1,
    title: "Deposit + kickoff Loom + brand questionnaire",
    body: "Deposit clears, the build is locked in. You get a kickoff Loom walking through what happens next, plus a one-page brand questionnaire to fill in.",
  },
  {
    day: 2,
    title: "Wireframes + content tree",
    body: "We map the full site structure — every page, every section, how they link. Low-fidelity wireframes so the skeleton is agreed before any pixels are pushed.",
  },
  {
    day: 3,
    title: "Design v1 (3 directions)",
    body: "Three distinct visual directions on a live staging URL. Real layout, real type, real color — not flat mockups. You pick the one that feels like you.",
  },
  {
    day: 4,
    title: "Design lock + asset gather",
    body: "We lock the chosen direction and collect the assets — logo, photos, copy, anything the build needs. The look is final from here forward.",
  },
  {
    day: 5,
    title: "Build foundation (auth, layout, routing)",
    body: "The real codebase comes alive: layout shell, routing, auth scaffolding, design system wired. The frame the rest of the build hangs on.",
  },
  {
    day: 6,
    title: "Build core pages",
    body: "The primary pages get built out for real — home, services, about, contact, and the rest of the content tree, on the locked design.",
  },
  {
    day: 7,
    title: "Client review #1 (mid-build Loom)",
    body: "A mid-build Loom walks you through what&rsquo;s shipped so far on staging. 30 minutes of your time to react, flag, and steer before the back half.",
  },
];

const WEEK_TWO: Beat[] = [
  {
    day: 8,
    title: "Revisions from review #1",
    body: "Everything you flagged in review #1 gets worked through. Copy, layout, and design adjustments land before we move into the heavier integration work.",
  },
  {
    day: 9,
    title: "Integrations (Stripe, email, agents if applicable)",
    body: "The plumbing goes in — Stripe billing, transactional email, and any AI agents your build includes — wired and tested against real flows.",
  },
  {
    day: 10,
    title: "Build polish",
    body: "Motion, responsive behavior, edge cases, empty states, loading states. The difference between &lsquo;done&rsquo; and &lsquo;feels expensive&rsquo; happens here.",
  },
  {
    day: 11,
    title: "Client review #2",
    body: "The near-final build on staging. A second 30-minute pass to catch anything remaining while there&rsquo;s still room to change it.",
  },
  {
    day: 12,
    title: "Final revisions",
    body: "The last round of changes from review #2. After this the build is feature-complete and we shift fully into launch prep.",
  },
  {
    day: 13,
    title: "Staging launch + QA",
    body: "Full QA pass on a production-grade staging environment — links, forms, payments, mobile, performance. Everything checked before it goes live.",
  },
  {
    day: 14,
    title: "Production launch + handoff Loom",
    body: "Domain pointed, payments flipped to live, the site goes public. A handoff Loom walks you through everything you own and how to run it.",
  },
];

function Timeline() {
  return (
    <section id="timeline" className="container-page py-16 scroll-mt-24">
      <div className="rule mb-12" />
      <div className="max-w-2xl">
        <div className="eyebrow eyebrow-rule mb-5">The timeline</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
          Fourteen beats. One per day.
        </h2>
        <p className="mt-5 text-ink-500">
          Every Day14 build runs the same rhythm. Week one is design and
          foundation. Week two is build, integrate, and launch. Two scheduled
          reviews keep you in the loop without slowing the ship.
        </p>
      </div>

      <div className="mt-14 space-y-16">
        <TimelineWeek label="Week 1" sub="Design + foundation" beats={WEEK_ONE} />
        <TimelineWeek label="Week 2" sub="Build + integrate + launch" beats={WEEK_TWO} />
      </div>
    </section>
  );
}

function TimelineWeek({
  label,
  sub,
  beats,
}: {
  label: string;
  sub: string;
  beats: Beat[];
}) {
  return (
    <div>
      <div className="mb-8 flex items-baseline gap-3">
        <h3 className="text-xl font-bold tracking-tightest text-ink">{label}</h3>
        <span className="font-mono text-xs uppercase tracking-widest text-ink-400">
          {sub}
        </span>
      </div>

      <ol className="relative space-y-px border-l border-ink-100 pl-0">
        {beats.map((beat) => (
          <li key={beat.day} className="relative pl-10 pb-8 last:pb-0 sm:pl-14">
            <span
              aria-hidden
              className="absolute left-0 top-1 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-sm border border-ink-100 bg-paper font-mono text-[12px] font-bold text-ember-600 tnum sm:h-8 sm:w-8 sm:text-[13px]"
            >
              {beat.day}
            </span>
            <div className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
              Day {beat.day}
            </div>
            <h4 className="mt-1.5 text-lg font-bold tracking-tightest text-ink">
              {beat.title}
            </h4>
            <p
              className="mt-2 text-sm text-ink-700"
              dangerouslySetInnerHTML={{ __html: beat.body }}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const RECEIVE: string[] = [
  "A kickoff Loom on Day 1, so you know the plan before you spend a minute on it.",
  "A staging URL on Day 3 with three live design directions — not flat mockups.",
  "A daily one-paragraph progress update, so you never have to ask &lsquo;where are we?&rsquo;",
  "Daily Looms through the build — the work narrated as it ships, not summarized after.",
  "Two scheduled client reviews (Day 7 and Day 11) with mid-build Looms walking the work.",
  "A full QA pass on a production-grade staging environment before anything goes live.",
  "Stripe billing, transactional email, and any AI agents wired and tested against real flows.",
  "A handoff Loom on Day 14 walking through everything you own and how to operate it.",
  "The repo, the domain, and the data — yours from day one, no lock-in.",
  "A live, public build that ships at your domain by the end of Day 14.",
];

function WhatYouReceive() {
  return (
    <section className="border-y border-ink-100 bg-paper-50/60 py-20">
      <div className="container-page">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div>
            <div className="eyebrow mb-4">What you receive</div>
            <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
              Ten things land in your inbox.
            </h2>
            <p className="mt-5 text-ink-500">
              The deliverables are fixed, not a surprise. Every build ships the
              same set, on the same cadence — that&rsquo;s what the fixed price buys.
            </p>
          </div>

          <ul className="space-y-3">
            {RECEIVE.map((item) => (
              <li
                key={item}
                className="flex gap-3 rounded-lg border border-ink-100 bg-paper p-4 text-sm text-ink-700"
              >
                <span
                  aria-hidden
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500"
                />
                <span dangerouslySetInnerHTML={{ __html: item }} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

const NEED: { title: string; body: string }[] = [
  {
    title: "The deposit",
    body: "50% up front on Day 1. It clears the build into the queue and locks your dates. The balance is due at launch.",
  },
  {
    title: "Your brand assets",
    body: "Logo, colors, and any photography you already have. No logo yet? We&rsquo;ll point you to designers who can turn one around inside the window.",
  },
  {
    title: "Your content",
    body: "Services, pricing, and the facts about your business — via the Day 1 questionnaire. The clearer this is, the faster we move.",
  },
  {
    title: "30 minutes for each review",
    body: "Two scheduled reviews, Day 7 and Day 11. Half an hour each to react to the build and steer it while there&rsquo;s still room to change course.",
  },
];

function WhatWeNeed() {
  return (
    <section className="container-page py-20">
      <div className="max-w-2xl">
        <div className="eyebrow eyebrow-rule mb-5">What we need from you</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
          Four things, and they&rsquo;re light.
        </h2>
        <p className="mt-5 text-ink-500">
          The fixed timeline only holds if your side is quick. None of this is
          heavy — it&rsquo;s the minimum input that lets the build move at pace.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {NEED.map((n, i) => (
          <div key={n.title} className="card-pop">
            <div className="font-mono text-xs font-bold uppercase tracking-widest text-ember-600 tnum">
              {String(i + 1).padStart(2, "0")}
            </div>
            <h3 className="mt-3 text-xl font-bold tracking-tightest text-ink">
              {n.title}
            </h3>
            <p
              className="mt-3 text-sm text-ink-700"
              dangerouslySetInnerHTML={{ __html: n.body }}
            />
          </div>
        ))}
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
              Now you know exactly what you&rsquo;re buying.
            </h2>
            <p className="mt-4 max-w-xl text-paper-200">
              Twenty minutes to scope your build. We come back with a fixed quote,
              a fixed timeline, and the same fourteen beats you just read.
            </p>
          </div>
          <div>
            <a
              href={SITE.bookingUrl}
              className="btn-ember w-full justify-center text-base"
            >
              Book a 15-min intro call
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
