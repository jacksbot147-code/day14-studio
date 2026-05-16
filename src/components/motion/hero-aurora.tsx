/**
 * HeroAurora — animated gradient mesh that sits behind the hero. Pure CSS,
 * no JS, no perf cost. Two radial gradients orbit slowly, giving the hero
 * a quietly-expensive AI-product feel without going kaleidoscopic.
 *
 * Sized to absolute-fill the hero <section>. Z-index sits behind content.
 * Brand-locked: ember accent + ink shadow, against the paper background.
 */
export function HeroAurora() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Ember orb — drifts top-left */}
      <div className="absolute -top-32 -left-24 h-[36rem] w-[36rem] rounded-full bg-ember-500 opacity-[0.13] blur-[120px] animate-aurora-a" />
      {/* Ink-toned counter orb — drifts bottom-right */}
      <div className="absolute -bottom-40 -right-24 h-[40rem] w-[40rem] rounded-full bg-ink opacity-[0.06] blur-[140px] animate-aurora-b" />
      {/* Subtle grain — paper texture, fixed */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,92,40,0.05),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(11,11,10,0.04),transparent_55%)]" />
    </div>
  );
}
