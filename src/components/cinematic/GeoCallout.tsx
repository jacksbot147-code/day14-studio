/**
 * cinematic/GeoCallout — homepage teaser for the GEO service line (/geo).
 *
 * Sits after Pricing: the visitor has just seen build tiers; this is the
 * "and there's a third motion" beat. Server component — copy + one CTA,
 * no client hooks. Prices intentionally absent (they live on /geo, sourced
 * from pricing.ts) so this section can never drift from pricing truth.
 */

import { Reveal } from "./Reveal";

export function GeoCallout() {
  return (
    <section id="geo" className="cin-section">
      <div className="cin-sys-head">
        <Reveal as="div" className="cin-kicker">
          New · GEO
        </Reveal>
        <Reveal as="h2" delayStep={1} className="cin-h2">
          Your next customer isn&rsquo;t Googling. They&rsquo;re asking.
        </Reveal>
      </div>
      <Reveal as="p" className="cin-platform" delayStep={2}>
        When someone asks ChatGPT, Perplexity, or Google AI who to hire, one
        business gets named. GEO is the work that makes it yours — visibility
        scored out of 20, re-measured monthly, transcripts included.{" "}
        <a href="/geo" data-cta="geo_home">
          See how GEO works →
        </a>
      </Reveal>
    </section>
  );
}

export default GeoCallout;
