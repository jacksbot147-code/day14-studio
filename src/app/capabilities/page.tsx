import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * /capabilities — the full scope of what Day14 builds + brings to every
 * engagement. Strategic asset, written voice-aligned (I, not we). Useful
 * for sales calls, partnerships, procurement conversations.
 *
 * Voice-checked against studio/docs/VOICE.md.
 */

const TITLE = "Day14 Capabilities — full scope of what I build, how, and what I don't do";
const DESCRIPTION =
  "One-person studio. Sites and apps shipped in 5–28 days. Every build runs on Day14 OS — the multi-tenant platform I built to run my own six businesses. Honest scope, honest disqualifiers.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/capabilities" },
  openGraph: {
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
    url: `https://${SITE.domain}/capabilities`,
    siteName: SITE.brand,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
  },
};

const TIERS = [
  {
    name: "Spark",
    price: "$1,500",
    cadence: "5 days",
    ops: "$49/mo after",
    bestFor: "Local businesses, solo professionals, side projects",
    includes: [
      "One custom-designed page (services, about, contact in one scroll)",
      "Lead capture form wired to your email",
      "Mobile responsive, SEO basics, analytics",
      "Click-to-call on every screen",
      "3 months of ops bundled",
    ],
  },
  {
    name: "Studio",
    price: "$9,000",
    cadence: "14 days",
    ops: "$149/mo after",
    bestFor: "Founders launching a brand",
    includes: [
      "Up to 6 pages + blog",
      "Custom design + illustration / photography direction",
      "Lead capture + content scheduling",
      "A/B framework wired in",
      "6 months of ops bundled",
      "Design system handoff in Figma",
    ],
  },
  {
    name: "Platform",
    price: "$24,000",
    cadence: "4 weeks",
    ops: "$299/mo after",
    bestFor: "Operators launching a SaaS",
    includes: [
      "Marketing site + customer portal + admin app",
      "Stripe billing + onboarding flows wired live",
      "Multi-environment deploys (staging + prod)",
      "Full team handoff including admin training",
      "12 months of ops bundled",
    ],
  },
  {
    name: "Custom",
    price: "Quoted in 48h",
    cadence: "6–12 weeks",
    ops: "scoped",
    bestFor: "Multi-tenant, marketplaces, bespoke",
    includes: [
      "Multi-tenant or marketplace architecture",
      "Custom scheduled-task development",
      "Integrations with your existing stack",
      "White-glove migration if you're moving off something else",
      "12 months of ops + dedicated channel",
    ],
  },
];

const SPECIALTY = [
  {
    name: "Day14 Audit",
    price: "$499",
    description:
      "1-hour Loom teardown of any small-business site. Voice + UX + conversion + audience-fit. Five-persona pass, named bounce reasons, top 5 fixes ranked by ROI. No build commitment.",
  },
  {
    name: "Day14 Voice",
    price: "$5,000",
    description:
      "Brand voice authorship. I read everything you've published, watch how your customers talk back, and produce your VOICE.md — the canonical doc your team (or agents) check every piece of customer-facing copy against. Two weeks.",
  },
  {
    name: "Day14 Migration",
    price: "$1k–$2k cash + revenue share",
    description:
      "Distressed asset acquisitions. I find an abandoned solo product in your vertical, acquire it, revive it on Day14 OS in 14 days, and either flip it, revive it as a tenant, or harvest its assets. One acquisition per month.",
  },
];

const PRIMITIVES = [
  {
    n: "01",
    name: "Multi-tenant chrome",
    body: "One admin app. Every business is a tenant. No context switching between dashboards.",
  },
  {
    n: "02",
    name: "Scheduled task framework",
    body: "Cron-style background work with dependency tracking. 24+ tasks running daily across the six tenants.",
  },
  {
    n: "03",
    name: "Evidence verifier",
    body: "Checks disk, not return-status. Catches phantom-success silently. Return-status is a lie. Disk is the truth.",
  },
  {
    n: "04",
    name: "Inbox routing",
    body: "One screen of \"things only a human can decide,\" cross-tenant, kind-filtered. The only screen I'm religious about.",
  },
  {
    n: "05",
    name: "Work-log + daily auto-commit",
    body: "The system writes its own log. Nothing is invisible. Daily commit captures every evidence-verified change.",
  },
  {
    n: "06",
    name: "Skills registry",
    body: "59 named operational plays the OS can dispatch instead of guessing. Each one a small, named, testable thing.",
  },
  {
    n: "07",
    name: "Jack-tap math",
    body: "Anything customer-facing or money-moving requires one human tap. Agents draft; humans publish. Money doesn't move without you.",
  },
];

