/**
 * cinematic/CaptureCallout — homepage teaser for the Capture service line (/capture).
 *
 * Sits after GeoCallout: the visitor has seen build → buy → own; this is the
 * "… and something has to catch the demand" beat. Server component — copy + one
 * CTA, no client hooks. Prices intentionally absent (they live on /capture, sourced
 * from pricing.ts) so this section can never drift from pricing truth.
 */

import { Reveal } from "./Reveal";

export function CaptureCallout() {
  return (
    <section id="capture" className="cin-section">
      <div className="cin-sys-head">
        <Reveal as="div" className="cin-kicker">
          New · Capture
        </Reveal>
        <Reveal as="h2" delayStep={1} className="cin-h2">
          The call you miss doesn&rsquo;t leave a message. It leaves.
        </Reveal>
      </div>
      <Reveal as="p" className="cin-platform" delayStep={2}>
        After hours, on a job, mid-rush — the calls you can&rsquo;t pick up go to
        the next name on the list. Capture answers, says it&rsquo;s automated, and
        books them — then proves it every month in booked jobs.{" "}
        <a href="/capture" data-cta="capture_home">
          See how Capture works →
        </a>
      </Reveal>
    </section>
  );
}

export default CaptureCallout;
