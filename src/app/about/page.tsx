import type { Metadata } from "next";
import Link from "next/link";
import { SITE, PITCH, CASE_STUDIES } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About",
  description: `${SITE.brand} is one operator (${SITE.ownerHandle}) using AI agents to ship complete business platforms in 14 days. Built in ${SITE.location}.`,
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <TheModel />
        <TheProof />
        <WhatIDontDo />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  return (
    <section className="container-page pt-14 pb-12 sm:pt-20">
      <div className="eyebrow mb-6">About {SITE.brand}</div>
      <h1 className="max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
        One operator. AI agents.
        <br className="hidden sm:block" /> Real businesses, shipped.
      </h1>
      <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
        {SITE.brand} is {SITE.ownerHandle} — a solo operator in {SITE.location}
        {" "}who runs his own small businesses and ships software for others
        who run theirs. No agency. No project managers. No quotes. Just one
        builder, a fleet of AI agents, and a productized 14-day playbook.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <a href={SITE.bookingUrl} className="btn-ember">
          Book a 30-min intro call
        </a>
        <Link href="/#case-studies" className="btn-ghost">
          See the work
        </Link>
      </div>
    </section>
  );
}

function TheModel() {
  return (
    <section className="container-page py-16">
      <div className="rule mb-12" />

      <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
        <div>
          <div className="eyebrow mb-4">The model</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            How a one-operator shop ships the same scope as a 10-person agency.
          </h2>
        </div>

        <div className="space-y-6 text-ink-700">
          <p>
            Most agencies stack overhead: project managers, account managers,
            designers, frontend, backend, QA, devops. Six people in a meeting
            to decide a button color. The customer pays for all of them,
            timeline and price.
          </p>
          <p>
            Day14 strips it down to one operator running AI agents
            (Claude-based) inside Cowork. The agents handle the volume work —
            scaffolding, repetitive code, content generation, QA scans. The
            operator handles the judgment work — architecture, customer
            relationships, the moments where the agent doesn&rsquo;t know what
            to do next.
          </p>
          <p>
            The result is a productized agency that ships the full stack
            (marketing site + customer portal + billing + admin + AI chatbot
            + SMS) in 14 days for $5k–$10k — same scope an agency would charge
            $50k+ and take 6 months for.
          </p>
          <p className="text-ink-500">
            {PITCH.founderAngle}
          </p>
        </div>
      </div>
    </section>
  );
}

function TheProof() {
  return (
    <section className="border-y border-ink-100 bg-paper-50/60 py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4 justify-center">The proof</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Builder of his own businesses first.
          </h2>
          <p className="mt-5 text-ink-500">
            Every {SITE.brand} build is shaped by lessons from running a real
            business. {SITE.ownerHandle} is customer #0 of the field-service
            Platform shell — he dispatches real pool-service visits through it
            every week. That&rsquo;s a different worldview than an agency
            developer who&rsquo;s never logged into Stripe Connect after launch.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-3">
          {CASE_STUDIES.map((cs) => (
            <Link
              key={cs.slug}
              href={`/case-studies/${cs.slug}`}
              className="card-pop block"
            >
              <div className="font-mono text-xs uppercase tracking-widest text-ember-600">
                {cs.sku}
              </div>
              <h3 className="mt-2 text-lg font-bold tracking-tightest text-ink">
                {cs.name}
              </h3>
              <p className="mt-1 text-xs text-ink-400">{cs.industry}</p>
              <p className="mt-3 text-sm text-ink-500">{cs.summary.split(".")[0]}.</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatIDontDo() {
  const dont = [
    "I don't run your business operations. Day14 ships the platform; you ship the work.",
    "I don't design logos from scratch. Use what you have, or bring a designer (I know good ones).",
    "I don't take on more than 3 active builds at once. The whole pitch is shipped-in-14, not stuck-on-a-waitlist-for-14-weeks.",
    "I don't run paid ads, write blog posts, or manage your social. The Day14 monthly covers hosting + maintenance, not marketing services.",
    "I don't quote at 4am for someone who wants to argue about price. The SKUs are public and fixed. If they don't fit, that's a real answer, not a haggle.",
    "I don't promise things I can't ship. The day-14-or-deposit-back guarantee is the price of saying it.",
  ];

  return (
    <section className="container-page py-20">
      <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
        <div>
          <div className="eyebrow mb-4">What I don&rsquo;t do</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Just as important as the list of what&rsquo;s in scope.
          </h2>
          <p className="mt-5 text-ink-500">
            Productized agencies stay profitable because they say no a lot.
            Here&rsquo;s the no-list.
          </p>
        </div>

        <ul className="space-y-3">
          {dont.map((d) => (
            <li
              key={d}
              className="flex gap-3 rounded-lg border border-ink-100 bg-paper-50 p-4 text-ink-700"
            >
              <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="container-page pb-24">
      <div className="overflow-hidden rounded-xl bg-ink p-10 text-paper sm:p-14">
        <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">
              30 minutes. No pitch deck. Just the live demo.
            </h2>
            <p className="mt-4 max-w-xl text-paper-200">
              We pull up the live builds on the call, you tell me about your
              business, I tell you which SKU fits and what we&rsquo;d ship in
              14 days. If it&rsquo;s not a fit, I say so on the call.
            </p>
          </div>
          <div>
            <a
              href={SITE.bookingUrl}
              className="btn-ember w-full justify-center text-base"
            >
              Book a 30-min intro call
            </a>
            <a
              href={`mailto:${SITE.email}`}
              className="mt-3 inline-flex w-full items-center justify-center rounded border border-paper-200/40 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-paper/10"
            >
              Or email {SITE.email}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
