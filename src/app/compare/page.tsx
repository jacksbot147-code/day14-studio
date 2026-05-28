import type { Metadata } from "next";
import Link from "next/link";
import { SITE, PITCH, FAQ } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CountUp } from "@/components/motion/count-up";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Day14 vs Jobber, Housecall Pro, GoHighLevel, Squarespace",
  description:
    "Why not just use Jobber for $69/mo? The honest comparison: monthly cost, code ownership, branding, customizability, and the five-year math.",
};

export default function ComparePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ComparisonTable />
        <CantDoThis />
        <FiveYearMath />
        <FaqSubset />
        <FinalCta />
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
    <section className="grain container-page pt-14 pb-12 sm:pt-20 sm:pb-16">
      <div className="eyebrow mb-6">Day14 vs the alternatives</div>
      <h1 className="max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px] lg:text-[72px]">
        Stop renting.{" "}
        <span className="text-aurora">Own your platform.</span>
      </h1>
      <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
        {PITCH.vsSaaS}
      </p>
      <p className="mt-4 max-w-2xl text-base text-ink-400 sm:text-lg">
        Below is the honest comparison — monthly cost, what you actually own,
        what you can customize, and the five-year math. No marketing spin. The
        numbers and the checkmarks are what they are.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <a href={SITE.bookingUrl} className="btn-ember">
          Book a 30-min intro call
        </a>
        <Link href="/about" className="btn-ghost">
          How Day14 works →
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Comparison table                                                           */
/* -------------------------------------------------------------------------- */

type Mark = "yes" | "no" | "partial" | string;

type Competitor = {
  name: string;
  short: string;
  monthly: string;
  upfront: string;
  shipTime: string;
  ownsCode: Mark;
  branding: Mark;
  portalFlex: Mark;
  chatbot: Mark;
  photoProof: Mark;
  multiCounty: Mark;
  highlight?: boolean;
};

const COMPETITORS: Competitor[] = [
  {
    name: "Jobber Connect",
    short: "Jobber",
    monthly: "$169/mo",
    upfront: "$0",
    shipTime: "Same day",
    ownsCode: "no",
    branding: "partial",
    portalFlex: "no",
    chatbot: "no",
    photoProof: "partial",
    multiCounty: "no",
  },
  {
    name: "Housecall Pro · Pro",
    short: "Housecall",
    monthly: "$129/mo",
    upfront: "$0",
    shipTime: "Same day",
    ownsCode: "no",
    branding: "partial",
    portalFlex: "no",
    chatbot: "no",
    photoProof: "partial",
    multiCounty: "no",
  },
  {
    name: "GoHighLevel Agency",
    short: "GHL",
    monthly: "$97/mo",
    upfront: "$0",
    shipTime: "Weeks of setup",
    ownsCode: "no",
    branding: "partial",
    portalFlex: "partial",
    chatbot: "partial",
    photoProof: "no",
    multiCounty: "no",
  },
  {
    name: "Squarespace Commerce",
    short: "Squarespace",
    monthly: "$36/mo+",
    upfront: "$0",
    shipTime: "Days of setup",
    ownsCode: "no",
    branding: "yes",
    portalFlex: "no",
    chatbot: "no",
    photoProof: "no",
    multiCounty: "no",
  },
  {
    name: "Traditional agency build",
    short: "Agency",
    monthly: "Varies",
    upfront: "$50,000+",
    shipTime: "6–9 months",
    ownsCode: "yes",
    branding: "yes",
    portalFlex: "yes",
    chatbot: "partial",
    photoProof: "yes",
    multiCounty: "yes",
  },
  {
    name: "Day14 Portal",
    short: "Day14",
    monthly: "$199/mo",
    upfront: "$5,000",
    shipTime: "14 days",
    ownsCode: "yes",
    branding: "yes",
    portalFlex: "yes",
    chatbot: "yes",
    photoProof: "yes",
    multiCounty: "yes",
    highlight: true,
  },
];

