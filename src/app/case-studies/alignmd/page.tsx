import type { Metadata } from "next";

import { SITE } from "@/lib/site";
import { SERVICE_TIERS } from "@/lib/pricing";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";

/**
 * /case-studies/alignmd — the healthcare-staffing proof, cinematic skin.
 *
 * Re-themed into the cinematic system (block 6/10). Same shared shell + detail
 * primitives as /about and the other case studies; problem → build → result
 * narrative mirroring the homepage proof framing. AlignMD is genuinely live —
 * it's the second of the two live proof tiles on the homepage (`#work`).
 * Content preserved from the prior surface; only the skin changes.
 *
 * PRICING INTEGRITY: the Platform price label is read from pricing.ts
 * (setupLabel), never hard-coded, and the `$X + $Y/mo` tier shape is avoided —
 * so check:prices stays clean.
 */

// Platform price comes from pricing.ts — the single source of truth.
const PLATFORM_SETUP =
  SERVICE_TIERS.find((t) => t.slug === "platform")?.setupLabel ??
  "at a fixed price";

const CASE = {
  name: "AlignMD",
  industry: "healthcare staffing",
  url: "https://alignmd.vercel.app",
} as const;

export const metadata: Metadata = {
  title: `${CASE.name} — case study`,
  description: `How Day14 built ${CASE.name} as a Platform — credential-aware intake, AI dossier generation, multi-state license verification, and an operator admin that turned a 40-minute clinician onboarding into a 4-minute one.`,
  alternates: { canonical: "/case-studies/alignmd" },
  openGraph: {
    title: `${CASE.name} — case study`,
    description: "Credential-aware staffing, end to end. Built on Day14 OS.",
    url: `https://${SITE.domain}/case-studies/alignmd`,
    siteName: SITE.brand,
    type: "article",
  },
};

const SURFACES: Array<{ tag: string; name: string; body: string }> = [
  {
    tag: "Clinician portal",
    name: "Magic-link, mobile-first intake",
    body: "Clinicians sign in with a magic link, upload credentials (drag, drop, or a photo of a paper doc), and watch a progress bar of what's parsed vs. what still needs them. Mobile-first, because that's where credential photos get taken.",
  },
  {
    tag: "Operator admin",
    name: "Dossier queue, one-click approve",
    body: "The ops team sees a queue of completed dossiers ranked by review priority — license urgency, geo demand, contract value. One screen: approve or kick back. The same admin shell runs every other tenant.",
  },
  {
    tag: "Scheduled agents",
    name: "Lookups, assembly, nightly QA",
    body: "Agents run on cron: credential-parse fires on a new doc, a license-status agent verifies against state boards nightly, and an evidence verifier flags any dossier where parsed data doesn't match the source PDF.",
  },
  {
    tag: "Billing + ops",
    name: "Stripe Connect placement fees",
    body: "Hospitals pay placement fees through Stripe Connect; clinicians get paid on the same rails when a placement closes. Wired live before launch — no “billing comes in phase 2.”",
  },
];

const STATS: Array<{ v: string; l: string }> = [
  { v: "10x", l: "Faster onboarding (40 min → 4 min)" },
  { v: "4 wk", l: "Platform build, kickoff to launch" },
  { v: "1", l: "Operator, same admin as five tenants" },
  { v: "24/7", l: "Agent license-status coverage" },
];

export default function CaseStudyPage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        {/* Hero */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-detail-crumb">
            <a href="/#work">← All work</a>
          </Reveal>
          <Reveal as="div" className="cin-kicker">
            {CASE.industry} · live
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            Credential-aware staffing, end to end.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            AlignMD is a B2B platform for healthcare staffing — clinicians submit
            credentials once, hospitals see a fully-formed dossier in minutes. It
            runs on Day14 OS, the same multi-tenant platform behind five other
            businesses the operator runs himself.
          </Reveal>
          <Reveal as="div" delayStep={3} className="cin-hcta cin-detail-cta">
            <a
              href={CASE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn cin-btn-solid"
              data-cta="open_alignmd_live"
            >
              Open the live platform ↗
            </a>
            <a
              href={SITE.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn"
              data-cta="book_alignmd_hero"
            >
              Get one built like this
            </a>
          </Reveal>
        </header>

        <div className="cin-detail">
          {/* Problem */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              The problem
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              Clinician intake takes 40 minutes per candidate.
            </Reveal>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              Healthcare staffing is gated by credentials — medical license,
              board certifications, malpractice history, hospital privileges,
              state-specific verifications. A typical clinician submits 8&ndash;12
              documents across 3&ndash;5 forms, and a coordinator stitches them
              into a dossier by hand. The average end-to-end cycle is 40 minutes
              per clinician, with rework on every fourth file.
            </Reveal>
          </section>

          {/* The build */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              The build
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              Four surfaces. One operating system.
            </Reveal>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              Every surface sits on Day14 OS — multi-tenant routing, magic-link
              auth, the same evidence-verified deploy pipeline used on every
              other build. AlignMD looks like its own product because the brand
              and workflow are bespoke; under the hood it&rsquo;s the same
              hardened core.
            </Reveal>
            <div className="cin-detail-cases">
              {SURFACES.map((s, i) => (
                <Reveal
                  key={s.name}
                  className="cin-detail-case"
                  delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
                >
                  <div className="cin-detail-case-v">{s.tag}</div>
                  <h3
                    style={{
                      fontWeight: 400,
                      fontSize: "18px",
                      margin: "0 0 6px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {s.name}
                  </h3>
                  <p>{s.body}</p>
                </Reveal>
              ))}
            </div>
          </section>

          {/* Why it works */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              The OS is the moat.
            </Reveal>
            <Reveal as="p" delayStep={1} className="cin-detail-body">
              The reason AlignMD shipped in four weeks — not the four months an
              agency quotes — is that the multi-tenant infrastructure was already
              built. Auth, billing, admin shell, scheduled agents, deploy
              pipeline, evidence verifier all sit in the same code stack that
              runs the operator&rsquo;s own revenue. When you hire {SITE.brand} to
              build, you get the same platform we trust with ours — not a template
              with our markup on top.
            </Reveal>
          </section>

          {/* Same engine line */}
          <section className="cin-detail-block cin-detail-outcome">
            <Reveal as="p">
              Same engine as a pool route. Wildly different business.
            </Reveal>
          </section>

          {/* Results */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              By the numbers
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              What the operator measures.
            </Reveal>
            <div className="cin-stats">
              {STATS.map((s) => (
                <div key={s.l} className="cin-stat">
                  <div className="cin-stat-v">{s.v}</div>
                  <div className="cin-stat-l">{s.l}</div>
                </div>
              ))}
            </div>
            <Reveal as="p" delayStep={1} className="cin-detail-body">
              Platform tier starts {PLATFORM_SETUP}. Same stack, same agents,
              your brand — shipped in four weeks.
            </Reveal>
          </section>
        </div>

        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
