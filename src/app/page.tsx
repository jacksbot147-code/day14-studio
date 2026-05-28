import type { ReactNode } from "react";
import Link from "next/link";
import { SITE, PITCH, SKUS, STATS, TIMELINE, FAQ, CASE_STUDIES, VERTICALS } from "@/lib/site";
import { BUILDS, dayOfFourteen, type Build } from "@/lib/builds";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/cn";
import { ScrollFade } from "@/components/motion/scroll-fade";
import { CountUp } from "@/components/motion/count-up";
import { CyclingWord } from "@/components/motion/cycling-word";
import { HeroAurora } from "@/components/motion/hero-aurora";
import { DeployStrip } from "@/components/deploy-strip";

const SHIP_CYCLE = [
  "marketing sites",
  "customer portals",
  "admin apps",
  "billing flows",
  "AI chatbots",
  "SMS reminders",
  "photo-proof pipelines",
  "the whole stack",
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <DeployStrip />
        <ScrollFade><LiveDemo /></ScrollFade>
        <ScrollFade><Verticals /></ScrollFade>
        <ScrollFade><SkuSection /></ScrollFade>
        <ScrollFade><HowItWorks /></ScrollFade>
        <TrustStrip />
        <ScrollFade><NowBuilding /></ScrollFade>
        <ScrollFade><CaseStudies /></ScrollFade>
        <ScrollFade><FaqSection /></ScrollFade>
        <ScrollFade><FinalCta /></ScrollFade>
      </main>
      <SiteFooter />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Section heading — editorial: eyebrow-rule, big display title, lead          */
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
/* Hero — asymmetric, line-framed, dramatic editorial type                    */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="grain relative isolate overflow-hidden border-b border-ink-100">
      <HeroAurora />
      <div className="container-page pt-14 pb-20 sm:pt-24 sm:pb-28">
        <div className="eyebrow mb-7">
          <span className="relative inline-block h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-ember-500" />
            <span className="absolute -inset-1 animate-ping rounded-full bg-ember-500/40" />
          </span>
          A one-operator build studio · {SITE.location}
        </div>

        <h1 className="max-w-4xl text-[2.75rem] font-extrabold leading-[1.0] tracking-tightest text-ink sm:text-[64px] lg:text-[78px]">
          <span className="hero-phrase" style={{ animationDelay: "0ms" }}>
            Real business platforms,
          </span>{" "}
          <span className="hero-phrase" style={{ animationDelay: "140ms" }}>
            <span className="marker text-ink">owned by you</span>.
          </span>
          <br className="hidden sm:block" />{" "}
          <span className="hero-phrase" style={{ animationDelay: "280ms" }}>
            Built in <span className="tnum text-ember-600">14 days</span>.
          </span>
        </h1>

        <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
          {PITCH.oneLiner}
        </p>

        <p className="mt-3 max-w-2xl text-base text-ink-400 sm:text-lg">
          {PITCH.vsSaaS}
        </p>

        <p className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-500">
          <span>We ship</span>
          <span className="inline-flex items-baseline rounded-sm border border-ink-200 bg-paper-50 px-2 py-1 normal-case tracking-normal text-sm font-semibold text-ember-600">
            <CyclingWord words={SHIP_CYCLE} />
          </span>
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <a href={SITE.bookingUrl} className="btn-ember">
            Book a 30-min intro call
          </a>
          <a href="#sku" className="btn-ghost">
            See what we build →
          </a>
        </div>

        {/* Proof strip — a true bordered grid divided by internal rules. */}
        <div className="mt-14 grid max-w-3xl grid-cols-2 border-l border-t border-ink-100 sm:grid-cols-4">
          <Stat
            label="Avg actual ship"
            value={
              <>
                <CountUp to={STATS.avgShipDays} /> days
              </>
            }
          />
          <Stat
            label="Guaranteed by"
            value={
              <>
                day <CountUp to={STATS.guaranteeDays} />
              </>
            }
          />
          <Stat
            label="Live builds"
            value={<CountUp to={STATS.liveBuilds} />}
          />
          <Stat
            label="Starting at"
            value={
              <>
                $<CountUp to={STATS.startingPriceUsd} />
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
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
/* Live demo embed                                                            */
/* -------------------------------------------------------------------------- */

function LiveDemo() {
  return (
    <section className="container-page py-20 sm:py-24">
      <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-12">
        <div>
          <div className="eyebrow eyebrow-rule mb-5">The proof</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            A real customer build. Live, public, taking payments.
          </h2>
          <p className="mt-5 text-ink-500">
            Splash Jacks Pools is customer #0. Full marketing site, SEO city
            pages, AI chatbot, customer portal with self-reschedule, operator
            admin app with route scheduler and photo proof, Stripe billing
            end-to-end. Two weeks, one operator. Go poke around.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="https://splashjackspools.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Open splashjackspools.com ↗
            </a>
            <Link
              href="/case-studies/splash-jacks-pools"
              className="btn-ghost"
            >
              Read the case study
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-ink-200 bg-paper-50">
          <div className="flex items-center justify-between border-b border-ink-100 bg-paper-100 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-ink-200" />
              <span className="h-2 w-2 rounded-sm bg-ink-200" />
              <span className="h-2 w-2 rounded-sm bg-ink-200" />
            </div>
            <div className="font-mono text-xs text-ink-400">
              splashjackspools.com
            </div>
            <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-shipped-600">
              <span className="h-1.5 w-1.5 rounded-full bg-shipped-500" />
              Live
            </div>
          </div>
          <div className="relative aspect-[4/3] w-full">
            {/*
              Embedded iframe of the live customer build. Some sites set
              X-Frame-Options / CSP that block embedding — if Splash Jacks
              denies framing we fall through to the link above.
            */}
            <iframe
              src="https://splashjackspools.com"
              title="Splash Jacks Pools — live customer build"
              loading="lazy"
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Verticals — who we build for                                               */
/* -------------------------------------------------------------------------- */

function Verticals() {
  return (
    <section id="verticals" className="border-t border-ink-100 py-20 sm:py-24">
      <div className="container-page">
        <SectionHead
          eyebrow="Who we build for"
          title="Three kinds of business. One playbook."
          lead={
            <>
              We&rsquo;ve productized the build for three customer shapes. If
              your business looks like one of these, we already know the stack,
              the pitfalls, and the launch path. If it doesn&rsquo;t, we&rsquo;ll
              tell you on the call.
            </>
          }
        />

        {/* True bordered grid — divided by internal rules, not floating cards. */}
        <div className="mt-12 grid border-l border-t border-ink-100 md:grid-cols-3">
          {VERTICALS.map((v) => (
            <Link
              key={v.slug}
              href={`/verticals/${v.slug}`}
              className="group relative flex h-full flex-col border-b border-r border-ink-100 bg-paper-50 p-7 transition-[background-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-paper-100 motion-reduce:transform-none motion-reduce:hover:translate-y-0"
            >
              <span className="absolute inset-x-0 top-0 h-0.5 w-0 bg-ember-500 transition-all duration-200 group-hover:w-full" />
              <div className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-ember-600">
                {v.shortName}
              </div>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tightest text-ink">
                {v.name}
              </h3>
              <p className="mt-3 text-sm text-ink-500">{v.tagline}</p>

              <div className="eyebrow mb-2 mt-6 text-[10px]">A few examples</div>
              <ul className="flex flex-wrap gap-1.5">
                {v.examples.slice(0, 5).map((ex) => (
                  <li
                    key={ex}
                    className="rounded-sm border border-ink-100 bg-paper px-2 py-0.5 text-xs text-ink-600"
                  >
                    {ex}
                  </li>
                ))}
                {v.examples.length > 5 ? (
                  <li className="rounded-sm border border-ink-100 bg-paper px-2 py-0.5 text-xs text-ink-400">
                    +{v.examples.length - 5} more
                  </li>
                ) : null}
              </ul>

              <div className="mt-auto pt-6 text-sm font-semibold text-ink">
                See what we build for {v.shortName.toLowerCase()} →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* SKU pricing cards                                                          */
/* -------------------------------------------------------------------------- */

function SkuSection() {
  return (
    <section id="sku" className="border-y border-ink-100 bg-paper-50 py-20 sm:py-24">
      <div className="container-page">
        <SectionHead
          eyebrow="Three SKUs, fixed prices"
          title="Sign on Tuesday. Live by the second Friday — or your deposit refunds."
          lead={
            <>
              No &ldquo;let me get back to you with a quote.&rdquo; Productized
              scope, productized price. Anything outside the SKU is $200/hr or
              rolls into a Platform upgrade.
            </>
          }
        />

        {/* Bordered pricing grid — one continuous frame, divided by rules. */}
        <div className="mt-12 grid border-l border-t border-ink-200 md:grid-cols-3">
          {SKUS.map((sku) => (
            <article
              key={sku.id}
              className={cn(
                "relative flex flex-col border-b border-r border-ink-200 p-7",
                sku.popular ? "bg-ink text-paper" : "bg-paper",
              )}
            >
              {sku.popular ? (
                <div className="absolute right-0 top-0 bg-ember-500 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
                  Most popular
                </div>
              ) : null}

              <div className="flex items-baseline justify-between gap-3">
                <h3
                  className={cn(
                    "text-2xl font-extrabold tracking-tightest",
                    sku.popular ? "text-paper" : "text-ink",
                  )}
                >
                  {sku.name}
                </h3>
                <div
                  className={cn(
                    "font-mono text-xs uppercase tracking-widest",
                    sku.popular ? "text-paper-300" : "text-ink-400",
                  )}
                >
                  ships in {sku.shipsIn}
                </div>
              </div>

              <p
                className={cn(
                  "mt-2 text-sm",
                  sku.popular ? "text-paper-200" : "text-ink-500",
                )}
              >
                {sku.blurb}
              </p>

              <div className="mt-6 flex items-baseline gap-1.5 tnum">
                <span
                  className={cn(
                    "text-4xl font-extrabold tracking-tightest",
                    sku.popular ? "text-paper" : "text-ink",
                  )}
                >
                  ${sku.oneTime.toLocaleString()}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    sku.popular ? "text-paper-300" : "text-ink-400",
                  )}
                >
                  one-time
                </span>
              </div>
              <div
                className={cn(
                  "mt-1 font-mono text-xs tnum",
                  sku.popular ? "text-paper-300" : "text-ink-400",
                )}
              >
                + ${sku.monthly}/mo hosting + maintenance
              </div>

              <a
                href={SITE.bookingUrl}
                className={cn(
                  "mt-6 w-full",
                  sku.popular ? "btn-ember" : "btn-primary",
                )}
              >
                Book intro call
              </a>

              <div
                className={cn(
                  "my-7 h-px w-full",
                  sku.popular ? "bg-paper-200/20" : "bg-ink-100",
                )}
              />

              <div
                className={cn(
                  "mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em]",
                  sku.popular ? "text-ember-300" : "text-ember-600",
                )}
              >
                Best for
              </div>
              <p
                className={cn(
                  "text-sm",
                  sku.popular ? "text-paper-200" : "text-ink-500",
                )}
              >
                {sku.bestFor}
              </p>

              <div
                className={cn(
                  "mb-3 mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.22em]",
                  sku.popular ? "text-ember-300" : "text-ember-600",
                )}
              >
                What&rsquo;s in it
              </div>
              <ul
                className={cn(
                  "space-y-0",
                  sku.popular ? "text-paper-200" : "text-ink-700",
                )}
              >
                {sku.features.map((f) => (
                  <li
                    key={f}
                    className={cn(
                      "flex gap-2.5 border-t py-2.5 text-sm",
                      sku.popular ? "border-paper-200/15" : "border-ink-100",
                    )}
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 bg-ember-500"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="mt-10 font-mono text-xs uppercase tracking-widest text-ink-400">
          50% on signature · 50% on launch · 30-day cancel · you own the code
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* How it works — 14-day timeline                                             */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  return (
    <section id="how" className="border-t border-ink-100 py-20 sm:py-24">
      <div className="container-page">
        <SectionHead
          eyebrow="How it works"
          title="14 days, end to end."
          lead={
            <>
              Every project runs the same playbook. No surprises, no scope
              creep, no standing meetings.
            </>
          }
        />

        {/* Timeline — connected rows divided by hairline rules, no floating. */}
        <ol className="mt-12 border-t border-ink-100">
          {TIMELINE.map((step, i) => (
            <li
              key={step.day}
              className="group relative grid items-baseline gap-3 border-b border-ink-100 py-6 transition-colors hover:bg-paper-50 sm:grid-cols-[150px_minmax(0,1fr)_2fr] sm:gap-8 sm:py-7"
            >
              <span className="absolute inset-y-0 left-0 w-0.5 scale-y-0 bg-ember-500 transition-transform duration-200 group-hover:scale-y-100" />
              <div className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-ember-600 tnum sm:pl-4">
                {step.day}
              </div>
              <div className="text-lg font-bold tracking-tighter text-ink">
                {step.title}
              </div>
              <div className="flex items-baseline gap-6 text-ink-500">
                <span>{step.body}</span>
                <span
                  aria-hidden
                  className="ml-auto hidden shrink-0 font-mono text-xs text-ink-300 tnum sm:block sm:pr-4"
                >
                  {String(i + 1).padStart(2, "0")} / {String(TIMELINE.length).padStart(2, "0")}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Trust strip                                                                */
/* -------------------------------------------------------------------------- */

function TrustStrip() {
  const STACK = [
    "Next.js",
    "TypeScript",
    "Postgres",
    "Stripe",
    "Supabase",
    "Vercel",
    "Anthropic",
  ];
  return (
    <section className="border-y border-ink-100 bg-paper-50 py-12">
      <div className="container-page">
        <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink-400">
            Same stack as
            <br className="hidden sm:block" /> Vercel, Linear, Cash App
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-lg font-bold tracking-tighter text-ink-300 sm:justify-end">
            {STACK.map((name) => (
              <span key={name} className="transition-colors hover:text-ink">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Now building — public build-log teaser                                     */
/* -------------------------------------------------------------------------- */

function NowBuilding() {
  // Show up to 2 in-progress builds; if none, render an empty-state CTA.
  const inProgress = BUILDS.filter((b) => b.status === "in-progress").slice(0, 2);

  return (
    <section id="now-building" className="border-t border-ink-100 py-20 sm:py-24">
      <div className="container-page">
        <SectionHead
          eyebrow={
            <>
              <span className="relative inline-block h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-ember-500" />
                <span className="absolute -inset-1 animate-ping rounded-full bg-ember-500/40" />
              </span>
              Now building · public from day one
            </>
          }
          title="Watch a 14-day build, in real time."
          lead={
            <>
              Every active customer build is on a public page from Day 1.
              Day-by-day commits, the same EOD update the customer gets, the
              preview URL once it&rsquo;s live. No agency does this.
            </>
          }
        />

        {inProgress.length === 0 ? (
          <div className="mt-12 border border-dashed border-ink-200 bg-paper-50 p-10 text-center">
            <p className="mx-auto max-w-md text-ink-500">
              No active builds right now — three slots open this month. Book an
              intro call to claim one.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a href={SITE.bookingUrl} className="btn-ember">
                Book a 30-min intro call
              </a>
              <Link href="/builds" className="btn-ghost">
                See past builds →
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-12 grid border-l border-t border-ink-100 md:grid-cols-2">
              {inProgress.map((b) => (
                <NowBuildingCard key={b.slug} build={b} />
              ))}
            </div>
            <div className="mt-8">
              <Link
                href="/builds"
                className="font-mono text-xs uppercase tracking-widest text-ink-500 transition-colors hover:text-ink"
              >
                See the full build log →
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function NowBuildingCard({ build }: { build: Build }) {
  const day = dayOfFourteen(build);
  const progressPct = Math.min(100, Math.round((day / 14) * 100));
  const verticalLabel =
    build.vertical === "custom" ? "Custom" : build.vertical.replace("-", " ");
  return (
    <Link
      href={`/builds/${build.slug}`}
      className="group relative block border-b border-r border-ink-100 bg-paper-50 p-7 transition-colors hover:bg-paper-100"
    >
      <span
        className="absolute inset-x-0 top-0 h-0.5 bg-ember-500 transition-all duration-300 ease-out group-hover:!w-full"
        style={{ width: `${progressPct}%` }}
      />
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs font-bold uppercase tracking-widest text-ember-600">
          {build.sku} · {verticalLabel}
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-500">
          <span className="relative inline-block h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-ember-500" />
            <span className="absolute -inset-1 animate-ping rounded-full bg-ember-500/40" />
          </span>
          In progress
        </span>
      </div>
      <h3 className="mt-3 text-2xl font-extrabold tracking-tightest text-ink">
        {build.customerName}
      </h3>
      <div className="mt-1 flex items-baseline gap-3 font-mono text-xs uppercase tracking-widest text-ink-400 tnum">
        <span>
          Day <span className="text-ink">{day}</span> of 14
        </span>
        <span className="text-ink-300">·</span>
        <span>{progressPct}% there</span>
      </div>
      <p className="mt-4 text-sm text-ink-500">{build.currentStatus}</p>
      <div className="mt-5 text-sm font-semibold text-ink">
        Read the build log →
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Case studies                                                               */
/* -------------------------------------------------------------------------- */

function CaseStudies() {
  return (
    <section id="case-studies" className="border-t border-ink-100 py-20 sm:py-24">
      <div className="container-page">
        <SectionHead
          eyebrow="Three live builds, three SKUs"
          title="The work, on the public internet."
          lead={
            <>
              A service-business platform, a brand-heavy event site, and a
              two-sided marketplace — all shipped, all live, all examples of
              what Day14 builds inside the standard SKUs.
            </>
          }
        />

        <div className="mt-12 grid border-l border-t border-ink-100 md:grid-cols-3">
          {CASE_STUDIES.map((cs) => (
            <Link
              key={cs.slug}
              href={`/case-studies/${cs.slug}`}
              className="group relative flex flex-col overflow-hidden border-b border-r border-ink-100 bg-paper-50 transition-[background-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-paper-100 motion-reduce:transform-none motion-reduce:hover:translate-y-0"
            >
              <span className="absolute inset-x-0 top-0 z-10 h-0.5 w-0 bg-ember-500 transition-all duration-200 group-hover:w-full" />
              {cs.url ? (
                <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-ink-100 bg-ink-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://image.thum.io/get/width/720/crop/450/png/wait/4/noanimate/${cs.url}`}
                    alt=""
                    loading="lazy"
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover object-top grayscale-[35%] transition duration-500 ease-out group-hover:scale-[1.02] group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-paper-50/40 via-transparent to-transparent transition-opacity duration-300 group-hover:opacity-0" />
                </div>
              ) : null}
              <div className="flex flex-1 flex-col p-7">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs font-bold uppercase tracking-widest text-ember-600">
                    {cs.sku}
                  </div>
                  <StatePill state={cs.state} />
                </div>
                <h3 className="mt-3 text-2xl font-extrabold tracking-tightest text-ink">
                  {cs.name}
                </h3>
                <p className="mt-1 text-sm text-ink-400">{cs.industry}</p>
                <p className="mt-4 text-sm text-ink-500">{cs.summary}</p>
                <div className="mt-auto flex items-center justify-between pt-5">
                  <span className="text-sm font-semibold text-ink">
                    Read the case study →
                  </span>
                  {cs.url ? (
                    <span className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
                      {new URL(cs.url).host}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-10 font-mono text-xs uppercase tracking-widest text-ink-400">
          Your business is the fourth. Three slots open this month.
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
/* FAQ                                                                        */
/* -------------------------------------------------------------------------- */

function FaqSection() {
  return (
    <section id="faq" className="border-t border-ink-100 bg-paper-50 py-20 sm:py-24">
      <div className="container-page">
        <SectionHead
          eyebrow="Frequently asked"
          title="The twelve questions every small-business owner asks."
        />

        {/* Accordion — a continuous list divided by hairline rules. */}
        <div className="mt-12 border-t border-ink-100">
          {FAQ.map((item, i) => (
            <details
              key={item.q}
              className="group border-b border-ink-100 open:bg-paper"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5">
                <div>
                  <span className="font-mono text-xs text-ink-400 tnum">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="ml-3 text-lg font-bold tracking-tighter text-ink">
                    {item.q}
                  </span>
                </div>
                <span
                  aria-hidden
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-sm border border-ink-200 font-mono text-sm text-ink-500 transition group-open:rotate-45 group-open:border-ember-500 group-open:bg-ember-500 group-open:text-white"
                >
                  +
                </span>
              </summary>
              <div className="pb-5 pl-9 pr-10 text-ink-500">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Final CTA                                                                  */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="border-t border-ink-100 py-20 sm:py-24">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-lg border border-ink-700 bg-ink p-10 text-paper sm:p-14">
          <div className="grid-lines-dark absolute inset-0 [mask-image:radial-gradient(600px_360px_at_15%_0%,#000,transparent_75%)]" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="eyebrow eyebrow-rule mb-5 text-ember-300">
                Talk to a builder
              </div>
              <h2 className="text-3xl font-extrabold tracking-tightest text-paper sm:text-[2.75rem] sm:leading-[1.03]">
                30 minutes. No deck. Just the live demo and a fixed price.
              </h2>
              <p className="mt-5 max-w-xl text-paper-200">
                We pull up splashjackspools.com on the call, you tell us your
                business, we tell you which SKU fits and what we&rsquo;d ship in
                14 days. If it&rsquo;s not a fit we say so on the call.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href={SITE.bookingUrl}
                className="btn-ember w-full justify-center text-base"
              >
                Book a 30-min intro call
              </a>
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
