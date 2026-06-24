/**
 * cinematic/Testimonial — the single editorial testimonial (task 5/8).
 *
 * Reads the `TESTIMONIAL` data slot (./testimonialData). When a real,
 * permissioned customer quote is present it renders that, attributed. When the
 * slot is `null` it renders a clearly-marked PLACEHOLDER — an illustrative line
 * with a "placeholder · drop in a real owner quote before launch" badge and NO
 * fabricated name. This is the honesty rail: the page never claims a named
 * customer said something they didn't.
 *
 * No client hooks here — it just composes the shared <Reveal> entrance, so it
 * can render on the server.
 */

import { Reveal } from "./Reveal";
import { TESTIMONIAL } from "./testimonialData";

export function Testimonial() {
  const testimonial = TESTIMONIAL;

  return (
    <section className="cin-section cin-testi">
      <Reveal as="blockquote" className="cin-quote">
        {testimonial
          ? testimonial.quote
          : "It catches the job I used to lose to voicemail."}
      </Reveal>

      {testimonial ? (
        <Reveal as="figcaption" delayStep={1} className="cin-quote-by">
          — {testimonial.name}, {testimonial.role}
        </Reveal>
      ) : (
        <Reveal as="figcaption" delayStep={1} className="cin-quote-by">
          — illustrative
          <span className="cin-ph cin-mono">
            placeholder · drop in a real owner quote before launch
          </span>
        </Reveal>
      )}
    </section>
  );
}

export default Testimonial;
