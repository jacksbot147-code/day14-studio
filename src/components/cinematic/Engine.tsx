/**
 * cinematic/Engine — the "engine" section (task 5/8).
 *
 * Composes the prototype's engine block: a centered kicker, the typing
 * <Terminal />, and the count-up <StatsRow />. The terminal and stats own their
 * own scroll-triggered animation + reduced-motion handling; here we only add the
 * shared <Reveal> entrance and the section rhythm.
 */

import { Reveal } from "./Reveal";
import { StatsRow } from "./StatsRow";
import { Terminal } from "./Terminal";

export function Engine() {
  return (
    <section className="cin-section cin-engine" id="engine">
      <Reveal className="cin-kicker cin-engine-kicker">
        One operator. The OS is the team.
      </Reveal>
      <Reveal delayStep={1}>
        <Terminal />
      </Reveal>
      <Reveal delayStep={2}>
        <StatsRow />
      </Reveal>
    </section>
  );
}

export default Engine;
