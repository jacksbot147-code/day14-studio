/**
 * /dashboard/marque — internal Marque ops surface.
 *
 * The fifth service line, rendered for the operator. Marque sells a creative
 * PIPELINE, so this page answers the pipeline's question rather than an ad
 * account's: not "which asset won" but **which idea is working**.
 *
 * Reads the variant library the marque-ads skill writes. Read-only: the skill
 * owns every write, and nothing here launches, pauses, or spends anything.
 *
 * Dashboard skin (zinc-950), same pattern as /dashboard/capture and geo.
 *
 * HARD RAILS: prices and spend floors only from MARQUE_TIERS. No claimed
 * performance — the fatigue rules are decisions we commit to, not predictions.
 */

import Link from "next/link";

import { MARQUE_TIERS, MARQUE_SPEND_RULE } from "@/lib/pricing";
import { FATIGUE_RULES } from "@/lib/marque-taxonomy";
import {
  readLibrary,
  summarise,
  summariseSpend,
  assessLiveField,
  detectFieldWipe,
  buildBoard,
  survivalBy,
  buildSwapQueue,
  untriedPairs,
} from "@/lib/marque-library";

export const dynamic = "force-dynamic";

const WEEKLY_LOOP = [
  {
    phase: "Generate the bench",
    detail:
      "marque_matrix.py builds a balanced batch — no two variants share a (hook, angle) pair while the space still has room. Concepts are written per variant before anything is generated; a category is not a brief.",
  },
  {
    phase: "Run a few",
    detail:
      "Four to eight live, never the whole batch. Ads inside an ad set share one pool of optimization events, so a large live field keeps everything in learning. The variant id goes in verbatim as the ad name — that is what makes the export joinable.",
  },
  {
    phase: "Read the fatigue",
    detail:
      "marque_fatigue.py against the week's ad-level export. Every rule compares a variant to its OWN history, because budgets move and a variant measured against itself is the only fair comparison.",
  },
  {
    phase: "Swap on a different bet",
    detail:
      "A retirement is replaced from a different hook. Swapping a dead problem-callout for another problem-callout re-runs the bet that just lost — that is how 'we refreshed the creative' becomes a treadmill instead of a test.",
  },
];

