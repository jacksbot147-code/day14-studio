"use client";

/**
 * cinematic/FeaturedTenant — dedicated promo section for the featured product
 * (currently Marque), slotted between Proof (#work) and the ROI calculator.
 *
 * Why a separate section instead of a 5th Proof tile (Jack decision 2026-07-06):
 * the Proof grid's claim is "all on the exact same system" — Marque is a
 * STANDALONE repo/brand, so it gets its own section with copy that says
 * "newest product out of the Day14 shop" and never claims same-engine.
 *
 * Honesty rail (binding):
 * - NO prices anywhere in this section — Marque tiers are not Jack-confirmed.
 * - The scored-batch card is illustrative UI with fictional hook names/scores,
 *   mirroring Marque's own labeled-fictional demo convention; the
 *   "illustrative" microcopy must stay.
 * - Primary CTA routes to the on-domain sister page /brands/marque
 *   (shipped in 02c4228); the ghost CTA links out to the pre-launch demo.
 *
 * Design source of truth: ~/Claude/Projects/DAY14/adforge-featured-section-preview.html
 */

import { Reveal } from "./Reveal";
import styles from "./FeaturedTenant.module.css";

interface ScoredAd {
  name: string;
  meta: string;
  score: number;
  verdict: string;
  tone: "hi" | "mid" | "lo";
}

/** Illustrative UI only — fictional batch, labeled as such in the card footer. */
const SAMPLE_BATCH: readonly ScoredAd[] = [
  { name: "Hook A — “stop scrolling” UGC", meta: "9:16 · voiced · 22s", score: 92, verdict: "run it", tone: "hi" },
  { name: "Hook B — problem / agitate", meta: "9:16 · voiced · 19s", score: 84, verdict: "run it", tone: "hi" },
  { name: "Hook C — product demo", meta: "9:16 · voiced · 25s", score: 61, verdict: "maybe", tone: "mid" },
  { name: "Hook D — pattern interrupt", meta: "9:16 · voiced · 17s", score: 38, verdict: "skip", tone: "lo" },
];

export function FeaturedTenant() {
  return (
    <section className={`cin-section ${styles.featured}`} id="marque">
      <div className={styles.inner}>
        <Reveal as="p" className={`cin-mono ${styles.kicker}`}>
          <span className={styles.dot} aria-hidden="true" />
          featured · newest from the shop
        </Reveal>

        <div className={styles.grid}>
          <div>
            <Reveal as="h2" className={styles.h}>
              Marque — brand-grade video ads <em>from any link.</em>
            </Reveal>
            <Reveal as="p" delayStep={1} className={styles.lede}>
              The newest product out of the Day14 shop: give it a link, get
              back a batch of short-form video ads — scripted, voiced, cut for
              TikTok, Reels and Shorts — each one scored for predicted virality
              before a dollar of media spend.
            </Reveal>
            <Reveal as="ul" delayStep={2} className={styles.points}>
              <li>
                <strong>A batch, not a guess.</strong> Distinct hooks — UGC,
                demo, pattern-interrupt — generated in one run.
              </li>
              <li>
                <strong>Scored pre-flight.</strong> Hook strength and retention
                risk ranked before you buy media.
              </li>
              <li>
                <strong>Run the winners.</strong> Losers flagged so you never
                pay to learn.
              </li>
            </Reveal>
            <Reveal as="div" delayStep={3} className={styles.ctas}>
              <a className={styles.btnPrimary} href="/brands/marque">
                See Marque →
              </a>
              <a
                className={styles.btnGhost}
                href="https://ad-forge-amber.vercel.app/gallery"
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch a sample batch
              </a>
            </Reveal>
            <Reveal as="p" delayStep={3} className={`cin-mono ${styles.ribbon}`}>
              pre-launch · onboarding founding brands now · demo data clearly
              labeled
            </Reveal>
          </div>

          <Reveal as="div" delayStep={2} className={styles.card}>
            <div className={`cin-mono ${styles.cardHead}`}>
              <span>batch · scored</span>
              <span className={styles.cardLive}>● ranked</span>
            </div>
            {SAMPLE_BATCH.map((ad) => (
              <div key={ad.name} className={styles.adRow}>
                <div className={styles.adName}>
                  {ad.name}
                  <span className="cin-mono">{ad.meta}</span>
                </div>
                <span
                  className={`cin-mono ${styles.score} ${
                    ad.tone === "hi"
                      ? styles.scoreHi
                      : ad.tone === "mid"
                        ? styles.scoreMid
                        : styles.scoreLo
                  }`}
                >
                  {ad.score} · {ad.verdict}
                </span>
              </div>
            ))}
            <p className={`cin-mono ${styles.cardFoot}`}>
              illustrative UI — sample batch, fictional brand
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default FeaturedTenant;
