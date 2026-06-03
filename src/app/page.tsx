import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/cn";
import { BuildReveal } from "@/components/landing/build-reveal";
import { CmdKPalette } from "@/components/landing/cmd-k-palette";
import { CountUp } from "@/components/motion/count-up";
import { HeroAurora } from "@/components/motion/hero-aurora";
import { StaggerCtas } from "@/components/motion/stagger-ctas";
import { CursorSpotlight } from "@/components/landing/cursor-spotlight";
import { ScrambleNumber } from "@/components/landing/scramble-number";
import { SectionNumeral } from "@/components/landing/section-numeral";
import { SectionDivider } from "@/components/landing/section-divider";
import { MeshGradient } from "@/components/landing/mesh-gradient";
import { TerminalSnippet } from "@/components/landing/terminal-snippet";
import { CinematicImage } from "@/components/landing/cinematic-image";
import { VideoHero } from "@/components/landing/video-hero";
import { DeployStrip } from "@/components/deploy-strip";
import { WaitlistForm } from "@/components/WaitlistForm";

/**
 * Home page — Day14 OS pivot day, May 29 2026.
 *
 * Pitches Day14 OS as the multi-tenant operating system for one operator
 * running several businesses. Existing build-studio messaging moves to
 * /work-with-us (still linked from the footer). The pivot copy here is
 * the public bet — landing page + Loom + manifesto + waitlist.
 *
 * Constraints honored: NO new dependencies, reuse design tokens, single
 * page, framer-motion via the existing motion/* components.
 */

// Placeholder Loom URL — Jack pastes the real one post-record.
// Empty string renders a styled "ready to embed" frame.
const LOOM_EMBED_URL = "";

// Page-level metadata overrides the layout defaults for the home route.
// Other routes (case studies, about, etc.) keep the layout defaults.
const TITLE = "Day14 OS — The operating system for solopreneurs running multiple businesses";
const DESCRIPTION =
  "One operator. Six businesses. One operating system. Multi-tenant studio with marketing sites, portals, billing, admin app, scheduled agents, and an evidence-verified work-log. Waitlist open until Sunday.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: SITE.brand,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// Day14 OS at a glance — used in the hero proof strip.
const OS_STATS = {
  tenants: 6,
  agentsPerDay: 24,
  shippedChanges: 400,
  attentionHoursPerDay: 4,
};

// Six tenants on the OS — the empire, live. Bento order:
//   Row 1 (tall): alignmd, life-loophole, day14
//   Row 2 (short): day14-realty, hot-flash-co, kennum-lawn-care
// hot-flash-co + kennum-lawn-care render as PARKED tiles per the operator
// brief — excluded from new product work but kept visible in the grid.
type TenantState = "live" | "paused" | "parked";
const OS_CASE_STUDIES: Array<{
  slug: string;
  name: string;
  title: string;
  story: string;
  state: TenantState;
  brandColor: string;
  size: "tall" | "short";
}> = [
  {
    slug: "alignmd",
    name: "AlignMD",
    title: "Credential-aware staffing, end to end.",
    story:
      "Clinician intake that used to take 40 minutes now takes 4. Same admin app the operator runs every other tenant from.",
    state: "live",
    brandColor: "#3B82F6",
    size: "tall",
  },
  {
    slug: "life-loophole",
    name: "Life Loophole",
    title: "Editorial finance, drafted by an agent nightly.",
    story:
      "A scheduled agent ships essays in brand voice each night. Operator reviews and publishes from the inbox.",
    state: "live",
    brandColor: "#CA8A04",
    size: "tall",
  },
  {
    slug: "day14",
    name: "Day14 OS",
    title: "The operating system running this page.",
    story:
      "Multi-tenant studio, scheduled agents, evidence-verified work-log. The same code stack runs all six brands.",
    state: "live",
    brandColor: "#EF6C33",
    size: "tall",
  },
  {
    slug: "day14-realty",
    name: "Day14 Realty",
    title: "Coastal listings, paused for licensing.",
    story:
      "Brand and admin wired into the OS. On hold until broker-of-record paperwork clears.",
    state: "paused",
    brandColor: "#14805A",
    size: "short",
  },
  {
    slug: "hot-flash-co",
    name: "Hot Flash Co",
    title: "Menopause-positive D2C, parked.",
    story:
      "Site, copy, and product grid live in the OS. Held until capital lines up for the first inventory run.",
    state: "parked",
    brandColor: "#F472B6",
    size: "short",
  },
  {
    slug: "kennum-lawn-care",
    name: "Kennum Lawn Care",
    title: "Local landscape services, parked.",
    story:
      "Booking + dispatch wired against the same admin. Reactivates when route density returns to profitable.",
    state: "parked",
    brandColor: "#65A30D",
    size: "short",
  },
];

