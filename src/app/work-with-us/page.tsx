import type { Metadata } from "next";
import Link from "next/link";
import { SITE, PITCH } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const TITLE = `Work with ${SITE.brand}`;
const DESCRIPTION = `Hire ${SITE.brand} to build your business platform — a multi-tenant Next.js stack with an autonomous-agent layer baked in. Marketing site, customer portal, billing, admin, AI agents. One operator, fixed scope, owned by you.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/work-with-us" },
  openGraph: {
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
    url: `https://${SITE.domain}/work-with-us`,
    siteName: SITE.brand,
    type: "website",
    images: [
      {
        url: "/og/work-with-us.png",
        width: 1200,
        height: 630,
        alt: `${TITLE} — ${SITE.brand}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
    images: ["/og/work-with-us.png"],
  },
};

export default function WorkWithUsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <WhatWeBuild />
        <WhoItsFor />
        <Engagements />
        <PricingShape />
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
      <div className="eyebrow mb-6">Work with {SITE.brand}</div>
      <h1 className="max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
        Hire {SITE.brand} to build
        <br className="hidden sm:block" /> your business — not a project.
      </h1>
      <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
        {SITE.brand} ships full-stack business platforms on a Next.js core
        with an autonomous-agent layer baked in. Marketing site, customer
        portal, billing, admin, AI agents — multi-tenant from day one, owned
        by you on day fourteen.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <Link href="/intake" className="btn-ember">
          Get a build estimate
        </Link>
        <a href={SITE.bookingUrl} className="btn-ghost">
          Or book a 30-min intro call
        </a>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function WhatWeBuild() {
  const layers = [
    {
      label: "The stack",
      title: "Next.js + Postgres + Stripe, multi-tenant by default.",
      body: "Every Day14 build sits on the same hardened core: Next.js 15 app-router, Postgres, Stripe Connect, magic-link auth, Resend + Twilio. Multi-tenant routing means new brands drop in as a slug, not a fork. You get the stack the studio uses to run its own businesses.",
    },
    {
      label: "The agent layer",
      title: "Autonomous Claude agents wired into the platform.",
      body: "Every build ships with an AI chatbot trained on the business, an admin co-pilot for daily ops, and a fleet of scheduled agents that triage leads, draft replies, and run nightly QA. The agents aren't a demo — they're how the studio itself operates.",
    },
    {
      label: "What ships",
      title: "Marketing site, customer portal, billing, admin, agents — all of it.",
      body: "Public site with SEO landing pages and chat. Magic-link customer portal with self-service and Stripe billing. Operator admin with CRUD, photo-proof, dispatch, broadcasts, exports. Dynamic OG images, sitemap, monitoring. The whole stack — not the marketing slice.",
    },
  ];

  return (
    <section className="container-page py-16">
      <div className="rule mb-12" />
      <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
        <div>
          <div className="eyebrow mb-4">What Day14 builds</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            A complete platform on a productized core.
          </h2>
          <p className="mt-5 text-ink-500">
            Same stack every time. Same agent layer every time. Different
            brand, different vertical, different go-to-market — but the
            foundation doesn&rsquo;t get reinvented per client.
          </p>
        </div>

        <div className="space-y-6">
          {layers.map((l) => (
            <div
              key={l.label}
              className="rounded-lg border border-ink-100 bg-paper-50 p-6"
            >
              <div className="font-mono text-xs uppercase tracking-widest text-ember-600">
                {l.label}
              </div>
              <h3 className="mt-2 text-xl font-bold tracking-tightest text-ink">
                {l.title}
              </h3>
              <p className="mt-3 text-ink-700">{l.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function WhoItsFor() {
  const fits = [
    "Founders who want a working empire, not a project — the platform shipped, the agents live, the brand handed over with the keys.",
    "Operators who already run a real business and need software that respects how the work actually flows.",
    "Builders adding a second or third brand to a portfolio who don't want to rebuild the stack each time.",
  ];
  const notFits = [
    "Teams who want a Figma file, six weeks of discovery, and an agency-style change-order process.",
    "Anyone shopping a SaaS subscription. Day14 ships code you own, not seats you rent.",
    "Stealth-mode ideas that won't talk to a real customer for six months. Day14 ships things that go live.",
  ];

  return (
    <section className="border-y border-ink-100 bg-paper-50/60 py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4 justify-center">Who it&rsquo;s for</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Built for founders who want to ship.
          </h2>
          <p className="mt-5 text-ink-500">{PITCH.founderAngle}</p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="card-pop">
            <div className="font-mono text-xs uppercase tracking-widest text-ember-600">
              Good fit
            </div>
            <ul className="mt-4 space-y-3">
              {fits.map((f) => (
                <li key={f} className="flex gap-3 text-sm text-ink-700">
                  <span
                    aria-hidden
                    className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500"
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card-pop">
            <div className="font-mono text-xs uppercase tracking-widest text-ink-400">
              Not a fit
            </div>
            <ul className="mt-4 space-y-3">
              {notFits.map((f) => (
                <li key={f} className="flex gap-3 text-sm text-ink-700">
                  <span
                    aria-hidden
                    className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300"
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Engagements() {
  return (
    <section className="container-page py-20">
      <div className="max-w-2xl">
        <div className="eyebrow eyebrow-rule mb-5">Two paths</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-[2.75rem] sm:leading-[1.03]">
          Pick the shape that fits.
        </h2>
        <p className="mt-5 text-ink-500">
          Most engagements land in one of two buckets. The intake form asks a
          few questions and routes you to the right one — or to a real
          conversation if neither fits cleanly.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="card-pop">
          <div className="font-mono text-xs uppercase tracking-widest text-ember-600">
            Path 1 · Build me a business
          </div>
          <h3 className="mt-3 text-2xl font-bold tracking-tightest text-ink">
            Full tenant scaffold + agents.
          </h3>
          <p className="mt-4 text-ink-700">
            You&rsquo;re starting from a brand and an idea. Day14 stands up a
            new tenant on the platform — marketing site, customer portal,
            admin, billing, AI chatbot, the scheduled-agent fleet — and hands
            you the keys.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-ink-700">
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500"
              />
              <span>New brand spun up as a Day14 tenant</span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500"
              />
              <span>Marketing site, portal, admin, billing, agents</span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500"
              />
              <span>Fixed scope, fixed timeline, hand-off on day fourteen</span>
            </li>
          </ul>
          <p className="mt-6 text-sm text-ink-500">
            Best for: founders launching a new brand, operators digitizing a
            real-world business, portfolio builders adding tenant #2 or #3.
          </p>
        </div>

        <div className="card-pop">
          <div className="font-mono text-xs uppercase tracking-widest text-ember-600">
            Path 2 · Add to my Day14
          </div>
          <h3 className="mt-3 text-2xl font-bold tracking-tightest text-ink">
            Drop into an existing empire.
          </h3>
          <p className="mt-4 text-ink-700">
            You already run on Day14 — or on a stack close enough that the
            agent layer slots in. Day14 ships a discrete addition: a new
            module, a new agent, a new brand, a new vertical inside the same
            multi-tenant core.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-ink-700">
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500"
              />
              <span>Scoped addition to an existing platform</span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500"
              />
              <span>New agents, new modules, or a new tenant slug</span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500"
              />
              <span>Shorter timeline, reuses the existing core</span>
            </li>
          </ul>
          <p className="mt-6 text-sm text-ink-500">
            Best for: existing Day14 tenants growing into new surface area, or
            operators with a Next.js stack who want the agent layer.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function PricingShape() {
  return (
    <section className="container-page pb-20">
      <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
        <div>
          <div className="eyebrow mb-4">Pricing shape</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Productized, but not vending-machine.
          </h2>
          <p className="mt-5 text-ink-500">
            Day14 publishes its SKUs on the homepage as a starting point.
            Most builds land near a SKU and a few land somewhere between
            them. The honest answer on price is the one you get on the intro
            call.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-ink-100 bg-paper p-6">
            <div className="flex items-baseline justify-between gap-4">
              <div className="font-mono text-xs uppercase tracking-widest text-ember-600">
                Build me a business
              </div>
              <div className="font-mono text-xs uppercase tracking-widest text-ink-400">
                Starts at the Site SKU
              </div>
            </div>
            <p className="mt-3 text-ink-700">
              Sized by what ships: marketing-only, marketing + portal, or
              the full operator platform. Fixed price once the SKU is set.
              See the{" "}
              <a
                href="/#sku"
                className="font-medium text-ink underline-offset-2 hover:underline"
              >
                SKU board on the homepage
              </a>{" "}
              for the public range — your actual number lands on the call.
            </p>
          </div>

          <div className="rounded-lg border border-ink-100 bg-paper p-6">
            <div className="flex items-baseline justify-between gap-4">
              <div className="font-mono text-xs uppercase tracking-widest text-ember-600">
                Add to my Day14
              </div>
              <div className="font-mono text-xs uppercase tracking-widest text-ink-400">
                Starting at — let&rsquo;s talk
              </div>
            </div>
            <p className="mt-3 text-ink-700">
              Scoped per addition. A new agent, a new module, or a new
              tenant inside the existing core all price differently. Most
              additions ship inside a week. Bring the spec, get a number.
            </p>
          </div>

          <div className="rounded-lg border border-ink-100 bg-paper-50 p-6 text-sm text-ink-500">
            No 4am haggling. No quote inflation to leave room for a discount.
            The SKUs are public, the scope is fixed, and if the fit
            isn&rsquo;t there {SITE.ownerHandle} will say so on the call.
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="container-page pb-24">
      <div className="overflow-hidden rounded-xl bg-ink p-10 text-paper sm:p-14">
        <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">
              Tell us about the business. Get a real estimate.
            </h2>
            <p className="mt-4 max-w-xl text-paper-200">
              The intake form takes about ten minutes. It asks the questions
              that change the price — vertical, scope, integrations, brand
              assets — and routes you to {SITE.ownerHandle} with the answers
              already in hand.
            </p>
          </div>
          <div>
            <Link
              href="/intake"
              className="btn-ember w-full justify-center text-base"
            >
              Get a build estimate
            </Link>
            <a
              href={SITE.bookingUrl}
              className="mt-3 inline-flex w-full items-center justify-center rounded border border-paper-200/40 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-paper/10 focus-visible:ring-offset-ink"
            >
              Or book a 30-min intro call
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
