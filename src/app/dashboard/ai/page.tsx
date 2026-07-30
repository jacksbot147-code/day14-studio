/**
 * /dashboard/ai — the AI & tech radar surface.
 *
 * One page for everything AI-shaped: what Day14 has evaluated and where it
 * sits, what is actually running versus merely shipped, what the LLM layer is
 * costing (and whether it is even answering), and what to integrate next.
 *
 * Reads, at every request:
 *   - public/data/ops/tech-radar.json   the ring decisions + changelog
 *   - public/data/ops/.llm-ledger.json  call volume, spend, failure streak
 *   - public/data/ops/.loop-gate.json   the tech-radar loop's outcome gate
 *
 * The radar is the delta baseline the weekly scan diffs against, so this page
 * is not a reading list — it is the governance surface for it. Writes go
 * through ./actions.ts and are gated by the radar's own four rules.
 *
 * HARD RAIL (CLAUDE.md prime directives): nothing on this page installs
 * anything, touches a credential, calls an external API, or pushes to git.
 * "Queue tap" writes a Telegram card for Jack. That is the whole extent of it.
 */

import Link from "next/link";
import {
  ADOPT_MIN_PRODUCTION_DAYS,
  RADAR_RINGS,
  RING_LABEL,
  adoptEligibility,
  allRadarItems,
  itemSlug,
  radarIntegrity,
  recommendations,
  trulyAdopted,
  type RadarItem,
  type RadarRing,
} from "@/lib/tech-radar";
import {
  readLedger,
  readLoopGate,
  readRadar,
  radarLastChanged,
  type LedgerDay,
} from "@/lib/tech-radar-store";
import { AddRadarItemForm, QueueTapButton, RingMoveControl } from "./radar-controls";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RING_STYLE: Record<RadarRing, { dot: string; text: string; border: string }> = {
  adopt: { dot: "bg-emerald-400", text: "text-emerald-300", border: "border-emerald-900/60" },
  trial: { dot: "bg-blue-400", text: "text-blue-300", border: "border-blue-900/60" },
  assess: { dot: "bg-amber-400", text: "text-amber-300", border: "border-amber-900/60" },
  hold: { dot: "bg-red-400", text: "text-red-300", border: "border-red-900/60" },
};

const EFFORT_STYLE: Record<string, string> = {
  minutes: "bg-emerald-500/15 text-emerald-300",
  hours: "bg-blue-500/15 text-blue-300",
  days: "bg-amber-500/15 text-amber-300",
  weeks: "bg-zinc-600/30 text-zinc-400",
};

