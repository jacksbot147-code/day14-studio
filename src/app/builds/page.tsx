import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { BUILDS, dayOfFourteen, type Build, type BuildStatus } from "@/lib/builds";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Build log — every Day14 customer build, public from day one",
  description:
    "Day14 publishes every customer build as it happens — day-by-day commits, screenshots, and operator updates. No competitor in productized agency does this.",
};

export default function BuildsIndexPage() {
  const inProgress = BUILDS.filter((b) => b.status === "in-progress");
  const shipped = BUILDS.filter((b) => b.status === "shipped");
  const paused = BUILDS.filter((b) => b.status === "paused");

  return (
    <>
      <SiteHeader />
      <main>
        <Header />
        <BuildList title="In progress" builds={inProgress} emptyCopy="No active builds right now — three slots open this month. Book an intro call to claim one." />
        <BuildList title="Shipped" builds={shipped} />
        {paused.length > 0 ? <BuildList title="Paused" builds={paused} /> : null}
        <Manifesto />
      </main>
      <SiteFooter />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

function Header() {
  return (
    <section className="container-page pt-14 pb-12 sm:pt-20">
      <div className="eyebrow mb-5">
        <span className="relative inline-block h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-ember-500" />
        </span>
        Build log · public from day one
      </div>
      <h1 className="max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
        Every Day14 build, in the open.
      </h1>
      <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
        Day-by-day commits, screenshots, and the same operator update the customer
        gets at 5pm. No agency does this. The transparency is the point — you can
        watch a build happen in real time before you sign one of your own.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Build list — one section per status                                        */
/* -------------------------------------------------------------------------- */

function BuildList({
  title,
  builds,
  emptyCopy,
}: {
  title: string;
  builds: Build[];
  emptyCopy?: string;
}) {
  return (
    <section className="container-page py-10">
      <div className="rule mb-8" />
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-2xl font-extrabold tracking-tightest text-ink sm:text-3xl">
          {title}
        </h2>
        <span className="font-mono text-xs uppercase tracking-widest text-ink-400 tnum">
          {String(builds.length).padStart(2, "0")} {builds.length === 1 ? "build" : "builds"}
        </span>
      </div>

      {builds.length === 0 ? (
        emptyCopy ? (
          <div className="rounded-lg border border-dashed border-ink-200 bg-paper-50 p-8 text-center">
            <p className="text-ink-500">{emptyCopy}</p>
            <a href={SITE.bookingUrl} className="btn-ember mt-5">
              Book a 30-min intro call
            </a>
          </div>
        ) : null
      ) : (
        <ul className="space-y-2">
          {builds.map((b) => (
            <li key={b.slug}>
              <BuildRow build={b} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BuildRow({ build }: { build: Build }) {
  const day = dayOfFourteen(build);
  return (
    <Link
      href={`/builds/${build.slug}`}
      className="grid items-start gap-4 rounded-lg border border-ink-100 bg-paper-50 p-5 transition hover:border-ink-200 hover:shadow-lift sm:grid-cols-[1.6fr_1fr_2fr_auto] sm:items-center sm:gap-6 sm:p-6"
    >
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-ember-600">
          {build.sku} · {build.vertical === "custom" ? "Custom" : build.vertical.replace("-", " ")}
        </div>
        <div className="mt-1 text-xl font-bold tracking-tightest text-ink">
          {build.customerName}
        </div>
      </div>

      <div className="font-mono text-xs uppercase tracking-widest text-ink-500 tnum">
        Day {day} of 14
      </div>

      <p className="text-sm text-ink-500">{build.currentStatus}</p>

      <div className="flex items-center gap-3 sm:justify-end">
        <BuildStatusPill status={build.status} />
        <span className="hidden text-sm font-semibold text-ink sm:inline">→</span>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Status pill                                                                */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Manifesto block — why we publish                                           */
/* -------------------------------------------------------------------------- */

function Manifesto() {
  return (
    <section className="container-page py-20">
      <div className="rule mb-12" />
      <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="eyebrow mb-4">Why we publish</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            The build is the marketing.
          </h2>
        </div>
        <div className="space-y-4 text-ink-500">
          <p>
            Agencies show you a polished case study six months after the fact.
            We show you the commits as they land. If we slip a day, you see it.
            If we ship early, you see that too. Either way, the only way to
            understand what 14 days of Day14 actually looks like is to watch one.
          </p>
          <p>
            Every active build gets a public page on this index from Day 1. Every
            shipped build stays here as a permanent record. The customer
            controls when their production URL goes public; the build-log is
            published with their consent in the SOW.
          </p>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-400">
            Three slots open this month. Book the call to claim one.
          </p>
        </div>
      </div>
    </section>
  );
}
