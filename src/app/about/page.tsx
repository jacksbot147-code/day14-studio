import type { Metadata } from "next";

import { SITE, PITCH, CASE_STUDIES } from "@/lib/site";
import { SERVICE_TIERS } from "@/lib/pricing";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";

/**
 * /about — the operator story, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 4/10 of the rebuild). Composed
 * directly from the shared shell (CanvasField backdrop + fixed Nav + SiteFooter
 * + ClosingCTA), matching the `/pricing` (block 2) and `/work-with-us` (block 3)
 * pattern rather than the <CinematicPage> wrapper — because the closing booking
 * CTA must sit *before* the footer, and CinematicPage renders the footer itself
 * with no slot for it. Long-form narrative uses the `.cin-prose` styles from
 * block 1; the proof grid reuses `.cin-detail-cases` and the honesty rail reuses
 * `.cin-detail-pain` (muted markers — semantically a "what I don't do" list).
 *
 * Positioning matches the homepage north-star: an operator who builds software
 * for local service businesses, not an agency. Content is preserved from the
 * prior surface; only the skin changes.
 *
 * PRICING INTEGRITY: the full-stack price label is read from src/lib/pricing.ts
 * (the platform tier's setupLabel), never hard-coded — so `check:prices` stays
 * clean. The "$50k+" / "6 months" figures are agency-comparison prose, not a
 * Day14 tier price, and are not tier-shaped.
 */

// Full-stack build price comes from pricing.ts — the Platform tier label.
// Guard the lookup instead of asserting non-null: these pages are statically
// generated, so a `!` here would hard-fail the whole site build if the
// "platform" slug is ever renamed. Degrade to a neutral label instead.
const FULL_STACK_PRICE =
  SERVICE_TIERS.find((t) => t.slug === "platform")?.setupLabel ??
  "at a fixed price";

export const metadata: Metadata = {
  title: "About",
  description: `${SITE.brand} is one operator (${SITE.ownerHandle}) using AI agents to ship operator-built software for local service businesses — complete platforms in 14 days. Built in ${SITE.location}.`,
  alternates: { canonical: "/about" },
};

/* The honesty rail — the no-list. Just as important as what's in scope. */
const DONT: string[] = [
  "I don't run your business operations. Day14 ships the platform; you ship the work.",
  "I don't design logos from scratch. Use what you have, or bring a designer (I know good ones).",
  "I don't take on more than 3 active builds at once. The whole pitch is shipped-in-14, not stuck-on-a-waitlist-for-14-weeks.",
  "I don't run paid ads, write blog posts, or manage your social. The Day14 monthly covers hosting + maintenance, not marketing services.",
  "I don't quote at 4am for someone who wants to argue about price. The SKUs are public and fixed. If they don't fit, that's a real answer, not a haggle.",
  "I don't promise things I can't ship. The day-14-or-deposit-back guarantee is the price of saying it.",
];

export default function AboutPage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        {/* Hero — editorial header in the 760px column. */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-kicker">
            About {SITE.brand}
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            One operator. AI agents. Real businesses, shipped.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            {SITE.brand} is {SITE.ownerHandle} — a solo operator in{" "}
            {SITE.location} who runs his own small businesses and ships software
            for others who run theirs. No agency. No project managers. No quotes.
            Just one builder, a fleet of AI agents, and a productized 14-day
            playbook.
          </Reveal>
          <Reveal as="div" delayStep={3} className="cin-hcta cin-detail-cta">
            <a
              href={SITE.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn cin-btn-solid"
              data-cta="book_about_hero"
            >
              Book a 15-min intro call
            </a>
            <a href="/#work" className="cin-btn" data-cta="work_about_hero">
              See the work
            </a>
          </Reveal>
        </header>

        {/* Narrative — the model, the proof, the honesty rail. */}
        <div className="cin-detail">
          {/* The model — pure long-form prose. */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              The model
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              How a one-operator shop ships the same scope as a 10-person agency.
            </Reveal>
            <Reveal as="div" delayStep={2} className="cin-prose">
              <p>
                Most agencies stack overhead: project managers, account managers,
                designers, frontend, backend, QA, devops. Six people in a meeting
                to decide a button color. The customer pays for all of them — in
                timeline and in price.
              </p>
              <p>
                Day14 strips it down to one operator running AI agents
                (Claude-based) inside Cowork. The agents handle the volume work —
                scaffolding, repetitive code, content generation, QA scans. The
                operator handles the judgment work — architecture, customer
                relationships, the moments where the agent doesn&rsquo;t know what
                to do next.
              </p>
              <p>
                The result is a productized studio that ships the full stack
                (marketing site + customer portal + billing + admin + AI chatbot
                + SMS) {FULL_STACK_PRICE} — the same scope an agency would charge
                $50k+ and take 6 months for.
              </p>
              <p>
                <strong>{PITCH.founderAngle}</strong>
              </p>
            </Reveal>
          </section>

          {/* The proof — operator-first, with the live builds as evidence. */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Builder of his own businesses first.
            </Reveal>
            <Reveal as="p" delayStep={1} className="cin-detail-body">
              Every {SITE.brand} build is shaped by lessons from running a real
              business. {SITE.ownerHandle} is customer #0 of the field-service
              Platform shell — he dispatches real pool-service visits through it
              every week. That&rsquo;s a different worldview than an agency
              developer who&rsquo;s never logged into Stripe Connect after launch.
            </Reveal>
            <div className="cin-detail-cases">
              {CASE_STUDIES.map((cs, i) => (
                <Reveal
                  key={cs.slug}
                  className="cin-detail-case"
                  delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
                >
                  <div className="cin-detail-case-v">{cs.sku}</div>
                  <h3
                    style={{
                      fontWeight: 400,
                      fontSize: "18px",
                      margin: "0 0 6px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {cs.name}
                  </h3>
                  <p>{`${cs.summary.split(".").at(0) ?? cs.summary}.`}</p>
                </Reveal>
              ))}
            </div>
          </section>

          {/* The honesty rail — the no-list. */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              What I don&rsquo;t do.
            </Reveal>
            <Reveal as="p" delayStep={1} className="cin-detail-body">
              Just as important as the list of what&rsquo;s in scope. Productized
              studios stay profitable because they say no a lot. Here&rsquo;s the
              no-list.
            </Reveal>
            <ul className="cin-detail-pain" role="list">
              {DONT.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
        </div>

        {/* Closing CTA — book (Cal.com) + email fallback. */}
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
