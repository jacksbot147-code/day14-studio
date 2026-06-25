import type { Metadata } from "next";

import { SITE } from "@/lib/site";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";

/**
 * /process — the 14-day build, beat by beat, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 4/10 of the rebuild). Composed
 * directly from the shared shell (CanvasField + Nav + SiteFooter + ClosingCTA),
 * matching the `/about` + `/work-with-us` pattern (the closing booking CTA sits
 * before the footer). The fourteen beats render as two `.cin-detail-steps`
 * lists (one per week) where the step number is the day; the deliverables and
 * client-inputs render as long-form `.cin-prose` / `.cin-detail-features`. All
 * content is preserved from the prior surface — only the skin changes.
 *
 * No prices appear on this page, so `check:prices` is trivially clean.
 */

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

/* -------------------------------------------------------------------------- */

type Beat = { day: number; title: string; body: string };

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
    body: "A mid-build Loom walks you through what’s shipped so far on staging. 30 minutes of your time to react, flag, and steer before the back half.",
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
    body: "Motion, responsive behavior, edge cases, empty states, loading states. The difference between ‘done’ and ‘feels expensive’ happens here.",
  },
  {
    day: 11,
    title: "Client review #2",
    body: "The near-final build on staging. A second 30-minute pass to catch anything remaining while there’s still room to change it.",
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

/* The ten deliverables that land in the customer's inbox. */
const RECEIVE: string[] = [
  "A kickoff Loom on Day 1, so you know the plan before you spend a minute on it.",
  "A staging URL on Day 3 with three live design directions — not flat mockups.",
  "A daily one-paragraph progress update, so you never have to ask ‘where are we?’",
  "Daily Looms through the build — the work narrated as it ships, not summarized after.",
  "Two scheduled client reviews (Day 7 and Day 11) with mid-build Looms walking the work.",
  "A full QA pass on a production-grade staging environment before anything goes live.",
  "Stripe billing, transactional email, and any AI agents wired and tested against real flows.",
  "A handoff Loom on Day 14 walking through everything you own and how to operate it.",
  "The repo, the domain, and the data — yours from day one, no lock-in.",
  "A live, public build that ships at your domain by the end of Day 14.",
];

/* The four light inputs we need from the customer. */
const NEED: { title: string; body: string }[] = [
  {
    title: "The deposit",
    body: "50% up front on Day 1. It clears the build into the queue and locks your dates. The balance is due at launch.",
  },
  {
    title: "Your brand assets",
    body: "Logo, colors, and any photography you already have. No logo yet? We’ll point you to designers who can turn one around inside the window.",
  },
  {
    title: "Your content",
    body: "Services, pricing, and the facts about your business — via the Day 1 questionnaire. The clearer this is, the faster we move.",
  },
  {
    title: "30 minutes for each review",
    body: "Two scheduled reviews, Day 7 and Day 11. Half an hour each to react to the build and steer it while there’s still room to change course.",
  },
];

/* -------------------------------------------------------------------------- */

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
    <div className="cin-detail-block">
      <Reveal as="h3" className="cin-detail-h2" style={{ fontSize: "clamp(20px, 2.4vw, 28px)" }}>
        {label}
        <span
          style={{
            fontFamily: "var(--cin-font-mono)",
            fontSize: "12px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--cin-faint)",
            marginLeft: "14px",
          }}
        >
          {sub}
        </span>
      </Reveal>
      <ol className="cin-detail-steps" role="list">
        {beats.map((beat, i) => (
          <Reveal
            as="li"
            key={beat.day}
            delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
          >
            <span className="cin-detail-step-n">
              Day {String(beat.day).padStart(2, "0")}
            </span>
            <div>
              <h3>{beat.title}</h3>
              <p>{beat.body}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export default function ProcessPage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        {/* Hero — editorial header in the 760px column. */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-kicker">
            How we ship
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            14 days, beat by beat.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            The work isn&rsquo;t a mystery. Here&rsquo;s exactly what happens
            between deposit and launch — fourteen beats, one per day.
          </Reveal>
          <Reveal as="div" delayStep={3} className="cin-hcta cin-detail-cta">
            <a
              href={SITE.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn cin-btn-solid"
              data-cta="book_process_hero"
            >
              Book a 15-min intro call
            </a>
            <a href="#timeline" className="cin-btn" data-cta="timeline_process_hero">
              See the 14 beats
            </a>
          </Reveal>
        </header>

        {/* The timeline + the two supporting sections, in the readable column. */}
        <div className="cin-detail">
          <section id="timeline" className="cin-detail-block" style={{ scrollMarginTop: "120px" }}>
            <Reveal as="h2" className="cin-detail-h2">
              Fourteen beats. One per day.
            </Reveal>
            <Reveal as="p" delayStep={1} className="cin-detail-body">
              Every Day14 build runs the same rhythm. Week one is design and
              foundation. Week two is build, integrate, and launch. Two scheduled
              reviews keep you in the loop without slowing the ship.
            </Reveal>
          </section>

          <TimelineWeek
            label="Week 1"
            sub="Design + foundation"
            beats={WEEK_ONE}
          />
          <TimelineWeek
            label="Week 2"
            sub="Build + integrate + launch"
            beats={WEEK_TWO}
          />

          {/* What you receive. */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Ten things land in your inbox.
            </Reveal>
            <Reveal as="p" delayStep={1} className="cin-detail-body">
              The deliverables are fixed, not a surprise. Every build ships the
              same set, on the same cadence — that&rsquo;s what the fixed price
              buys.
            </Reveal>
            <ul className="cin-detail-features" role="list">
              {RECEIVE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {/* What we need from you. */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Four things from you, and they&rsquo;re light.
            </Reveal>
            <Reveal as="p" delayStep={1} className="cin-detail-body">
              The fixed timeline only holds if your side is quick. None of this
              is heavy — it&rsquo;s the minimum input that lets the build move at
              pace.
            </Reveal>
            <ol className="cin-detail-steps" role="list">
              {NEED.map((n, i) => (
                <Reveal
                  as="li"
                  key={n.title}
                  delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
                >
                  <span className="cin-detail-step-n">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </section>

          {/* The payoff line. */}
          <section className="cin-detail-block cin-detail-outcome">
            <Reveal as="p">
              Now you know exactly what you&rsquo;re buying — the same fourteen
              beats, every build.
            </Reveal>
          </section>
        </div>

        {/* Closing CTA — book (Cal.com) + email fallback. */}
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