export default async function AiRadarPage() {
  const [radar, ledger, loopGate, changedAt] = await Promise.all([
    readRadar(),
    readLedger(),
    readLoopGate(),
    radarLastChanged(),
  ]);

  if (!radar) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100 md:p-10">
        <h1 className="text-3xl font-bold">AI &amp; tech radar</h1>
        <p className="mt-4 max-w-xl text-sm text-red-300">
          <code className="font-mono">public/data/ops/tech-radar.json</code> is missing or
          unparseable, so there is no delta baseline to render. The weekly scan reads the
          same file through the repo&rsquo;s raw URL and is equally blind until it is fixed.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm text-emerald-400">
          ← back to dashboard
        </Link>
      </main>
    );
  }

  const now = new Date();
  const flags = radarIntegrity(radar, now);
  const running = trulyAdopted(radar, now);
  const recs = recommendations(radar);
  const total = allRadarItems(radar).length;

  // LLM layer health — the loudest true fact about AI at Day14 on any given day.
  const streak = ledger?.consecutive_failures ?? 0;
  const days = Object.entries(ledger?.days ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const last7 = days.slice(-7);
  const spend7 = last7.reduce((sum, [, d]) => sum + (d.est_cost_usd || 0), 0);
  const calls7 = last7.reduce((sum, [, d]) => sum + (d.calls || 0), 0);
  const ok7 = last7.reduce((sum, [, d]) => sum + (d.ok || 0), 0);

  const radarLoop = loopGate?.loops?.["tech-radar"];
  const changedDaysAgo = changedAt
    ? Math.floor((now.getTime() - changedAt.getTime()) / 86_400_000)
    : null;

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100 md:p-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">AI &amp; tech radar</h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            {total} evaluated decisions · {running.length} actually running · baseline updated{" "}
            {radar.updated || "unknown"}
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← back to dashboard
        </Link>
      </header>

      {/* The LLM layer either answers or it doesn't. Say so first. */}
      {streak > 0 && (
        <section className="mb-6 rounded-xl border border-red-900/60 bg-red-500/10 p-5">
          <h2 className="text-sm font-semibold text-red-200">
            LLM layer is failing — {streak} consecutive failures
          </h2>
          <p className="mt-1.5 text-xs text-red-200/80">
            Last success:{" "}
            <span className="font-mono">
              {ledger?.last_success_at ?? "never recorded"}
            </span>
            {ledger?.last_failure_at && (
              <>
                {" · "}last failure{" "}
                <span className="font-mono">{ledger.last_failure_at}</span>
              </>
            )}
          </p>
          {ledger?.last_failure_error && (
            <code className="mt-2 block break-words rounded bg-zinc-950/70 p-2.5 font-mono text-[11px] text-red-200/90">
              {ledger.last_failure_error}
            </code>
          )}
          <p className="mt-2.5 text-xs text-zinc-400">
            Every ring below that depends on an agent run is frozen until this clears. A
            fallback leg exists in code — see <span className="text-blue-300">Ollama</span> in
            Trial — but it is not installed, so there is currently no degraded mode.
          </p>
        </section>
      )}

      {/* Ring counts */}
      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        {RADAR_RINGS.map((ring) => (
          <div
            key={ring}
            className={`rounded-xl border bg-zinc-900 p-5 ${RING_STYLE[ring].border}`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${RING_STYLE[ring].dot}`} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                {RING_LABEL[ring]}
              </span>
            </div>
            <div className="mt-1.5 text-3xl font-bold tabular-nums text-zinc-50">
              {(radar.rings[ring] ?? []).length}
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
            LLM calls / 7d
          </div>
          <div className="mt-1.5 text-3xl font-bold tabular-nums text-zinc-50">{calls7}</div>
          <div className="mt-1.5 text-xs text-zinc-500">
            {ok7} succeeded · ${spend7.toFixed(2)} est
          </div>
        </div>
      </section>

      {/* Integrity — the radar audited against its own rules. */}
      {flags.length > 0 && (
        <section className="mb-8 rounded-xl border border-amber-900/60 bg-amber-500/[0.07] p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-amber-300">
            Radar integrity — {flags.length} {flags.length === 1 ? "item" : "items"} fail the
            radar&rsquo;s own rules
          </h2>
          <ul className="mt-3 space-y-2">
            {flags.map((f) => (
              <li key={`${f.slug}-${f.problem}`} className="text-sm">
                <span className="font-mono text-zinc-200">{f.item}</span>
                <span className="ml-2 text-xs text-zinc-500">[{f.ring}]</span>
                <p className="mt-0.5 text-xs text-amber-200/80">{f.problem}</p>
              </li>
            ))}
          </ul>
          {running.length === 0 && (radar.rings.adopt ?? []).length > 0 && (
            <p className="mt-3 border-t border-amber-900/40 pt-3 text-xs text-amber-200">
              Read that literally: <strong>nothing in Adopt is actually adopted.</strong> All{" "}
              {(radar.rings.adopt ?? []).length} entries are built, bought, or decided — none
              have run a week in production. Rule 1 exists because this is the state a radar
              drifts into on its own.
            </p>
          )}
        </section>
      )}

      {/* Recommendations — what to integrate next, cheapest unblocked first. */}
      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-zinc-400">
          Integrate next — {recs.length} with a concrete step, cheapest unblocked first
        </h2>
        <p className="mt-1.5 text-xs text-zinc-500">
          Ordered by effort, not excitement. Hold items are excluded by construction —
          recommending one is the exact loop the Hold ring exists to prevent.
        </p>
        {recs.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No item carries a next action. That is a gap in the radar, not an empty queue.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {recs.map(({ item, ring }, i) => (
              <li
                key={itemSlug(item)}
                className="border-l-2 pl-3.5"
                style={{ borderColor: "rgb(63 63 70)" }}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <span className="text-xs tabular-nums text-zinc-600">{i + 1}</span>
                  <span className="text-sm font-medium text-zinc-100">{item.item}</span>
                  <span className={`text-[11px] ${RING_STYLE[ring].text}`}>{ring}</span>
                  {item.effort && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                        EFFORT_STYLE[item.effort] ?? "bg-zinc-700/40 text-zinc-400"
                      }`}
                    >
                      {item.effort}
                    </span>
                  )}
                  {item.blocked_by && (
                    <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red-300">
                      blocked
                    </span>
                  )}
                  <span className="ml-auto flex shrink-0 flex-col items-end gap-1">
                    <QueueTapButton slug={itemSlug(item)} />
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-zinc-300">{item.next_action}</p>
                {item.blocked_by && (
                  <p className="mt-1 text-xs text-red-300/80">Blocked by: {item.blocked_by}</p>
                )}
                {item.capability && (
                  <p className="mt-1 text-[11px] text-zinc-600">
                    Capability — {item.capability}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* The rings in full. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {RADAR_RINGS.map((ring) => (
          <section
            key={ring}
            className={`rounded-xl border bg-zinc-900 p-5 ${RING_STYLE[ring].border}`}
          >
            <h2 className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-zinc-400">
              <span className={`h-2 w-2 rounded-full ${RING_STYLE[ring].dot}`} />
              {RING_LABEL[ring]} ({(radar.rings[ring] ?? []).length})
            </h2>
            <p className="mb-3.5 text-[11px] text-zinc-600">{ringBlurb(ring)}</p>
            {(radar.rings[ring] ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500">Empty.</p>
            ) : (
              <ul className="space-y-4">
                {(radar.rings[ring] ?? []).map((item) => (
                  <li key={itemSlug(item)} className="border-t border-zinc-800 pt-3 first:border-0 first:pt-0">
                    <div className="flex flex-wrap items-start gap-2">
                      <span className="text-sm font-medium text-zinc-100">{item.item}</span>
                      {(ring === "adopt" || item.in_production_since) && (
                        <AdoptBadge item={item} ring={ring} now={now} />
                      )}
                      <RingMoveControl
                        slug={itemSlug(item)}
                        currentRing={ring}
                        itemName={item.item}
                      />
                    </div>
                    {(item.why || item.reason) && (
                      <p className="mt-1.5 text-xs text-zinc-400">{item.why ?? item.reason}</p>
                    )}
                    {item.status && (
                      <p className="mt-1 text-xs text-zinc-500">
                        <span className="text-zinc-600">status:</span> {item.status}
                      </p>
                    )}
                    {item.revisit && (
                      <p className="mt-1 text-xs text-zinc-500">
                        <span className="text-zinc-600">revisit:</span> {item.revisit}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* Scan health + spend + add-item, side by side. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-zinc-400">
            Weekly scan
          </h2>
          <dl className="space-y-2 text-sm">
            <Row
              label="Radar file last changed"
              value={
                changedAt
                  ? `${changedAt.toISOString().slice(0, 10)} (${changedDaysAgo}d ago)`
                  : "never"
              }
            />
            <Row label="Changelog entries" value={String(radar.changelog.length)} />
            <Row
              label="Loop-gate no-op ceiling"
              value={
                radarLoop?.max_noop_runs
                  ? `${radarLoop.max_noop_runs} runs, then auto-pause`
                  : "not gated"
              }
            />
          </dl>
          {radarLoop?.note && (
            <p className="mt-3 rounded bg-zinc-950/60 p-2.5 text-xs text-zinc-400">
              {radarLoop.note}
            </p>
          )}
          <p className="mt-3 text-xs text-zinc-500">
            The gate watches this radar file, so a ring move recorded here is what makes the
            scan count as productive. A run that only writes a report scores zero.
          </p>
          {radar.changelog.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-zinc-800 pt-3">
              {radar.changelog
                .slice(-6)
                .reverse()
                .map((c, i) => (
                  <li key={`${c.date}-${i}`} className="text-xs">
                    <span className="font-mono text-zinc-500">{c.date}</span>{" "}
                    <span className="text-zinc-300">{c.note}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-zinc-400">
            LLM spend &amp; reliability (last {last7.length}d)
          </h2>
          {last7.length === 0 ? (
            <p className="text-sm text-zinc-500">No ledger entries yet.</p>
          ) : (
            <div className="space-y-1.5">
              {last7.map(([date, d]) => (
                <LedgerRow key={date} date={date} day={d} />
              ))}
            </div>
          )}
          {ledger?.last_agent && (
            <p className="mt-3 text-xs text-zinc-500">
              Last agent through the layer:{" "}
              <span className="font-mono text-zinc-400">{ledger.last_agent}</span>
            </p>
          )}
          <p className="mt-3 text-xs text-zinc-600">
            Cost is the layer&rsquo;s own estimate, not a provider invoice. A failed call bills
            nothing, so <span className="text-zinc-400">$0.00 on a red day means outage</span>,
            not thrift.
          </p>
        </section>
      </div>

      {/* Add an item. */}
      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-zinc-400">
          Add to the radar
        </h2>
        <p className="mb-3.5 text-xs text-zinc-500">
          Three tests, all of which must hold: it is shipping (not announced), it changes a
          Day14 decision, and it is not already on the radar in any ring.
        </p>
        <AddRadarItemForm />
      </section>

      {/* The governance text, where the decisions actually get made. */}
      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-zinc-400">
          The rules these controls enforce
        </h2>
        <ol className="space-y-1.5 text-xs text-zinc-400">
          {radar.rules_for_changing_a_ring.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 tabular-nums text-zinc-600">{i + 1}.</span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3.5 border-t border-zinc-800 pt-3.5 text-xs text-zinc-400">
          <strong className="text-zinc-300">The no-filler gate.</strong> If nothing clears the
          bar, the correct output is a single line saying so — not a landscape update, not
          three items that almost qualified. A scan that always has something to say is a scan
          that has stopped discriminating.
        </p>
      </section>

      <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-zinc-800 pt-6 text-xs text-zinc-500">
        <span>
          Human source of truth:{" "}
          <code className="text-zinc-400">Obsidian-Vault/Tech Radar.md</code> · machine copy:{" "}
          <code className="text-zinc-400">public/data/ops/tech-radar.json</code>
        </span>
        <span>
          Nothing here installs, sends, pays, or pushes. Queue tap → Telegram card.
        </span>
      </footer>
    </main>
  );
}

function ringBlurb(ring: RadarRing): string {
  switch (ring) {
    case "adopt":
      return "Running in production for a week or more. Use these; don't relitigate them.";
    case "trial":
      return "Worth running for real on a bounded piece of work.";
    case "assess":
      return "Watch, read, maybe prototype. No commitment.";
    case "hold":
      return "The most valuable ring. Each line carries its reason; moving one out needs new evidence, not a new opinion.";
  }
}

/**
 * Rule 1, made visible.
 *
 * On an Adopt entry this says whether the entry is honest. On anything else
 * that is already running it shows the clock counting toward eligibility, so
 * the date is derived from `in_production_since` rather than a hand-written
 * sentence that goes stale the moment the item changes.
 */
function AdoptBadge({
  item,
  ring,
  now,
}: {
  item: RadarItem;
  ring: RadarRing;
  now: Date;
}) {
  const elig = adoptEligibility(item, now);
  const base = "rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide";

  if (ring === "adopt") {
    return (
      <span
        title={elig.detail}
        className={`${base} ${
          elig.eligible
            ? "bg-emerald-500/15 text-emerald-300"
            : "bg-red-500/15 text-red-300"
        }`}
      >
        {elig.eligible ? `running ${elig.daysRunning}d` : "not running"}
      </span>
    );
  }

  return (
    <span
      title={elig.detail}
      className={`${base} ${
        elig.eligible
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-blue-500/15 text-blue-300"
      }`}
    >
      {elig.eligible
        ? "adopt-ready"
        : `running ${elig.daysRunning}d of ${ADOPT_MIN_PRODUCTION_DAYS}d · eligible ${elig.eligibleAt}`}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="text-right font-mono text-zinc-200">{value}</dd>
    </div>
  );
}

function LedgerRow({ date, day }: { date: string; day: LedgerDay }) {
  const calls = day.calls || 0;
  const ok = day.ok || 0;
  const okPct = calls > 0 ? ok / calls : 0;
  const bar = calls > 0 ? Math.max(4, Math.round(okPct * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 font-mono text-xs text-zinc-500">{date.slice(5)}</span>
      <div className="h-2 flex-1 overflow-hidden rounded bg-zinc-800">
        <div
          className={okPct > 0 ? "h-full bg-emerald-500" : "h-full bg-red-500"}
          style={{ width: `${calls > 0 && okPct === 0 ? 100 : bar}%` }}
        />
      </div>
      <span className="w-28 shrink-0 text-right font-mono text-xs text-zinc-400">
        {ok}/{calls} ok · ${(day.est_cost_usd || 0).toFixed(2)}
      </span>
    </div>
  );
}
