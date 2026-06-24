/**
 * cinematic/CapabilityMarquee — the infinite-scroll capability strip.
 *
 * Port of the locked prototype's `.marquee` (task 3/8): a single row of
 * capability labels that scrolls horizontally forever, with masked (faded)
 * left/right edges. The track holds the label set twice and translates by -50%,
 * so the loop is seamless. The whole strip is purely decorative — it restates
 * the capability grid — so it is `aria-hidden` and the duplicate copy is hidden
 * from assistive tech.
 *
 * Reduced-motion: the scroll animation is disabled in cinematic.css (the strip
 * simply sits still, edges still masked), so motion-sensitive users get a
 * static, legible row rather than a frozen-then-jumping animation.
 */

/** Short labels for the strip. Mirrors the prototype's marquee copy. */
const MARQUEE_ITEMS = [
  "Marketing site",
  "Online booking",
  "Customer portal",
  "Payments",
  "Scheduling",
  "Admin app",
  "AI assistant",
  "SMS & email",
] as const;

function MarqueeRow() {
  return (
    <span className="cin-marquee-row">
      {MARQUEE_ITEMS.map((label, i) => (
        <span key={label} className="cin-marquee-item">
          {label}
          {i < MARQUEE_ITEMS.length - 1 ? (
            <span className="cin-marquee-sep" aria-hidden="true">
              ·
            </span>
          ) : null}
        </span>
      ))}
      <span className="cin-marquee-sep" aria-hidden="true">
        ·
      </span>
    </span>
  );
}

export function CapabilityMarquee() {
  return (
    <div className="cin-marquee" aria-hidden="true">
      <div className="cin-marquee-track">
        <MarqueeRow />
        <MarqueeRow />
      </div>
    </div>
  );
}

export default CapabilityMarquee;
