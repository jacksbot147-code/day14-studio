/**
 * cinematic/Statement — the "Not a website. The whole operation." line.
 *
 * Port of the locked prototype's standalone statement section (task 3/8): one
 * oversized, centered editorial line that sets up the capabilities section that
 * follows. The emphasised clause renders in italic Newsreader, accent-tinted
 * (via the `.cin-em` helper from cinematic.css). Enters with the cinematic
 * <Reveal> primitive.
 */

import { Reveal } from "./Reveal";

export function Statement() {
  return (
    <section className="cin-section">
      <Reveal as="p" className="cin-statement">
        Not a website. <em className="cin-em">The whole operation.</em>
      </Reveal>
    </section>
  );
}

export default Statement;