export default async function MarqueDashboard() {
  const { variants, verdicts, productDirs } = await readLibrary();
  const totals = summarise(variants);
  const spend = summariseSpend(variants);
  const field = assessLiveField(variants);
  const wipe = detectFieldWipe(variants, verdicts);
  const board = buildBoard(variants);
  const hookSurvival = survivalBy(variants, "hook");
  const swaps = buildSwapQueue(variants, verdicts);
  const gaps = untriedPairs(variants, 6);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Marque ops
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Ad creative pipeline · weekly loop by{" "}
            <span className="font-mono">marque-ads</span> · the question is
            which <em>idea</em> is working, not which asset
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← back to dashboard
        </Link>
      </header>

      {/* Pipeline at a glance. */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat label="products" value={totals.products} />
        <Stat label="generated" value={totals.generated} />
        <Stat label="live" value={totals.live} tone="emerald" />
        <Stat label="bench" value={totals.bench} />
        <Stat label="retired" value={totals.retired} tone="zinc" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* The board — the whole reason variants are tagged. */}
        <Card title={`Hook × angle board (${board.cells.size} pairs tried)`}>
          {variants.length === 0 ? (
            <div className="text-sm text-zinc-400 space-y-2">
              <p>
                No variants in the library yet. A batch appears here once{" "}
                <span className="font-mono text-zinc-300">
                  &lt;library&gt;/&#123;product&#125;/batch-*.json
                </span>{" "}
                exists.
              </p>
              <p className="text-xs text-zinc-500">
                Library root:{" "}
                <span className="font-mono">
                  {process.env.MARQUE_LIBRARY_DIR
                    ? "MARQUE_LIBRARY_DIR"
                    : "~/Claude/Projects/DAY14/Marque/library"}
                </span>
                {productDirs.length > 0 &&
                  ` · ${productDirs.length} product folder(s) present but no readable batches`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left font-normal text-zinc-500 pr-3 pb-2">
                      hook \ angle
                    </th>
                    {board.angles.map((a) => (
                      <th
                        key={a}
                        className="font-normal text-zinc-500 px-1.5 pb-2 text-left whitespace-nowrap"
                      >
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {board.hooks.map((h) => (
                    <tr key={h}>
                      <td className="text-zinc-300 pr-3 py-1 whitespace-nowrap font-mono">
                        {h}
                      </td>
                      {board.angles.map((a) => {
                        const c = board.cells.get(`${h}|${a}`);
                        return (
                          <td key={a} className="px-1.5 py-1 text-center">
                            {!c ? (
                              <span className="text-zinc-700">·</span>
                            ) : (
                              <span className="font-mono">
                                {c.live > 0 && (
                                  <span className="text-emerald-400">{c.live}</span>
                                )}
                                {c.bench > 0 && (
                                  <span className="text-zinc-400">
                                    {c.live > 0 ? "/" : ""}
                                    {c.bench}
                                  </span>
                                )}
                                {c.retired > 0 && (
                                  <span className="text-zinc-600 line-through ml-0.5">
                                    {c.retired}
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-zinc-600 mt-3">
                <span className="text-emerald-400">live</span> /{" "}
                <span className="text-zinc-400">bench</span> /{" "}
                <span className="text-zinc-600 line-through">retired</span> ·{" "}
                <span className="text-zinc-700">·</span> = never tried
              </p>
            </div>
          )}
        </Card>

        {/* A whole-field wipe is a data problem until proven otherwise. */}
        {wipe && (
          <div className="md:col-span-2 rounded border border-rose-800 bg-rose-950/40 p-4">
            <p className="text-sm font-semibold text-rose-300 uppercase tracking-wider mb-1">
              Stop — check the input before acting
            </p>
            <p className="text-sm text-rose-100/90">{wipe.message}</p>
            <ul className="mt-2 space-y-1">
              {wipe.checks.map((c) => (
                <li key={c} className="text-xs text-rose-200/80 flex gap-2">
                  <span>·</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-rose-300/70 mt-2">
              A whole live field does not fatigue in the same week. Acting on
              this empties the account.
            </p>
          </div>
        )}

        {/* Is the live field a test, or four slots buying one answer? */}
        <Card title="Live field">
          {totals.generated === 0 ? (
            <p className="text-sm text-zinc-400">Nothing live.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-4 mb-3">
                <span className="text-2xl font-bold font-mono">{field.live}</span>
                <span className="text-sm text-zinc-400">
                  {field.distinctHooks} hook{field.distinctHooks === 1 ? "" : "s"} ·{" "}
                  {field.distinctAngles} angle{field.distinctAngles === 1 ? "" : "s"}
                </span>
                <span
                  className={`ml-auto text-xs uppercase tracking-wider ${
                    field.wellSpread ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {field.wellSpread ? "well spread" : "not a clean test"}
                </span>
              </div>
              {field.warnings.length > 0 ? (
                <ul className="space-y-1.5">
                  {field.warnings.map((w) => (
                    <li key={w} className="text-sm text-amber-400/90 flex gap-2">
                      <span>⚠</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-400">
                  Every live slot tests a different hook and a different angle,
                  so each one buys an answer the others do not.
                </p>
              )}
              <p className="text-xs text-zinc-600 mt-3">
                The field is chosen for SPREAD, not for score. Two high-scoring
                variants of the same hook teach you nothing the first one didn&rsquo;t
                — and a field that is well spread today can stop being so on the
                next swap with nothing saying it changed.
              </p>
            </>
          )}
        </Card>

        {/* The actual creative. A pipeline you cannot look at is a spreadsheet. */}
        <Card title={`Creative (${variants.filter((v) => v.assetRef).length} rendered)`}>
          {variants.filter((v) => v.assetRef).length === 0 ? (
            <p className="text-sm text-zinc-400">
              No rendered assets yet. Variants appear here once a batch carries{" "}
              <span className="font-mono text-zinc-300">assetRef</span>.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {variants
                  .filter((v) => v.assetRef)
                  .map((v) => (
                    <figure key={v.id} className="m-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.assetRef!}
                        alt={`${v.hook} / ${v.angle} — ${v.concept}`}
                        loading="lazy"
                        className={`w-full rounded border ${
                          v.reviewVerdict === "miss"
                            ? "border-rose-900/70 opacity-40"
                            : v.reviewVerdict === "recut"
                              ? "border-amber-900/70 opacity-70"
                              : "border-zinc-700"
                        }`}
                      />
                      <figcaption className="mt-1.5 text-[11px] leading-snug">
                        <span className="font-mono text-zinc-400">
                          {v.hook}/{v.angle}
                        </span>
                        {v.reviewVerdict && (
                          <span
                            className={
                              v.reviewVerdict === "usable"
                                ? " text-emerald-400"
                                : v.reviewVerdict === "recut"
                                  ? " text-amber-400"
                                  : " text-rose-400"
                            }
                          >
                            {" "}
                            · {v.reviewVerdict}
                          </span>
                        )}
                        {v.reviewNote && (
                          <span className="block text-zinc-500 mt-0.5">{v.reviewNote}</span>
                        )}
                      </figcaption>
                    </figure>
                  ))}
              </div>
              <p className="text-xs text-zinc-600 mt-3">
                Generated, not shipped. A batch that reviews 100% usable has not
                been reviewed — the misses are why the bench is deeper than the
                field.
              </p>
            </>
          )}
        </Card>

        {/* Needs a swap. */}
        <Card title={`Needs a swap (${swaps.length})`}>
          {swaps.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Nothing to pull. Either no fatigue check has run this week, or
              every live variant is still beating its own history — say which,
              rather than reporting silence as health.
            </p>
          ) : (
            <ul className="space-y-3">
              {swaps.map((s) => (
                <li key={s.verdict.variantId} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={
                        s.verdict.action === "retire"
                          ? "text-rose-400 text-xs uppercase tracking-wider"
                          : "text-amber-400 text-xs uppercase tracking-wider"
                      }
                    >
                      {s.verdict.action}
                    </span>
                    <span className="font-mono text-zinc-300 text-xs break-all">
                      {s.verdict.variantId}
                    </span>
                  </div>
                  {s.verdict.reasons.map((r) => (
                    <p key={r} className="text-xs text-zinc-500 mt-0.5">
                      {r}
                    </p>
                  ))}
                  {s.replacement && (
                    <p className="text-xs text-emerald-300/90 mt-1">
                      → {s.replacement.hook} / {s.replacement.angle}{" "}
                      <span className="text-zinc-500">
                        ({s.replacement.id})
                      </span>
                    </p>
                  )}
                  {s.gap && (
                    <p className="text-xs text-amber-400/90 mt-1">{s.gap}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* What is surviving, by hook. */}
        <Card title="Hook survival">
          {hookSurvival.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Nothing tried yet.
            </p>
          ) : (
            <>
              <ul className="space-y-1.5 text-sm">
                {hookSurvival.map((r) => (
                  <li key={r.tag} className="flex items-center gap-2">
                    <span className="font-mono text-zinc-300 text-xs">
                      {r.tag}
                    </span>
                    <span className="ml-auto font-mono text-xs">
                      <span className="text-zinc-400">{r.stillRunning}</span>
                      <span className="text-zinc-600">/{r.tried}</span>{" "}
                      {r.retirementRate === null ? (
                        <span className="text-zinc-600">
                          too few to rate
                        </span>
                      ) : (
                        <span
                          className={
                            r.retirementRate > 0.5
                              ? "text-rose-400"
                              : "text-emerald-400"
                          }
                        >
                          {Math.round(r.retirementRate * 100)}% retired
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-600 mt-3">
                A rate is withheld below three tries. One retirement off one
                variant is not a 100% failure rate — it is one variant, and
                reporting it as a rate is the false confidence this pipeline
                exists to replace.
              </p>
            </>
          )}
        </Card>

        {/* Next batch writes itself. */}
        <Card title="Untried pairs — the next batch">
          {gaps.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Every hook × angle pair has been tried. Further batches are
              re-cuts, not new bets — say so out loud before generating more.
            </p>
          ) : (
            <ul className="space-y-1 text-sm font-mono text-zinc-300">
              {gaps.map((g) => (
                <li key={`${g.hook}|${g.angle}`}>
                  {g.hook} <span className="text-zinc-600">×</span> {g.angle}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* What it has cost. Spend, not balance — see summariseSpend. */}
        <Card title="Generation spend">
          {totals.generated === 0 ? (
            <p className="text-sm text-zinc-400">Nothing generated yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <div className="text-2xl font-bold font-mono">{spend.creditsRecorded}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">credits spent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {spend.creditsPerUsable ?? "—"}
                  </div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">per usable</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">
                    {spend.byVerdict.usable}
                    <span className="text-zinc-600 text-base">/{totals.generated}</span>
                  </div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">hit rate</div>
                </div>
              </div>
              <ul className="space-y-1 text-sm">
                {spend.byProduct.map((p) => (
                  <li key={p.product} className="flex justify-between">
                    <span className="font-mono text-zinc-300 text-xs">{p.product}</span>
                    <span className="font-mono text-xs text-zinc-400">
                      {p.credits} credits · {p.variants} variants
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-600 mt-3">
                <span className="text-zinc-400">Cost per USABLE variant</span> is the
                number that matters — spend divided by what survived review, not
                by what was generated. A pipeline is only as cheap as its hit
                rate.
                {spend.byVerdict.unreviewed > 0 && (
                  <>
                    {" "}
                    <span className="text-amber-400/90">
                      {spend.byVerdict.unreviewed} variant(s) unreviewed — the hit
                      rate is optimistic until they are looked at.
                    </span>
                  </>
                )}
                {spend.unpriced > 0 && (
                  <>
                    {" "}
                    <span className="text-amber-400/90">
                      {spend.unpriced} carry no recorded cost, so the total is a
                      floor, not a figure.
                    </span>
                  </>
                )}
              </p>
              <p className="text-xs text-zinc-600 mt-2">
                This is spend, not balance. The generator runs where the
                Higgsfield credential lives; this backend has none and cannot
                query a balance. Showing a remembered one as current is how a
                dashboard starts lying.
              </p>
            </>
          )}
        </Card>

        {/* Offer ladder — numbers from pricing.ts only. */}
        <Card title="Offer ladder + published spend floors">
          <ul className="space-y-3 text-sm">
            {MARQUE_TIERS.map((t) => (
              <li key={t.slug}>
                <div className="flex justify-between">
                  <span className="text-zinc-200 font-medium">{t.name}</span>
                  <span className="font-mono text-zinc-300">{t.priceLabel}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {t.variantsPerMonth} generated · {t.variantsLive} live · floor{" "}
                  <span className="text-zinc-300">
                    ${t.spendFloorMonthly.toLocaleString("en-US")}/mo
                  </span>{" "}
                  = {MARQUE_SPEND_RULE.dailyBudgetMultipleOfCpa}× a $
                  {t.floorTargetCpa} target on {t.floorEvent}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-600 mt-3">
            {MARQUE_SPEND_RULE.billing}
          </p>
        </Card>

        {/* The rules we commit to. */}
        <Card title="Fatigue rules (decisions, not predictions)">
          <ul className="space-y-2 text-sm text-zinc-300">
            {FATIGUE_RULES.map((r) => (
              <li key={r.id} className="flex gap-2">
                <span
                  className={
                    r.action === "retire"
                      ? "text-rose-400/80"
                      : "text-amber-500/80"
                  }
                >
                  {r.action === "retire" ? "✕" : "↻"}
                </span>
                <span>
                  <span className="font-mono text-xs text-zinc-400">
                    {r.id}
                  </span>{" "}
                  — {r.trigger}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-600 mt-3">
            Every rule compares a variant to its own history. These say when we
            swap, never what your results will be.
          </p>
        </Card>

        {/* The weekly loop. */}
        <Card title="Weekly loop">
          <div className="space-y-4">
            {WEEKLY_LOOP.map((step, i) => (
              <div key={step.phase}>
                <h4 className="text-sm text-zinc-200 font-medium">
                  {i + 1}. {step.phase}
                </h4>
                <p className="text-sm text-zinc-400 mt-1">{step.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-400/90 mt-3">
            ⚠ Publishing an ad and changing a budget are Jack taps. The loop
            generates, tags, scores and queues — it never spends.
          </p>
        </Card>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "emerald" | "zinc";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "zinc"
        ? "text-zinc-500"
        : "text-zinc-100";
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3">
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      <div className="text-xs text-zinc-500 uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5">
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
