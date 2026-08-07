import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  stateOf,
  summarise,
  buildBoard,
  survivalBy,
  buildSwapQueue,
  untriedPairs,
  summariseSpend,
  readLibrary,
  type LibraryVariant,
} from "@/lib/marque-library";
import { buildMatrix, type FatigueVerdict } from "@/lib/marque-taxonomy";

function lib(count = 12, product = "mug-warmer"): LibraryVariant[] {
  return buildMatrix({ product, count, channel: "tiktok" }).map((v, i) => ({
    ...v,
    generatedAt: "2026-08-06T00:00:00.000Z",
    concept: `concept ${i}`,
    live: i < 4,
  }));
}

describe("marque library — state", () => {
  it("reads live, bench and retired off a variant", () => {
    const [v] = lib(1);
    expect(stateOf({ ...v!, live: true })).toBe("live");
    expect(stateOf({ ...v!, live: false })).toBe("bench");
    expect(stateOf({ ...v!, live: true, retiredAt: "2026-08-06" })).toBe("retired");
  });

  it("treats an absent live flag as bench, not live", () => {
    const { live: _drop, ...noFlag } = lib(1)[0]!;
    expect(stateOf(noFlag as LibraryVariant)).toBe("bench");
  });
});

describe("marque library — totals", () => {
  it("counts a batch into live, bench and retired without double counting", () => {
    const t = summarise(lib(12));
    expect(t.generated).toBe(12);
    expect(t.live).toBe(4);
    expect(t.bench).toBe(8);
    expect(t.retired).toBe(0);
    expect(t.live + t.bench + t.retired).toBe(t.generated);
  });

  it("a retired variant leaves the live count", () => {
    const v = lib(12);
    v[0] = { ...v[0]!, retiredAt: "2026-08-06", retiredBy: "ctr-decay" };
    const t = summarise(v);
    expect(t.live).toBe(3);
    expect(t.retired).toBe(1);
    expect(t.live + t.bench + t.retired).toBe(12);
  });

  it("counts distinct products and reports the channels in play", () => {
    const t = summarise([...lib(4, "mug-warmer"), ...lib(4, "sunset-lamp")]);
    expect(t.products).toBe(2);
    expect(t.channels).toEqual(["tiktok"]);
  });

  it("an empty library summarises to zeroes rather than throwing", () => {
    expect(summarise([])).toMatchObject({ products: 0, generated: 0, live: 0, bench: 0, retired: 0 });
  });
});

describe("marque library — the board", () => {
  it("only shows hooks and angles that were actually tried", () => {
    const board = buildBoard(lib(4));
    expect(board.hooks).toHaveLength(4);
    expect(board.angles).toHaveLength(4);
    expect(board.cells.size).toBe(4);
  });

  it("keeps hooks and angles in canonical order, not first-seen order", () => {
    const shuffled = [...lib(6)].reverse();
    const board = buildBoard(shuffled);
    expect(board.hooks).toEqual([...board.hooks].sort(
      (a, b) => buildBoard(lib(6)).hooks.indexOf(a) - buildBoard(lib(6)).hooks.indexOf(b),
    ));
  });

  it("a cell's states sum to its total", () => {
    const v = lib(12);
    v[0] = { ...v[0]!, retiredAt: "2026-08-06" };
    for (const cell of buildBoard(v).cells.values()) {
      expect(cell.live + cell.bench + cell.retired).toBe(cell.total);
    }
  });

  it("an empty library produces an empty board, not a grid of zeroes", () => {
    const board = buildBoard([]);
    expect(board.hooks).toEqual([]);
    expect(board.angles).toEqual([]);
    expect(board.cells.size).toBe(0);
  });
});

describe("marque library — survival", () => {
  it("withholds a rate until a tag has been tried enough to mean anything", () => {
    const v = lib(12);
    v[0] = { ...v[0]!, retiredAt: "2026-08-06" };
    const rows = survivalBy(v, "hook");
    // A 12-variant batch tries most hooks once or twice.
    for (const r of rows) {
      if (r.tried < 3) expect(r.retirementRate, `${r.tag} tried ${r.tried}`).toBeNull();
      else expect(r.retirementRate).toBeCloseTo(r.retired / r.tried);
    }
  });

  it("one retired variant off one try is never reported as a 100% failure rate", () => {
    const v = lib(12).map((x, i) => (i === 0 ? { ...x, retiredAt: "2026-08-06" } : x));
    const row = survivalBy(v, "hook").find((r) => r.tried === 1);
    if (row) expect(row.retirementRate).toBeNull();
  });

  it("does report a rate once the threshold is met", () => {
    const v = lib(40);
    const marked = v.map((x, i) => (i % 4 === 0 ? { ...x, retiredAt: "2026-08-06" } : x));
    const rows = survivalBy(marked, "hook");
    expect(rows.some((r) => r.retirementRate !== null)).toBe(true);
  });

  it("tried always equals retired plus still running", () => {
    const v = lib(40).map((x, i) => (i % 3 === 0 ? { ...x, retiredAt: "2026-08-06" } : x));
    for (const r of survivalBy(v, "angle")) {
      expect(r.retired + r.stillRunning).toBe(r.tried);
    }
  });
});

