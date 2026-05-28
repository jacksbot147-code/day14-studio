import { loadEmpireSnapshot, describeAction, relativeAge } from "@/lib/empire-snapshot";

/**
 * DeployStrip — a terminal-style horizontal strip showing real, recent
 * empire activity. Pulls from `public/data/empire-state.json` (the same
 * snapshot the /admin cockpit consumes) so what scrolls past is what is
 * actually happening on the operator's machine, not hand-curated.
 *
 * Falls back to a hand-curated set when no snapshot is available (fresh
 * checkout, CI build before any agent has run). That keeps the strip
 * visually rich on first paint even pre-data.
 */

const FALLBACK: Array<{ ago: string; actor: string; tenant: string; action: string }> = [
  { ago: "12m", actor: "realty-scout", tenant: "day14-realty", action: "scored 14 properties" },
  { ago: "1h", actor: "social-orchestrator", tenant: "hot-flash-co", action: "queued content" },
  { ago: "3h", actor: "morning-briefing", tenant: "day14", action: "shipped the morning digest" },
  { ago: "5h", actor: "vercel-deploy-monitor", tenant: "studio", action: "verified the deploy" },
  { ago: "6h", actor: "opportunity-scanner", tenant: "day14", action: "scored a new niche" },
];

export async function DeployStrip() {
  const snap = await loadEmpireSnapshot();
  const items =
    snap.recent.length > 0
      ? snap.recent.slice(0, 8).map((e) => ({
          ago: relativeAge(e.ts),
          actor: e.actor,
          tenant: e.tenant,
          action: describeAction(e),
        }))
      : FALLBACK;

  return (
    <section
      aria-label="Recent empire activity"
      className="relative overflow-hidden border-y border-ink-200 bg-ink text-paper"
    >
      <div className="container-page flex items-center gap-3 py-3 font-mono text-[12px] leading-none">
        <span className="inline-flex shrink-0 items-center gap-2 rounded border border-paper-200/20 bg-paper/5 px-2 py-1 uppercase tracking-[0.16em] text-paper-200">
          <span className="relative inline-block h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-shipped-400" />
            <span className="absolute -inset-1 animate-ping rounded-full bg-shipped-400/40" />
          </span>
          Live activity
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-deploy-marquee gap-10">
            {[...items, ...items].map((d, i) => (
              <span
                key={`${d.actor}-${d.tenant}-${i}`}
                className="inline-flex items-center gap-2 whitespace-nowrap"
              >
                <span className="text-paper-200/60">{d.ago}</span>
                <span className="text-ember-300">{d.actor}</span>
                <span className="text-paper-200/80">{d.action}</span>
                <span className="text-paper-200/40">·</span>
                <span className="text-paper-300/80">{d.tenant}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
