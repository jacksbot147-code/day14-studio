/**
 * Price label. Renders the final string from pricing.ts immediately.
 * The old scramble animation flashed unfinished digits before settling.
 */

interface PriceScrambleProps {
  /** Settled price string, e.g. a tier's setupLabel. Never a hard-coded price. */
  final: string;
}

export function PriceScramble({ final }: PriceScrambleProps) {
  return <span className="cin-scramble">{final}</span>;
}

export default PriceScramble;