describe("marque library — the swap queue", () => {
  const verdict = (id: string, action: FatigueVerdict["action"]): FatigueVerdict => ({
    variantId: id,
    action,
    fired: action === "keep" ? [] : ["ctr-decay"],
    reasons: [],
  });

  it("ignores keep and watch — the queue is things to do", () => {
    const v = lib(12);
    const q = buildSwapQueue(v, [verdict(v[0]!.id, "keep"), verdict(v[1]!.id, "watch")]);
    expect(q).toHaveLength(0);
  });

  it("never replaces a dead hook with the same hook", () => {
    const v = lib(12);
    const q = buildSwapQueue(v, [verdict(v[0]!.id, "retire")]);
    expect(q).toHaveLength(1);
    expect(q[0]!.replacement).not.toBeNull();
    expect(q[0]!.replacement!.hook).not.toBe(v[0]!.hook);
  });

  it("never hands the same bench variant to two dying ads", () => {
    const v = lib(12);
    const q = buildSwapQueue(v, [
      verdict(v[0]!.id, "retire"),
      verdict(v[1]!.id, "retire"),
      verdict(v[2]!.id, "retire"),
    ]);
    const picked = q.map((s) => s.replacement?.id).filter(Boolean);
    expect(new Set(picked).size).toBe(picked.length);
  });

  it("refresh means re-cut, not replace", () => {
    const v = lib(12);
    const q = buildSwapQueue(v, [verdict(v[0]!.id, "refresh")]);
    expect(q[0]!.replacement).toBeNull();
    expect(q[0]!.gap).toMatch(/Re-cut/);
  });

  it("says the bench is empty instead of silently offering nothing", () => {
    // Everything live: no bench at all.
    const v = lib(12).map((x) => ({ ...x, live: true }));
    const q = buildSwapQueue(v, [verdict(v[0]!.id, "retire")]);
    expect(q[0]!.replacement).toBeNull();
    expect(q[0]!.gap).toMatch(/Bench is empty/);
  });

  it("never pulls a replacement from a different product", () => {
    const a = lib(6, "mug-warmer");
    const b = lib(6, "sunset-lamp");
    const q = buildSwapQueue([...a, ...b], [verdict(a[0]!.id, "retire")]);
    expect(q[0]!.replacement?.product).toBe("mug-warmer");
  });

  it("survives a verdict for a variant the library has never heard of", () => {
    const q = buildSwapQueue(lib(12), [verdict("ghost-variant-id", "retire")]);
    expect(q).toHaveLength(1);
    expect(q[0]!.dying).toBeNull();
  });

  it("orders retirements ahead of refreshes", () => {
    const v = lib(12);
    const q = buildSwapQueue(v, [verdict(v[0]!.id, "refresh"), verdict(v[1]!.id, "retire")]);
    expect(q[0]!.verdict.action).toBe("retire");
  });
});

describe("marque library — coverage", () => {
  it("suggests only pairs that have never been tried", () => {
    const v = lib(12);
    const tried = new Set(v.map((x) => `${x.hook}|${x.angle}`));
    for (const p of untriedPairs(v)) {
      expect(tried.has(`${p.hook}|${p.angle}`)).toBe(false);
    }
  });

  it("spreads suggestions across hooks rather than stacking one", () => {
    const suggestions = untriedPairs(lib(12), 6);
    expect(suggestions).toHaveLength(6);
    expect(new Set(suggestions.map((s) => s.hook)).size).toBeGreaterThan(1);
  });

  it("returns nothing once the whole space is exhausted", () => {
    const all = buildMatrix({ product: "p", count: 100, channel: "tiktok" }).map((v) => ({
      ...v,
      generatedAt: "2026-08-06T00:00:00.000Z",
      concept: "c",
    }));
    expect(untriedPairs(all)).toEqual([]);
  });

  it("suggests a full spread against an empty library", () => {
    expect(untriedPairs([], 6)).toHaveLength(6);
  });
});


