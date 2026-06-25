import type { Metadata } from "next";

import { SITE, PITCH, FAQ } from "@/lib/site";
import { SERVICE_TIERS } from "@/lib/pricing";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";

/**
 * /compare — Day14 vs the SaaS alternatives, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 5/10 of the rebuild). Composed
 * directly from the shared shell (CanvasField backdrop + fixed Nav + ClosingCTA
 * + SiteFooter) like /pricing (block 2) and /about (block 4) — the booking CTA
 * must sit before the footer, which CinematicPage gives no slot for.
 *
 * The comparison table lives in a wide `.cin-compare` column (1140px, wider than
 * the 760px narrative measure) so ten columns can breathe: dark-readable with
 * token borders, zebra striping, a sticky header + sticky first column on
 * desktop, an accent-railed "us" row, and a stacked-card fallback under 720px.
 * The five-year math reuses the same card grid. Honest framing is preserved
 * verbatim from the prior surface; only the skin changes.
 *
 * PRICING INTEGRITY: Day14's row and the five-year math are computed live from
 * src/lib/pricing.ts (the Portal tier — setup + monthly), never hard-coded, so
 * `check:prices` stays clean. Competitor figures (Jobber/Housecall/GHL/
 * Squarespace/agency) are public third-party plan prices, intentionally kept
 * as-is and not tier-shaped.
 */

// Day14's own numbers come from pricing.ts (SERVICE_TIERS). Guard the lookups
// rather than asserting non-null — these pages are statically generated, so a
// missing slug should degrade, not hard-fail the whole site build.
const T = Object.fromEntries(SERVICE_TIERS.map((t) => [t.slug, t]));
const PORTAL = T.portal;
const LOCAL = T.local;
const PLATFORM = T.platform;
const PORTAL_MONTHLY = PORTAL?.monthly ?? 0;
const PORTAL_SETUP = PORTAL?.setup ?? 0;
const PLATFORM_FLOOR =
  PLATFORM?.setup ??
  Number((PLATFORM?.setupLabel ?? "").replace(/[^0-9]/g, "")) ??
  0;

const usd = (n: number) => `$${n.toLocaleString()}`;

