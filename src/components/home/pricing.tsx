import { cn } from "@/lib/cn";
import { DecryptText } from "@/components/landing/decrypt-text";
import { PathCrumb } from "@/components/landing/path-crumb";
import { SERVICE_TIERS } from "@/lib/pricing";

/* -------------------------------------------------------------------------- */
/* Pricing — services shelf                                                    */
/*                                                                            */
/* Prices come from src/lib/pricing.ts (THE single source of truth — set     */
/* 2026-06-11). No price may be hard-coded in this file except the Custom    */
/* catch-all tier, which has no number by design.                            */
/* -------------------------------------------------------------------------- */

type Card = {
  name: string;
  price: string;
  cadence: string;
  timeline: string;
  bestFor: string;
  includes: string[];
  popular?: boolean;
};

const TIMELINES: Record<string, string> = {
  spark: "Live in 7 days",
  local: "Live in 14 days",
  portal: "Live in 3 weeks",
  platform: "Quoted in 48 hours",
};

const CARDS: Card[] = [
  ...SERVICE_TIERS.map((t) => ({
    name: t.name,
    price: t.setup === null ? t.setupLabel : `$${t.setup.toLocaleString()}`,
    cadence: t.setup === null ? "" : `one-time · then ${t.monthlyLabel}`,
    timeline: TIMELINES[t.slug] ?? "",
    bestFor: t.bestFor,
    includes: t.features,
    popular: t.featured,
  })),
  {
    name: "Custom",
    price: "Talk to us",
    cadence: "intro call",
    timeline: "6–12 weeks",
    bestFor:
      "Multi-tenant platforms, marketplaces, anything bespoke. Full Day14 OS — agents, evidence verifier, work-log, the lot.",
    includes: [
      "Multi-tenant, marketplace, or custom architecture",
      "Full Day14 OS access — agents, verifier, work-log",
      "Scoped to your business — quote in 48 hours",
      "12 months of ops + dedicated channel",
    ],
  },
];

export function Pricing() {
  // Apple-style soft cards on cream. One harmonious shelf; the featured
  // tier gets an ember 2px border + pill, the rest stay quiet.
  const cardShadow =
    "0 24px 60px -20px rgba(239, 108, 51, 0.10), 0 8px 24px -8px rgba(15, 23, 42, 0.06)";

  return (
    <section id="pricing" className="bg-paper-cream py-32 sm:py-40">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <PathCrumb path="pricing" />
          </div>
          <div className="eyebrow mb-6 justify-center text-ember-600">
            <DecryptText text="Pricing · build studio" durationMs={550} triggerOnView />
          </div>
          <h2 className="text-[56px] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[72px] lg:text-[80px]">
            <DecryptText text="$1,500 to custom." durationMs={700} startAt={250} triggerOnView />
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-[17px] leading-[1.6] text-warm-gray-500 sm:text-[18px]">
            Fixed price, fixed timeline, no SOWs. Pick the size that fits the
            job &mdash; your build lives on Day14 OS, the same stack that runs
            all six of my own.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {CARDS.map((tier) => (
            <article
              key={tier.name}
              className={cn(
                "relative flex flex-col bg-paper-cream p-8",
                "rounded-[24px]",
                "transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5",
                tier.popular
                  ? "border-2 border-ember-500"
                  : "border border-warm-gray-100",
              )}
              style={{ boxShadow: cardShadow }}
            >
              {tier.popular ? (
                <span className="absolute -top-3 right-6 inline-flex items-center rounded-full bg-ember-500 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_4px_12px_-2px_rgba(239,108,51,0.4)]">
                  Most owners pick this
                </span>
              ) : null}

              <h3 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.025em] text-ink">
                {tier.name}
              </h3>
              <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-warm-gray-400">
                {tier.timeline}
              </p>

              <div className="mt-7 flex items-baseline gap-2 tnum">
                <span className="text-[40px] font-extrabold leading-none tracking-[-0.035em] text-ink sm:text-[44px]">
                  {tier.price}
                </span>
              </div>
              {tier.cadence ? (
                <p className="mt-1.5 text-sm font-medium text-warm-gray-400">
                  {tier.cadence}
                </p>
              ) : null}

              <div className="my-7 h-px w-full bg-warm-gray-100" />

              <p className="text-[14px] leading-[1.55] text-warm-gray-500">
                {tier.bestFor}
              </p>

              <ul className="mt-6 flex flex-col gap-2.5">
                {tier.includes.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2.5 text-[13.5px] leading-[1.45] text-ink"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ember-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 8 6.5 12 13 4" />
                    </svg>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#book"
                className="mt-8 inline-flex items-center justify-center self-start rounded-full bg-ember-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-ember-600"
              >
                Book a 15-min intro call →
              </a>
            </article>
          ))}
        </div>

        <p className="mt-12 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-warm-gray-400">
          Fixed price · No SOWs · Every build includes 3 months of ops
        </p>
      </div>
    </section>
  );
}
