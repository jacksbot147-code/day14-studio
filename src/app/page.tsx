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
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <HeroAurora />
      <div className="container-page pt-14 pb-20 sm:pt-24 sm:pb-28">
        <div className="eyebrow mb-6">
          <span className="relative inline-block h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-ember-500" />
            <span className="absolute -inset-1 animate-ping rounded-full bg-ember-500/40" />
          </span>
          A one-operator build studio · {SITE.location}
        </div>

        <h1 className="max-w-4xl text-[44px] font-extrabold leading-[1.04] tracking-tightest text-ink sm:text-[64px] lg:text-[76px]">
          Real business platforms,{" "}
          <span className="text-aurora">owned by you</span>.
          <br className="hidden sm:block" />{" "}
          Built in <span className="tnum">14 days</span>.
        </h1>

        <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
          {PITCH.oneLiner}
        </p>

        <p className="mt-3 max-w-2xl text-base text-ink-400 sm:text-lg">
          {PITCH.vsSaaS}
        </p>

        <p className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-500">
          <span>We ship</span>
          <span className="inline-flex items-baseline rounded border border-ink-200 bg-paper-50 px-2 py-1 normal-case tracking-normal text-sm font-semibold text-ember-600">
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

        <div className="mt-12 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-5 text-sm sm:grid-cols-4">
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
    <div>
      <div className="font-mono text-xs uppercase tracking-[0.18em] text-ink-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tracking-tightest text-ink tnum">
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
    <section className="container-page pb-20">
      <div className="rule mb-12" />
      <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
        <div>
          <div className="eyebrow mb-4">The proof</div>
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

        <div className="overflow-hidden rounded-lg border border-ink-100 bg-paper-50">
          <div className="flex items-center justify-between border-b border-ink-100 bg-paper-100 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
            </div>
            <div className="font-mono text-xs text-ink-400">
              splashjackspools.com
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-shipped-600">
              ● Live
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
    <section id="verticals" className="container-page py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">Who we build for</div>
        <h2 className="text-4xl font-extrabold tracking-tightest text-ink sm:text-5xl">
          Three kinds of business. One playbook.
        </h2>
        <p className="mt-5 text-ink-500">
          We&rsquo;ve productized the build for three customer shapes. If your
          business looks like one of these, we already know the stack, the
          pitfalls, and the launch path. If it doesn&rsquo;t, we&rsquo;ll tell
          you on the call.
        </p>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {VERTICALS.map((v) => (
          <Link
            key={v.slug}
            href={`/verticals/${v.slug}`}
            className="card-pop flex h-full flex-col"
          >
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-ember-600">
              {v.shortName}
            </div>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tightest text-ink">
              {v.name}
            </h3>
            <p className="mt-3 text-sm text-ink-500">{v.tagline}</p>

            <div className="eyebrow mb-2 mt-6">A few examples</div>
            <ul className="flex flex-wrap gap-1.5">
              {v.examples.slice(0, 5).map((ex) => (
                <li
                  key={ex}
                  className="rounded border border-ink-100 bg-paper-100 px-2 py-0.5 text-xs text-ink-600"
                >
                  {ex}
                </li>
              ))}
              {v.examples.length > 5 ? (
                <li className="rounded border border-ink-100 bg-paper-100 px-2 py-0.5 text-xs text-ink-400">
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
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* SKU pricing cards                                                          */
/* -------------------------------------------------------------------------- */

function SkuSection() {
  return (
    <section id="sku" className="border-y border-ink-100 bg-paper-50/60 py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4 justify-center">Three SKUs, fixed prices</div>
          <h2 className="text-4xl font-extrabold tracking-tightest text-ink sm:text-5xl">
            Sign on Tuesday. Live by the second Friday — or your deposit refunds.
          </h2>
          <p className="mt-5 text-ink-500">
            No &ldquo;let me get back to you with a quote.&rdquo; Productized scope, productized price.
            Anything outside the SKU is $200/hr or rolls into a Platform upgrade.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {SKUS.map((sku) => (
            <article
              key={sku.id}
              className={cn(
                "relative flex flex-col rounded-lg border bg-paper p-7 transition",
                sku.popular
                  ? "border-ink shadow-lift"
                  : "border-ink-100 hover:border-ink-200",
              )}
            >
              {sku.popular ? (
                <div className="absolute -top-3 left-7 rounded bg-ember-500 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-white">
                  Most popular
                </div>
              ) : null}

              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-extrabold tracking-tightest text-ink">
                  {sku.name}
                </h3>
                <div className="font-mono text-xs uppercase tracking-widest text-ink-400">
                  ships in {sku.shipsIn}
                </div>
              </div>

              <p className="mt-2 text-sm text-ink-500">{sku.blurb}</p>

              <div className="mt-6 flex items-baseline gap-1.5 tnum">
                <span className="text-4xl font-extrabold tracking-tightest text-ink">
                  ${sku.oneTime.toLocaleString()}
                </span>
                <span className="text-sm font-medium text-ink-400">one-time</span>
              </div>
              <div className="mt-1 font-mono text-xs text-ink-400 tnum">
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

              <div className="rule my-7" />

              <div className="eyebrow mb-3">Best for</div>
              <p className="text-sm text-ink-500">{sku.bestFor}</p>

              <div className="eyebrow mb-3 mt-6">What&rsquo;s in it</div>
              <ul className="space-y-2.5 text-sm text-ink-700">
                {sku.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center font-mono text-xs uppercase tracking-widest text-ink-400">
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
    <section id="how" className="container-page py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">How it works</div>
        <h2 className="text-4xl font-extrabold tracking-tightest text-ink sm:text-5xl">
          14 days, end to end.
        </h2>
        <p className="mt-5 text-ink-500">
          Every project runs the same playbook. No surprises, no scope creep, no
          standing meetings.
        </p>
      </div>

      <ol className="mt-14 space-y-1.5">
        {TIMELINE.map((step, i) => (
          <li
            key={step.day}
            className="grid items-start gap-5 rounded-lg border border-ink-100 bg-paper-50 p-5 sm:grid-cols-[140px_1fr_2fr] sm:gap-8 sm:p-6"
          >
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-ember-600 tnum">
              {step.day}
            </div>
            <div className="text-lg font-bold tracking-tightest text-ink">
              {step.title}
            </div>
            <div className="text-ink-500">{step.body}</div>
            {/* Index for visual rhythm — not numbered in the data so we hide
                this on small screens to save space. */}
            <span aria-hidden className="hidden text-right font-mono text-xs text-ink-300 tnum sm:block">
              {String(i + 1).padStart(2, "0")} / {String(TIMELINE.length).padStart(2, "0")}
            </span>
          </li>
        ))}
      </ol>
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
    <section className="border-y border-ink-100 bg-paper-50/60 py-12">
      <div className="container-page text-center">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ink-400">
          Same stack as Vercel, Linear, Cash App
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-lg font-semibold tracking-tight text-ink-300">
          {STACK.map((name) => (
            <span key={name} className="transition hover:text-ink">
              {name}
            </span>
          ))}
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
    <section id="now-building" className="container-page py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">
          <span className="relative inline-block h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-ember-500" />
            <span className="absolute -inset-1 animate-ping rounded-full bg-ember-500/40" />
          </span>
          Now building · public from day one
        </div>
        <h2 className="text-4xl font-extrabold tracking-tightest text-ink sm:text-5xl">
          Watch a 14-day build, in real time.
        </h2>
        <p className="mt-5 text-ink-500">
          Every active customer build is on a public page from Day 1. Day-by-day
          commits, the same EOD update the customer gets, the preview URL once
          it&rsquo;s live. No agency does this.
        </p>
      </div>

      {inProgress.length === 0 ? (
        <div className="mx-auto mt-12 max-w-2xl rounded-lg border border-dashed border-ink-200 bg-paper-50 p-8 text-center">
          <p className="text-ink-500">
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
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {inProgress.map((b) => (
              <NowBuildingCard key={b.slug} build={b} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/builds"
              className="font-mono text-xs uppercase tracking-widest text-ink-500 transition hover:text-ink"
            >
              See the full build log →
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

function NowBuildingCard({ build }: { build: Build }) {
  const day = dayOfFourteen(build);
  const verticalLabel =
    build.vertical === "custom" ? "Custom" : build.vertical.replace("-", " ");
  return (
    <Link href={`/builds/${build.slug}`} className="card-pop block">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs uppercase tracking-widest text-ember-600">
          {build.sku} · {verticalLabel}
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-500">
          <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
          In progress
        </span>
      </div>
      <h3 className="mt-3 text-2xl font-extrabold tracking-tightest text-ink">
        {build.customerName}
      </h3>
      <div className="mt-1 font-mono text-xs uppercase tracking-widest text-ink-400 tnum">
        Day {day} of 14
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
    <section id="case-studies" className="container-page py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">Three live builds, three SKUs</div>
        <h2 className="text-4xl font-extrabold tracking-tightest text-ink sm:text-5xl">
          The work, on the public internet.
        </h2>
        <p className="mt-5 text-ink-500">
          A service-business platform, a brand-heavy event site, and a two-sided
          marketplace — all shipped, all live, all examples of what Day14 builds
          inside the standard SKUs.
        </p>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {CASE_STUDIES.map((cs) => (
          <Link
            key={cs.slug}
            href={`/case-studies/${cs.slug}`}
            className="card-pop block"
          >
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs uppercase tracking-widest text-ember-600">
                {cs.sku}
              </div>
              <StatePill state={cs.state} />
            </div>
            <h3 className="mt-3 text-2xl font-extrabold tracking-tightest text-ink">
              {cs.name}
            </h3>
            <p className="mt-1 text-sm text-ink-400">{cs.industry}</p>
            <p className="mt-4 text-sm text-ink-500">{cs.summary}</p>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">
                Read the case study →
              </span>
              {cs.url ? (
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
                  {new URL(cs.url).host}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-12 text-center font-mono text-xs uppercase tracking-widest text-ink-400">
        Your business is the fourth. Three slots open this month.
      </p>
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
    <section id="faq" className="border-t border-ink-100 bg-paper-50/60 py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4 justify-center">Frequently asked</div>
          <h2 className="text-4xl font-extrabold tracking-tightest text-ink sm:text-5xl">
            The twelve questions every small-business owner asks.
          </h2>
        </div>

        <div className="mx-auto mt-14 max-w-3xl space-y-3">
          {FAQ.map((item, i) => (
            <details
              key={item.q}
              className="group rounded-lg border border-ink-100 bg-paper p-5 open:border-ink-200 sm:p-6"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-xs text-ink-400 tnum">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="ml-3 text-lg font-semibold tracking-tight text-ink">
                    {item.q}
                  </span>
                </div>
                <span
                  aria-hidden
                  className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded border border-ink-200 font-mono text-sm text-ink-500 transition group-open:rotate-45 group-open:border-ember-500 group-open:text-ember-500"
                >
                  +
                </span>
              </summary>
              <div className="mt-3 pl-10 text-ink-500">{item.a}</div>
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
    <section className="container-page py-24">
      <div className="overflow-hidden rounded-xl bg-ink p-10 text-paper sm:p-16">
        <div className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="eyebrow mb-5 text-ember-300">Talk to a builder</div>
            <h2 className="text-4xl font-extrabold tracking-tightest sm:text-5xl">
              30 minutes. No deck. Just the live demo and a fixed price.
            </h2>
            <p className="mt-5 max-w-xl text-paper-200">
              We pull up splashjackspools.com on the call, you tell us your
              business, we tell you which SKU fits and what we&rsquo;d ship in 14
              days. If it&rsquo;s not a fit we say so on the call.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a href={SITE.bookingUrl} className="btn-ember w-full justify-center text-base">
              Book a 30-min intro call
            </a>
            <a
              href={`mailto:${SITE.email}`}
              className="inline-flex w-full items-center justify-center rounded border border-paper-200/40 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-paper/10"
            >
              Or email {SITE.email}
            </a>
            <div className="mt-2 text-center font-mono text-xs uppercase tracking-widest text-paper-300/60">
              Three slots open this month
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
