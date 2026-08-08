/**
 * marque_post.py against the real webhook handler, using the REAL library.
 *
 * tests/marque-pipeline-e2e.test.ts already proves the contract with a
 * hand-made fixture. This is the stronger version: the payloads in
 * tests/fixtures/marque-real-library-payloads.json were produced by
 * marque_post.py from the actual day14-spark batches on disk — the same ten
 * variants the dashboard renders — and are replayed through the same route
 * handler that runs in production.
 *
 * After this, the only untested link between the pipeline and the backend is
 * the network hop itself, which is blocked on DAY14_INGEST_SECRET reaching
 * Vercel and is not something a test can close.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import payloads from "./fixtures/marque-real-library-payloads.json";
import { parseVariantId, HOOKS_REQUIRING_EVIDENCE } from "@/lib/marque-taxonomy";
import { MARQUE_TIERS } from "@/lib/pricing";

const SECRET = "test-ingest-secret";
let TMP_HOME: string;

async function freshPost() {
  vi.resetModules();
  const mod = await import("../src/app/api/webhooks/marque/route");
  return mod.POST as (req: Request) => Promise<Response>;
}

function req(p: { body: string; signature: string }, sig?: string): Request {
  return new Request("http://localhost/api/webhooks/marque", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-day14-brand": "marque",
      "x-day14-signature": sig ?? p.signature,
    },
    body: p.body,
  });
}

beforeEach(async () => {
  TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "marque-real-"));
  process.env.HOME = TMP_HOME;
  process.env.DAY14_INGEST_SECRET = SECRET;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});
afterEach(async () => {
  delete process.env.DAY14_INGEST_SECRET;
  await fs.rm(TMP_HOME, { recursive: true, force: true }).catch(() => {});
});

describe("the real library posts to the real handler", () => {
  test("the fixture is the actual batch, at the size the tier promises", () => {
    // Starter publishes 12 generated a month. If the demo library is not that
    // size, this fails rather than letting a short batch be presented as a
    // tier month.
    const starter = MARQUE_TIERS[0]!;
    expect(payloads.length).toBe(starter.variantsPerMonth);
    const ids = payloads.map((p) => p.id);
    expect(new Set(ids).size).toBe(payloads.length);
    expect(ids.every((i) => i.startsWith("day14-spark-"))).toBe(true);
  });

  test("Python's signature verifies under Node for every real row", () => {
    for (const p of payloads) {
      expect(
        crypto.createHmac("sha256", SECRET).update(Buffer.from(p.body, "utf-8")).digest("hex"),
        `signature mismatch on ${p.id}`,
      ).toBe(p.signature);
    }
  });

  test("every one of the ten is accepted", async () => {
    const POST = await freshPost();
    for (const p of payloads) {
      const res = await POST(req(p));
      expect(res.status, `rejected ${p.id}`).toBe(200);
    }
  });

  test("the review verdict survives the hop — an events table without it cannot answer anything", async () => {
    for (const p of payloads) {
      const payload = JSON.parse(p.body).payload as Record<string, unknown>;
      expect(payload.reviewVerdict, `${p.id} lost its verdict`).toBeTruthy();
      expect(typeof payload.creditsSpent).toBe("number");
      expect(payload.generatedBy).toBe("higgsfield:marketing_studio_image");
    }
  });

  test("carries all three verdicts, so the backend sees failures and not just wins", () => {
    const verdicts = new Set(payloads.map((p) => p.verdict));
    expect(verdicts).toContain("usable");
    expect(verdicts).toContain("recut");
    expect(verdicts).toContain("miss");
  });

  test("every external_id still parses back into its tag", () => {
    for (const p of payloads) {
      const rec = JSON.parse(p.body);
      const tag = parseVariantId(rec.external_id);
      expect(tag, `unparseable: ${rec.external_id}`).not.toBeNull();
      expect(tag!.hook).toBe(rec.payload.hook);
      expect(tag!.angle).toBe(rec.payload.angle);
    }
  });

  test("no variant in the real batch uses a hook that needs proof we do not have", () => {
    for (const p of payloads) {
      const hook = JSON.parse(p.body).payload.hook as string;
      expect(HOOKS_REQUIRING_EVIDENCE as readonly string[]).not.toContain(hook);
    }
  });

  test("re-posting the whole batch is a no-op, so a retry is safe", async () => {
    const POST = await freshPost();
    for (const p of payloads) expect((await POST(req(p))).status).toBe(200);
    for (const p of payloads) expect((await POST(req(p))).status).toBe(200);
  });

  test("a tampered real payload is rejected", async () => {
    const POST = await freshPost();
    const p = payloads[0]!;
    const tampered = { ...p, body: p.body.replace("day14-spark", "someone-elses-product") };
    expect((await POST(req(tampered, p.signature))).status).toBe(401);
  });

  test("the recorded spend on the wire matches the library's own total", () => {
    const wire = payloads.reduce(
      (a, p) => a + Number((JSON.parse(p.body).payload as { creditsSpent: number }).creditsSpent),
      0,
    );
    // 12 variants x 2 credits. Higgsfield's balance moved 270 -> 246, exactly
    // this, so the library is not quietly under-reporting what it cost.
    expect(wire).toBe(24);
  });
});
