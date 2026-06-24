"use client";

/**
 * cinematic/ClosingCTA — the `#book` closing section (task 6/8).
 *
 * Port of the locked prototype's `.close` block: the oversized "Watch it run.
 * Fifteen minutes." line, two real CTAs, and the operator signature.
 *
 * CTAs are wired to the REAL endpoints from src/lib/site.ts — the primary
 * button opens the Cal.com intro booking (SITE.bookingUrl =
 * https://cal.com/day14/intro), the secondary is a mailto to SITE.email
 * (hello@day14.us). No dead "#" links. The booking link opens in a new tab
 * (rel=noopener); the mailto stays in-place.
 *
 * Reveal entrances reuse the task-1 <Reveal> primitive. The booking anchor also
 * carries data-mag for the hero/nav magnetic-hover script when present; it's a
 * progressive enhancement and degrades to a normal link without it.
 */

import { SITE } from "@/lib/site";
import { Reveal } from "./Reveal";

export function ClosingCTA() {
  return (
    <section id="book" className="cin-close">
      <Reveal as="h2">
        Watch it run.
        <br />
        Fifteen minutes.
      </Reveal>

      <Reveal className="cin-close-cta" delayStep={1}>
        <a
          className="cin-btn cin-btn-solid"
          href={SITE.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-mag
        >
          Book 15 minutes
        </a>
        <a className="cin-btn" href={`mailto:${SITE.email}`}>
          {SITE.email}
        </a>
      </Reveal>

      <Reveal as="p" className="cin-sig" delayStep={2}>
        Jack — owner, Splash Jacks Pools · built and runs on Day14
      </Reveal>
    </section>
  );
}

export default ClosingCTA;
