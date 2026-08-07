/**
 * marque-library.ts — reading the Marque variant library back.
 *
 * The pipeline writes tagged variants; this reads them and answers the one
 * question the whole product exists to answer: **which idea is working?**
 *
 * An ad account can only tell you which asset won. Because every Marque variant
 * carries a hook and an angle, the same data aggregated by tag says
 * "problem-callout beats social-proof for this product, and pain-relief beats
 * novelty on both" — a reusable answer rather than a filename.
 *
 * Everything here is PURE. The filesystem read lives in the dashboard page, so
 * the aggregation is testable without a disk.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

import {
  HOOK_TYPES,
  OFFER_ANGLES,
  type HookType,
  type OfferAngle,
  type Channel,
  type Format,
  type FatigueVerdict,
  type VariantTag,
} from "./marque-taxonomy";

/** A variant as it appears in a batch file, plus its operational state. */
export interface LibraryVariant extends VariantTag {
  /** True when it is one of the small live field, false when it is bench. */
  live?: boolean;
  /** Set once the variant has been pulled. */
  retiredAt?: string;
  /** The rule id that retired it, when it was retired by the fatigue check. */
  retiredBy?: string;
  /** Optional model score, used only to order a launch queue. */
  viralityScore?: number;
  /**
   * Human review after generation. `usable` may run; `recut` means the idea is
   * fine and the file is not; `miss` means the concept itself was wrong. A
   * generated batch is not a shipped batch — recording the misses is the point,
   * because a pipeline that reports 100% usable is not being reviewed.
   */
  reviewVerdict?: "usable" | "recut" | "miss";
  reviewNote?: string;
  /** e.g. "higgsfield:marketing_studio_image". */
  generatedBy?: string;
  creditsSpent?: number;
}

export type VariantState = "live" | "bench" | "retired";

export function stateOf(v: LibraryVariant): VariantState {
  if (v.retiredAt) return "retired";
  return v.live ? "live" : "bench";
}

/* ------------------------------------------------------------------ totals */

export interface LibraryTotals {
  products: number;
  generated: number;
  live: number;
  bench: number;
  retired: number;
  channels: Channel[];
  formats: Format[];
}

export function summarise(variants: LibraryVariant[]): LibraryTotals {
  const counts = { live: 0, bench: 0, retired: 0 };
  for (const v of variants) counts[stateOf(v)]++;
  return {
    products: new Set(variants.map((v) => v.product)).size,
    generated: variants.length,
    ...counts,
    channels: [...new Set(variants.map((v) => v.channel))].sort(),
    formats: [...new Set(variants.map((v) => v.format))].sort(),
  };
}

/* -------------------------------------------------------------- the board */

export interface BoardCell {
  hook: HookType;
  angle: OfferAngle;
  live: number;
  bench: number;
  retired: number;
  total: number;
}

/**
 * The hook x angle board. Only rows and columns that have actually been tried
 * are returned — an empty 10x10 grid of zeroes tells an operator nothing, and
 * printing it would imply coverage that does not exist.
 */
export function buildBoard(variants: LibraryVariant[]): {
  hooks: HookType[];
  angles: OfferAngle[];
  cells: Map<string, BoardCell>;
} {
  const cells = new Map<string, BoardCell>();
  for (const v of variants) {
    const key = `${v.hook}|${v.angle}`;
    const cell =
      cells.get(key) ??
      { hook: v.hook, angle: v.angle, live: 0, bench: 0, retired: 0, total: 0 };
    cell[stateOf(v)]++;
    cell.total++;
    cells.set(key, cell);
  }
  const usedHooks = new Set(variants.map((v) => v.hook));
  const usedAngles = new Set(variants.map((v) => v.angle));

  // Canonical order first, then anything unrecognised.
  //
  // The library is arbitrary JSON off disk — hand-edited, written by an older
  // pipeline, or carrying a tag added since. Filtering to the canonical lists
  // alone dropped such a variant from the axes while its cell stayed in the
  // map, so it counted in the totals and was impossible to render: the stat
  // tiles and the board disagreed, silently. An unknown tag is a thing to SEE,
  // not a thing to hide.
  const extraHooks = [...usedHooks].filter(
    (h) => !(HOOK_TYPES as readonly string[]).includes(h),
  ).sort() as HookType[];
  const extraAngles = [...usedAngles].filter(
    (a) => !(OFFER_ANGLES as readonly string[]).includes(a),
  ).sort() as OfferAngle[];

  return {
    hooks: [...HOOK_TYPES.filter((h) => usedHooks.has(h)), ...extraHooks],
    angles: [...OFFER_ANGLES.filter((a) => usedAngles.has(a)), ...extraAngles],
    cells,
  };
}

