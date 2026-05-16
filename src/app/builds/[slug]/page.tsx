import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";
import {
  BUILDS,
  dayOfFourteen,
  formatBuildDate,
  getBuildBySlug,
  type Build,
} from "@/lib/builds";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import type { BuildStatus } from "@/lib/builds";

/**
 * Local copy of the build-status pill — kept duplicated here rather than
 * imported from the index page so route files don't import each other.
 * If a third surface needs it, lift to `@/components/build-status-pill`.
 */
function BuildStatusPill({ status }: { status: BuildStatus }) {
  const config = {
    "in-progress": { dot: "bg-ember-500", label: "In progress" },
    shipped: { dot: "bg-shipped-500", label: "Shipped" },
    paused: { dot: "bg-ink-300", label: "Paused" },
  }[status];
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-500">
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return BUILDS.map((b) => ({ slug: b.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const build = getBuildBySlug(params.slug);
  if (!build) return { title: "Build not found" };
  return {
    title: `${build.customerName} — build log`,
    description: `Day-by-day public build log for ${build.customerName}: ${build.sku} tier, shipped or shipping in 14 days.`,
  };
}

export default function BuildDetailPage({ params }: { params: Params }) {
  const build = getBuildBySlug(params.slug);
  if (!build) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <Header build={build} />
        <Timeline build={build} />
        <NowShowing build={build} />
        <StackBlock build={build} />
        <WhyThisMatters />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

function Header({ build }: { build: Build }) {
  const day = dayOfFourteen(build);
  const verticalLabel =
    build.vertical === "custom" ? "Custom" : build.vertical.replace("-", " ");
  const ship =
    build.actualShipDate ?? build.targetShipDate;

  return (
    <section className="container-page pt-14 pb-12 sm:pt-20">
      <Link
        href="/builds"
        className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-ink-400 transition hover:text-ink"
      >
        ← All builds
      </Link>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-400">
        <span className="text-ember-600">{build.sku}</span>
        <span className="h-1 w-1 rounded-full bg-ink-200" />
        <span>{verticalLabel}</span>
        <span className="h-1 w-1 rounded-full bg-ink-200" />
        <span>
          {build.status === "shipped" ? "Shipped" : "Target ship"} {formatBuildDate(ship)}
        </span>
      </div>

      <h1 className="mt-5 max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
        {build.customerName}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <BuildStatusPill status={build.status} />
        <span className="inline-flex items-center rounded border border-ink-200 bg-paper-50 px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-ink tnum">
          Day {day} of 14
        </span>
      </div>

      <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
        {build.currentStatus}
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        {build.productionUrl ? (
          <a
            href={build.productionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Open {new URL(build.productionUrl).host} ↗
          </a>
        ) : null}
        {build.previewUrl && !build.productionUrl ? (
          <a
            href={build.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Open preview ↗
          </a>
        ) : null}
        <a href={SITE.bookingUrl} className="btn-ember">
          Get one built like this
        </a>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Day-by-day timeline                                                        */
/* -------------------------------------------------------------------------- */

function Timeline({ build }: { build: Build }) {
  return (
    <section className="container-page py-12">
      <div className="rule mb-12" />
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">The build, day by day</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
          Every day of work, in public.
        </h2>
        <p className="mt-5 text-ink-500">
          One paragraph per day, the same one the customer gets at 5pm. Commit
          shas where they exist. Screenshots when there&rsquo;s a UI to show.
        </p>
      </div>

      <ol className="mx-auto mt-12 max-w-3xl space-y-3">
        {build.entries.map((entry) => (
          <li
            key={entry.day}
            className="grid items-start gap-5 rounded-lg border border-ink-100 bg-paper-50 p-5 sm:grid-cols-[120px_1fr] sm:p-6"
          >
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-ember-600 tnum">
                Day {String(entry.day).padStart(2, "0")}
              </div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-ink-400 tnum">
                {formatBuildDate(entry.date)}
              </div>
            </div>
            <div>
              <p className="text-ink-700">{entry.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {entry.commits?.map((sha) => (
                  <span
                    key={sha}
                    className="inline-flex items-center rounded border border-ink-100 bg-paper px-2 py-0.5 font-mono text-[11px] tracking-tight text-ink-500 tnum"
                  >
                    {sha}
                  </span>
                ))}
                {entry.screenshotUrl ? (
                  <a
                    href={entry.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] uppercase tracking-widest text-ember-600 hover:text-ember-700"
                  >
                    screenshot ↗
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Now showing — preview iframe (with x-frame fallback link, same as homepage) */
/* -------------------------------------------------------------------------- */

function NowShowing({ build }: { build: Build }) {
  const url = build.productionUrl ?? build.previewUrl;
  if (!url) return null;
  const host = new URL(url).host;
  const label = build.status === "shipped" ? "● Live" : "● Preview";

  return (
    <section className="container-page py-16">
      <div className="rule mb-12" />
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">Now showing</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
          The build, on the public internet.
        </h2>
      </div>

      <div className="mt-10 overflow-hidden rounded-lg border border-ink-100 bg-paper-50">
        <div className="flex items-center justify-between border-b border-ink-100 bg-paper-100 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          </div>
          <div className="font-mono text-xs text-ink-400">{host}</div>
          <div
            className={`font-mono text-[10px] uppercase tracking-widest ${
              build.status === "shipped" ? "text-shipped-600" : "text-ember-600"
            }`}
          >
            {label}
          </div>
        </div>
        <div className="relative aspect-[4/3] w-full">
          {/*
            Embedded iframe of the customer build. Some sites set
            X-Frame-Options / CSP that block embedding; the link below
            (and the buttons in the header) are the documented fallback.
          */}
          <iframe
            src={url}
            title={`${build.customerName} — live build`}
            loading="lazy"
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-ink-400">
        If the embed doesn&rsquo;t load,{" "}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-ink underline-offset-4 hover:underline"
        >
          open {host} in a new tab
        </a>
        .
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Stack used                                                                 */
/* -------------------------------------------------------------------------- */

function StackBlock({ build }: { build: Build }) {
  if (build.stack.length === 0) return null;
  return (
    <section className="border-y border-ink-100 bg-paper-50/60 py-16">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4 justify-center">Tech stack used</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Same productized stack, every build.
          </h2>
          <p className="mt-5 text-ink-500">
            We don&rsquo;t experiment per project. Same boring stack so the
            14-day clock works.
          </p>
        </div>

        <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
          {build.stack.map((tech) => (
            <li
              key={tech}
              className="rounded border border-ink-200 bg-paper px-3 py-1.5 text-sm font-semibold text-ink"
            >
              {tech}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Why this matters                                                           */
/* -------------------------------------------------------------------------- */

function WhyThisMatters() {
  return (
    <section className="container-page py-20">
      <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="eyebrow mb-4">Why publish this</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            The build is the proof.
          </h2>
        </div>
        <div className="space-y-4 text-ink-500">
          <p>
            Most agencies hide their work until launch day, then publish a
            polished case study six months later. We do the opposite: every day
            of work goes on this page within 24 hours of the commit landing.
          </p>
          <p>
            The transparency is on-brand for Day14. We&rsquo;re selling the
            14-day promise — the only way to make that promise believable is to
            show the clock running. If we slip a day, you see it. If we ship
            early, you see that too.
          </p>
          <p>
            For prospects, this is the highest-fidelity signal of what you&rsquo;ll
            actually get. For us, it&rsquo;s the marketing flywheel: every build
            becomes a piece of public content that earns the next one.
          </p>
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
    <section className="container-page pb-24">
      <div className="overflow-hidden rounded-xl bg-ink p-10 text-paper sm:p-14">
        <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">
              Want a public build-log of your own?
            </h2>
            <p className="mt-4 max-w-xl text-paper-200">
              Three slots open this month. 30-minute intro call, fixed price,
              signed order form same day if it&rsquo;s a fit. The first commit
              lands within 24 hours of the deposit clearing.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a href={SITE.bookingUrl} className="btn-ember w-full justify-center text-base">
              Book a 30-min intro call
            </a>
            <Link
              href="/builds"
              className="inline-flex w-full items-center justify-center rounded border border-paper-200/40 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-paper/10"
            >
              See all builds
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