const VERTICALS = [
  {
    name: "AlignMD",
    vertical: "B2B SaaS · Healthcare staffing",
    state: "live",
    note: "Credential-aware clinician intake. 40 min → 4 min.",
  },
  {
    name: "Splash Jacks Pools",
    vertical: "Field service · Home services",
    state: "live",
    note: "Booking, route dispatch, photo-proof visits with GPS+timestamp, Stripe billing.",
  },
  {
    name: "Casamoré",
    vertical: "Events · Cultural brand",
    state: "live",
    note: "Self-polishing site via scheduled agents. 18 pages, 19 essays, poster series, waitlist.",
  },
  {
    name: "Buildbridge",
    vertical: "Two-sided marketplace",
    state: "live",
    note: "Stripe escrow, multi-county permit lookups, NOAA-triggered Storm Mode.",
  },
  {
    name: "Life Loophole",
    vertical: "Editorial content · Finance",
    state: "live",
    note: "Background automation drafts essays in brand voice nightly.",
  },
  {
    name: "Day14 OS",
    vertical: "Solo-operator platform",
    state: "live",
    note: "The multi-tenant substrate itself. Six tenants, scheduled agents, evidence verifier.",
  },
  {
    name: "Day14 Realty",
    vertical: "Coastal listings + distress monitoring",
    state: "paused",
    note: "Paused for licensing. Data preserved.",
  },
];

const DONT = [
  "Native mobile apps (iOS / Android). I ship mobile-first web + Capacitor wrappers if you need the app store.",
  "Hardware or IoT firmware.",
  "High-volume e-commerce (Shopify > 5,000 SKUs, Amazon storefronts).",
  "Regulated verticals I don't already operate in (telehealth, fintech, gambling, weapons, cannabis).",
  "Multi-month \"discovery\" engagements. If you don't know what you want built, I'll help you find out — on the 15-minute intro call, free.",
  "Agency-style account management. No account manager. No weekly status calls. You talk to me directly.",
  "On-site work. I'm remote. Always.",
  "White-label work. The \"Built on Day14\" badge is part of the deal (small, footer).",
];

const NON_NEGOTIABLES = [
  {
    title: "Fixed scope, fixed price, fixed timeline.",
    body: "I quote on the intro call. You say yes or no within 48 hours. No SOWs. No change orders. No surprise invoices.",
  },
  {
    title: "One operator end to end.",
    body: "You talk to the person doing the work. Not a salesperson who hands you off after the contract.",
  },
  {
    title: "Daily Looms during the build.",
    body: "You hear from me every day. You don't have to ask.",
  },
  {
    title: "One round of revisions, 48-hour window.",
    body: "After the preview link drops, you have 48 hours to send every change in one reply. Anything outside the original sitemap is queued as Month 1 ops work or quoted separately.",
  },
  {
    title: "Honest about what's done. Honest about what's not.",
    body: "If something falls behind, the daily Loom says so the day it falls behind. Not the day before launch.",
  },
];

const PROCUREMENT = [
  { label: "Legal entity", value: "Day14 LLC (Delaware). W-9, COI, EIN available." },
  { label: "Insurance", value: "General liability + E&O. Certificates on request." },
  { label: "NDA / MSA", value: "Mutual NDA up front. Your paper or mine." },
  { label: "References", value: "Available on request from operators of live tenants." },
  { label: "Security posture", value: "SOC 2 in progress (target Q4 2026). Sub-processor list + data handling under NDA." },
  { label: "Payment terms", value: "Milestone billing on engagements ≥ $25k. Stripe direct on < $25k." },
  { label: "Subcontractor disclosure", value: "No subcontractors. All work performed by Jack Boppington personally." },
];

