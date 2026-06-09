import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const CASE = {
  name: "Buildbridge",
  industry: "Contractor marketplace · B2B2C",
  location: "Southwest Florida",
  sku: "Platform",
  timeline: "Platform tier — regional marketplace build",
  customerType:
    "Two-sided: homeowners requesting work + licensed contractors bidding and delivering",
} as const;

export const metadata: Metadata = {
  title: `${CASE.name} — case study`,
  description: `How we built ${CASE.name} as a Day14 Platform — Stripe milestone escrow, multi-county permit-portal integrations, Storm Mode regional moat, and a native iOS + Android wrapper.`,
};

export default function CaseStudyPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Header />
        <Surfaces />
        <FeatureMatrix />
        <Stack />
        <Timeline />
        <ResultsAndProof />
        <NextCta />
      </main>
      <SiteFooter />
    </>
  );
}

function Header() {
  return (
    <section className="container-page pt-14 pb-12 sm:pt-20">
      <Link
        href="/"
        className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-ink-400 transition hover:text-ink"
      >
        ← All case studies
      </Link>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-400">
        <span className="text-ember-600">{CASE.sku}</span>
        <span className="h-1 w-1 rounded-full bg-ink-200" />
        <span>{CASE.timeline}</span>
        <span className="h-1 w-1 rounded-full bg-ink-200" />
        <span>{CASE.industry}</span>
        <span className="h-1 w-1 rounded-full bg-ink-200" />
        <span>{CASE.location}</span>
        <span className="h-1 w-1 rounded-full bg-ink-200" />
        <span className="text-ember-600">Reference build · Preview · SSO-gated</span>
      </div>

      <h1 className="mt-5 max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
        {CASE.name}
      </h1>

      <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
        A two-sided home-services marketplace with Stripe milestone escrow,
        atomic role-based user provisioning, multi-county permit-portal
        integrations, a regionally-defensible Storm Mode feature, and native iOS
        and Android wrappers. Built as the Platform tier exemplar for B2B2C
        marketplaces in coastal markets.
      </p>

      <p className="mt-4 max-w-2xl text-base text-ink-400">
        Preview is currently SSO-gated. Ask on the intro call for a guided
        walkthrough — we&rsquo;ll screen-share the full operator + contractor +
        homeowner flows live.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <a href={SITE.bookingUrl} className="btn-ember">
          Book a walkthrough
        </a>
        <Link href="/" className="btn-ghost">
          See the other case studies
        </Link>
      </div>
    </section>
  );
}

