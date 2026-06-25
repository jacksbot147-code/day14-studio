import type { Metadata } from "next";

import { SITE } from "@/lib/site";
import { CinematicPage } from "@/components/cinematic/CinematicPage";
import { Reveal } from "@/components/cinematic/Reveal";

/**
 * /terms — Terms of Service, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 8/10 of the rebuild — legal + info).
 * Uses the shared <CinematicPage> shell (CanvasField backdrop + fixed Nav +
 * SiteFooter) with a hero, then renders the terms as clean long-form `.cin-prose`
 * for legible legal reading. Content is preserved verbatim from the prior
 * surface; only the skin changes.
 *
 * PRICING INTEGRITY: no Day14 tier price is hard-coded here — the "$200/hr"
 * change rate is a service term, not a SKU, and is not tier-shaped, so
 * `check:prices` stays clean.
 */

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The short version: you pay, we ship in 14 days, you own the code, 30-day cancel anytime.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "May 19, 2026";

export default function TermsPage() {
  return (
    <CinematicPage
      hero={{
        eyebrow: "Terms of service",
        title: "You pay, we ship, you own it.",
        lede: "The short version: a 50% deposit, a product in 14 days, the code in your name, and a 30-day cancel anytime. The full terms, below.",
      }}
    >
      <Reveal as="div" className="cin-prose">
        <p className="cin-prose-kicker">Last updated {UPDATED}</p>

        <h2>The deal</h2>
        <p>
          You sign an order form, you pay a 50% deposit, we ship your product in
          14 days (Portal SKU) or your deposit refunds in full. The remaining
          50% is due at launch. The monthly fee covers hosting + maintenance and
          is billed via Stripe.
        </p>

        <h2>What you get</h2>
        <ul>
          <li>The complete repo, in your name on GitHub, from day one.</li>
          <li>
            A live deployment on Vercel, in our hosting account (covered by the
            monthly).
          </li>
          <li>Your domain, registered in your name (or we use yours).</li>
          <li>
            30-minute training walk-through at launch + 1 hour of changes per
            month included.
          </li>
          <li>
            Email support at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>,
            replies within 24h on business days.
          </li>
        </ul>

        <h2>What we don&rsquo;t do</h2>
        <ul>
          <li>
            Custom logo design from scratch (we use your existing or refer you to
            a designer).
          </li>
          <li>
            Standing meetings or weekly status calls (the build-log is your
            status update).
          </li>
          <li>
            Free open-ended changes after launch — anything beyond your monthly
            hour is $200/hr or rolls into a Platform upgrade.
          </li>
        </ul>

        <h2>Cancellation</h2>
        <p>
          You can cancel monthly hosting at any time with 30 days notice. When
          you cancel, you keep the repo, the domain, and the customer data. We
          deliver a migration runbook so you can self-host or move to another
          developer.
        </p>

        <h2>Refunds</h2>
        <p>
          See the <a href="/refunds">refund policy</a>. Short version: if your
          Portal isn&rsquo;t live and accepting real customer payments by end of
          day 14, your deposit refunds in full and you keep everything
          we&rsquo;ve shipped.
        </p>

        <h2>Intellectual property</h2>
        <p>
          You own the code we write for you. We retain the right to use
          generalized patterns and tooling we&rsquo;ve built (e.g., the Day14 OS
          automation stack) in future projects.
        </p>

        <h2>Liability</h2>
        <p>
          We do our best to ship working software, but we&rsquo;re not liable for
          damages exceeding the amount you&rsquo;ve paid us in the prior 90 days.
          You&rsquo;re responsible for backing up your customer data (we provide
          tooling to do this).
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of the State of Florida. Disputes
          go to courts in Lee County, FL.
        </p>

        <h2>Questions</h2>
        <p>
          Email Jack at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> before
          signing if anything&rsquo;s unclear. We&rsquo;d rather over-explain on
          the call than have you sign confused.
        </p>
      </Reveal>
    </CinematicPage>
  );
}
