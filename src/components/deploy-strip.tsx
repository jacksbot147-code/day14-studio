/**
 * DeployStrip — a terminal-style horizontal strip showing recent commits.
 * Demonstrates the "we publish the build-log" promise without requiring
 * a real backing service yet. Data is hand-curated in `RECENT_DEPLOYS`
 * below; replace with a real feed in Phase 2.4.
 *
 * Visually: a thin dark band with a glowing dot indicating "live", mono
 * font, fake-but-plausible commit shas, customer slug, and a relative
 * timestamp.
 */
const RECENT_DEPLOYS: Array<{
  sha: string;
  customer: string;
  message: string;
  ago: string;
}> = [
  {
    sha: "a3f9b21",
    customer: "splash-jacks",
    message: "feat: chemistry trend chart + 30-day rolling average",
    ago: "12m",
  },
  {
    sha: "7d2c8e0",
    customer: "casamore",
    message: "fix: mailerlite worker handles email-already-subscribed",
    ago: "1h",
  },
  {
    sha: "f184a55",
    customer: "buildbridge",
    message: "feat(storm-mode): NOAA RSS poller + active-storm RPC",
    ago: "3h",
  },
  {
    sha: "9bc4170",
    customer: "studio",
    message: "feat: verticals data + 3 vertical landing pages",
    ago: "5h",
  },
  {
    sha: "2eb83f8",
    customer: "studio",
    message: "feat: case studies for casamore + buildbridge",
    ago: "6h",
  },
];

export function DeployStrip() {
  return (
    <section
      aria-label="Recent deploys"
      className="relative overflow-hidden border-y border-ink-200 bg-ink text-paper"
    >
      <div className="container-page flex items-center gap-3 py-3 font-mono text-[12px] leading-none">
        <span className="inline-flex shrink-0 items-center gap-2 rounded border border-paper-200/20 bg-paper/5 px-2 py-1 uppercase tracking-[0.16em] text-paper-200">
          <span className="relative inline-block h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-shipped-400" />
            <span className="absolute -inset-1 animate-ping rounded-full bg-shipped-400/40" />
          </span>
          Live deploys
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-deploy-marquee gap-10">
            {[...RECENT_DEPLOYS, ...RECENT_DEPLOYS].map((d, i) => (
              <span key={`${d.sha}-${i}`} className="inline-flex items-center gap-2 whitespace-nowrap">
                <span className="text-paper-200/60">{d.ago} ago</span>
                <span className="rounded bg-paper/10 px-1.5 py-0.5 text-paper-200">
                  {d.sha}
                </span>
                <span className="text-ember-300">{d.customer}</span>
                <span className="text-paper-200/80">{d.message}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
