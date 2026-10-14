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

  // No placeholder quote. The section appears only with a real, permissioned line.
  if (!testimonial) return null;

  return (
    <section className="cin-section cin-testi">
      <Reveal as="blockquote" className="cin-quote">
        {testimonial.quote}
      </Reveal>

      <Reveal as="figcaption" delayStep={1} className="cin-quote-by">
        — {testimonial.name}, {testimonial.role}
      </Reveal>
    </section>
  );
}

export default Testimonial;
