import type { Metadata } from "next";
import Link from "next/link";

import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";
import { PriceScramble } from "@/components/cinematic/PriceScramble";
import { CAPTURE_TIERS, CAPTURE_FOUNDING, type CaptureTier } from "@/lib/pricing";
import { SITE } from "@/lib/site";

/**
 * /capture — Capture (AI lead-capture / receptionist), the fourth service line.
 * Full cinematic build mirroring /geo: hero + missed-call demo, sample
 * caught-rate meters, how-it-works steps, tier cards (same card system as
 * /pricing), founding banner, FAQ, closing CTA.
 *
 * PRICING INTEGRITY: every number flows from src/lib/pricing.ts
 * (CAPTURE_TIERS + CAPTURE_FOUNDING). `npm run check:prices` stays clean.
 *
 * HONESTY RAILS: "catches what you're missing," never "never miss a call."
 * The assistant always identifies as automated; every greeting carries a
 * Florida two-party recording disclosure. The demo + meters are labelled
 * illustrative — no fabricated client, no fabricated testimonial. Case-study
 * section intentionally absent until client #0 data exists.
 */

const TITLE = "Capture — catch the calls you're missing | Day14";
const DESCRIPTION =
  "The calls you miss after hours, on a job, or during the rush don't have to walk. Capture answers, says it's automated, and books them — then proves it in booked jobs.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/capture" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `https://${SITE.domain}/capture`,
    siteName: SITE.brand,
    type: "website",
  },
};

/** Honest FAQ — inlined (no fabricated data). */
const CAPTURE_FAQ = [
  {
    q: "Will I never miss a call again?",
    a: "No — and be suspicious of anyone who promises that. Capture is the backup that catches what you're already missing: nights, weekends, when you're on a job. Some callers still hang up; the point is that far fewer slip away, and you can see exactly which ones we caught.",
  },
  {
    q: "Does it pretend to be a person?",
    a: "Never. The assistant identifies itself as automated in the first breath of every call, and every greeting includes a recording disclosure. Honesty is the product — a caller who feels tricked is a lost job.",
  },
  {
    q: "Is it legal to record the calls?",
    a: "We follow Florida's two-party consent rule: every greeting states that the call is recorded. If the disclosure is ever off, recording is off — no exceptions.",
  },
  {
    q: "What about text messages?",
    a: "SMS only turns on after A2P messaging is approved for your number, and we only text people who contacted you first. No purchased lists, no cold blasts.",
  },
  {
    q: "How do I know it's actually working?",
    a: "The monthly report attributes booked jobs to where they came from — the missed call we caught, the after-hours voice, the web chat. Numbers with a source, not a vibe.",
  },
  {
    q: "What if it books something wrong?",
    a: "You review and tune. On live clients, nothing about the assistant's behavior changes without your say-so.",
  },
];

/**
 * Sample caught-rate — ILLUSTRATIVE ONLY (labelled in the UI). Percentages are
 * layout values for the meters, not client data; no business is named.
 */
const SAMPLE_METERS = [
  { scenario: "After-hours calls", before: 10, after: 85 },
  { scenario: "On-a-job overflow", before: 20, after: 80 },
  { scenario: "Weekend inquiries", before: 5, after: 75 },
] as const;

function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CAPTURE_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function serviceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Lead Capture / Receptionist (Capture)",
    serviceType: "AI phone answering and lead capture",
    provider: {
      "@type": "Organization",
      name: SITE.brand,
      url: `https://${SITE.domain}`,
    },
    areaServed: "Southwest Florida",
    offers: CAPTURE_TIERS.map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: String(t.oneTime ?? t.monthly ?? ""),
      priceCurrency: "USD",
      description: t.tagline,
    })),
  };
}

/** "$250" / "$395" from the tier's numbers — formatted, never hard-coded. */
function tierPrice(tier: CaptureTier): string {
  const n = tier.oneTime ?? tier.monthly ?? 0;
  return `$${n.toLocaleString("en-US")}`;
}
function tierPriceUnit(tier: CaptureTier): string {
  return tier.oneTime !== null ? "one-time" : "/mo";
}

/** Editorial tail on the unit line — copy, not pricing. */
const TIER_NOTE: Record<CaptureTier["slug"], string> = {
  "capture-audit": "delivered in 5 days",
  "capture-essentials": "the receptionist",
  "capture-growth": "every channel",
};

