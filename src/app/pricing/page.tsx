import type { Metadata } from "next";

import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { Pricing } from "@/components/cinematic/Pricing";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";
import { getPaymentLinks } from "@/lib/payment-links";
import { PRICING_NOTES } from "@/lib/pricing";

/**
 * /pricing — the standalone pricing page, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 2/10 of the rebuild): the shared
 * shell (CanvasField backdrop + fixed Nav + SiteFooter), the cinematic
 * <Pricing> card section, and the .cin-detail-faq accordion. Composed directly
 * (not via CinematicPage) because the pricing card grid needs the full-width
 * layout, while the narrative blocks sit in the 760px .cin-detail column —
 * the same pattern /platform/[slug] uses.
 *
 * PRICING INTEGRITY: every number on this page flows from src/lib/pricing.ts
 * through the <Pricing> component and PRICING_NOTES. Nothing is hard-coded here,
 * so `npm run check:prices` stays clean. Copy is preserved from the existing
 * pricing + FAQ surfaces; only the skin changes.
 */

export const metadata: Metadata = {
  title: "Pricing — Day14",
  description:
    "Fixed price, fixed timeline, no SOWs. Spark, Local, Portal, or the full Platform — your build lives on Day14 OS, the same stack that runs all of mine. Every build includes 3 months of ops.",
  alternates: { canonical: "/pricing" },
};

/**
 * Pricing FAQ — copy preserved verbatim from the /faq surface, scoped to the
 * questions an owner asks while looking at prices. Static <details> accordion
 * (server-rendered, no client JS) reusing the .cin-detail-faq styles.
 */
const PRICING_FAQS: { q: string; a: string }[] = [
  {
    q: "Why is this so much cheaper than an agency?",
    a: "Agencies have project managers, designers, frontend, backend, QA, account managers. We have one operator and a fleet of agents. Same output, no overhead. We pass the savings on.",
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
    q: "What if I cancel?",
    a: "30 days notice, no annual contract. You keep the code, the domain, and the customer data. We unwire the integrations and walk you through self-hosting if you want it.",
  },
  {
    q: "Do I own the code?",
    a: "Yes. The repo is in your name on GitHub from day one. If you cancel hosting we hand you a tarball and a migration runbook so you can take it in-house or to another developer.",
  },
];

export default function PricingPage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        {/* Hero — left-aligned editorial header in the 760px column. */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-kicker">
            Pricing · build studio
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            Fixed price, fixed timeline, no SOWs.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            Pick the size that fits the job. Your build lives on Day14 OS — the
            same stack that runs all of mine — and moves up a tier whenever you
            are ready. Pay only the difference.
          </Reveal>
        </header>

        {/* Cards — every tier + the Platform line, all numbers from pricing.ts. */}
        <Pricing links={getPaymentLinks()} />

        {/* Guarantee / ops-included framing + narrative FAQ, 760px column. */}
        <div className="cin-detail">
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Every build, no asterisks
            </Reveal>
            <div className="cin-prose">
              <ul>
                <li>{PRICING_NOTES.opsIncluded}</li>
                <li>
                  Fixed price, fixed timeline — no statements of work, no scope
                  creep, no surprise invoices.
                </li>
                <li>
                  You own the code, the domain, and the customer data from day
                  one. Cancel anytime on 30 days&apos; notice and take it with
                  you.
                </li>
                <li>{PRICING_NOTES.noGames}</li>
              </ul>
            </div>
          </section>

          <section className="cin-detail-block cin-detail-outcome">
            <Reveal as="p">
              If your Portal is not live and accepting real customer payments by
              end of day 14, your deposit refunds in full — and you keep
              everything we have shipped. We carry the timeline risk so you do
              not.
            </Reveal>
          </section>

          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Also: GEO — AI search visibility
            </Reveal>
            <div className="cin-prose">
              <p>
                Builds get you a front door. GEO gets you named when someone
                asks ChatGPT, Perplexity, or Google AI who to hire — scored
                out of 20, re-measured monthly, transcripts included. It has
                its own page and its own pricing:{" "}
                <a href="/geo">see how GEO works →</a>
              </p>
            </div>
          </section>

          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Questions about pricing
            </Reveal>
            <div className="cin-detail-faqs">
              {PRICING_FAQS.map((f) => (
                <details key={f.q} className="cin-detail-faq">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Closing CTA — book (Cal.com) + email fallback, wired in ClosingCTA. */}
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
