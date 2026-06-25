import type { Metadata } from "next";

import { SITE } from "@/lib/site";
import { SERVICE_TIERS } from "@/lib/pricing";
import { CinematicPage } from "@/components/cinematic/CinematicPage";
import { Reveal } from "@/components/cinematic/Reveal";

/**
 * /refunds — the launch-by-day-14-or-deposit-back policy, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 8/10 of the rebuild — legal + info).
 * Uses the shared <CinematicPage> shell (CanvasField backdrop + fixed Nav +
 * SiteFooter) with a hero, then renders the policy as clean long-form `.cin-prose`
 * for legible legal reading. The key promise sits in a `.cin-prose` blockquote
 * (editorial serif, accent rail); the close is a small `.cin-btn` CTA row.
 *
 * PRICING INTEGRITY: per-SKU figures are read live from src/lib/pricing.ts
 * (SERVICE_TIERS) — never hard-coded — so `check:prices` stays clean. The
 * "$200/hr" change rate is a service term, not a Day14 tier price, and is not
 * tier-shaped. Content is preserved from the prior surface; only the skin changes.
 */

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Launch by Day 14 or your deposit refunds in full. The full policy.",
  alternates: { canonical: "/refunds" },
};

// Per-tier guarantee windows. Prices come from pricing.ts (SERVICE_TIERS).
const GUARANTEE: Record<string, string> = {
  spark: "Shipped within 7 days or your deposit refunds.",
  local: "Live within 14 days or your deposit refunds.",
  portal:
    "Live and Stripe-accepting payments within 3 weeks or your deposit refunds.",
  platform:
    "Live within 4 weeks or your deposit refunds. We allow more time because the operator admin app has more surface area.",
};

export default function RefundsPage() {
  return (
    <CinematicPage
      hero={{
        eyebrow: "Refund policy",
        title: "We carry the timeline risk, so you don’t.",
        lede: "Launch by Day 14 or your deposit refunds in full — and you keep everything we’ve shipped. The full policy, below.",
      }}
    >
      <Reveal as="div" className="cin-prose">
        <h2>The day-14 guarantee</h2>
        <blockquote>
          If your Portal-tier project isn&rsquo;t live and able to accept real
          customer payments by the end of day 14, your deposit refunds in full
          and you keep everything we&rsquo;ve shipped &mdash; the repo, the
          preview deployment, the work in progress.
        </blockquote>
        <p>
          &ldquo;Day 14&rdquo; means 14 calendar days from the day we receive
          your signed order form and 50% deposit. The clock pauses only if you
          take longer than 48 hours to respond to a blocker we&rsquo;ve flagged.
        </p>

        <h2>Per-SKU specifics</h2>
        <ul>
          {SERVICE_TIERS.map((t) => (
            <li key={t.slug}>
              <strong>
                {t.name} (
                {t.setup === null
                  ? t.setupLabel
                  : `$${t.setup.toLocaleString()}`}
                ):
              </strong>{" "}
              {GUARANTEE[t.slug]}
            </li>
          ))}
        </ul>

        <h2>Monthly hosting</h2>
        <p>
          Cancel anytime with 30 days notice. No long-term contract, no
          early-termination fee. When you cancel, the final invoice is prorated
          and we deliver a migration runbook within 7 days.
        </p>

        <h2>What&rsquo;s not refundable</h2>
        <ul>
          <li>
            Change requests already completed at your written authorization
            ($200/hr work).
          </li>
          <li>
            The final 50% balance after launch (because the deliverable is live
            in production).
          </li>
          <li>
            Third-party costs we passed through (domain registration, paid API
            tiers, etc.) &mdash; those refund per the third party&rsquo;s policy.
          </li>
        </ul>

        <h2>How to request a refund</h2>
        <p>
          Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with your
          order form ID. We refund via the original payment method within 7
          business days.
        </p>
      </Reveal>

      <Reveal as="div" delayStep={1} className="cin-prose" style={{ marginTop: "3em" }}>
        <hr />
        <p className="cin-prose-kicker">Questions about the guarantee?</p>
        <p>
          Easier to talk through on the call. We&rsquo;ll walk you through the
          exact timeline for your build.
        </p>
        <div
          style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 28 }}
        >
          <a
            className="cin-btn cin-btn-solid"
            href={SITE.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Book intro call
          </a>
          <a className="cin-btn" href="/terms">
            Read full terms
          </a>
        </div>
      </Reveal>
    </CinematicPage>
  );
}
