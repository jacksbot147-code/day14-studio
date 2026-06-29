"use client";

/**
 * cinematic/RoiCalculator — the "what would this be worth to you" estimator.
 *
 * An operator picks their trade and three numbers (jobs/month, average job
 * value, hours/week on admin). We show an HONEST, clearly-labelled ESTIMATE of
 * the monthly upside Day14 software unlocks: hours saved (admin automation) and
 * extra revenue (24/7 booking + instant quoting capturing inquiries that today
 * go to voicemail). Every assumption is named and visible — this is a directional
 * estimate, not a guarantee, and it quotes NO Day14 price (keeps check:prices
 * clean and keeps the focus on the operator's own upside).
 *
 * Accessibility: native range inputs with labels, output region is aria-live so
 * screen readers hear the recomputed figures. CLS-safe (outputs always render).
 * Reduced-motion: nothing here animates beyond native input behaviour.
 */

import { useMemo, useState } from "react";
import { Reveal } from "./Reveal";

interface TradePreset {
  slug: string;
  label: string;
  jobs: number;
  value: number;
  admin: number;
}

const TRADES: readonly TradePreset[] = [
  { slug: "pool", label: "Pool service", jobs: 80, value: 150, admin: 12 },
  { slug: "lawn", label: "Lawn / landscaping", jobs: 90, value: 65, admin: 10 },
  { slug: "pressure", label: "Pressure washing", jobs: 30, value: 300, admin: 8 },
  { slug: "handyman", label: "Handyman", jobs: 40, value: 250, admin: 9 },
  { slug: "detailing", label: "Mobile detailing", jobs: 50, value: 160, admin: 10 },
];

/* Transparent assumptions — shown to the user, conservative on purpose. */
const ADMIN_AUTOMATION = 0.6; // share of admin/phone/quoting time automated away
const CAPTURE_LIFT = 0.15; // extra booked jobs from 24/7 booking + instant quotes
const WEEKS_PER_MONTH = 4.33;

const fmtMoney = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

export function RoiCalculator({ initialTrade }: { initialTrade?: string } = {}) {
  const start = TRADES.find((t) => t.slug === initialTrade) ?? TRADES[0]!;
  const [tradeSlug, setTradeSlug] = useState(start.slug);

  const [jobs, setJobs] = useState(start.jobs);
  const [value, setValue] = useState(start.value);
  const [admin, setAdmin] = useState(start.admin);

  // When the trade changes, reset the three inputs to that trade's defaults.
  function pickTrade(slug: string) {
    const p = TRADES.find((t) => t.slug === slug) ?? TRADES[0]!;
    setTradeSlug(p.slug);
    setJobs(p.jobs);
    setValue(p.value);
    setAdmin(p.admin);
  }

  const out = useMemo(() => {
    const hoursSaved = admin * WEEKS_PER_MONTH * ADMIN_AUTOMATION;
    const extraJobs = jobs * CAPTURE_LIFT;
    const extraRevenue = extraJobs * value;
    return {
      hoursSaved: Math.round(hoursSaved),
      extraJobs: Math.round(extraJobs),
      extraRevenue,
      annual: extraRevenue * 12,
    };
  }, [jobs, value, admin]);

  return (
    <section id="roi" className="cin-section cin-roi">
      <div className="cin-roi-head">
        <Reveal as="div" className="cin-kicker">
          What it&rsquo;s worth to you
        </Reveal>
        <Reveal as="h2" delayStep={1} className="cin-h2">
          Run the numbers on your own shop.
        </Reveal>
        <Reveal as="p" delayStep={2}>
          A directional estimate of what 24/7 booking, instant quoting, and an
          automated back office free up — in your hours and your revenue.
        </Reveal>
      </div>

      <Reveal className="cin-roi-card" delayStep={1}>
        <div className="cin-roi-controls">
          <div className="cin-roi-field">
            <label htmlFor="roi-trade">Your trade</label>
            <select
              id="roi-trade"
              value={tradeSlug}
              onChange={(e) => pickTrade(e.target.value)}
              className="cin-roi-select"
            >
              {TRADES.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="cin-roi-field">
            <label htmlFor="roi-jobs">
              Jobs / month <b>{jobs}</b>
            </label>
            <input
              id="roi-jobs"
              type="range"
              min={5}
              max={300}
              step={5}
              value={jobs}
              onChange={(e) => setJobs(Number(e.target.value))}
            />
          </div>

          <div className="cin-roi-field">
            <label htmlFor="roi-value">
              Average job value <b>{fmtMoney(value)}</b>
            </label>
            <input
              id="roi-value"
              type="range"
              min={25}
              max={1000}
              step={5}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </div>

          <div className="cin-roi-field">
            <label htmlFor="roi-admin">
              Hours / week on phone, quoting &amp; admin <b>{admin}</b>
            </label>
            <input
              id="roi-admin"
              type="range"
              min={1}
              max={40}
              step={1}
              value={admin}
              onChange={(e) => setAdmin(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="cin-roi-out" aria-live="polite">
          <div className="cin-roi-stat cin-roi-stat-hero">
            <div className="cin-roi-v">{fmtMoney(out.extraRevenue)}</div>
            <div className="cin-roi-l">est. extra revenue / month</div>
          </div>
          <div className="cin-roi-stat">
            <div className="cin-roi-v">{out.hoursSaved} hrs</div>
            <div className="cin-roi-l">admin time back / month</div>
          </div>
          <div className="cin-roi-stat">
            <div className="cin-roi-v">+{out.extraJobs}</div>
            <div className="cin-roi-l">jobs captured / month</div>
          </div>
          <div className="cin-roi-stat">
            <div className="cin-roi-v">{fmtMoney(out.annual)}</div>
            <div className="cin-roi-l">annualized upside</div>
          </div>
        </div>

        <p className="cin-roi-note">
          Estimate only. Assumes ~{Math.round(ADMIN_AUTOMATION * 100)}% of admin
          time automated and ~{Math.round(CAPTURE_LIFT * 100)}% more jobs captured
          from 24/7 booking and instant quoting. Your numbers will vary.
        </p>

        <div className="cin-roi-cta">
          <a href="#book" className="cin-btn cin-btn-solid" data-cta="book_roi">
            See it run on your business
          </a>
        </div>
      </Reveal>
    </section>
  );
}

export default RoiCalculator;