const COLUMNS: Array<{
  key: keyof Pick<
    Competitor,
    | "monthly"
    | "upfront"
    | "shipTime"
    | "ownsCode"
    | "branding"
    | "portalFlex"
    | "chatbot"
    | "photoProof"
    | "multiCounty"
  >;
  label: string;
  short: string;
}> = [
  { key: "monthly", label: "Monthly cost", short: "Monthly" },
  { key: "upfront", label: "Upfront cost", short: "Upfront" },
  { key: "shipTime", label: "Ship time", short: "Ship" },
  { key: "ownsCode", label: "You own the code", short: "Own code" },
  { key: "branding", label: "Customer-facing branding", short: "Branding" },
  { key: "portalFlex", label: "Customer portal flexibility", short: "Portal flex" },
  { key: "chatbot", label: "AI chatbot included", short: "AI chatbot" },
  { key: "photoProof", label: "Photo proof pipeline", short: "Photo proof" },
  { key: "multiCounty", label: "Multi-county integrations", short: "Multi-county" },
];

function ComparisonTable() {
  return (
    <section
      id="table"
      className="border-y border-ink-100 bg-paper-50/60 py-20 sm:py-24"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4 justify-center">The honest table</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            What each platform actually does — and what it costs.
          </h2>
          <p className="mt-5 text-ink-500">
            Checkmarks where the platform genuinely ships the feature. Partial
            when it&rsquo;s technically there but in a vendor-branded, locked-in
            form. An X when you&rsquo;re on your own.
          </p>
        </div>

        {/* Desktop / tablet — full table */}
        <div className="mt-12 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-paper-50/80 px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-ink-400 backdrop-blur"
                >
                  Platform
                </th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className="border-b border-ink-100 px-3 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400"
                  >
                    {c.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c) => (
                <tr
                  key={c.name}
                  className={cn(
                    "transition",
                    c.highlight
                      ? "bg-paper shadow-[inset_3px_0_0_0_theme(colors.ember.500)]"
                      : "hover:bg-paper",
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      "sticky left-0 z-10 border-b border-ink-100 bg-paper-50/80 px-4 py-4 text-left align-top font-semibold tracking-tight backdrop-blur",
                      c.highlight ? "text-ink" : "text-ink-700",
                    )}
                  >
                    <div className="flex items-baseline gap-2">
                      <span>{c.name}</span>
                      {c.highlight ? (
                        <span className="rounded bg-ember-500 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-white">
                          Us
                        </span>
                      ) : null}
                    </div>
                  </th>
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className="border-b border-ink-100 px-3 py-4 align-top tnum"
                    >
                      <Cell value={c[col.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile — stacked cards */}
        <div className="mt-10 grid gap-4 sm:hidden">
          {COMPETITORS.map((c) => (
            <article
              key={c.name}
              className={cn(
                "rounded-lg border bg-paper p-5 transition",
                c.highlight
                  ? "border-ember-500 shadow-lift"
                  : "border-ink-100",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-lg font-extrabold tracking-tightest text-ink">
                  {c.name}
                </h3>
                {c.highlight ? (
                  <span className="rounded bg-ember-500 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-white">
                    Us
                  </span>
                ) : null}
              </div>
              <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
                {COLUMNS.map((col) => (
                  <div key={col.key} className="contents">
                    <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400 self-center">
                      {col.short}
                    </dt>
                    <dd className="text-right tnum text-ink-700">
                      <Cell value={c[col.key]} />
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>

        <p className="mt-8 max-w-3xl font-mono text-xs leading-relaxed text-ink-400">
          * Prices reflect publicly listed plans as of May 2026 and use the
          values from our long-form essay &ldquo;Your SaaS subscription is a
          tax you pay forever.&rdquo; A formal pricing fact-check is scheduled
          for the same day this page was published. Vendor pricing changes
          frequently — confirm with the vendor before signing.
        </p>
      </div>
    </section>
  );
}

function Cell({ value }: { value: Mark }) {
  if (value === "yes") {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-shipped-600">
        <span aria-hidden className="text-base">✓</span>
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-ink-300">
        <span aria-hidden className="text-base">✗</span>
        <span className="sr-only">No</span>
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-ember-600">
        <span aria-hidden className="text-base leading-none">◐</span>
        <span>Partial</span>
      </span>
    );
  }
  return <span className="font-semibold text-ink-700">{value}</span>;
}

/* -------------------------------------------------------------------------- */
/* They can't do this                                                         */
/* -------------------------------------------------------------------------- */

const CALLOUTS: Array<{ eyebrow: string; title: string; body: string }> = [
  {
    eyebrow: "Ownership",
    title: "Your repo. Your domain. Your customer data.",
    body:
      "Every Day14 build runs on infrastructure registered to you — your Vercel project, your Supabase database, your Cloudflare zone. You get the GitHub repo on day one. Cancel us in year three and you walk away with the entire platform, schema documented, photos in your bucket, customers in your tenancy. No SaaS in the table above can give you that — by design, because their business depends on you not being able to leave.",
  },
  {
    eyebrow: "Customization",
    title: "Workflows that match your vertical, not the vendor’s roadmap.",
    body:
      "Splash Jacks needed a chemistry-reading data model that surfaces chlorine, salt cell, gallons, and storm-prep calculators. Buildbridge needed multi-county permit-portal integrations with Lee, Collier, and Charlotte. Jobber doesn’t ship that. Housecall Pro doesn’t either. We built both because the codebase is yours and a vertical-specific feature is one Prisma migration away, not a 6-month wait on someone else’s product manager.",
  },
  {
    eyebrow: "Branding",
    title: "Your customer never sees the word “Day14” on a screen.",
    body:
      "The portal URL is yourdomain.com/login. The receipts come from billing@yourdomain.com. The mobile PWA installs with your icon, your name. When your customer tells a friend who built this software, the honest answer is “they did” — because you own the repo. On Jobber that customer is using the Jobber app. On Day14 they are using yours.",
  },
];

function CantDoThis() {
  return (
    <section className="container-page py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">
          Three things no SaaS in the table can do
        </div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
          The hard parts you can&rsquo;t rent.
        </h2>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {CALLOUTS.map((c) => (
          <article key={c.eyebrow} className="card-pop flex h-full flex-col">
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-ember-600">
              {c.eyebrow}
            </div>
            <h3 className="mt-2 text-xl font-extrabold tracking-tightest text-ink">
              {c.title}
            </h3>
            <p className="mt-3 text-sm text-ink-500">{c.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* The 5-year math                                                            */
/* -------------------------------------------------------------------------- */

type MathRow = {
  label: string;
  formula: string;
  monthlyTotal: number;
  upfront: number;
  total: number;
  ownAtEnd: boolean;
  note?: string;
  highlight?: boolean;
};

const MATH_ROWS: MathRow[] = [
  {
    label: "Jobber Connect",
    formula: "$169/mo × 60 mo + $0 upfront",
    monthlyTotal: 10140,
    upfront: 0,
    total: 10140,
    ownAtEnd: false,
    note: "Cancel and your customer portal goes dark the same day.",
  },
  {
    label: "Day14 Portal",
    formula: "$5,000 upfront + $199/mo × 60 mo",
    monthlyTotal: 11940,
    upfront: 5000,
    total: 16940,
    ownAtEnd: true,
    note: "Cancel and you keep the repo, the domain, and the customers.",
    highlight: true,
  },
];

function FiveYearMath() {
  const delta = 16940 - 10140;
  return (
    <section className="border-y border-ink-100 bg-paper-50/60 py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4 justify-center">The five-year math</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            What you actually pay — and what you actually own.
          </h2>
          <p className="mt-5 text-ink-500">
            Multiply the monthly by 60. Add the upfront. The number on the right
            is what you write to the vendor over five years. The column after
            that is what you have to show for it.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {MATH_ROWS.map((r) => (
            <article
              key={r.label}
              className={cn(
                "flex flex-col rounded-lg border bg-paper p-7 transition",
                r.highlight
                  ? "border-ink shadow-lift"
                  : "border-ink-100",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-2xl font-extrabold tracking-tightest text-ink">
                  {r.label}
                </h3>
                {r.highlight ? (
                  <span className="rounded bg-ember-500 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-white">
                    Us
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-ink-400 tnum">
                {r.formula}
              </p>

              <dl className="mt-7 grid grid-cols-[1fr_max-content] gap-y-2 text-sm">
                <dt className="text-ink-500">Upfront</dt>
                <dd className="text-right font-semibold tnum text-ink">
                  <CountUp to={r.upfront} prefix="$" />
                </dd>
                <dt className="text-ink-500">Monthly × 60</dt>
                <dd className="text-right font-semibold tnum text-ink">
                  <CountUp to={r.monthlyTotal} prefix="$" />
                </dd>
                <dt className="border-t border-ink-100 pt-3 text-ink">
                  5-year total
                </dt>
                <dd className="border-t border-ink-100 pt-3 text-right text-xl font-extrabold tnum text-ink">
                  <CountUp to={r.total} prefix="$" />
                </dd>
              </dl>

              <div className="rule my-6" />

              <div className="eyebrow mb-2">After 60 months you own</div>
              <p
                className={cn(
                  "text-base font-semibold tracking-tight",
                  r.ownAtEnd ? "text-shipped-600" : "text-ink-400",
                )}
              >
                {r.ownAtEnd
                  ? "The platform. Repo, domain, database, customer relationships."
                  : "Nothing. The platform belongs to the vendor."}
              </p>
              {r.note ? (
                <p className="mt-3 text-sm text-ink-500">{r.note}</p>
              ) : null}
            </article>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-lg border border-ember-500/30 bg-ember-50/40 p-6 sm:p-7">
          <div className="eyebrow mb-2">The delta</div>
          <p className="text-lg text-ink">
            Day14 costs{" "}
            <span className="tnum font-extrabold">
              <CountUp to={delta} prefix="$" />
            </span>{" "}
            more than Jobber Connect over five years. That delta is what you
            pay for ownership. Year six onward your costs are flat. The SaaS
            costs keep climbing — every vendor in the table has raised prices
            in the last 24 months.
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center font-mono text-xs uppercase tracking-widest text-ink-400">
          Day14 Portal is the comparable SKU. Site ($2,500 + $99/mo) and
          Platform ($10,000 + $399/mo) flank it.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ subset                                                                 */
/* -------------------------------------------------------------------------- */

const FAQ_KEYWORDS = ["why not just use jobber", "do i own the code", "what if i cancel"];

function FaqSubset() {
  const items = FAQ_KEYWORDS.map((needle) =>
    FAQ.find((f) => f.q.toLowerCase().includes(needle)),
  ).filter((f): f is { q: string; a: string } => Boolean(f));

  return (
    <section className="container-page py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">Three honest questions</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
          The objections we hear every intro call.
        </h2>
      </div>

      <div className="mx-auto mt-12 max-w-3xl space-y-3">
        {items.map((item, i) => (
          <details
            key={item.q}
            className="group rounded-lg border border-ink-100 bg-paper-50 p-5 open:border-ink-200 sm:p-6"
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
            <div className="eyebrow mb-5 text-ember-300">
              Stop paying the rent
            </div>
            <h2 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">
              14 days from now, you could own the platform.
            </h2>
            <p className="mt-5 max-w-xl text-paper-200">
              Or you could spend the same fortnight signing up for another
              SaaS that rents you a generic backend forever. Book a 30-minute
              call. We&rsquo;ll pull up a live customer build, you tell us
              your business, and we&rsquo;ll quote you on the call.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href={SITE.bookingUrl}
              className="btn-ember w-full justify-center text-base"
            >
              Book a 30-min intro call
            </a>
            <Link
              href="/about"
              className="inline-flex w-full items-center justify-center rounded border border-paper-200/40 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-paper/10"
            >
              How Day14 works
            </Link>
            <div className="mt-2 text-center font-mono text-xs uppercase tracking-widest text-paper-300/60">
              Three slots open this month
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