/* ------------------------------------------------------------------ spend */

export interface SpendSummary {
  /** Credits recorded against variants. NOT a balance — see the note below. */
  creditsRecorded: number;
  /** Variants that cost credits but carry no recorded figure. */
  unpriced: number;
  /** Credits per usable variant, or null when nothing has been reviewed yet. */
  creditsPerUsable: number | null;
  byProduct: Array<{ product: string; credits: number; variants: number }>;
  byVerdict: { usable: number; recut: number; miss: number; unreviewed: number };
}

/**
 * What the pipeline has actually cost, from the library.
 *
 * Deliberately NOT a provider balance. The generator runs in Cowork where the
 * Higgsfield MCP lives; this backend holds no Higgsfield credential and cannot
 * query it. Rendering a remembered balance as if it were live would be exactly
 * the stale-number-dressed-as-current problem that made ops-pulse report a
 * hardcoded zero. So this reports what was SPENT, which the library does know,
 * and says nothing about what remains.
 *
 * `creditsPerUsable` is the number that matters: spend divided by variants that
 * survived review, not by variants generated. A pipeline is only as cheap as
 * its hit rate.
 */
export function summariseSpend(variants: LibraryVariant[]): SpendSummary {
  const byProduct = new Map<string, { credits: number; variants: number }>();
  const byVerdict = { usable: 0, recut: 0, miss: 0, unreviewed: 0 };
  let creditsRecorded = 0;
  let unpriced = 0;

  for (const v of variants) {
    const c = typeof v.creditsSpent === "number" ? v.creditsSpent : null;
    if (c === null) unpriced++;
    else creditsRecorded += c;

    const p = byProduct.get(v.product) ?? { credits: 0, variants: 0 };
    p.credits += c ?? 0;
    p.variants += 1;
    byProduct.set(v.product, p);

    if (v.reviewVerdict === "usable") byVerdict.usable++;
    else if (v.reviewVerdict === "recut") byVerdict.recut++;
    else if (v.reviewVerdict === "miss") byVerdict.miss++;
    else byVerdict.unreviewed++;
  }

  return {
    creditsRecorded,
    unpriced,
    creditsPerUsable:
      byVerdict.usable > 0 ? Number((creditsRecorded / byVerdict.usable).toFixed(2)) : null,
    byProduct: [...byProduct.entries()]
      .map(([product, x]) => ({ product, ...x }))
      .sort((a, b) => b.credits - a.credits || a.product.localeCompare(b.product)),
    byVerdict,
  };
}

/* ------------------------------------------------------- what is surviving */

export interface TagSurvival {
  tag: string;
  tried: number;
  retired: number;
  stillRunning: number;
  /** Share of tried variants that have been retired. Null below `minTried`. */
  retirementRate: number | null;
}

/**
 * Survival by tag value. `retirementRate` is deliberately null until a tag has
 * been tried `minTried` times, because a 100% retirement rate off one variant
 * is not a finding — it is one variant. Reporting it as a rate would be the
 * exact false confidence this pipeline is supposed to replace.
 */
export function survivalBy(
  variants: LibraryVariant[],
  key: "hook" | "angle" | "format",
  minTried = 3,
): TagSurvival[] {
  const acc = new Map<string, { tried: number; retired: number }>();
  for (const v of variants) {
    const k = String(v[key]);
    const a = acc.get(k) ?? { tried: 0, retired: 0 };
    a.tried++;
    if (stateOf(v) === "retired") a.retired++;
    acc.set(k, a);
  }
  return [...acc.entries()]
    .map(([tag, a]) => ({
      tag,
      tried: a.tried,
      retired: a.retired,
      stillRunning: a.tried - a.retired,
      retirementRate: a.tried >= minTried ? a.retired / a.tried : null,
    }))
    .sort((x, y) => y.tried - x.tried || x.tag.localeCompare(y.tag));
}

/* --------------------------------------------------- the live field */

export interface LiveFieldAssessment {
  live: number;
  distinctHooks: number;
  distinctAngles: number;
  /** True when every live variant tests a different hook AND a different angle. */
  wellSpread: boolean;
  /** Hooks running more than once concurrently, with their counts. */
  duplicatedHooks: Array<{ hook: HookType; count: number }>;
  duplicatedAngles: Array<{ angle: OfferAngle; count: number }>;
  /** Live variants that failed review — these should not be running at all. */
  liveButNotUsable: string[];
  warnings: string[];
}

