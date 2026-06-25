import type { Metadata } from "next";

import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";

/**
 * /faq — common questions, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 7/10 of the rebuild). Composed
 * directly from the shared shell (CanvasField backdrop + fixed Nav + ClosingCTA
 * + SiteFooter), matching /pricing, /about, /compare — the booking CTA must sit
 * before the footer, which CinematicPage gives no slot for.
 *
 * The questions render as the canonical `.cin-detail-faq` accordion: native
 * <details>/<summary> elements (keyboard-accessible and screen-reader friendly
 * out of the box, with a +/– marker drawn in CSS and a token focus ring). The
 * Reveal entrances honor reduced-motion via the global `.reveal` guards.
 *
 * Content is preserved verbatim from the prior surface; only the skin changes.
 * No price is hard-coded into a Day14 tier shape here — the competitor "$69–
 * $329/mo" figures and the "$200/hr" change rate are third-party / service-rate
 * prose, not a Day14 SKU, so `check:prices` stays clean.
 */

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Common questions about Day14: pricing, ownership, AI agents, timelines, cancellation, technical stack.",
  alternates: { canonical: "/faq" },
};

const FAQS: { q: string; a: string }[] = [
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
    a: "No. We have shipped service-business platforms, brand-heavy event sites, two-sided marketplaces, and autonomous POD stores. Anything that fits in Spark / Local / Portal / Platform we will quote on the call.",
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
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        {/* Hero — editorial header in the 760px column. */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-kicker">
            FAQ
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            The questions every small-business owner asks.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            If yours is not here, the intro call is the place to ask — 20
            minutes, no deck, and a fixed quote inside 48 hours. We tell you on
            the call if it is a fit.
          </Reveal>
        </header>

        {/* The questions — native details/summary accordion. */}
        <section className="cin-detail">
          <div className="cin-detail-faqs">
            {FAQS.map((f) => (
              <details key={f.q} className="cin-detail-faq">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA — book (Cal.com) + email fallback. */}
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