export default function CapabilitiesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Tiers />
        <Specialty />
        <Primitives />
        <Verticals />
        <NonNegotiables />
        <Dont />
        <Procurement />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="container-page pt-14 pb-12 sm:pt-20">
      <div className="eyebrow mb-6">Day14 capabilities</div>
      <h1 className="max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
        Full scope.
        <br className="hidden sm:block" /> What I build. What I don&rsquo;t.
      </h1>
      <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
        I&rsquo;m a one-person studio. I ship custom sites and apps in 5&ndash;28 days. Every build runs on Day14 OS &mdash; the multi-tenant platform I built to run my own six businesses. Fixed price, fixed timeline, no SOWs. If it&rsquo;s a fit, you&rsquo;ll know on the 15-minute intro call. If it isn&rsquo;t, you&rsquo;ll know just as fast.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <a href="#book" className="btn-ember">
          Book a 15-min intro call
        </a>
        <Link href="/work-with-us" className="btn-ghost">
          The buyer-side overview
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Tiers() {
  return (
    <section className="container-page py-16">
      <div className="rule mb-12" />
      <div className="mb-12">
        <div className="eyebrow mb-5">What I build</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
          Four tiers. Fixed price each.
        </h2>
        <p className="mt-5 max-w-2xl text-ink-500">
          Pick the size that fits the job. Every tier comes with a bundled ops window on Day14 OS; the monthly ops fee after the bundle scales with build complexity.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {TIERS.map((t) => (
          <article
            key={t.name}
            className="rounded-2xl border border-warm-gray-100 bg-paper-cream p-7"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-2xl font-extrabold tracking-tightest text-ink">{t.name}</h3>
              <span className="text-xl font-extrabold tracking-tightest text-ink tnum">{t.price}</span>
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-400">
              Shipped in {t.cadence} · {t.ops}
            </p>
            <p className="mt-5 text-[15px] leading-[1.6] text-ink-500">{t.bestFor}</p>
            <ul className="mt-6 space-y-2 text-[14px] leading-[1.55] text-ink-500">
              {t.includes.map((i) => (
                <li key={i} className="flex gap-2.5">
                  <span aria-hidden className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-ember-500" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Specialty() {
  return (
    <section className="container-page py-16">
      <div className="rule mb-12" />
      <div className="mb-12">
        <div className="eyebrow mb-5">Specialty services</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
          Standalone engagements.
        </h2>
        <p className="mt-5 max-w-2xl text-ink-500">
          For when the build tiers above aren&rsquo;t the right shape. Smaller commitments, sharper scope.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {SPECIALTY.map((s) => (
          <article
            key={s.name}
            className="rounded-2xl border border-warm-gray-100 bg-paper-cream p-7"
          >
            <h3 className="text-xl font-extrabold tracking-tightest text-ink">{s.name}</h3>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ember-600">
              {s.price}
            </p>
            <p className="mt-5 text-[14px] leading-[1.6] text-ink-500">{s.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Primitives() {
  return (
    <section className="container-page py-16">
      <div className="rule mb-12" />
      <div className="mb-12 max-w-3xl">
        <div className="eyebrow mb-5">What I bring with me</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
          Seven load-bearing primitives.
        </h2>
        <p className="mt-5 text-ink-500">
          Every site or app I ship runs on the same platform. You inherit it free with your build &mdash; the same substrate the six tenants on day14-studio.com run on.
        </p>
      </div>
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {PRIMITIVES.map((p) => (
          <div key={p.n} className="flex gap-5">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ember-600 tnum">
              {p.n}
            </span>
            <div>
              <h3 className="text-lg font-bold tracking-tightest text-ink">{p.name}</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-ink-500">{p.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Verticals() {
  return (
    <section className="container-page py-16">
      <div className="rule mb-12" />
      <div className="mb-12 max-w-3xl">
        <div className="eyebrow mb-5">Verticals I&rsquo;ve shipped in</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
          Eleven tenants. Six live.
        </h2>
        <p className="mt-5 text-ink-500">
          The cross-pollination is the moat &mdash; pricing patterns, voice patterns, customer signals across verticals nobody else has run end to end.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-warm-gray-100">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-warm-gray-50">
            <tr>
              <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-warm-gray-500">
                Tenant
              </th>
              <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-warm-gray-500">
                Vertical
              </th>
              <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-warm-gray-500">
                State
              </th>
              <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-warm-gray-500">
                One line
              </th>
            </tr>
          </thead>
          <tbody>
            {VERTICALS.map((v, i) => (
              <tr key={v.name} className={i % 2 === 0 ? "bg-paper-cream" : "bg-white"}>
                <td className="px-5 py-3 font-bold text-ink">{v.name}</td>
                <td className="px-5 py-3 text-ink-500">{v.vertical}</td>
                <td className="px-5 py-3">
                  <span
                    className={
                      "font-mono text-[10px] font-bold uppercase tracking-[0.18em] " +
                      (v.state === "live" ? "text-shipped-600" : "text-amber-600")
                    }
                  >
                    {v.state}
                  </span>
                </td>
                <td className="px-5 py-3 text-ink-500">{v.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function NonNegotiables() {
  return (
    <section className="container-page py-16">
      <div className="rule mb-12" />
      <div className="mb-12 max-w-3xl">
        <div className="eyebrow mb-5">How I work</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
          Non-negotiables.
        </h2>
        <p className="mt-5 text-ink-500">
          Most of what&rsquo;s frustrating about agencies comes from these being soft. They aren&rsquo;t.
        </p>
      </div>
      <div className="space-y-8">
        {NON_NEGOTIABLES.map((n) => (
          <div key={n.title} className="max-w-3xl">
            <h3 className="text-lg font-bold tracking-tightest text-ink">{n.title}</h3>
            <p className="mt-2 text-[15px] leading-[1.6] text-ink-500">{n.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Dont() {
  return (
    <section className="container-page py-16">
      <div className="rule mb-12" />
      <div className="mb-12 max-w-3xl">
        <div className="eyebrow mb-5">What I don&rsquo;t do</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
          Honest disqualifiers.
        </h2>
        <p className="mt-5 text-ink-500">
          Better to know on the intro call than discover at week 4.
        </p>
      </div>
      <ul className="space-y-4 text-[15px] leading-[1.6] text-ink-500">
        {DONT.map((d) => (
          <li key={d} className="flex max-w-3xl gap-3">
            <span aria-hidden className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-warm-gray-400" />
            <span>{d}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Procurement() {
  return (
    <section className="container-page py-16">
      <div className="rule mb-12" />
      <div className="mb-12 max-w-3xl">
        <div className="eyebrow mb-5">Procurement readiness</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
          The boring stuff legal needs.
        </h2>
        <p className="mt-5 text-ink-500">
          For the corp-innovation, mid-market, or enterprise buyer. The boring stuff that has to be true before legal will let us talk.
        </p>
      </div>
      <dl className="grid gap-y-5 sm:grid-cols-[12rem_1fr] sm:gap-x-8">
        {PROCUREMENT.map((p) => (
          <div key={p.label} className="contents">
            <dt className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-warm-gray-500">
              {p.label}
            </dt>
            <dd className="text-[15px] leading-[1.6] text-ink-500">{p.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section id="book" className="container-page py-20 sm:py-28">
      <div className="rule mb-12" />
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-5 justify-center">Talk to me</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
          Fifteen minutes. Real call. Fixed quote in 24 hours.
        </h2>
        <p className="mt-5 text-ink-500">
          If you&rsquo;ve made it this far, you already know what you want built. The intro call is where I tell you whether I&rsquo;m the right person to build it. If I&rsquo;m not, I&rsquo;ll tell you who is.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <a href={SITE.bookingUrl || "/#book"} className="btn-ember">
            Book a 15-min intro call
          </a>
          <Link href="/work-with-us" className="btn-ghost">
            See the buyer-side overview
          </Link>
        </div>
      </div>
    </section>
  );
}