/**
 * Is the live field actually a test?
 *
 * Four ads running the same hook teach you one thing, expensively. The whole
 * argument for a small field is that each slot buys a different answer, so the
 * field has to be chosen for SPREAD rather than for score — two high-scoring
 * variants of one hook tell you nothing the first one didn't.
 *
 * This exists because a field can be well spread by accident of batch order and
 * then quietly stop being so on the next swap, with nothing anywhere saying it
 * changed.
 */
export function assessLiveField(variants: LibraryVariant[]): LiveFieldAssessment {
  const live = variants.filter((v) => stateOf(v) === "live");

  const count = <T extends string>(key: (v: LibraryVariant) => T) => {
    const m = new Map<T, number>();
    for (const v of live) m.set(key(v), (m.get(key(v)) ?? 0) + 1);
    return m;
  };
  const hooks = count((v) => v.hook);
  const angles = count((v) => v.angle);

  const duplicatedHooks = [...hooks.entries()]
    .filter(([, n]) => n > 1)
    .map(([hook, count]) => ({ hook, count }))
    .sort((a, b) => b.count - a.count);
  const duplicatedAngles = [...angles.entries()]
    .filter(([, n]) => n > 1)
    .map(([angle, count]) => ({ angle, count }))
    .sort((a, b) => b.count - a.count);

  const liveButNotUsable = live
    .filter((v) => v.reviewVerdict && v.reviewVerdict !== "usable")
    .map((v) => v.id);

  const warnings: string[] = [];
  for (const d of duplicatedHooks) {
    warnings.push(
      `${d.count} live variants share the ${d.hook} hook — that slot is buying an answer you already have.`,
    );
  }
  for (const d of duplicatedAngles) {
    warnings.push(`${d.count} live variants share the ${d.angle} angle.`);
  }
  for (const id of liveButNotUsable) {
    warnings.push(`${id} is live but did not pass review.`);
  }
  if (live.length === 0 && variants.length > 0) {
    warnings.push("Nothing is live. A bench with no field is a library, not a test.");
  }

  return {
    live: live.length,
    distinctHooks: hooks.size,
    distinctAngles: angles.size,
    wellSpread:
      live.length > 0 && hooks.size === live.length && angles.size === live.length,
    duplicatedHooks,
    duplicatedAngles,
    liveButNotUsable,
    warnings,
  };
}

/* ------------------------------------------------------- the swap queue */

export interface SwapSuggestion {
  verdict: FatigueVerdict;
  dying: LibraryVariant | null;
  /** A bench variant on a DIFFERENT hook — replacing like with like repeats the losing bet. */
  replacement: LibraryVariant | null;
  /** Set when no bench variant on a different hook exists. */
  gap: string | null;
}

/**
 * Turn fatigue verdicts into an actionable swap queue.
 *
 * The rule that matters: a retired variant is replaced from a DIFFERENT hook.
 * Swapping a dead `problem-callout` for another `problem-callout` re-runs the
 * bet that just lost, which is how "we refreshed the creative" becomes a
 * treadmill instead of a test.
 */
export function buildSwapQueue(
  variants: LibraryVariant[],
  verdicts: FatigueVerdict[],
): SwapSuggestion[] {
  const byId = new Map(variants.map((v) => [v.id, v]));
  const rank = { retire: 0, refresh: 1, watch: 2, keep: 3 } as const;

  const actionable = verdicts
    .filter((v) => v.action === "retire" || v.action === "refresh")
    .sort((a, b) => rank[a.action] - rank[b.action]);

  // Bench variants are consumed as they are assigned, so two dying ads never
  // get handed the same replacement.
  const claimed = new Set<string>();

  return actionable.map((verdict) => {
    const dying = byId.get(verdict.variantId) ?? null;

    let replacement: LibraryVariant | null = null;
    let gap: string | null = null;

    if (verdict.action === "refresh") {
      // The idea is alive, the file is tired — re-cut it, do not replace it.
      gap = dying
        ? `Re-cut ${dying.hook} / ${dying.angle} with a new opener; keep the tags, bump the seq.`
        : "Re-cut with a new opener; keep the tags.";
    } else {
      const pool = variants.filter(
        (v) =>
          stateOf(v) === "bench" &&
          !claimed.has(v.id) &&
          (!dying || (v.hook !== dying.hook && v.product === dying.product)),
      );
      // Prefer an untried angle too, then fall back to any different hook.
      const triedAngles = new Set(
        variants.filter((v) => stateOf(v) !== "bench").map((v) => v.angle),
      );
      replacement =
        pool.find((v) => !triedAngles.has(v.angle)) ?? pool[0] ?? null;
      if (replacement) claimed.add(replacement.id);
      else
        gap = dying
          ? `Bench is empty for ${dying.product} on a hook other than ${dying.hook}. Generate before pulling this one.`
          : "No bench variant available on a different hook.";
    }

    return { verdict, dying, replacement, gap };
  });
}