const OS_STEPS = [
  {
    n: "01",
    title: "Add a tenant",
    body:
      "One config entry. The OS picks up the tenant everywhere — admin dashboard, inbox routing, deploy strip, scheduled tasks, work-log.",
  },
  {
    n: "02",
    title: "Schedule the agents",
    body:
      "Daily briefing, content drafts, image generation, deploy commit, EOD evidence check. Each agent writes to the work-log when it ships, surfaces to the inbox when it can't.",
  },
  {
    n: "03",
    title: "Live in the inbox",
    body:
      "The operator's job is one screen: /admin/inbox. Everything else is either automated or evidence-verified. If it's not in the inbox, it doesn't need you.",
  },
];

type OsTier = {
  name: string;
  price: string;
  cadence: string;
  tenants: string;
  bestFor: string;
  popular?: boolean;
};

const OS_TIERS: OsTier[] = [
  {
    name: "Solo",
    price: "$79",
    cadence: "/mo",
    tenants: "1 tenant",
    bestFor: "One operator, one business, wants the OS but only needs one slot.",
  },
  {
    name: "Portfolio",
    price: "$299",
    cadence: "/mo",
    tenants: "Up to 5 tenants",
    bestFor: "One operator, two to five businesses. The shape this OS was built for.",
    popular: true,
  },
  {
    name: "Founder",
    price: "$999",
    cadence: "/mo",
    tenants: "Unlimited tenants",
    bestFor: "Heavy users. Onboarding session, direct line, closes at 100 signups.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <DeployStrip />
        {/* BuildReveal wraps each section so its content "builds itself"
            on viewport entry — opacity-0 + scale-0.96 + blur-8px resolving
            to crisp focus over 700ms. Phase B move 1. */}
        <BuildReveal><LoomDemo /></BuildReveal>
        <BuildReveal><CaseStudies /></BuildReveal>
        <BuildReveal><HowItWorks /></BuildReveal>
        <BuildReveal><Pricing /></BuildReveal>
        <BuildReveal><Waitlist /></BuildReveal>
        <BuildReveal><FooterCta /></BuildReveal>
      </main>
      <SiteFooter />
      {/* Phase C — interactive Cmd+K palette. Floating "Ask anything" pill
          bottom-right; press ⌘K (or Ctrl+K) anywhere to open. 14 real-feeling
          Day14 OS commands, live fuzzy filter, faked "execute" with toast.
          The marketing page's first interactive product moment. */}
      <CmdKPalette />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Section heading — reused editorial pattern                                  */
/* -------------------------------------------------------------------------- */

function SectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <div className="eyebrow eyebrow-rule mb-5">{eyebrow}</div>
      <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
        {title}
      </h2>
      {lead ? <p className="mt-5 text-ink-500">{lead}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="grain relative isolate overflow-hidden border-b border-ink-100">
      {/* Ambient backdrop — mesh + aurora + cursor spotlight live behind
          the LivingOsHero chrome. They tint the paper around the chrome
          without competing with it. (The Gemini hero-ambient image was
          dropped — the OS window carries the fold on its own.) */}
      <MeshGradient opacity={0.32} blur={90} />
      <HeroAurora />
      <CursorSpotlight />

      <div className="container-page relative z-10 pt-24 pb-24 sm:pt-32 sm:pb-32 lg:pt-36 lg:pb-40">
        {/* VideoHero — Package A wow stack: 4-vignette loop, ember particles
            orbiting the headline reacting to mouse, breathing gradient on the
            "operating system" text. The right column feels like a looping
            product demo reel, not a static screenshot. */}
        <VideoHero
          cta={
            <StaggerCtas className="flex flex-wrap items-center gap-3">
              <a href="#waitlist" className="btn-ember">
                Join the waitlist
              </a>
              <a href="#how" className="btn-ghost">
                See how it works
              </a>
            </StaggerCtas>
          }
        />

        {/* Proof strip — same bordered grid pattern. ScrambleNumber gives it
            a terminal-decrypting feel that matches the brutalist /admin
            mission-control vibe. Lives outside the parallax wrap so it stays
            anchored while the hero text floats. */}
        <div className="mt-20 grid max-w-3xl grid-cols-2 border-l border-t border-ink-100 sm:mt-24 sm:grid-cols-4">
          <Stat
            label="Tenants on the OS"
            value={<ScrambleNumber to={OS_STATS.tenants} />}
          />
          <Stat
            label="Agents per day"
            value={<ScrambleNumber to={OS_STATS.agentsPerDay} />}
          />
          <Stat
            label="Verified shipped"
            value={
              <>
                <ScrambleNumber to={OS_STATS.shippedChanges} />+
              </>
            }
          />
          <Stat
            label="Operator hrs / day"
            value={
              <>
                &le; <ScrambleNumber to={OS_STATS.attentionHoursPerDay} />
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-b border-r border-ink-100 px-4 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tightest text-ink tnum">
        {value}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loom demo embed                                                            */
/* -------------------------------------------------------------------------- */

function LoomDemo() {
  // Apple-product-page moment: centered editorial column over the video
  // card. The card itself IS the frame — no browser chrome, no dotted
  // mockup. Long warm peach-tinted shadow, soft cream surface, big radius.
  const cardShadow =
    "0 24px 60px -20px rgba(239, 108, 51, 0.10), 0 8px 24px -8px rgba(15, 23, 42, 0.06)";

  return (
    <section
      id="loom"
      className="bg-paper-cream py-32 sm:py-40"
    >
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="eyebrow mb-6 justify-center text-ember-600">
            Watch the system run · 4 min
          </div>
          <h2 className="text-[64px] font-extrabold leading-[0.95] tracking-[-0.04em] text-ink sm:text-[80px] lg:text-[96px]">
            A Monday morning. Six businesses. No standups.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-[1.55] text-warm-gray-500 sm:text-xl">
            I open the admin dashboard, the inbox shows me three things to approve, I approve them, the scheduled tasks fire, and by noon every business has shipped something. No team, no project manager, no Notion archaeology. The OS is the manager.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href="#waitlist" className="btn-ember">
              Join the waitlist →
            </a>
            <a href="#case-studies" className="btn-ghost">
              See the tenants
            </a>
          </div>
        </div>

        <div
          className="relative mx-auto mt-20 aspect-video w-full max-w-5xl overflow-hidden rounded-3xl bg-warm-gray-50"
          style={{ boxShadow: cardShadow }}
        >
          {LOOM_EMBED_URL ? (
            <iframe
              src={LOOM_EMBED_URL}
              title="Day14 OS — 4-minute demo"
              loading="lazy"
              allow="fullscreen"
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-8 text-center">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-warm-gray-400">
                  Loom · ready to embed
                </div>
                <p className="mx-auto mt-4 max-w-md text-sm text-warm-gray-500">
                  Demo recording in progress. Paste the Loom share URL into{" "}
                  <code className="rounded bg-warm-gray-100 px-1.5 py-0.5 font-mono text-xs text-ink">
                    LOOM_EMBED_URL
                  </code>{" "}
                  in <code className="font-mono text-xs">page.tsx</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Case studies — three tenants                                                */
/* -------------------------------------------------------------------------- */

function CaseStudies() {
  // Apple-style bento. 3 cols on lg, 2 on md, 1 on mobile.
  // Row 1: alignmd, life-loophole, day14 (tall — 360px).
  // Row 2: day14-realty, hot-flash-co, kennum-lawn-care (short — 240px).
  // Tiles render with brand-color top border + warm peach long shadow.
  const tileShadow =
    "0 24px 60px -20px rgba(239, 108, 51, 0.10), 0 8px 24px -8px rgba(15, 23, 42, 0.06)";

  return (
    <section
      id="case-studies"
      className="bg-paper-cream py-32 sm:py-40"
    >
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="eyebrow mb-6 justify-center text-ember-600">
            Six businesses, one OS
          </div>
          <h2 className="text-[56px] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[72px] lg:text-[80px]">
            The empire, live.
          </h2>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {OS_CASE_STUDIES.map((cs) => (
            <article
              key={cs.slug}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-3xl bg-paper-cream p-7 sm:p-8",
                cs.size === "tall" ? "min-h-[360px]" : "min-h-[240px]",
              )}
              style={{ boxShadow: tileShadow }}
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: cs.brandColor }}
              />
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-warm-gray-500">
                {cs.name}
              </div>
              <h3 className="mt-4 text-2xl font-bold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[26px]">
                {cs.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.55] text-warm-gray-500">
                {cs.story}
              </p>
              <div className="mt-auto flex justify-end pt-6">
                <StatePill state={cs.state} />
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-16 max-w-2xl text-center font-mono text-xs uppercase tracking-[0.22em] text-warm-gray-400">
          Same OS · Same inbox · Same evidence verifier
        </p>
      </div>
    </section>
  );
}

function StatePill({ state }: { state: "live" | "paused" | "parked" }) {
  const config = {
    live: { dot: "bg-shipped-500", label: "Live", text: "text-shipped-600" },
    paused: { dot: "bg-amber-500", label: "Paused", text: "text-amber-600" },
    parked: { dot: "bg-warm-gray-400", label: "Parked", text: "text-warm-gray-500" },
  }[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-warm-gray-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em]",
        config.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* How it works — 3 steps                                                      */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  // Apple-style staircase: each step takes a full row, image (terminal)
  // and copy alternate sides. A massive ghost numeral sits behind the row
  // as background art, in warm-gray-100 — present but not loud. The cream
  // surface lets the light TerminalSnippet variant carry the product-feel
  // without flipping the section into a dark slab.
  const terminalsByStep: Array<Array<{ text: string; output?: string }>> = [
    [
      { text: "day14 new-tenant my-brand" },
      { text: "day14 deploy my-brand", output: "✓ deployed to my-brand.day14.us" },
    ],
    [
      { text: "day14 schedule daily-briefing 07:30" },
      { text: "day14 schedule end-of-day 16:00", output: "✓ 2 agents scheduled" },
    ],
    [
      { text: "open day14.us/admin/inbox" },
      { text: "# approve / skip — one screen", output: "12 items waiting → 0" },
    ],
  ];

  return (
    <section id="how" className="bg-paper-cream py-32 sm:py-40">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="eyebrow mb-6 justify-center text-ember-600">
            How it works
          </div>
          <h2 className="text-[56px] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[72px] lg:text-[80px]">
            Three primitives. Everything else is a consequence.
          </h2>
        </div>

        <div className="mt-24 flex flex-col gap-24 sm:gap-32">
          {OS_STEPS.map((s, i) => {
            // Alternate which side the copy sits on. Step 1 + 3: copy left,
            // terminal right. Step 2: terminal left, copy right.
            const reverse = i % 2 === 1;
            const terminalLines = terminalsByStep[i] ?? [];
            return (
              <div key={s.n} className="relative">
                {/* Ghost numeral — 200-280px warm-gray-100, sits behind the
                    step content as scroll-cinema background art. Positioned
                    on the same side as the copy column for visual rhyme. */}
                <div
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute -top-12 select-none font-extrabold leading-none tracking-[-0.06em] text-warm-gray-100",
                    "text-[200px] sm:text-[240px] lg:text-[280px]",
                    reverse ? "right-0 sm:-right-6" : "left-0 sm:-left-6",
                  )}
                >
                  {s.n}
                </div>

                <div
                  className={cn(
                    "relative z-10 grid items-center gap-10 lg:grid-cols-2 lg:gap-16",
                    reverse && "lg:[&>*:first-child]:order-2",
                  )}
                >
                  <div>
                    <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ember-600 tnum">
                      Step {s.n}
                    </div>
                    <h3 className="mt-5 text-[48px] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[56px] lg:text-[64px]">
                      {s.title}
                    </h3>
                    <p className="mt-6 max-w-xl text-[18px] leading-[1.6] text-warm-gray-500">
                      {s.body}
                    </p>
                  </div>
                  <div>
                    <TerminalSnippet
                      title={`step ${s.n}`}
                      lines={terminalLines}
                      variant="light"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Pricing teaser                                                              */
/* -------------------------------------------------------------------------- */

function Pricing() {
  // Apple-style soft cards on cream. All three tiers live on the same
  // paper-cream surface (no dark-inverted Portfolio) so the row reads as
  // one harmonious shelf. Portfolio gets an ember 2px border + a
  // "Recommended" pill in the top-right; the other two stay quiet.
  const cardShadow =
    "0 24px 60px -20px rgba(239, 108, 51, 0.10), 0 8px 24px -8px rgba(15, 23, 42, 0.06)";

  return (
    <section id="pricing" className="bg-paper-cream py-32 sm:py-40">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="eyebrow mb-6 justify-center text-ember-600">
            Founder pricing — open until 100 signups
          </div>
          <h2 className="text-[56px] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[72px] lg:text-[80px]">
            Three tiers. Pick one.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-[17px] leading-[1.6] text-warm-gray-500 sm:text-[18px]">
            Founder pricing locks for the first 100 signups. After that the Founder tier closes; Portfolio becomes the top public tier.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5">
          {OS_TIERS.map((tier) => (
            <article
              key={tier.name}
              className={cn(
                "relative flex flex-col bg-paper-cream p-8",
                "rounded-[24px]",
                "transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5",
                tier.popular
                  ? "border-2 border-ember-500"
                  : "border border-warm-gray-100",
              )}
              style={{ boxShadow: cardShadow }}
            >
              {tier.popular ? (
                <span className="absolute -top-3 right-6 inline-flex items-center rounded-full bg-ember-500 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_4px_12px_-2px_rgba(239,108,51,0.4)]">
                  Recommended
                </span>
              ) : null}

              <h3 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.025em] text-ink">
                {tier.name}
              </h3>
              <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-warm-gray-400">
                {tier.tenants}
              </p>

              <div className="mt-7 flex items-baseline gap-1 tnum">
                <span className="text-[56px] font-extrabold leading-none tracking-[-0.035em] text-ink">
                  {tier.price}
                </span>
                <span className="text-base font-medium text-warm-gray-400">
                  {tier.cadence}
                </span>
              </div>

              <div className="my-7 h-px w-full bg-warm-gray-100" />

              <p className="text-[15px] leading-[1.6] text-warm-gray-500">
                {tier.bestFor}
              </p>

              <a
                href="#waitlist"
                className="mt-8 inline-flex items-center justify-center self-start rounded-full bg-ember-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-ember-600"
              >
                Join the waitlist →
              </a>
            </article>
          ))}
        </div>

        <p className="mt-12 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-warm-gray-400">
          No drip campaign · No upsell · Founder tier closes at 100 signups
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Waitlist                                                                    */
/* -------------------------------------------------------------------------- */

function Waitlist() {
  // Base44-style center-stack. The dual-column layout is gone; the headline,
  // the lead, and the form sit on a single vertical axis with breathing
  // room. The form itself lives inside a soft-shadowed cream card so it
  // reads as the deliberate point of action on the page.
  const cardShadow =
    "0 24px 60px -20px rgba(239, 108, 51, 0.10), 0 8px 24px -8px rgba(15, 23, 42, 0.06)";

  return (
    <section
      id="waitlist"
      className="bg-paper-cream py-32 sm:py-40"
    >
      <div className="container-page">
        <div className="mx-auto max-w-md text-center">
          <div className="eyebrow mb-6 justify-center text-ember-600">
            The 24-hour signal
          </div>
          <h2 className="text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[48px] lg:text-[56px]">
            Opening the waitlist today. Closes Sunday.
          </h2>
          <p className="mt-7 text-[17px] leading-[1.6] text-warm-gray-500">
            If 50+ operators want this by Sunday at 14:00 EDT, I start onboarding next week. If fewer, I refocus on the strongest tenant and the OS stays private tooling. Either answer is useful — the point of the waitlist is to find out.
          </p>
        </div>

        <div
          className="mx-auto mt-12 max-w-md rounded-[24px] bg-paper-cream p-8"
          style={{ boxShadow: cardShadow }}
        >
          <div className="text-center">
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ember-600">
              Day14 OS · waitlist
            </div>
            <h3 className="mt-2 text-[22px] font-extrabold tracking-[-0.025em] text-ink">
              One email, Sunday.
            </h3>
            <p className="mt-2 text-[15px] leading-[1.55] text-warm-gray-500">
              One email Sunday with where the signal landed, and maybe one more on launch day. That&rsquo;s the whole sequence.
            </p>
          </div>
          <div className="mt-6">
            <WaitlistForm />
          </div>
          <p className="mt-4 text-center font-mono text-[11px] tracking-[0.04em] text-warm-gray-400">
            No drip campaign. No upsell. Unsubscribe is a one-click reply.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer CTA — legacy 14-day SKU link preserved                               */
/* -------------------------------------------------------------------------- */

function FooterCta() {
  // Cream finale. The dark slab is gone — the page resolves on the same
  // paper-cream surface it lived in, with a single ember pill CTA carrying
  // the action. Email lives below as a quiet ghost link.
  return (
    <section className="bg-paper-cream py-32 sm:py-40">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="eyebrow mb-6 justify-center text-ember-600">
            The day-job, still on offer
          </div>
          <h2 className="text-[48px] font-extrabold leading-[1] tracking-[-0.04em] text-ink sm:text-[56px] lg:text-[64px]">
            Want a single 14-day build instead? That offer still stands.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-[17px] leading-[1.6] text-warm-gray-500 sm:text-[18px]">
            The build studio that funded Day14 OS is still taking three customers a month. Fixed-price 14-day platforms — site, portal, admin app, billing. Same operator, same agents, different deliverable.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-5">
            <Link
              href="/work-with-us"
              className="inline-flex items-center justify-center rounded-full bg-ember-500 px-6 py-3 text-base font-semibold text-white transition-colors duration-150 hover:bg-ember-600"
            >
              See the 14-day SKUs →
            </Link>
            <a
              href={`mailto:${SITE.email}`}
              className="text-sm font-semibold text-warm-gray-500 underline decoration-warm-gray-200 underline-offset-4 transition-colors duration-150 hover:text-ink hover:decoration-ember-500"
            >
              Or email {SITE.email}
            </a>
          </div>

          <div className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-warm-gray-400">
            Three slots open this month
          </div>
        </div>
      </div>
    </section>
  );
}