export const metadata: Metadata = {
  title: "Day14 vs Jobber, Housecall Pro, GoHighLevel, Squarespace",
  description:
    "Why not just use Jobber for $69/mo? The honest comparison: monthly cost, code ownership, branding, customizability, and the five-year math.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        <Hero />
        <ComparisonTable />
        <CantDoThis />
        <FiveYearMath />
        <FaqSubset />
      </main>

      <ClosingCTA />
      <SiteFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <header className="cin-detail">
      <Reveal as="div" className="cin-kicker">
        Day14 vs the alternatives
      </Reveal>
      <Reveal as="h1" delayStep={1} className="cin-page-h1">
        Stop renting. Own your platform.
      </Reveal>
      <Reveal as="p" delayStep={2} className="cin-page-lede">
        {PITCH.vsSaaS}
      </Reveal>
      <Reveal as="p" delayStep={3} className="cin-detail-body">
        Below is the honest comparison — monthly cost, what you actually own,
        what you can customize, and the five-year math. No marketing spin. The
        numbers and the checkmarks are what they are.
      </Reveal>
      <Reveal as="div" delayStep={3} className="cin-hcta cin-detail-cta">
        <a
          className="cin-btn cin-btn-solid"
          href={SITE.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-cta="book_compare_hero"
        >
          Book a 15-min intro call
        </a>
        <a className="cin-btn" href="/about">
          How Day14 works →
        </a>
      </Reveal>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Comparison table                                                           */
/* -------------------------------------------------------------------------- */

type Mark = "yes" | "no" | "partial" | string;

type Competitor = {
  name: string;
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
    monthly: `$${PORTAL_MONTHLY}/mo`,
    upfront: usd(PORTAL_SETUP),
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
  short: string;
}> = [
  { key: "monthly", short: "Monthly" },
  { key: "upfront", short: "Upfront" },
  { key: "shipTime", short: "Ship" },
  { key: "ownsCode", short: "Own code" },
  { key: "branding", short: "Branding" },
  { key: "portalFlex", short: "Portal flex" },
  { key: "chatbot", short: "AI chatbot" },
  { key: "photoProof", short: "Photo proof" },
  { key: "multiCounty", short: "Multi-county" },
];

function ComparisonTable() {
  return (
    <section id="table" className="cin-compare">
      <Reveal className="cin-compare-head">
        <div className="cin-kicker">The honest table</div>
        <h2 className="cin-detail-h2">
          What each platform actually does — and what it costs.
        </h2>
        <p className="cin-compare-sub">
          Checkmarks where the platform genuinely ships the feature. Partial
          when it&rsquo;s technically there but in a vendor-branded, locked-in
          form. An X when you&rsquo;re on your own.
        </p>
      </Reveal>

      {/* Desktop / tablet — sticky-header scrolling table. */}
      <Reveal className="cin-compare-scroll">
        <table className="cin-compare-table">
          <thead>
            <tr>
              <th scope="col">Platform</th>
              {COLUMNS.map((c) => (
                <th key={c.key} scope="col">
                  {c.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPETITORS.map((c) => (
              <tr key={c.name} className={c.highlight ? "is-us" : undefined}>
                <th scope="row">
                  <span className="cin-compare-name">
                    {c.name}
                    {c.highlight ? (
                      <span className="cin-compare-tag">Us</span>
                    ) : null}
                  </span>
                </th>
                {COLUMNS.map((col) => (
                  <td key={col.key}>
                    <Cell value={c[col.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>

      {/* Mobile — stacked cards. */}
      <div className="cin-compare-cards">
        {COMPETITORS.map((c) => (
          <article
            key={c.name}
            className={
              c.highlight ? "cin-compare-card is-us" : "cin-compare-card"
            }
          >
            <div className="cin-compare-card-h">
              <h3>{c.name}</h3>
              {c.highlight ? <span className="cin-compare-tag">Us</span> : null}
            </div>
            <dl>
              {COLUMNS.map((col) => (
                <div key={col.key} style={{ display: "contents" }}>
                  <dt>{col.short}</dt>
                  <dd>
                    <Cell value={c[col.key]} />
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <p className="cin-compare-note">
        * Prices reflect publicly listed plans as of May 2026 and use the values
        from our long-form essay &ldquo;Your SaaS subscription is a tax you pay
        forever.&rdquo; A formal pricing fact-check is scheduled for the same day
        this page was published. Vendor pricing changes frequently — confirm with
        the vendor before signing.
      </p>
    </section>
  );
}

function Cell({ value }: { value: Mark }) {
  if (value === "yes") {
    return (
      <span className="cin-mark-yes">
        <span aria-hidden>✓</span>
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="cin-mark-no">
        <span aria-hidden>✗</span>
        <span className="sr-only">No</span>
      </span>
    );
  }
  if (value === "partial") {
    return <span className="cin-mark-partial">Partial</span>;
  }
  return <span>{value}</span>;
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
    <section className="cin-compare">
      <Reveal className="cin-compare-head">
        <div className="cin-kicker">
          Three things no SaaS in the table can do
        </div>
        <h2 className="cin-detail-h2">The hard parts you can&rsquo;t rent.</h2>
      </Reveal>

      <Reveal className="cin-compare-grid" stagger>
        {CALLOUTS.map((c) => (
          <article key={c.eyebrow} className="cin-compare-tile">
            <p className="cin-compare-tile-eyebrow">{c.eyebrow}</p>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </article>
        ))}
      </Reveal>
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
    formula: `${usd(PORTAL_SETUP)} upfront + $${PORTAL_MONTHLY}/mo × 60 mo`,
    monthlyTotal: PORTAL_MONTHLY * 60,
    upfront: PORTAL_SETUP,
    total: PORTAL_SETUP + PORTAL_MONTHLY * 60,
    ownAtEnd: true,
    note: "Cancel and you keep the repo, the domain, and the customers.",
    highlight: true,
  },
];

function FiveYearMath() {
  const delta = MATH_ROWS[1]!.total - MATH_ROWS[0]!.total;
  const flank =
    LOCAL && PLATFORM
      ? `Day14 Portal is the comparable SKU. Local (${usd(
          LOCAL.setup ?? 0,
        )} + $${LOCAL.monthly}/mo) and Platform (from ${usd(
          PLATFORM_FLOOR,
        )} + $${PLATFORM.monthly}/mo) flank it.`
      : "Day14 Portal is the comparable SKU.";

  return (
    <section className="cin-compare">
      <Reveal className="cin-compare-head">
        <div className="cin-kicker">The five-year math</div>
        <h2 className="cin-detail-h2">
          What you actually pay — and what you actually own.
        </h2>
        <p className="cin-compare-sub">
          Multiply the monthly by 60. Add the upfront. The number at the bottom
          is what you write to the vendor over five years. The line after that is
          what you have to show for it.
        </p>
      </Reveal>

      <Reveal className="cin-compare-grid is-2" stagger>
        {MATH_ROWS.map((r) => (
          <article
            key={r.label}
            className={
              r.highlight ? "cin-compare-tile is-us" : "cin-compare-tile"
            }
          >
            <div className="cin-compare-card-h">
              <h3 style={{ margin: 0 }}>{r.label}</h3>
              {r.highlight ? <span className="cin-compare-tag">Us</span> : null}
            </div>
            <p className="cin-math-formula">{r.formula}</p>

            <dl className="cin-math-rows">
              <dt>Upfront</dt>
              <dd>{usd(r.upfront)}</dd>
              <dt>Monthly × 60</dt>
              <dd>{usd(r.monthlyTotal)}</dd>
              <dt className="cin-math-total-l">5-year total</dt>
              <dd className="cin-math-total-v">{usd(r.total)}</dd>
            </dl>

            <p className="cin-math-own-label">After 60 months you own</p>
            <p
              className={
                r.ownAtEnd ? "cin-math-own is-yes" : "cin-math-own is-no"
              }
            >
              {r.ownAtEnd
                ? "The platform. Repo, domain, database, customer relationships."
                : "Nothing. The platform belongs to the vendor."}
            </p>
            {r.note ? <p className="cin-math-note">{r.note}</p> : null}
          </article>
        ))}
      </Reveal>

      <Reveal className="cin-compare-delta">
        <div className="cin-kicker" style={{ marginBottom: 0 }}>
          The delta
        </div>
        <p>
          Day14 costs <strong>{usd(delta)}</strong> more than Jobber Connect over
          five years. That delta is what you pay for ownership. Year six onward
          your costs are flat. The SaaS costs keep climbing — every vendor in the
          table has raised prices in the last 24 months.
        </p>
      </Reveal>

      <p className="cin-compare-flank">{flank}</p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ subset                                                                 */
/* -------------------------------------------------------------------------- */

const FAQ_KEYWORDS = [
  "why not just use jobber",
  "do i own the code",
  "what if i cancel",
];

function FaqSubset() {
  const items = FAQ_KEYWORDS.map((needle) =>
    FAQ.find((f) => f.q.toLowerCase().includes(needle)),
  ).filter((f): f is { q: string; a: string } => Boolean(f));

  return (
    <section className="cin-detail">
      <Reveal as="div" className="cin-kicker">
        Three honest questions
      </Reveal>
      <Reveal as="h2" delayStep={1} className="cin-detail-h2">
        The objections we hear every intro call.
      </Reveal>

      <div className="cin-detail-faqs" style={{ marginTop: "2.5rem" }}>
        {items.map((item) => (
          <details key={item.q} className="cin-detail-faq">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