export default function CapturePage() {
  return (
    <div className="cinematic" id="top">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd()) }}
      />
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        {/* ============ Hero ============ */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-kicker">
            Capture · AI lead capture
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            The 6pm call that booked your competitor.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            The calls you miss after hours, on a job, or during the lunch rush
            don&rsquo;t wait — they call the next name on the list. Capture
            answers, says up front that it&rsquo;s automated, gets the caller&rsquo;s
            details, and books the job. It catches what you&rsquo;re missing — and
            proves it every month in booked work.
          </Reveal>
          <Reveal as="div" delayStep={3}>
            <a className="cin-btn cin-btn-glow" href="#capture-pricing" data-cta="capture_hero">
              See the offers →
            </a>
          </Reveal>
        </header>

        {/* ============ The problem — missed-call demo ============ */}
        <section className="cin-section">
          <div className="cin-sys-head">
            <Reveal as="div" className="cin-kicker">
              The leak
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-h2">
              A missed call doesn&rsquo;t leave a message. It leaves.
            </Reveal>
          </div>

          <div className="cin-frow">
            <Reveal className="cin-ftext">
              <div className="cin-ftext-n cin-mono">01 / the missed call</div>
              <h3>&ldquo;They didn&rsquo;t pick up. Next.&rdquo;</h3>
              <p>
                When your crew is on a job and the phone rings, most callers
                won&rsquo;t leave a voicemail and won&rsquo;t call back — they
                dial the next result. The lead was real, the intent was there,
                and it walked before you ever knew it existed. That&rsquo;s not
                a marketing problem; it&rsquo;s a coverage problem, and it&rsquo;s
                the first thing the Call Leak Audit measures.
              </p>
            </Reveal>
            <Reveal delayStep={1}>
              {/* Illustrative caught-call card — no real client named. */}
              <div className="cin-card" aria-label="Illustrative caught call">
                <div className="cin-mono" style={{ fontSize: 12, opacity: 0.6 }}>
                  illustrative — what a caught call looks like
                </div>
                <p style={{ marginTop: 12 }}>
                  &ldquo;Thanks for calling [BUSINESS] — I&rsquo;m their automated
                  assistant, and this call is recorded for quality. The crew&rsquo;s
                  out right now, but I can get you on the schedule. What&rsquo;s
                  going on?&rdquo;
                </p>
                <p style={{ opacity: 0.6 }}>
                  Caught at <b>8:15 PM</b> · name, number, and job captured ·
                  booked for Thursday. The call that would have walked.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="cin-frow cin-frow-rev">
            <Reveal className="cin-ftext">
              <div className="cin-ftext-n cin-mono">02 / the proof</div>
              <h3>Every catch, attributed to a dollar.</h3>
              <p>
                Capture isn&rsquo;t judged on a feeling. Every month you get a
                one-page report that ties booked jobs back to where they came
                from — the after-hours voice call, the missed-call text-back, the
                web chat. Same shape every month, so the number is real movement,
                not a story. If the leak is small, the audit says so and you stop
                at one fixed fee.
              </p>
            </Reveal>
            <Reveal delayStep={1}>
              {/* Sample caught-rate scorecard — meters, labelled illustrative. */}
              <div className="cin-card" aria-label="Sample caught-rate scorecard">
                <div className="cin-mono" style={{ fontSize: 12, opacity: 0.6 }}>
                  sample scorecard — illustrative, not client data
                </div>
                {SAMPLE_METERS.map((m) => (
                  <div key={m.scenario} style={{ marginTop: 14 }}>
                    <div className="cin-meter-foot" style={{ marginTop: 0 }}>
                      <span>{m.scenario}</span>
                      <span>before → with Capture</span>
                    </div>
                    <div className="cin-meter" style={{ marginTop: 6 }}>
                      <b style={{ width: `${m.before}%` }} />
                    </div>
                    <div className="cin-meter" style={{ marginTop: 4 }}>
                      <b style={{ width: `${m.after}%` }} />
                    </div>
                  </div>
                ))}
                <div className="cin-meter-foot">
                  <span>share of calls caught</span>
                  <span>measured monthly</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============ How it works ============ */}
        <div className="cin-detail">
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              How it works
            </Reveal>
            <ol className="cin-detail-steps">
              <li>
                <span className="cin-detail-step-n">01</span>
                <div>
                  <h3>Call Leak Audit</h3>
                  <p>
                    We test your real missed-call scenarios — after hours, on a
                    job, second caller — and show where each one goes today and
                    what the leak is costing. Delivered in five days, and free
                    for active Day14 clients.
                  </p>
                </div>
              </li>
              <li>
                <span className="cin-detail-step-n">02</span>
                <div>
                  <h3>Route it, honestly</h3>
                  <p>
                    Your overflow and after-hours calls route to the assistant.
                    Every greeting identifies as automated and states the call is
                    recorded (Florida two-party consent). No number goes live
                    until it passes an 8-for-8 call test.
                  </p>
                </div>
              </li>
              <li>
                <span className="cin-detail-step-n">03</span>
                <div>
                  <h3>Tune to your business</h3>
                  <p>
                    The assistant learns your services, hours, and booking rules,
                    and gets sharper from real transcripts. On live clients,
                    nothing about its behavior changes without your approval.
                  </p>
                </div>
              </li>
              <li>
                <span className="cin-detail-step-n">04</span>
                <div>
                  <h3>Report, every month</h3>
                  <p>
                    Calls caught, jobs booked, revenue attributed to source — one
                    page, honest numbers. The report is the deliverable; the
                    transcripts keep it auditable.
                  </p>
                </div>
              </li>
            </ol>
          </section>
        </div>

        {/* ============ Pricing cards — same card system as /pricing ============ */}
        <section id="capture-pricing" className="cin-pricing">
          <Reveal as="h2" className="cin-price-h">
            Fixed prices. Honest measurement.
          </Reveal>
          <Reveal as="p" className="cin-price-sub" delayStep={1}>
            Start with the audit. Stay only if the leak is worth closing.
          </Reveal>

          <div className="cin-cards">
            {CAPTURE_TIERS.map((tier, i) => (
              <Reveal
                key={tier.slug}
                delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
                className={`cin-card${tier.featured ? " cin-card-feat" : ""}`}
              >
                <span className="cin-badge">
                  {tier.featured ? "founding rate — 3 slots" : ""}
                </span>
                <div className="cin-nm">{tier.name}</div>
                <div className="cin-pr">
                  <PriceScramble final={tierPrice(tier)} />{" "}
                  <small>{tierPriceUnit(tier)}</small>
                </div>
                <div className="cin-mo">{TIER_NOTE[tier.slug]} · {tier.tagline}</div>
                <ul role="list">
                  {tier.features.slice(0, 4).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a
                  className={`cin-card-cta${tier.featured ? "" : " cin-card-cta-ghost"}`}
                  href="#book"
                  data-cta={`capture_book_${tier.slug}`}
                >
                  Book a 15-min look →
                </a>
              </Reveal>
            ))}
          </div>

          <Reveal as="p" className="cin-platform">
            Founding rate: the first three Capture clients get{" "}
            {CAPTURE_TIERS.find((t) => t.slug === CAPTURE_FOUNDING.appliesTo)?.name ??
              "Essentials"}{" "}
            at ${CAPTURE_FOUNDING.monthly}/mo, locked for 12 months, in exchange
            for a testimonial and case-study rights. The Call Leak Audit is
            free for active Day14 clients.{" "}
            <a href="#book">Take a slot.</a>
          </Reveal>
        </section>

        {/* ============ Trifecta ============ */}
        <div className="cin-detail">
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              The fourth leg
            </Reveal>
            <div className="cin-prose">
              <p>
                Build the presence with{" "}
                <Link href="/pricing">a Day14 site</Link>, buy the traffic with{" "}
                <Link href="/brands/marque">Marque</Link>, own the AI answer with{" "}
                <Link href="/geo">GEO</Link> — and Capture closes the loop by
                catching the demand the other three create. One operator, four
                motions, one system: build → buy → own → capture.
              </p>
            </div>
          </section>

          {/* ============ FAQ ============ */}
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Questions owners actually ask
            </Reveal>
            <div className="cin-detail-faqs">
              {CAPTURE_FAQ.map((f) => (
                <details key={f.q} className="cin-detail-faq">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Closing CTA — Cal.com booking + email fallback (anchor #book). */}
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
