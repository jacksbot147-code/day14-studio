/**
 * HeroAurora — crisp blueprint backdrop that sits behind the hero. Pure CSS,
 * no JS, no perf cost. A hairline grid fades out behind the headline, with
 * one thin ember corner-rule and a single ember tick. Definition over
 * softness: lines carry the atmosphere, not blurred orbs.
 *
 * Sized to absolute-fill the hero <section>. Z-index sits behind content.
 * Brand-locked: ember accent + ink hairlines, against the paper background.
 */
export function HeroAurora() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Hairline blueprint grid — masked so it fades out toward the copy */}
      <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(900px_520px_at_88%_-5%,#000,transparent_72%)]" />
      {/* Thin ember corner-rules — a precise top-right bracket */}
      <div className="absolute right-0 top-0 h-40 w-px bg-gradient-to-b from-ember-500/50 to-transparent" />
      <div className="absolute right-0 top-0 h-px w-48 bg-gradient-to-l from-ember-500/50 to-transparent" />
      {/* Faint ink wash bottom-left to seat the section, no blur */}
      <div className="absolute -bottom-px left-0 right-0 h-px bg-ink-100" />
    </div>
  );
}
