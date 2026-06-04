import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const CASE = {
  name: "Splash Jacks Pools",
  industry: "Pool Service",
  location: "Naples & Bonita Springs, FL",
  sku: "Platform",
  timeline: "14 days",
  url: "https://splashjackspools.com",
  customerType: "B2C — residential pool owners on weekly recurring service",
} as const;

export const metadata: Metadata = {
  title: `${CASE.name} — case study`,
  description: `How we shipped a full ${CASE.sku} build (marketing + portal + admin app + billing) for ${CASE.name} in ${CASE.timeline}.`,
};

/* -------------------------------------------------------------------------- */
/* The case study, top to bottom.                                             */
/* -------------------------------------------------------------------------- */

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
        <span>Shipped in {CASE.timeline}</span>
        <span className="h-1 w-1 rounded-full bg-ink-200" />
        <span>{CASE.industry}</span>
        <span className="h-1 w-1 rounded-full bg-ink-200" />
        <span>{CASE.location}</span>
      </div>

      <h1 className="mt-5 max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
        {CASE.name}
      </h1>

      <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
        A full service-business platform built from a blank repo to a paying-customer
        launch in two weeks. Marketing site, SEO city landing pages, AI chatbot,
        customer portal with self-reschedule, operator admin app with route scheduler
        and photo proof, and Stripe billing wired end-to-end.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <a
          href={CASE.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          Open {new URL(CASE.url).host} ↗
        </a>
        <a href={SITE.bookingUrl} className="btn-ember">
          Get one built like this
        </a>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* The three surfaces — marketing site / customer portal / operator admin     */
/* -------------------------------------------------------------------------- */

function Surfaces() {
  const surfaces = [
    {
      tag: "Public",
      name: "Marketing site",
      body: "Custom-designed homepage, services & pricing, city-targeted landing pages (Naples, Bonita Springs, Estero, Fort Myers, Cape Coral), AI chatbot trained on services + chemistry, lead capture, mobile-first, PWA-installable, dynamic OG images per page.",
    },
    {
      tag: "Customer",
      name: "Customer portal",
      body: "Magic-link sign-in (no passwords), visit history with photos & chemistry readings, account info, invoices, ability to reschedule or pause service, request a quote, leave a note for the tech.",
    },
    {
      tag: "Operator",
      name: "Admin app",
      body: "Customer + lead + visit CRUD, route-aware day-of-week scheduler, photo proof with GPS + timestamp watermarking, quote system, PDF invoicing, daily admin digest, broadcast SMS, CSV exports, global search, 'needs attention' widgets, analytics dashboards.",
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

/* -------------------------------------------------------------------------- */
/* Features actually built — checklist with three columns                     */
/* -------------------------------------------------------------------------- */

function FeatureMatrix() {
  const groups: Array<{ title: string; items: string[] }> = [
    {
      title: "Marketing surface",
      items: [
        "Custom-designed homepage with hero, services, pricing, trust strip",
        "5 SEO city landing pages with per-city OG images",
        "About, contact, FAQ, gallery, privacy, terms",
        "Free homeowner calculators (chlorine, salt cell, gallons, chemistry, cost, storm prep)",
        "AI chatbot grounded in services + pricing",
        "Lead capture form → ops dashboard + operator email",
        "PWA install, mobile-first, dynamic OG images per page",
        "Stealth-mode robots gate that flips at launch",
      ],
    },
    {
      title: "Customer portal",
      items: [
        "Supabase magic-link auth — no passwords, no support tickets",
        "Visit history with photos + chemistry readings + notes",
        "Live next-visit ETA when a tech is en route",
        "Self-reschedule, pause, request quote, leave note for tech",
        "Stripe-managed invoices and payment methods",
        "Email + SMS notifications via Resend + Twilio",
        "Mobile-first responsive — installable as PWA",
        "Account, billing, message inbox",
      ],
    },
    {
      title: "Operator admin app",
      items: [
        "Customer + lead + visit/job CRUD with global search",
        "Route-aware auto-scheduler keyed off day-of-week and zone",
        "Photo proof pipeline: EXIF GPS + timestamp watermarked on upload",
        "Chemistry input with normalization + flag thresholds",
        "Quotes → invoices → PDF receipt generation",
        "Daily admin digest email summarizing the day's ops",
        "Broadcast SMS to filtered customer segments",
        "CSV exports for accounting / handoff",
        "'Needs attention' widgets surfacing overdue + unhealthy customers",
        "Analytics dashboards (revenue, customer churn, chemistry trends)",
        "Role-based auth with operator-only admin gate",
      ],
    },
    {
      title: "Integrations & infra",
      items: [
        "Stripe subscriptions + invoicing + webhook handlers",
        "Supabase Postgres with Prisma schema + migrations",
        "Resend transactional email with branded templates",
        "Twilio SMS for visit reminders + ops broadcasts",
        "sharp for photo processing, exifr for GPS extraction",
        "Anthropic SDK for the customer-facing AI chatbot",
        "Vercel hosting with preview deploys per branch",
        "Server actions with 50MB body limit for photo uploads",
      ],
    },
  ];

  return (
    <section className="container-page py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">What was actually built</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
          The complete feature list. Every one of these is live.
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

/* -------------------------------------------------------------------------- */
/* Stack                                                                      */
/* -------------------------------------------------------------------------- */

function Stack() {
  const stack: Array<[string, string]> = [
    ["Framework", "Next.js 14 (App Router)"],
    ["Language", "TypeScript strict, noUncheckedIndexedAccess"],
    ["Database", "Postgres on Supabase + Prisma"],
    ["Auth", "Supabase magic link"],
    ["Billing", "Stripe (subscriptions + invoicing)"],
    ["Email", "Resend"],
    ["SMS", "Twilio"],
    ["Images", "sharp + exifr"],
    ["AI", "Anthropic SDK"],
    ["Hosting", "Vercel"],
    ["Styling", "Tailwind CSS"],
    ["Lines of code", "~25k TS/TSX"],
  ];

  return (
    <section className="border-y border-ink-100 bg-paper-50/60 py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4 justify-center">Stack</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Same stack we use on every build. No experimenting per project.
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

/* -------------------------------------------------------------------------- */
/* Timeline                                                                   */
/* -------------------------------------------------------------------------- */

function Timeline() {
  const days = [
    { d: "Day 1", t: "Repo + scaffold + Vercel preview live, basic homepage" },
    { d: "Day 2–3", t: "Customer + visit + chemistry data model, Prisma schema, seed data" },
    { d: "Day 4–5", t: "Operator admin app: customer CRUD, visit logging, photo upload pipeline" },
    { d: "Day 6–7", t: "Auto-scheduler + route view + daily digest email" },
    { d: "Day 8", t: "Customer portal: magic-link auth, visit history, self-reschedule" },
    { d: "Day 9", t: "Stripe subscriptions + invoicing + webhook handlers" },
    { d: "Day 10", t: "AI chatbot, SEO city pages, OG image generation per city" },
    { d: "Day 11", t: "Twilio SMS, Resend transactional templates, broadcast tool" },
    { d: "Day 12", t: "Analytics dashboards, 'needs attention' widgets, CSV exports" },
    { d: "Day 13", t: "QA pass, polish, mobile audit, performance tuning" },
    { d: "Day 14", t: "Domain pointed, Stripe live mode flipped, first paying customer" },
  ];

  return (
    <section className="container-page py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">The actual two weeks</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
          Day by day, what shipped.
        </h2>
      </div>

      <ol className="mx-auto mt-12 max-w-3xl space-y-2">
        {days.map((d) => (
          <li
            key={d.d}
            className="grid items-start gap-4 rounded border border-ink-100 bg-paper-50 p-4 sm:grid-cols-[110px_1fr]"
          >
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-ember-600 tnum">
              {d.d}
            </div>
            <div className="text-sm text-ink-700">{d.t}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Results                                                                    */
/* -------------------------------------------------------------------------- */

function ResultsAndProof() {
  return (
    <section className="container-page py-20">
      <div className="rule mb-12" />
      <div className="grid gap-12 md:grid-cols-[1fr_1.3fr]">
        <div>
          <div className="eyebrow mb-4">Results</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Live, public, paying.
          </h2>
          <p className="mt-5 text-ink-500">
            The site has been live since launch day. Real customers are
            paying through it. The operator runs the entire business — route,
            chemistry, photo proof, billing — from the admin app. No spreadsheets,
            no scribbled chemistry sheets, no manual invoicing.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Result label="Time to first paying customer" value="14 days" />
          <Result label="Lines of TS/TSX shipped" value="~25k" />
          <Result label="Vendor accounts the operator manages" value="0" />
          <Result label="Spreadsheets replaced" value="all of them" />
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

/* -------------------------------------------------------------------------- */
/* Next CTA                                                                   */
/* -------------------------------------------------------------------------- */

function NextCta() {
  return (
    <section className="container-page pb-24">
      <div className="overflow-hidden rounded-xl bg-ink p-10 text-paper sm:p-14">
        <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">
              Want one built like this for your business?
            </h2>
            <p className="mt-4 max-w-xl text-paper-200">
              Three slots open this month for {SITE.location} service operators.
              20-minute scope call, fixed price, signed order form same day if
              it&rsquo;s a fit.
            </p>
          </div>
          <div>
            <a href={SITE.bookingUrl} className="btn-ember w-full justify-center text-base">
              Book a 20-min scope call
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