describe("marque library — reading it off disk", () => {
  let ROOT: string;

  beforeEach(async () => {
    ROOT = await fs.mkdtemp(path.join(os.tmpdir(), "marque-lib-"));
  });
  afterEach(async () => {
    await fs.rm(ROOT, { recursive: true, force: true }).catch(() => {});
  });

  async function writeProduct(slug: string, variants: LibraryVariant[], verdicts: unknown[] = []) {
    const dir = path.join(ROOT, slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "batch-2026-08-06.json"), JSON.stringify(variants));
    if (verdicts.length)
      await fs.writeFile(path.join(dir, "fatigue-2026-08-06.json"), JSON.stringify(verdicts));
  }

  it("a missing library root is empty, not an error", async () => {
    const r = await readLibrary(path.join(ROOT, "does-not-exist"));
    expect(r).toMatchObject({ variants: [], verdicts: [], productDirs: [], unreadable: [] });
  });

  it("reads batches and verdicts across several products", async () => {
    await writeProduct("mug-warmer", lib(12, "mug-warmer"), [
      { variantId: "x", action: "retire", fired: ["ctr-decay"], reasons: [] },
    ]);
    await writeProduct("sunset-lamp", lib(6, "sunset-lamp"));
    const r = await readLibrary(ROOT);
    expect(r.variants).toHaveLength(18);
    expect(r.verdicts).toHaveLength(1);
    expect(r.productDirs.sort()).toEqual(["mug-warmer", "sunset-lamp"]);
    expect(summarise(r.variants).products).toBe(2);
  });

  it("reports a malformed file instead of silently shrinking the library", async () => {
    const dir = path.join(ROOT, "broken");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "batch-bad.json"), "{ not json");
    const r = await readLibrary(ROOT);
    expect(r.variants).toHaveLength(0);
    expect(r.unreadable).toContain(path.join("broken", "batch-bad.json"));
  });

  it("ignores housekeeping folders — _to_delete is not a product", async () => {
    await writeProduct("real-product", lib(4, "real-product"));
    await fs.mkdir(path.join(ROOT, "_to_delete", "old"), { recursive: true });
    await fs.mkdir(path.join(ROOT, ".hidden"), { recursive: true });
    const r = await readLibrary(ROOT);
    expect(r.productDirs).toEqual(["real-product"]);
  });

  it("lists a product folder that has no readable batch, so an empty one is visible", async () => {
    await fs.mkdir(path.join(ROOT, "no-batches"), { recursive: true });
    const r = await readLibrary(ROOT);
    expect(r.productDirs).toContain("no-batches");
    expect(r.variants).toHaveLength(0);
  });

  it("de-duplicates on the variant id and lets later files add fields", async () => {
    const base = lib(2, "mug-warmer");
    const dir = path.join(ROOT, "mug-warmer");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "batch-a.json"), JSON.stringify(base));
    await fs.writeFile(
      path.join(dir, "batch-b.json"),
      JSON.stringify([{ ...base[0]!, retiredAt: "2026-08-06", retiredBy: "ctr-decay" }]),
    );
    const r = await readLibrary(ROOT);
    expect(r.variants).toHaveLength(2);
    const merged = r.variants.find((v) => v.id === base[0]!.id)!;
    expect(merged.retiredAt).toBe("2026-08-06");
    expect(merged.concept).toBe(base[0]!.concept);
  });

  it("ignores non-json and stray files rather than choking", async () => {
    const dir = path.join(ROOT, "mug-warmer");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "batch-2026-08-06.json"), JSON.stringify(lib(4)));
    await fs.writeFile(path.join(dir, "notes.md"), "hello");
    await fs.writeFile(path.join(dir, "cover.png"), "notreallyapng");
    await fs.writeFile(path.join(ROOT, "loose-file.json"), "[]");
    const r = await readLibrary(ROOT);
    expect(r.variants).toHaveLength(4);
    expect(r.unreadable).toEqual([]);
  });

  it("drops rows missing an id — a variant without its tag is not a variant", async () => {
    const dir = path.join(ROOT, "mug-warmer");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "batch-x.json"),
      JSON.stringify([...lib(3), { concept: "orphan with no id" }]),
    );
    const r = await readLibrary(ROOT);
    expect(r.variants).toHaveLength(3);
  });

  it("feeds the board and swap queue straight from disk", async () => {
    const v = lib(12, "mug-warmer");
    await writeProduct("mug-warmer", v, [
      { variantId: v[0]!.id, action: "retire", fired: ["ctr-decay"], reasons: ["decayed"] },
    ]);
    const r = await readLibrary(ROOT);
    const board = buildBoard(r.variants);
    expect(board.cells.size).toBe(12);
    const q = buildSwapQueue(r.variants, r.verdicts);
    expect(q).toHaveLength(1);
    expect(q[0]!.replacement!.hook).not.toBe(v[0]!.hook);
  });
});

/**
 * Adversarial pass, 2026-08-06. The library reads arbitrary JSON off disk, so
 * it must behave under data it did not write.
 */
