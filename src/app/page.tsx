import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/cn";
import { ScrollFade } from "@/components/motion/scroll-fade";
import { CountUp } from "@/components/motion/count-up";
import { HeroAurora } from "@/components/motion/hero-aurora";
import { StaggerCtas } from "@/components/motion/stagger-ctas";
import { HeroParallaxWrap } from "@/components/landing/hero-parallax-wrap";
import { CursorSpotlight } from "@/components/landing/cursor-spotlight";
import { ScrambleNumber } from "@/components/landing/scramble-number";
import { SectionNumeral } from "@/components/landing/section-numeral";
import { SectionDivider } from "@/components/landing/section-divider";
import { TintedCaseCard } from "@/components/landing/tinted-case-card";
import { MeshGradient } from "@/components/landing/mesh-gradient";
import { OrbitDiagram } from "@/components/landing/orbit-diagram";
import { TerminalSnippet } from "@/components/landing/terminal-snippet";
import { CinematicImage } from "@/components/landing/cinematic-image";
import { LivingOsHero } from "@/components/landing/living-os-hero";
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

// Three case studies for the OS pitch. Inline so we don't disturb the
// legacy CASE_STUDIES used by the /case-studies pages.
const OS_CASE_STUDIES: Array<{
  slug: string;
  name: string;
  vertical: string;
  state: "Live" | "Preview" | "Internal";
  screenshot: string;
  result: string;
  image: string;
  imageAlt: string;
}> = [
  {
    slug: "alignmd",
    name: "AlignMD",
    vertical: "B2B SaaS · Healthcare staffing",
    state: "Live",
    screenshot:
      "Clinician portal — credential checklist + intake parser running over a candidate resume, dossier auto-generating into the right panel.",
    result:
      "Credential-aware intake that used to take 40 minutes per clinician now takes 4. Same admin app the operator uses for the other five businesses.",
    image: "/images/landing/case-alignmd.png",
    imageAlt: "AlignMD — cool clinical morning light, abstract dashboards floating mid-air",
  },
  {
    slug: "hot-flash-co",
    name: "Hot Flash Co",
    vertical: "D2C brand · Wellness, peri/menopause",
    state: "Live",
    screenshot:
      "Brand site hero with menopause-positive editorial photography, product grid, MailerLite-wired waitlist, AI chatbot answering symptom questions.",
    result:
      "Brand-led D2C site built to look like it came from a 20-person team. Lives in the same OS as the SaaS tenant — different brand, same admin.",
    image: "/images/landing/case-hot-flash-co.png",
    imageAlt: "Hot Flash Co — warm golden-hour wellness still-life on linen",
  },
  {
    slug: "life-loophole",
    name: "Life Loophole",
    vertical: "Content business · Personal-finance education",
    state: "Live",
    screenshot:
      "Article archive of 30+ drafts on an editorial template, with the scheduled-task panel showing the daily content agent's last run.",
    result:
      "A scheduled agent drafts essays nightly to the brand voice. Operator reviews and ships from the inbox. One content business running on autopilot.",
    image: "/images/landing/case-life-loophole.png",
    imageAlt: "Life Loophole — layered ivory vellum with warm honey-gold afternoon light",
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
        <ScrollFade><LoomDemo /></ScrollFade>
        <ScrollFade><CaseStudies /></ScrollFade>
        <ScrollFade><HowItWorks /></ScrollFade>
        <ScrollFade><Pricing /></ScrollFade>
        <ScrollFade><Waitlist /></ScrollFade>
        <ScrollFade><FooterCta /></ScrollFade>
      </main>
      <SiteFooter />
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

      <div className="container-page relative z-10 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-32 lg:pb-40">
        {/* The hero IS the product. LivingOsHero is a faked-live Day14 admin
            window with a tenant rail, streaming activity log, ticking inbox
            counter, pulsing deploy bar, and the marketing headline rendered
            INSIDE the admin chrome as the main content panel. v0.dev /
            Linear / Resend pattern: marketing is product. */}
        <HeroParallaxWrap>
          <LivingOsHero
            cta={
              <StaggerCtas className="flex flex-wrap items-center gap-3">
                <a
                  href="#waitlist"
                  className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition-all duration-150 ease-out"
                  style={{
                    background:
                      "linear-gradient(180deg, #ff8a4c 0%, #ef6c33 100%)",
                    color: "#ffffff",
                    boxShadow:
                      "0 8px 24px -8px rgba(239,108,51,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
                  }}
                >
                  Join the waitlist
                  <span aria-hidden style={{ marginLeft: 2 }}>→</span>
                </a>
                <a
                  href="#how"
                  className="inline-flex items-center gap-2 rounded-md border px-5 py-3 text-sm font-semibold transition-colors"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "#e2e8f0",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  See how it works
                </a>
              </StaggerCtas>
            }
          />
        </HeroParallaxWrap>

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
  return (
    <section id="loom" className="container-page py-20 sm:py-24">
      <SectionDivider />
      <div className="mt-12 flex items-start justify-between gap-8">
        <SectionNumeral n={1} />
      </div>
      <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-12">
        <div>
          <div className="eyebrow eyebrow-rule mb-5">Watch the system run · 4 min</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            A real Monday morning. Six businesses. No standups.
          </h2>
          <p className="mt-5 text-ink-500">
            I open the admin dashboard, the inbox shows me three things to approve, I approve them, the scheduled tasks fire, and by noon every business has shipped something. No team, no project manager, no Notion archaeology. The OS is the manager.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#waitlist" className="btn-primary">
              Join the waitlist →
            </a>
            <a href="#case-studies" className="btn-ghost">
              See the tenants
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-ink-200 bg-paper-50">
          <div className="flex items-center justify-between border-b border-ink-100 bg-paper-100 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-ink-200" />
              <span className="h-2 w-2 rounded-sm bg-ink-200" />
              <span className="h-2 w-2 rounded-sm bg-ink-200" />
            </div>
            <div className="font-mono text-xs text-ink-400">loom · day14-os demo</div>
            <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ember-600">
              <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
              4 min
            </div>
          </div>
          <div className="relative aspect-[16/9] w-full">
            {LOOM_EMBED_URL ? (
              <iframe
                src={LOOM_EMBED_URL}
                title="Day14 OS — 4-minute demo"
                loading="lazy"
                allow="fullscreen"
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400">
                    Loom · ready to embed
                  </div>
                  <p className="mt-3 max-w-sm text-sm text-ink-500">
                    Demo recording in progress. Paste the Loom share URL into{" "}
                    <code className="rounded bg-paper-100 px-1.5 py-0.5 font-mono text-xs text-ink">
                      LOOM_EMBED_URL
                    </code>{" "}
                    in <code className="font-mono text-xs">page.tsx</code>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Case studies — three tenants                                                */
/* -------------------------------------------------------------------------- */

function CaseStudies() {
  return (
    <section id="case-studies" className="border-t border-ink-100 py-20 sm:py-24">
      <div className="container-page">
        <SectionDivider />
        <div className="mt-12">
          <SectionNumeral n={2} />
        </div>
        <SectionHead
          eyebrow="Three tenants, three businesses, one OS"
          title="Live, running, taking real money."
          lead={
            <>
              The OS is multi-tenant from the metal up. These three businesses share the same admin app, the same inbox, and the same evidence verifier. They look like three companies because they are.
            </>
          }
        />

        {/* OS-at-center visual centerpiece — six tenants orbiting Day14. */}
        <div className="mt-14 mb-6 flex justify-center">
          <OrbitDiagram />
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {OS_CASE_STUDIES.map((cs) => (
            <TintedCaseCard
              key={cs.slug}
              tint={cs.slug as "alignmd" | "hot-flash-co" | "life-loophole"}
            >
              <article className="relative flex flex-col overflow-hidden rounded-[10px]">
                <span className="absolute inset-x-0 top-0 z-10 h-0.5 w-full bg-ember-500/30" />
                {/* Cinematic per-tenant image header — Gemini-rendered
                    editorial atmosphere keyed to each brand. Top of card,
                    16:10 banner. Subtle dark-bottom scrim lets the card
                    body's text breathe against the image edge. */}
                <div className="relative w-full" style={{ aspectRatio: "16 / 10" }}>
                  <CinematicImage
                    src={cs.image}
                    alt={cs.imageAlt}
                    treatment="card"
                    position="center"
                  />
                </div>
                <div className="flex flex-1 flex-col p-7">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs font-bold uppercase tracking-widest text-ember-600">
                      {cs.name}
                    </div>
                    <StatePill state={cs.state} />
                  </div>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tightest text-ink">
                    {cs.vertical}
                  </h3>
                  <p className="mt-4 text-sm text-ink-500">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
                      Screenshot
                    </span>
                    <br />
                    {cs.screenshot}
                  </p>
                  <p className="mt-5 text-sm font-semibold text-ink">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ember-600">
                      Result
                    </span>
                    <br />
                    {cs.result}
                  </p>
                </div>
              </article>
            </TintedCaseCard>
          ))}
        </div>

        <p className="mt-10 font-mono text-xs uppercase tracking-widest text-ink-400">
          Same OS. Same inbox. Same evidence verifier. Three completely different businesses.
        </p>
      </div>
    </section>
  );
}

function StatePill({ state }: { state: "Live" | "Preview" | "Internal" }) {
  const config = {
    Live: { dot: "bg-shipped-500", label: "Live" },
    Preview: { dot: "bg-ember-500", label: "Preview" },
    Internal: { dot: "bg-ink-300", label: "Internal" },
  }[state];
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-500">
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* How it works — 3 steps                                                      */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  return (
    <section id="how" className="border-t border-ink-100 bg-paper-50 py-20 sm:py-24">
      <div className="container-page">
        <SectionDivider />
        <div className="mt-12">
          <SectionNumeral n={3} />
        </div>
        <SectionHead
          eyebrow="How the OS actually works"
          title="Three primitives. Everything else is a consequence."
        />

        {/* Each step pairs the narrative card with a live-typing terminal so
            "how it works" feels like product, not marketing copy. */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {OS_STEPS.map((s, i) => {
            const terminalLines = [
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
            ][i] ?? [];
            return (
              <div key={s.n} className="flex flex-col gap-4">
                {/* No image in this section — the narrative card + the
                    animated terminal IS the visual. The terminal carries
                    enough atmosphere on its own (typing cursor, macOS
                    chrome, ember accent) that an illustration above it
                    just competed for attention. */}
                <div className="relative flex flex-col rounded-xl border border-ink-100 bg-paper p-7 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)]">
                  <span className="absolute inset-x-0 top-0 h-0.5 w-12 bg-ember-500" />
                  <div className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-ember-600 tnum">
                    {s.n}
                  </div>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tightest text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-4 text-sm text-ink-500">{s.body}</p>
                </div>
                <TerminalSnippet
                  title={`step ${s.n}`}
                  lines={terminalLines}
                />
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
  return (
    <section id="pricing" className="border-t border-ink-100 py-20 sm:py-24">
      <div className="container-page">
        <SectionDivider />
        <div className="mt-12">
          <SectionNumeral n={4} />
        </div>
        <SectionHead
          eyebrow="Founder pricing — open until 100 signups"
          title="Three tiers. Pick one."
          lead={
            <>
              Founder pricing locks for the first 100 signups. After that the Founder tier closes; Portfolio becomes the top public tier.
            </>
          }
        />

        <div className="mt-12 grid border-l border-t border-ink-200 md:grid-cols-3">
          {OS_TIERS.map((tier) => (
            <article
              key={tier.name}
              className={cn(
                "relative flex flex-col border-b border-r border-ink-200 p-7",
                // Soft hover lift + shadow — keeps the brutalist border but adds an
                // affordance that this is a choice point, not a static spec sheet.
                "transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-xl",
                tier.popular ? "bg-ink text-paper motion-safe:hover:shadow-ember-300/30" : "bg-paper",
              )}
            >
              {tier.popular ? (
                <div className="absolute right-0 top-0 bg-ember-500 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
                  Built for this shape
                </div>
              ) : null}

              <h3
                className={cn(
                  "text-2xl font-extrabold tracking-tightest",
                  tier.popular ? "text-paper" : "text-ink",
                )}
              >
                {tier.name}
              </h3>
              <p
                className={cn(
                  "mt-1 font-mono text-xs uppercase tracking-widest",
                  tier.popular ? "text-paper-300" : "text-ink-400",
                )}
              >
                {tier.tenants}
              </p>

              <div className="mt-6 flex items-baseline gap-1 tnum">
                <span
                  className={cn(
                    "text-4xl font-extrabold tracking-tightest",
                    tier.popular ? "text-paper" : "text-ink",
                  )}
                >
                  {tier.price}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    tier.popular ? "text-paper-300" : "text-ink-400",
                  )}
                >
                  {tier.cadence}
                </span>
              </div>

              <a
                href="#waitlist"
                className={cn(
                  "mt-6 w-full",
                  tier.popular ? "btn-ember" : "btn-primary",
                )}
              >
                Join the waitlist
              </a>

              <div
                className={cn(
                  "my-7 h-px w-full",
                  tier.popular ? "bg-paper-200/20" : "bg-ink-100",
                )}
              />

              <div
                className={cn(
                  "mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em]",
                  tier.popular ? "text-ember-300" : "text-ember-600",
                )}
              >
                Best for
              </div>
              <p
                className={cn(
                  "text-sm",
                  tier.popular ? "text-paper-200" : "text-ink-500",
                )}
              >
                {tier.bestFor}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-10 font-mono text-xs uppercase tracking-widest text-ink-400">
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
  return (
    <section
      id="waitlist"
      className="border-t border-ink-100 bg-paper-50 py-20 sm:py-24"
    >
      <div className="container-page">
        <SectionDivider />
        <div className="mt-12 mb-6">
          <SectionNumeral n={5} />
        </div>
        <div className="grid items-start gap-10 md:grid-cols-[1fr_1fr] md:gap-16">
          <div>
            <div className="eyebrow eyebrow-rule mb-5">The 24-hour signal</div>
            <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.5rem] sm:leading-[1.05]">
              I&rsquo;m opening the waitlist today. The signal closes Sunday.
            </h2>
            <p className="mt-5 text-ink-500">
              If 50+ operators want this by Sunday at 14:00 EDT, I start onboarding next week. If fewer, I refocus on the strongest tenant and the OS stays private tooling. Either answer is useful. The point of the waitlist is to find out.
            </p>
          </div>

          <div className="rounded-lg border border-ink-200 bg-paper p-7">
            <div className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-ember-600">
              Day14 OS · waitlist
            </div>
            <h3 className="mt-2 text-xl font-extrabold tracking-tightest text-ink">
              One email, Sunday.
            </h3>
            <p className="mt-2 text-sm text-ink-500">
              I&rsquo;ll send one email Sunday with where the signal landed, and maybe one more on launch day. That&rsquo;s the whole sequence.
            </p>
            <div className="mt-5">
              <WaitlistForm />
            </div>
            <p className="mt-3 font-mono text-[11px] text-ink-400">
              No drip campaign. No upsell. Unsubscribe is a one-click reply.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer CTA — legacy 14-day SKU link preserved                               */
/* -------------------------------------------------------------------------- */

function FooterCta() {
  return (
    <section className="border-t border-ink-100 py-20 sm:py-24">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-lg border border-ink-700 bg-ink p-10 text-paper sm:p-14">
          {/* Cinematic ember-filament macro backdrop — Gemini-rendered
              circuit-board-vein-of-fire image. Scrim treatment vignettes the
              edges so the dark slab and headline still dominate. */}
          <CinematicImage
            src="/images/landing/footer-circuit.png"
            alt=""
            treatment="scrim"
            position="center"
          />
          <div className="grid-lines-dark absolute inset-0 [mask-image:radial-gradient(600px_360px_at_15%_0%,#000,transparent_75%)]" />
          <div className="relative z-10 grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="eyebrow eyebrow-rule mb-5 text-ember-300">
                The day-job, still on offer
              </div>
              <h2 className="text-3xl font-extrabold tracking-tightest text-paper sm:text-[2.5rem] sm:leading-[1.05]">
                Want a single 14-day build instead? That offer still stands.
              </h2>
              <p className="mt-5 max-w-xl text-paper-200">
                The build studio that funded Day14 OS is still taking three customers a month. Fixed-price 14-day platforms — site, portal, admin app, billing. Same operator, same agents, different deliverable.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/work-with-us" className="btn-ember w-full justify-center text-base">
                See the 14-day SKUs →
              </Link>
              <a
                href={`mailto:${SITE.email}`}
                className="inline-flex w-full items-center justify-center rounded-sm border border-paper-200/30 px-5 py-3 text-sm font-semibold text-paper transition-colors hover:border-paper-200/60 hover:bg-paper/5"
              >
                Or email {SITE.email}
              </a>
              <div className="mt-2 text-center font-mono text-xs uppercase tracking-widest text-paper-300/70">
                Three slots open this month
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
