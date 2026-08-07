/**
 * /dashboard/marque — does it actually RENDER?
 *
 * Everything else about this page was verified through readLibrary and tsc, and
 * neither of those would notice a runtime error in JSX. A page can typecheck,
 * read its data correctly, and still throw on the first null it maps over.
 *
 * It is an async server component with no client hooks, so it can be invoked
 * directly and rendered to static markup. No dev server, no browser.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import MarqueDashboard from "../src/app/dashboard/marque/page";
import { buildMatrix } from "@/lib/marque-taxonomy";

let ROOT: string;

async function render(): Promise<string> {
  const jsx = await MarqueDashboard();
  return renderToStaticMarkup(jsx);
}

async function seed(variants: unknown[], verdicts: unknown[] = []) {
  const dir = path.join(ROOT, "day14-spark");
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "batch-a.json"), JSON.stringify(variants));
  if (verdicts.length) await fs.writeFile(path.join(dir, "fatigue-a.json"), JSON.stringify(verdicts));
}

function variants(n: number) {
  return buildMatrix({ product: "day14-spark", count: n, channel: "meta" }).map((v, i) => ({
    ...v,
    generatedAt: "2026-08-07T00:00:00Z",
    concept: `concept number ${i} which is specific enough to be a brief`,
    live: i < 2,
    creditsSpent: 2,
    reviewVerdict: i === 0 ? "usable" : i === 1 ? "recut" : i === 2 ? "miss" : undefined,
    assetRef: i < 3 ? `/api/marque/asset/day14-spark/assets/${v.id}.png` : null,
  }));
}

beforeAll(async () => {
  ROOT = await fs.mkdtemp(path.join(os.tmpdir(), "marque-render-"));
  process.env.MARQUE_LIBRARY_DIR = ROOT;
});
afterAll(async () => {
  delete process.env.MARQUE_LIBRARY_DIR;
  await fs.rm(ROOT, { recursive: true, force: true }).catch(() => {});
});
afterEach(async () => {
  await fs.rm(path.join(ROOT, "day14-spark"), { recursive: true, force: true }).catch(() => {});
});

describe("/dashboard/marque renders", () => {
  it("renders against an EMPTY library without throwing", async () => {
    const html = await render();
    expect(html).toContain("Marque ops");
    // The empty state must say what is missing, not render a blank grid.
    expect(html).toMatch(/No variants in the library yet/);
    expect(html).toMatch(/Nothing generated yet|No rendered assets yet/);
  });

  it("renders a real batch, with the board, the creative and the spend", async () => {
    await seed(variants(6));
    const html = await render();

    expect(html).toContain("Hook × angle board");
    expect(html).toContain("day14-spark");
    // Creative actually emits img tags pointed at the asset route.
    expect(html).toMatch(/<img[^>]+src="\/api\/marque\/asset\/day14-spark\/assets\//);
    // Spend: 6 variants x 2 credits, 1 usable -> 12 per usable.
    expect(html).toContain("12");
    expect(html).toContain("credits spent");
    expect(html).toContain("per usable");
  });

  it("shows review verdicts on the creative", async () => {
    await seed(variants(6));
    const html = await render();
    expect(html).toContain("usable");
    expect(html).toContain("recut");
    expect(html).toContain("miss");
  });

  it("warns when variants are unreviewed rather than implying a clean sweep", async () => {
    await seed(variants(6));
    const html = await render();
    expect(html).toMatch(/unreviewed/);
  });

  it("renders a swap queue from fatigue verdicts", async () => {
    const v = variants(6);
    await seed(v, [
      { variantId: (v[0] as { id: string }).id, action: "retire", fired: ["ctr-decay"], reasons: ["CTR collapsed"] },
    ]);
    const html = await render();
    expect(html).toContain("Needs a swap");
    expect(html).toContain("retire");
    expect(html).toContain("CTR collapsed");
  });

  it("renders published spend floors from pricing.ts, not hardcoded", async () => {
    await seed(variants(4));
    const html = await render();
    expect(html).toContain("$900");
    expect(html).toContain("landing-page view");
  });

  it("survives a variant with an unknown hook — the hostile-data case, end to end", async () => {
    const v = variants(4) as Array<Record<string, unknown>>;
    v[0]!.hook = "made-up-hook";
    v[0]!.id = "day14-spark-odd-1";
    await seed(v);
    const html = await render();
    expect(html).toContain("made-up-hook");
  });

  it("survives a malformed batch file without blanking the page", async () => {
    const dir = path.join(ROOT, "day14-spark");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "batch-broken.json"), "{ not json");
    const html = await render();
    expect(html).toContain("Marque ops");
  });
});