/* --------------------------------------------------------------- coverage */

/** Hook x angle pairs never tried for a product — the next batch writes itself. */
export function untriedPairs(
  variants: LibraryVariant[],
  limit = 6,
): Array<{ hook: HookType; angle: OfferAngle }> {
  const tried = new Set(variants.map((v) => `${v.hook}|${v.angle}`));
  const out: Array<{ hook: HookType; angle: OfferAngle }> = [];
  // Walk the Latin square so the suggestions spread rather than clustering on
  // one hook — same reason buildMatrix does.
  for (let lap = 0; lap < OFFER_ANGLES.length && out.length < limit; lap++) {
    for (let h = 0; h < HOOK_TYPES.length && out.length < limit; h++) {
      const hook = HOOK_TYPES[h]!;
      const angle = OFFER_ANGLES[(h + lap) % OFFER_ANGLES.length]!;
      if (!tried.has(`${hook}|${angle}`)) out.push({ hook, angle });
    }
  }
  return out;
}

/* --------------------------------------------------------------------- io */

/**
 * Where the pipeline writes.
 *
 * Default is the DAY14 folder, NOT anywhere inside this repo — the repo is
 * public and pushed every ~15 minutes, so a variant library (which carries
 * product names, offers and concepts) must never become committable by
 * accident. Same reasoning as DAY14_DOCS_DIR for prospect data.
 */
export function libraryDir(): string {
  return (
    process.env.MARQUE_LIBRARY_DIR ??
    path.join(homedir(), "Claude/Projects/DAY14/Marque/library")
  );
}

export interface LibraryRead {
  variants: LibraryVariant[];
  verdicts: FatigueVerdict[];
  /** Product folders found, even ones with no readable batch. */
  productDirs: string[];
  /** Files that existed but could not be parsed — surfaced, never swallowed. */
  unreadable: string[];
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

/**
 * Read every product's batches and fatigue verdicts.
 * Layout: <library>/<product-slug>/batch-*.json and /fatigue-*.json
 *
 * A malformed file is reported in `unreadable` rather than crashing the page or
 * vanishing — a library that silently shrinks is worse than one that errors.
 */
export async function readLibrary(root = libraryDir()): Promise<LibraryRead> {
  const empty: LibraryRead = { variants: [], verdicts: [], productDirs: [], unreadable: [] };
  if (!existsSync(root)) return empty;

  const variants: LibraryVariant[] = [];
  const verdicts: FatigueVerdict[] = [];
  const productDirs: string[] = [];
  const unreadable: string[] = [];

  for (const slug of await fs.readdir(root).catch(() => [] as string[])) {
    // Skip housekeeping folders. `_to_delete`, `_archive`, `.DS_Store` and the
    // like are not products, and listing them as products with zero variants
    // reads as "a product we generated nothing for" — a false alarm on the one
    // surface that is supposed to say what is actually happening.
    if (slug.startsWith("_") || slug.startsWith(".")) continue;
    const dir = path.join(root, slug);
    let entries: string[];
    try {
      if (!(await fs.stat(dir)).isDirectory()) continue;
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    productDirs.push(slug);
    // Sort explicitly. Merge below is last-write-wins, and with date-stamped
    // filenames that must mean NEWEST-wins — but readdir order is arbitrary by
    // spec, so relying on it makes the merge silently filesystem-dependent.
    entries.sort();
    for (const name of entries) {
      if (!name.endsWith(".json")) continue;
      const full = path.join(dir, name);
      if (name.startsWith("batch")) {
        const rows = await readJson<LibraryVariant[]>(full);
        if (Array.isArray(rows)) variants.push(...rows.filter((r) => r && r.id));
        else unreadable.push(path.join(slug, name));
      } else if (name.startsWith("fatigue")) {
        const rows = await readJson<FatigueVerdict[]>(full);
        if (Array.isArray(rows)) verdicts.push(...rows.filter((r) => r && r.variantId));
        else unreadable.push(path.join(slug, name));
      }
    }
  }

  // The variant id is the idempotency key everywhere else; honour that here.
  // Later files win field-by-field, so a fatigue run that stamps retiredAt into
  // a newer batch file does not get undone by an older one.
  const seen = new Map<string, LibraryVariant>();
  for (const v of variants) seen.set(v.id, { ...seen.get(v.id), ...v });

  return { variants: [...seen.values()], verdicts, productDirs, unreadable };
}
