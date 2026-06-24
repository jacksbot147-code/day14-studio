/**
 * cinematic/HowItWorks — the "See it work" / How-it-works section (task 4/8).
 *
 * Port of the locked prototype's `#system` section: a centered head followed by
 * three alternating feature rows (copy ⇄ widget, the middle row reversed), each
 * pairing a line of copy with a REAL interactive widget:
 *
 *   01 / front door  → <BeforeAfter/>  draggable + keyboard before/after slider
 *   02 / booking     → <QuoteIntake/>  parse-a-request widget (labelled demo)
 *   03 / back office → <JobBoard/>     staggered reveal (field-service example)
 *
 * Rows reveal with the cinematic <Reveal> primitive (copy first, widget on a
 * one-step delay). The widgets are client components; this section is a server
 * component that just lays them out. The `id="system"` anchor matches the nav
 * link from the prototype ("How it works").
 */

import { Reveal } from "./Reveal";
import { BeforeAfter } from "./BeforeAfter";
import { QuoteIntake } from "./QuoteIntake";
import { JobBoard } from "./JobBoard";

export function HowItWorks() {
  return (
    <section id="system" className="cin-section">
      <div className="cin-sys-head">
        <Reveal as="div" className="cin-kicker">
          See it work
        </Reveal>
        <Reveal as="h2" delayStep={1} className="cin-h2">
          One system. Not five vendors.
        </Reveal>
      </div>

      {/* 01 — front door */}
      <div className="cin-frow">
        <Reveal className="cin-ftext">
          <div className="cin-ftext-n cin-mono">01 / front door</div>
          <h3>From a Facebook page to a real business.</h3>
          <p>
            An agency-grade site on your own domain — whatever you do. Drag it:
            what a customer saw before, and after.
          </p>
        </Reveal>
        <Reveal delayStep={1}>
          <BeforeAfter />
        </Reveal>
      </div>

      {/* 02 — booking (reversed: widget left, copy right on desktop) */}
      <div className="cin-frow cin-frow-rev">
        <Reveal className="cin-ftext">
          <div className="cin-ftext-n cin-mono">02 / booking</div>
          <h3>Quoting that never sleeps.</h3>
          <p>
            A customer types what they need — any service, any time. It arrives
            structured and booked, not as a voicemail. Try it for your trade.
          </p>
        </Reveal>
        <Reveal delayStep={1}>
          <QuoteIntake />
        </Reveal>
      </div>

      {/* 03 — back office */}
      <div className="cin-frow">
        <Reveal className="cin-ftext">
          <div className="cin-ftext-n cin-mono">03 / back office</div>
          <h3>The operation runs itself.</h3>
          <p>
            Jobs, status, follow-ups — one board that organizes the day for you.
            (Here&rsquo;s a field-service example; membership and food run the
            same way.)
          </p>
        </Reveal>
        <Reveal delayStep={1}>
          <JobBoard />
        </Reveal>
      </div>
    </section>
  );
}

export default HowItWorks;
