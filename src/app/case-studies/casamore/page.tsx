import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const CASE = {
  name: "Casamoré",
  industry: "Silent disco events · brand-heavy B2C",
  location: "Southwest Florida",
  sku: "Site",
  timeline: "Site tier — brand-led launch",
  url: "https://houseoflove.co",
  customerType:
    "B2C — events attendees, membership funnel, walk-up and ticketed audiences",
} as const;

export const metadata: Metadata = {
  title: `${CASE.name} — case study`,
  description: `How we built ${CASE.name} as a brand-first Day14 Site — full visual identity, 18 marketing pages, blog essay library, membership funnel, and merch presence.`,
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
      </div>

      <h1 className="mt-5 max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
        {CASE.name}
      </h1>

      <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
        A complete event-business launch — visual identity, 18 marketing pages,
        a content library of 19 on-brand essays, a poster series, merch mockups,
        a printable zine, and a MailerLite-powered membership funnel. This is
        Day14&rsquo;s Site tier exemplar — for a customer who needs a brand more
        than a back office.
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

function Surfaces() {
  const surfaces = [
    {
      tag: "Public",
      name: "Marketing website",
      body: "18 hand-designed pages: home, upcoming rituals, past events, about, FAQ, merch, zine, membership, contact, plus 5 event-detail templates. Every page is fully brand-system styled — no generic theme.",
    },
    {
      tag: "Content",
      name: "Essay & ritual library",
      body: "19 on-brand long-form blog essays anchoring the brand voice — manifesto pieces, event recaps, philosophy of silent-disco-as-ritual. Functions as both content marketing and brand bible.",
    },
    {
      tag: "Funnel",
      name: "Membership + email capture",
      body: "MailerLite-powered membership signup gated behind a custom form, with email automation, segmented audiences, and pre-event drip campaigns. Cloudflare Worker handles the form bridge.",
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
      title: "Brand identity",
      items: [
        "Full visual system — palette, typography, motif language",
        "Poster series (e.g. Ritual 01) with hand-illustrated assets",
        "Merch mockups (tees, totes, hats) and a printable zine",
        "Rebrand from House of Love → Casamoré, voice and tagline reset",
        "Custom logomark + secondary marks for sub-events",
        "Brand bible documenting voice rules, color tokens, do/don'ts",
      ],
    },
    {
      title: "Marketing surface",
      items: [
        "18 hand-designed marketing pages, all mobile-optimized",
        "Event detail templates with date, venue, capacity, ticketing link",
        "Past-events gallery with photo carousels",
        "About / philosophy page anchoring the silent-disco-as-ritual narrative",
        "FAQ and contact with form-bridge to operator email",
        "Custom 404 + landing transitions that stay on brand",
      ],
    },
    {
      title: "Content engine",
      items: [
        "19 essay-length blog posts (manifesto, event recaps, philosophy)",
        "Editorial calendar template for ongoing post cadence",
        "Tag system organizing posts by ritual, location, theme",
        "RSS feed for subscribers and aggregators",
        "OG image generation per post for shareable previews",
      ],
    },
    {
      title: "Membership + integrations",
      items: [
        "MailerLite list + automation flows (welcome, pre-event, recap)",
        "Cloudflare Worker form bridge for membership signup",
        "Segmented audience tags by event attended + interest",
        "Email templates matching brand system",
        "Discord / WhatsApp community link routing for members",
        "Cloudflare-hosted static delivery + global CDN edge cache",
      ],
    },
  ];

  return (
    <section className="container-page py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">What was actually built</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
          A complete brand surface, every page live.
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
    ["Framework", "Hand-built static HTML + CSS + JS"],
    ["Hosting", "Cloudflare Pages with global edge cache"],
    ["Serverless", "Cloudflare Workers for form bridge"],
    ["Email + automation", "MailerLite (lists, automations, audiences)"],
    ["Content", "19 essays in a hand-rolled blog system"],
    ["Brand", "Poster series, merch mockups, printable zine"],
    ["Domain", "houseoflove.co (Cloudflare-managed)"],
    ["Analytics", "Cloudflare Web Analytics, no third-party tracker"],
  ];

  return (
    <section className="border-y border-ink-100 bg-paper-50/60 py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4 justify-center">Stack</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Lightweight Site-tier stack. Fast everywhere, edge-cached globally.
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
  const days = [
    { d: "Day 1", t: "Rebrand discovery + new name landing on Casamoré" },
    { d: "Day 2", t: "Visual system: palette, type, motif language, logo marks" },
    { d: "Day 3", t: "Poster series + merch mockups + zine layout" },
    { d: "Day 4", t: "Page architecture, hand-build 8 core marketing pages" },
    { d: "Day 5", t: "Remaining 10 pages + event detail templates + 404" },
    { d: "Day 6", t: "MailerLite list setup + Cloudflare Worker form bridge" },
    { d: "Day 7", t: "Content library: 19 essays imported, tag system, RSS" },
    { d: "Day 8", t: "QA, mobile audit, brand consistency pass, launch" },
  ];

  return (
    <section className="container-page py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">The actual week</div>
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

function ResultsAndProof() {
  return (
    <section className="container-page py-20">
      <div className="rule mb-12" />
      <div className="grid gap-12 md:grid-cols-[1fr_1.3fr]">
        <div>
          <div className="eyebrow mb-4">Results</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            A brand the operator can actually run.
          </h2>
          <p className="mt-5 text-ink-500">
            Casamoré launched live with a full brand surface, a content engine
            ready to scale, and a membership funnel collecting email from day
            one. The site is built for the operator to extend — adding new
            events, essays, and poster drops without touching a developer.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Result label="Pages shipped" value="18" />
          <Result label="On-brand essays" value="19" />
          <Result label="Time to live" value="Site tier" />
          <Result label="Ongoing dev needed" value="zero" />
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
              Need a brand more than a back office?
            </h2>
            <p className="mt-4 max-w-xl text-paper-200">
              Site tier is $2,500 + $99/mo. Visual system, 5+ pages, blog
              engine, lead capture, AI chatbot, MailerLite or Resend wired. Out
              in 7 days.
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
