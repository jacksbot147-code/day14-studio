import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const CASE = {
  name: "AlignMD",
  industry: "B2B SaaS · Healthcare staffing",
  location: "United States",
  sku: "Platform",
  timeline: "Platform tier — full clinical-staffing platform on Day14 OS",
  customerType:
    "Two-sided: clinicians submitting credentials + hospital operations teams reviewing dossiers",
} as const;

export const metadata: Metadata = {
  title: `${CASE.name} — case study`,
  description: `How we built ${CASE.name} as a Day14 Platform — credential-aware intake, AI dossier generation, multi-state license verification, and an operator admin that turned a 40-minute clinician onboarding into a 4-minute one.`,
  alternates: { canonical: "/case-studies/alignmd" },
  openGraph: {
    title: `${CASE.name} — case study`,
    description: `Credential-aware staffing, end to end. Built on Day14 OS.`,
    url: `https://${SITE.domain}/case-studies/alignmd`,
    siteName: SITE.brand,
    type: "article",
  },
};

export default function CaseStudyPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Header />
        <ProblemAndSolution />
        <WhatShipped />
        <ResultsByNumbers />
        <SharedStack />
        <NextCta />
      </main>
      <SiteFooter />
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Header() {
  return (
    <section className="container-page pt-14 pb-12 sm:pt-20">
      <Link
        href="/#case-studies"
        className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-ink-400 transition hover:text-ink"
      >
        ← All case studies
      </Link>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-400">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#3b82f6" }} />
          <span>{CASE.industry}</span>
        </span>
        <span aria-hidden>·</span>
        <span>{CASE.sku} tier</span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-shipped-500" />
          Live
        </span>
      </div>

      <h1 className="mt-6 max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
        Credential-aware staffing, end to end.
      </h1>
      <p className="mt-6 max-w-3xl text-lg text-ink-500 sm:text-xl">
        AlignMD is a B2B SaaS for healthcare staffing &mdash; clinicians submit credentials once, hospitals see a fully-formed dossier in minutes. We built it on Day14 OS, the same multi-tenant platform that runs five other businesses we operate ourselves.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function ProblemAndSolution() {
  return (
    <section className="container-page py-16">
      <div className="rule mb-12" />
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <div className="eyebrow eyebrow-rule mb-5">The problem</div>
          <h2 className="text-2xl font-extrabold tracking-tightest text-ink sm:text-3xl">
            Clinician intake takes 40 minutes per candidate.
          </h2>
          <p className="mt-5 text-ink-500">
            Healthcare staffing is gated by credentials &mdash; medical license, board certifications, malpractice history, hospital privileges, state-specific verifications. A typical clinician submits 8&ndash;12 documents across 3&ndash;5 forms, and an operations coordinator stitches them into a dossier by hand. The average end-to-end cycle: 40 minutes per clinician, with rework on every fourth file.
          </p>
        </div>
        <div>
          <div className="eyebrow eyebrow-rule mb-5">The solution</div>
          <h2 className="text-2xl font-extrabold tracking-tightest text-ink sm:text-3xl">
            Credential-aware intake plus dossier generation.
          </h2>
          <p className="mt-5 text-ink-500">
            We built AlignMD as a Day14 Platform tier &mdash; clinician portal, operator admin, billing, and a scheduled-agent fleet that parses uploaded credentials, runs license-status lookups, and auto-assembles the dossier in the operator&rsquo;s queue. The coordinator&rsquo;s job changes from data entry to review-and-approve.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function WhatShipped() {
  const surfaces = [
    {
      label: "Clinician portal",
      title: "Magic-link auth, mobile-first intake.",
      body: "Clinicians sign in with a magic link, upload credentials (drag, drop, photo of paper docs are all fine), see a progress bar of what&rsquo;s parsed vs. what still needs them. Whole intake is mobile-first because that&rsquo;s where credential photos get taken.",
    },
    {
      label: "Operator admin",
      title: "Dossier queue, one-click approve.",
      body: "Operations team sees a queue of completed dossiers ranked by review priority (license urgency, geo demand, contract value). One screen, approve or kick back. Every other tenant we run uses the same admin shell &mdash; same shortcuts, same inbox model.",
    },
    {
      label: "Scheduled agents",
      title: "License lookups, dossier assembly, nightly QA.",
      body: "Agents run on cron: credential-parse fires when a new doc lands, license-status agent verifies against state boards nightly, evidence verifier flags any dossier where the parsed data doesn&rsquo;t match the source PDF. Operator only sees what needs a human.",
    },
    {
      label: "Billing + ops",
      title: "Stripe Connect for placement fees.",
      body: "Hospitals pay placement fees through Stripe Connect; clinicians get paid via the same rails when a placement closes. All wired live before launch &mdash; no &ldquo;billing comes in phase 2.&rdquo;",
    },
  ];

  return (
    <section className="border-y border-ink-100 bg-paper-50/60 py-20">
      <div className="container-page">
        <div className="max-w-2xl">
          <div className="eyebrow mb-4">What shipped</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Four surfaces. One operating system.
          </h2>
          <p className="mt-5 text-ink-500">
            Every surface below sits on Day14 OS &mdash; multi-tenant routing,
            magic-link auth, the same evidence-verified deploy pipeline we use
            on every other build. AlignMD looks like its own product because
            the brand and the workflow are bespoke; under the hood it&rsquo;s
            the same hardened core.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {surfaces.map((s) => (
            <div key={s.label} className="card-pop">
              <div className="font-mono text-xs uppercase tracking-widest text-ember-600">
                {s.label}
              </div>
              <h3 className="mt-2 text-xl font-bold tracking-tightest text-ink">
                {s.title}
              </h3>
              <p className="mt-3 text-ink-700" dangerouslySetInnerHTML={{ __html: s.body }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function ResultsByNumbers() {
  const stats = [
    { value: "10x", label: "Faster clinician onboarding (40 min → 4 min)" },
    { value: "4 wk", label: "Platform-tier build from kickoff to launch" },
    { value: "1", label: "Operator running the platform, same admin as five other tenants" },
    { value: "24/7", label: "Scheduled-agent coverage of license-status verification" },
  ];

  return (
    <section className="container-page py-20">
      <div className="max-w-2xl">
        <div className="eyebrow eyebrow-rule mb-5">By the numbers</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
          What the operator measures.
        </h2>
      </div>

      <div className="mt-12 grid grid-cols-2 border-l border-t border-ink-100 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border-b border-r border-ink-100 px-4 py-5">
            <div className="text-3xl font-extrabold tracking-tightest text-ink tnum sm:text-4xl">
              {s.value}
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function SharedStack() {
  return (
    <section className="container-page pb-20">
      <div className="rounded-lg border border-ink-100 bg-paper-50 p-8 sm:p-10">
        <div className="grid items-start gap-8 md:grid-cols-[1fr_2fr]">
          <div>
            <div className="eyebrow mb-3">Why it works</div>
            <h3 className="text-2xl font-bold tracking-tightest text-ink">
              The OS is the moat.
            </h3>
          </div>
          <div className="text-ink-700">
            <p>
              The reason AlignMD shipped in four weeks (not the four months a typical agency quotes) is that the multi-tenant infrastructure was already built &mdash; we use it to run six businesses ourselves. Auth, billing, admin shell, scheduled agents, deploy pipeline, evidence verifier &mdash; all of it sits in the same code stack that runs day14.us, lifeloophole.com, and three others.
            </p>
            <p className="mt-4">
              When you hire {SITE.brand} to build, you don&rsquo;t get a Webflow template with our markup on top. You get the same platform we trust with our own revenue.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function NextCta() {
  return (
    <section className="container-page pb-24">
      <div className="overflow-hidden rounded-xl bg-ink p-10 text-paper sm:p-14">
        <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">
              Want a platform like AlignMD?
            </h2>
            <p className="mt-4 max-w-xl text-paper-200">
              Platform tier is $24,000, shipped in 4 weeks. Same stack, same agents, your brand. 15-minute intro call to figure out if the fit is real.
            </p>
          </div>
          <div>
            <a
              href={SITE.bookingUrl}
              className="btn-ember w-full justify-center text-base"
            >
              Book a 15-min intro call
            </a>
            <Link
              href="/work-with-us"
              className="mt-3 inline-flex w-full items-center justify-center rounded border border-paper-200/40 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-paper/10"
            >
              See all 4 tiers
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
