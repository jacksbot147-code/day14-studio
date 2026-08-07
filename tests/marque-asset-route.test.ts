/**
 * /api/marque/asset/[...path] — the only bridge between the dashboard and the
 * variant library, which lives OUTSIDE this repo on purpose.
 *
 * "Read a file at a path the caller supplied" is the shape of a directory
 * traversal, and this process can see the operator's whole home directory, so
 * most of these tests are attacks rather than features.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

let ROOT: string;
let GET: (req: Request, ctx: { params: Promise<{ path?: string[] }> }) => Promise<Response>;

const call = (segments: string[]) =>
  GET(new Request("http://localhost/api/marque/asset/" + segments.join("/")), {
    params: Promise.resolve({ path: segments }),
  });

beforeAll(async () => {
  ROOT = await fs.mkdtemp(path.join(os.tmpdir(), "marque-asset-"));
  process.env.MARQUE_LIBRARY_DIR = ROOT;
  await fs.mkdir(path.join(ROOT, "p", "assets"), { recursive: true });
  await fs.writeFile(path.join(ROOT, "p", "assets", "a.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await fs.writeFile(path.join(ROOT, "p", "assets", "notes.json"), '{"secret":1}');
  // A secret OUTSIDE the library — the thing traversal would be after.
  await fs.writeFile(path.join(ROOT, "..", "marque-asset-SECRET.txt"), "do not serve me");
  ({ GET } = await import("../src/app/api/marque/asset/[...path]/route"));
});

afterAll(async () => {
  await fs.rm(ROOT, { recursive: true, force: true }).catch(() => {});
  await fs.rm(path.join(ROOT, "..", "marque-asset-SECRET.txt"), { force: true }).catch(() => {});
  delete process.env.MARQUE_LIBRARY_DIR;
});

describe("marque asset route — serving", () => {
  it("serves a real asset with the right content type", async () => {
    const res = await call(["p", "assets", "a.png"]);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await res.arrayBuffer()).byteLength).toBe(4);
  });

  it("404s a file that is not there", async () => {
    expect((await call(["p", "assets", "missing.png"])).status).toBe(404);
  });

  it("404s an empty path", async () => {
    expect((await call([])).status).toBe(404);
  });
});

describe("marque asset route — attacks", () => {
  it("refuses .. traversal", async () => {
    const res = await call(["p", "..", "..", "marque-asset-SECRET.txt"]);
    expect(res.status).toBe(400);
    expect(await res.text()).not.toContain("do not serve me");
  });

  it("refuses a single .. segment", async () => {
    expect((await call(["..", "marque-asset-SECRET.txt"])).status).toBe(400);
  });

  it("refuses an encoded separator inside a segment", async () => {
    expect((await call(["p", "assets/../../x.png"])).status).toBe(400);
    expect((await call(["p", "assets\\..\\x.png"])).status).toBe(400);
  });

  it("refuses a NUL byte", async () => {
    expect((await call(["p", "assets", "a.png\0.txt"])).status).toBe(400);
  });

  it("refuses dotfiles", async () => {
    expect((await call(["p", ".env"])).status).toBe(400);
  });

  it("refuses a non-media extension even inside the library", async () => {
    // notes.json exists and is readable — it must still be refused.
    const res = await call(["p", "assets", "notes.json"]);
    expect(res.status).toBe(415);
    expect(await res.text()).not.toContain("secret");
  });

  it("refuses svg, which is scriptable", async () => {
    await fs.writeFile(path.join(ROOT, "p", "assets", "x.svg"), "<svg/>");
    expect((await call(["p", "assets", "x.svg"])).status).toBe(415);
  });

  it("refuses a symlink that escapes the library", async () => {
    const link = path.join(ROOT, "p", "assets", "escape.png");
    await fs.symlink(path.join(ROOT, "..", "marque-asset-SECRET.txt"), link).catch(() => {});
    const res = await call(["p", "assets", "escape.png"]);
    // Either refused as a symlink, or 404 if the platform blocked the link.
    expect([400, 404]).toContain(res.status);
    expect(await res.text()).not.toContain("do not serve me");
  });

  it("refuses a directory", async () => {
    expect([400, 404, 415]).toContain((await call(["p", "assets"])).status);
  });
});