describe("marque library — hostile data", () => {
  it("never hides a variant whose hook is not in the canonical list", () => {
    const rows: LibraryVariant[] = [lib(1)[0]!, { ...lib(1)[0]!, id: "odd-1", hook: "made-up-hook" as never }];
    const totals = summarise(rows);
    const board = buildBoard(rows);

    // The defect: the odd hook counted in the totals but was absent from the
    // axes, so its cell existed and could never be rendered. Stat tiles and
    // board silently disagreed.
    const renderable = board.hooks
      .flatMap((h) => board.angles.map((a) => board.cells.get(`${h}|${a}`)?.total ?? 0))
      .reduce((x, y) => x + y, 0);
    expect(renderable).toBe(totals.generated);
    expect(board.hooks).toContain("made-up-hook");
  });

  it("keeps canonical tags first and unknown ones last, so order stays readable", () => {
    const rows: LibraryVariant[] = [
      { ...lib(1)[0]!, id: "odd-1", hook: "zzz-unknown" as never },
      lib(1)[0]!,
    ];
    const board = buildBoard(rows);
    expect(board.hooks[board.hooks.length - 1]).toBe("zzz-unknown");
  });

  it("does the same for an unknown angle", () => {
    const rows: LibraryVariant[] = [lib(1)[0]!, { ...lib(1)[0]!, id: "odd-2", angle: "made-up-angle" as never }];
    const board = buildBoard(rows);
    expect(board.angles).toContain("made-up-angle");
  });

  it("merges batch files newest-last regardless of the order the filesystem lists them", async () => {
    // readdir order is arbitrary by spec. With date-stamped filenames and a
    // last-write-wins merge, an unsorted read makes the result depend on the
    // filesystem rather than on the dates.
    const seen: Array<string | undefined> = [];
    for (let run = 0; run < 3; run++) {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), `marque-order-${run}-`));
      const dir = path.join(root, "p");
      await fs.mkdir(dir, { recursive: true });
      const base = lib(1)[0]!;
      const files: Array<[string, unknown]> = [
        ["batch-2026-01-01.json", [{ ...base, live: true }]],
        ["batch-2026-12-31.json", [{ ...base, live: false, retiredAt: "2026-12-31" }]],
      ];
      if (run % 2 === 1) files.reverse();
      for (const [name, body] of files) await fs.writeFile(path.join(dir, name), JSON.stringify(body));
      seen.push((await readLibrary(root)).variants[0]?.retiredAt);
      await fs.rm(root, { recursive: true, force: true });
    }
    expect(new Set(seen).size, `merge varied by write order: ${JSON.stringify(seen)}`).toBe(1);
    expect(seen[0]).toBe("2026-12-31");
  });
});

describe("marque library — spend", () => {
  const priced = (verdict: "usable" | "recut" | "miss" | undefined, credits: number | undefined, i: number) => ({
    ...lib(1)[0]!,
    id: `v-${i}`,
    reviewVerdict: verdict,
    creditsSpent: credits,
  });

  it("totals recorded credits", () => {
    const s = summariseSpend([priced("usable", 2, 1), priced("miss", 2, 2)]);
    expect(s.creditsRecorded).toBe(4);
  });

  it("divides by USABLE variants, not by generated ones", () => {
    // 4 generated, 8 credits, but only 2 survived review: 4 per usable, not 2.
    const s = summariseSpend([
      priced("usable", 2, 1), priced("usable", 2, 2),
      priced("miss", 2, 3), priced("recut", 2, 4),
    ]);
    expect(s.creditsRecorded).toBe(8);
    expect(s.creditsPerUsable).toBe(4);
  });

  it("returns null per-usable rather than dividing by zero", () => {
    const s = summariseSpend([priced("miss", 2, 1)]);
    expect(s.creditsPerUsable).toBeNull();
  });

  it("counts unreviewed variants so the hit rate is not read as final", () => {
    const s = summariseSpend([priced("usable", 2, 1), priced(undefined, 2, 2)]);
    expect(s.byVerdict.unreviewed).toBe(1);
  });

  it("flags variants with no recorded cost — the total is a floor, not a figure", () => {
    const s = summariseSpend([priced("usable", 2, 1), priced("usable", undefined, 2)]);
    expect(s.unpriced).toBe(1);
    expect(s.creditsRecorded).toBe(2);
  });

  it("breaks spend down by product, dearest first", () => {
    const rows = [
      { ...priced("usable", 2, 1), product: "cheap" },
      { ...priced("usable", 10, 2), product: "dear" },
    ];
    expect(summariseSpend(rows).byProduct[0]!.product).toBe("dear");
  });

  it("an empty library costs nothing and claims nothing", () => {
    const s = summariseSpend([]);
    expect(s).toMatchObject({ creditsRecorded: 0, unpriced: 0, creditsPerUsable: null });
  });
});
