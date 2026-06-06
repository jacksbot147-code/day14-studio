import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "FAQ — Day14",
  description:
    "Common questions about Day14: pricing, ownership, AI agents, timelines, cancellation, technical stack.",
};

const FAQS = [
  {
    q: "Why not just use Jobber, Housecall Pro, or GoHighLevel?",
    a: "Because you are renting. SaaS platforms charge $69–$329/mo forever, lock you into their templates, hold your customer data, and put their branding inside your customer-facing app. Day14 builds you something that is yours — your domain, repo, database, customer relationships.",
  },
  {
    q: "Do I own the code?",
    a: "Yes. The repo is in your name on GitHub from day one. If you cancel hosting we hand you a tarball and a migration runbook so you can take it in-house or to another developer.",
  },
  {
    q: "Is this actually built by AI?",
    a: "It is built by one operator using Claude-based agents to do the heavy lifting. We review every line, write the architecture, and own every customer relationship. The agents are the leverage; the judgment is human.",
  },
  {
    q: "What if I cancel?",
    a: "30 days notice, no annual contract. You keep the code, the domain, and the customer data. We unwire the integrations and walk you through self-hosting if you want it.",
  },
  {
    q: "Why is this so much cheaper than an agency?",
    a: "Agencies have project managers, designers, frontend, backend, QA, account managers. We have one operator and a fleet of agents. Same output, no overhead. We pass the savings on.",
  },
  {
    q: "Do you only do service businesses?",
    a: "No. We have shipped service-business platforms, brand-heavy event sites, two-sided marketplaces, and autonomous POD stores. Anything that fits in Site / Portal / Platform we will quote on the call.",
  },
  {
    q: "What about hosting and infrastructure costs?",
    a: "Included in your monthly fee. Vercel, Supabase, Resend, Twilio — all rolled in. No surprise bills, no separate vendor accounts to manage.",
  },
  {
    q: "What if I need changes after launch?",
    a: "Your monthly includes one hour of changes. Anything bigger is $200/hr with a 4-hour minimum, billed in advance. Major adds usually roll into a Platform upgrade.",
  },
  {
    q: "What is the launch-by-day-14-or-deposit-back guarantee?",
    a: "If your Portal is not live and accepting real customer payments by end of day 14, your deposit refunds in full and you keep everything we have shipped. We carry the timeline risk so you do not.",
  },
  {
    q: "Do you do logos and branding from scratch?",
    a: "Not from scratch. We use the logo and colors you already have. If you do not have a logo yet, we will point you to a designer we trust who can usually turn one around inside our 14-day window.",
  },
  {
    q: "Can I migrate off Day14 hosting?",
    a: "Yes. Everything we build runs on standard open-source infrastructure (Next.js, Postgres, Stripe). Any competent developer can take it over.",
  },
  {
    q: "Who owns the domain?",
    a: "You. Always. We register it in your name, or you bring your own. We never hold a customer's domain hostage.",
  },
];

export default function FAQPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page py-20 sm:py-28">
        <section className="mb-16 max-w-3xl">
          <span className="eyebrow eyebrow-rule mb-4">FAQ</span>
          <h1 className="mb-5">
            The questions every small-business owner{" "}
            <span className="marker">asks</span>.
          </h1>
          <p className="text-lg leading-relaxed text-ink-500 sm:text-xl">
            If yours is not here, ask on{" "}
            <a
              href="https://cal.com/day14/intro"
              className="underline decoration-ember-300 underline-offset-4 transition-colors hover:decoration-ember-500"
            >
              the intro call
            </a>{" "}
            or email{" "}
            <a
              href="mailto:hello@day14.us"
              className="underline decoration-ember-300 underline-offset-4 transition-colors hover:decoration-ember-500"
            >
              hello@day14.us
            </a>
            .
          </p>
        </section>

        <section className="mx-auto max-w-3xl">
          <div className="divide-y divide-ink-100 border-y border-ink-100">
            {FAQS.map((f, i) => (
              <details key={i} className="group py-6">
                <summary className="flex cursor-pointer list-none items-baseline gap-4">
                  <span className="font-mono text-xs font-bold tracking-[0.18em] text-ember-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-base font-bold leading-snug tracking-tighter text-ink sm:text-lg">
                    {f.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-ink-300 transition-transform duration-150 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="ml-10 mt-3 text-base leading-relaxed text-ink-500">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-20 border border-ink-100 bg-paper-50 p-8 sm:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow mb-3">Still have questions?</span>
            <h2 className="mb-3">20 minutes, no deck, fixed quote in 48 hours.</h2>
            <p className="mb-8 text-base leading-relaxed text-ink-500">
              We tell you on the call if it is a fit.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="https://cal.com/day14/intro" className="btn-primary">
                Book intro call
              </a>
              <Link href="/stack" className="btn-ghost">
                See the stack
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
