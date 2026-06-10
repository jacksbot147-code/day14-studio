/**
 * Tests for the createWebhookHandler factory.
 *
 * Verifies:
 *   - valid payload passes verify → parse → zod → handle
 *   - signature failure short-circuits with the route's response
 *   - invalid payload rejected by zod (400)
 *   - duplicate event id skipped with 200 {duplicate: true}
 *   - failed (5xx) deliveries are NOT marked processed (retryable)
 *
 * HOME is swapped to a temp dir so the idempotency store never touches
 * the real ~/Documents/businesses.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { z } from "zod";

let TMP_HOME: string;

async function freshImport() {
  vi.resetModules();
  return import("../src/lib/webhook-handler");
}

const testSchema = z.object({ id: z.string(), value: z.number() });

function makeRequest(body: unknown, sig = "good-signature"): Request {
  return new Request("http://localhost/api/webhooks/test", {
    method: "POST",
    headers: { "x-test-signature": sig },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

type FactoryModule = Awaited<ReturnType<typeof freshImport>>;

function buildHandler(
  mod: FactoryModule,
  handle: (ctx: { payload: z.infer<typeof testSchema>; eventId: string }) => Promise<Response>
) {
  return mod.createWebhookHandler({
    source: "test",
    verify: (req: Request) =>
      req.headers.get("x-test-signature") === "good-signature"
        ? { ok: true as const, context: null }
        : { ok: false as const, response: new Response("Invalid signature", { status: 401 }) },
    parse: (_req: Request, body: string) => {
      try {
        return { ok: true as const, payload: JSON.parse(body) };
      } catch {
        return { ok: false as const, response: new Response("Invalid JSON", { status: 400 }) };
      }
    },
    schema: testSchema,
    eventId: (payload) => payload.id,
    handle: async ({ payload, eventId }) => handle({ payload, eventId }),
  });
}

beforeEach(async () => {
  TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "webhook-test-"));
  process.env.HOME = TMP_HOME;
});

afterEach(async () => {
  await fs.rm(TMP_HOME, { recursive: true, force: true });
});

describe("createWebhookHandler", () => {
  test("valid payload flows through to handle", async () => {
    const mod = await freshImport();
    const handleMock = vi.fn(async () => Response.json({ received: true }));
    const handler = buildHandler(mod, handleMock);

    const res = await handler(makeRequest({ id: "evt_1", value: 42 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(handleMock).toHaveBeenCalledTimes(1);
    expect(handleMock).toHaveBeenCalledWith({
      payload: { id: "evt_1", value: 42 },
      eventId: "evt_1",
    });
  });

  test("bad signature → verify's response, handle never runs", async () => {
    const mod = await freshImport();
    const handleMock = vi.fn(async () => Response.json({ received: true }));
    const handler = buildHandler(mod, handleMock);

    const res = await handler(makeRequest({ id: "evt_2", value: 1 }, "wrong"));
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Invalid signature");
    expect(handleMock).not.toHaveBeenCalled();
  });

  test("invalid payload rejected by zod with 400", async () => {
    const mod = await freshImport();
    const handleMock = vi.fn(async () => Response.json({ received: true }));
    const handler = buildHandler(mod, handleMock);

    const res = await handler(makeRequest({ id: "evt_3", value: "not-a-number" }));
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Invalid test payload");
    expect(handleMock).not.toHaveBeenCalled();
  });

  test("duplicate event id skipped with 200 {duplicate:true}", async () => {
    const mod = await freshImport();
    const handleMock = vi.fn(async () => Response.json({ received: true }));
    const handler = buildHandler(mod, handleMock);

    const first = await handler(makeRequest({ id: "evt_4", value: 7 }));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ received: true });

    const second = await handler(makeRequest({ id: "evt_4", value: 7 }));
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true, duplicate: true });
    expect(handleMock).toHaveBeenCalledTimes(1);

    // Processed ids are persisted under _shared/poller/
    const idsFile = path.join(
      TMP_HOME,
      "Documents/businesses/_shared/poller/webhook-processed-ids.jsonl"
    );
    const text = await fs.readFile(idsFile, "utf8");
    expect(text).toContain("test:evt_4");
  });

  test("persisted ids survive a module reload (process restart)", async () => {
    const mod1 = await freshImport();
    const handle1 = vi.fn(async () => Response.json({ received: true }));
    const first = await buildHandler(mod1, handle1)(makeRequest({ id: "evt_5", value: 1 }));
    expect(first.status).toBe(200);

    // Fresh module = fresh in-memory cache; must reload from the JSONL file
    const mod2 = await freshImport();
    const handle2 = vi.fn(async () => Response.json({ received: true }));
    const second = await buildHandler(mod2, handle2)(makeRequest({ id: "evt_5", value: 1 }));
    expect(await second.json()).toEqual({ received: true, duplicate: true });
    expect(handle2).not.toHaveBeenCalled();
  });

  test("5xx responses are not marked processed — delivery stays retryable", async () => {
    const mod = await freshImport();
    const handleMock = vi
      .fn(async () => new Response("Handler error", { status: 500 }))
      .mockImplementationOnce(async () => new Response("Handler error", { status: 500 }))
      .mockImplementationOnce(async () => Response.json({ received: true }));
    const handler = buildHandler(mod, handleMock);

    const first = await handler(makeRequest({ id: "evt_6", value: 9 }));
    expect(first.status).toBe(500);

    // Retry is NOT treated as a duplicate
    const second = await handler(makeRequest({ id: "evt_6", value: 9 }));
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true });
    expect(handleMock).toHaveBeenCalledTimes(2);
  });

  test("missing eventId derivation falls back to body hash", async () => {
    const mod = await freshImport();
    const handleMock = vi.fn(async () => Response.json({ received: true }));
    const handler = mod.createWebhookHandler({
      source: "test-hash",
      verify: () => ({ ok: true as const, context: null }),
      parse: (_req: Request, body: string) => ({ ok: true as const, payload: JSON.parse(body) }),
      schema: testSchema,
      handle: async () => handleMock(),
    });

    await handler(makeRequest({ id: "evt_7", value: 1 }));
    const dup = await handler(makeRequest({ id: "evt_7", value: 1 }));
    expect(await dup.json()).toEqual({ received: true, duplicate: true });

    // Different body → different hash → processed normally
    const other = await handler(makeRequest({ id: "evt_7", value: 2 }));
    expect(await other.json()).toEqual({ received: true });
    expect(handleMock).toHaveBeenCalledTimes(2);
  });
});