function Surfaces() {
  const surfaces = [
    {
      tag: "Homeowner",
      name: "Public + customer surface",
      body: "Marketing site, scope-builder tool, license + permit + HOA lookups, request-a-bid flow, escrow-managed project dashboard, mobile-first PWA. Plus native iOS and Android wrappers for the mobile-first audience.",
    },
    {
      tag: "Contractor",
      name: "Pro surface",
      body: "Onboarding with license + insurance verification, lead inbox, bid management, milestone-tracked job board, payout dashboard, Storm Mode opt-in panel, mobile-first responsive build.",
    },
    {
      tag: "Operator",
      name: "Admin + marketplace ops",
      body: "Atomic role-based user provisioning, escrow dispute resolution, lead routing, county-permit data pipeline ops, NOAA storm-tracker control room, 4-channel notify fan-out, analytics dashboards.",
    },
  ];

  return (
    <section className="container-page py-12">
      <div className="rule mb-12" />
      <div className="grid gap-6 md:grid-cols-3">
        {surfaces.map((s) => (
          <div key={s.name} className="card">
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-ember-600">
              {s.tag}
            </div>
            <h3 className="mt-2 text-xl font-bold tracking-tightest text-ink">
              {s.name}
            </h3>
            <p className="mt-3 text-sm text-ink-500">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureMatrix() {
  const groups: Array<{ title: string; items: string[] }> = [
    {
      title: "Marketplace mechanics",
      items: [
        "Atomic role-based user provisioning (bb_provision_user_atomic): single-transaction User + UserRole + role-profile creation",
        "Stripe milestone escrow — funds held, released per phase signoff",
        "Bid request → contractor matching → quote → award flow",
        "License + insurance verification gate on contractor onboarding",
        "Multi-step project state machine (request → bid → award → milestones → close)",
        "Dispute escalation flow with operator-facing resolution panel",
      ],
    },
    {
      title: "Regional moat — Storm Mode",
      items: [
        "NOAA storm RSS + active-storm RPC feeds",
        "Pre-approved Storm Mode contractor panel with on-call opt-in",
        "One-tap mobilization — operator triggers the response panel",
        "4-channel notify fan-out: SMS, email, push, in-app",
        "Customer-facing storm preparedness landing pages",
        "Hurricane-season analytics dashboards for operator + contractors",
      ],
    },
    {
      title: "Multi-county permit integrations",
      items: [
        "Lee County Accela portal data scrapers",
        "Collier County CityView integration",
        "Charlotte County ePermitting bridge",
        "Permit lookup tool surfaced as a public lead-magnet",
        "Permit status sync into the project dashboard",
        "Compliance audit trail per project",
      ],
    },
    {
      title: "Free tools shelf (lead capture)",
      items: [
        "Scope builder — homeowner self-service project scoping",
        "License lookup — instant verify contractor by state license",
        "Permit lookup — pull active permits at any SWFL address",
        "Price benchmarks — typical job ranges per scope",
        "Insurance check — verify contractor coverage",
        "HOA check — flag HOA-governed addresses",
        "Hurricane prep — pre-season checklist generator",
        "Storm Mode opt-in — pre-register for post-storm mobilization",
        "Capacity scanner — show contractor availability by zip",
      ],
    },
    {
      title: "Mobile + infra",
      items: [
        "Native iOS wrapper via Capacitor",
        "Native Android wrapper via Capacitor",
        "Push notifications across both native platforms",
        "Web-first responsive build that drives both wrappers",
        "Supabase Postgres + 14 numbered SQL migrations (real product evolution)",
        "Vercel hosting with preview deploys per branch",
      ],
    },
  ];

  return (
    <section className="container-page py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">What was actually built</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
          A regionally-defensible marketplace, end to end.
        </h2>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.title} className="card">
            <h3 className="text-xl font-bold tracking-tightest text-ink">
              {g.title}
            </h3>
            <ul className="mt-5 space-y-2.5 text-sm text-ink-700">
              {g.items.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-shipped-500"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stack() {
  const stack: Array<[string, string]> = [
    ["Framework", "Next.js 14 (App Router)"],
    ["Language", "TypeScript strict, noUncheckedIndexedAccess"],
    ["Database", "Postgres on Supabase + 14 numbered migrations"],
    ["Auth", "Supabase, role-based provisioning"],
    ["Billing", "Stripe (milestone escrow + payouts)"],
    ["AI", "Groq Llama 3.3 + Anthropic SDK"],
    ["Notifications", "SMS + email + push + in-app (4-channel)"],
    ["Storm data", "NOAA RSS + active-storm RPC"],
    ["County permits", "Lee Accela, Collier CityView, Charlotte ePermit"],
    ["Mobile", "Capacitor (iOS + Android wrappers)"],
    ["Hosting", "Vercel + Supabase"],
    ["Status", "Preview, SSO-gated"],
  ];

  return (
    <section className="border-y border-ink-100 bg-paper-50/60 py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4 justify-center">Stack</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Platform tier stack, plus regional integrations no Squarespace can touch.
          </h2>
        </div>

        <dl className="mx-auto mt-12 grid max-w-4xl gap-x-10 gap-y-4 sm:grid-cols-2">
          {stack.map(([k, v]) => (
            <div
              key={k}
              className="flex items-start justify-between border-b border-ink-100 pb-3"
            >
              <dt className="font-mono text-xs uppercase tracking-widest text-ink-400">
                {k}
              </dt>
              <dd className="text-right text-sm font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Timeline() {
  const phases = [
    { d: "Phase 1", t: "Marketplace mechanics: User + UserRole atomic provisioning, bid request → quote → award flow, project state machine" },
    { d: "Phase 2", t: "Stripe milestone escrow — held funds, per-phase release, payout dashboard" },
    { d: "Phase 3", t: "Storm Mode regional moat: NOAA feed, contractor opt-in panel, 4-channel notify fan-out" },
    { d: "Phase 4", t: "Multi-county permit-portal scrapers: Lee Accela, Collier CityView, Charlotte ePermitting" },
    { d: "Phase 5", t: "Free tools shelf — 9 public lead-magnet tools (scope, license, permit, price, insurance, HOA, hurricane prep, etc.)" },
    { d: "Phase 6", t: "Capacitor wrappers — native iOS + Android with push notifications" },
    { d: "Phase 7", t: "Operator admin: escrow disputes, marketplace ops, analytics, audit trails" },
    { d: "Launch", t: "Deployed to Vercel with Supabase production database, currently SSO-gated for invited preview" },
  ];

  return (
    <section className="container-page py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">Build phases</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
          What shipped, in order.
        </h2>
      </div>

      <ol className="mx-auto mt-12 max-w-3xl space-y-2">
        {phases.map((p) => (
          <li
            key={p.d}
            className="grid items-start gap-4 rounded border border-ink-100 bg-paper-50 p-4 sm:grid-cols-[110px_1fr]"
          >
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-ember-600 tnum">
              {p.d}
            </div>
            <div className="text-sm text-ink-700">{p.t}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ResultsAndProof() {
  return (
    <section className="container-page py-20">
      <div className="rule mb-12" />
      <div className="grid gap-12 md:grid-cols-[1fr_1.3fr]">
        <div>
          <div className="eyebrow mb-4">Results</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            A real marketplace, with real defenses.
          </h2>
          <p className="mt-5 text-ink-500">
            Buildbridge proves Day14 can ship the most operationally complex
            tier — two-sided marketplaces with escrow, native mobile, and
            region-specific integrations that lock out generic out-of-state
            competitors. The Storm Mode and multi-county permit pieces are
            non-trivial to reproduce and locally defensible for years.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Result label="Counties integrated" value="3" />
          <Result label="Notify channels" value="4" />
          <Result label="Native platforms" value="iOS + Android" />
          <Result label="SQL migrations" value="14" />
        </dl>
      </div>
    </section>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-paper-50 p-5">
      <div className="font-mono text-xs uppercase tracking-widest text-ink-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tightest text-ink tnum">
        {value}
      </div>
    </div>
  );
}

function NextCta() {
  return (
    <section className="container-page pb-24">
      <div className="overflow-hidden rounded-xl bg-ink p-10 text-paper sm:p-14">
        <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">
              Running a marketplace, or want to?
            </h2>
            <p className="mt-4 max-w-xl text-paper-200">
              Platform tier is $10,000 + $399/mo. Two-sided flows, escrow,
              native mobile, region-specific integrations. Out in 21 days. Or
              the deposit refunds.
            </p>
          </div>
          <div>
            <a href={SITE.bookingUrl} className="btn-ember w-full justify-center text-base">
              Book a walkthrough
            </a>
            <Link
              href="/"
              className="mt-3 inline-flex w-full items-center justify-center rounded border border-paper-200/40 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-paper/10"
            >
              See the pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
