/**
 * ops-pulse: the revenue leg.
 *
 * Until 2026-08-06 `paying_software_customers` was a HARDCODED 0 while the
 * Stripe leg was returning "fetch failed". The one number ops-pulse's own header
 * calls "the only closed loop between local reality and a scheduled agent", and
 * that the weekly scan is told to rank above every research finding, was an
 * assertion that could not change in either direction. It would have reported 0
 * just as confidently on the day of the first sale.
 *
 * These tests pin the distinction that fix depends on: a MEASURED zero and an
 * UNREADABLE till are different states and must never collapse into each other.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stripeState } from "../scripts/ops-pulse.mjs";

const KEY = { STRIPE_SECRET_KEY: "sk_test_pinned" };
const realFetch = globalThis.fetch;

/** Route by URL so the two Stripe calls can be answered independently. */
function mockStripe(opts: {
  sessions?: { ok?: boolean; status?: number; body?: unknown } | "throw";
  subs?: { ok?: boolean; status?: number; body?: unknown } | "throw";
}) {
  globalThis.fetch = vi.fn(async (url: string) => {
    const which = String(url).includes("/subscriptions") ? opts.subs : opts.sessions;
    if (which === "throw") throw new TypeError("fetch failed");
    const spec = which ?? { ok: true, body: { data: [] } };
    return {
      ok: spec.ok ?? true,
      status: spec.status ?? 200,
      json: async () => spec.body ?? { data: [] },
      text: async () => JSON.stringify(spec.body ?? {}),
    };
  }) as unknown as typeof fetch;
}

const sub = (customer: string, status: string) => ({ customer, status });

beforeEach(() => vi.restoreAllMocks());
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("ops-pulse — reading the till", () => {
  it("counts distinct customers on a live subscription", async () => {
    mockStripe({
      subs: { body: { data: [sub("cus_a", "active"), sub("cus_b", "trialing")] } },
    });
    const s = await stripeState(KEY);
    expect(s.paying_customers).toBe(2);
  });

  it("does not double-count a customer holding two subscriptions", async () => {
    mockStripe({
      subs: { body: { data: [sub("cus_a", "active"), sub("cus_a", "active")] } },
    });
    expect((await stripeState(KEY)).paying_customers).toBe(1);
  });

  it("ignores cancelled, past_due and incomplete — those are not paying", async () => {
    mockStripe({
      subs: {
        body: {
          data: [
            sub("cus_a", "active"),
            sub("cus_x", "canceled"),
            sub("cus_y", "past_due"),
            sub("cus_z", "incomplete_expired"),
          ],
        },
      },
    });
    expect((await stripeState(KEY)).paying_customers).toBe(1);
  });

  it("reports a genuine zero as zero, not as unknown", async () => {
    mockStripe({ subs: { body: { data: [] } } });
    const s = await stripeState(KEY);
    expect(s.paying_customers).toBe(0);
    expect(s.paying_customers).not.toBeNull();
  });

  it("returns NULL, never 0, when the subscriptions call fails", async () => {
    mockStripe({ subs: "throw" });
    const s = await stripeState(KEY);
    // The whole point: an unreachable till must not read as an empty one.
    expect(s.paying_customers).toBeNull();
    expect(String(s.note)).toMatch(/subscriptions/);
  });

  it("returns NULL when Stripe rejects the subscriptions call", async () => {
    mockStripe({ subs: { ok: false, status: 401, body: {} } });
    const s = await stripeState(KEY);
    expect(s.paying_customers).toBeNull();
    expect(String(s.note)).toMatch(/401/);
  });

  it("returns NULL when the whole Stripe leg is unreachable", async () => {
    mockStripe({ sessions: "throw", subs: "throw" });
    const s = await stripeState(KEY);
    expect(s.paying_customers).toBeNull();
    expect(s.checkouts_7d).toBeNull();
    expect(String(s.note)).toMatch(/fetch failed/);
  });

  it("returns NULL with no key — absence of a key is not absence of customers", async () => {
    const s = await stripeState({});
    expect(s.key_present).toBe(false);
    expect(s.paying_customers).toBeNull();
  });

  it("keeps the subscription count independent of the 7-day checkout window", async () => {
    // A retainer sold three months ago still bills; a 7-day window cannot see it.
    mockStripe({
      sessions: { body: { data: [] } },
      subs: { body: { data: [sub("cus_a", "active")] } },
    });
    const s = await stripeState(KEY);
    expect(s.checkouts_7d).toBe(0);
    expect(s.paying_customers).toBe(1);
  });

  it("surfaces the subscription failure even when checkouts read fine", async () => {
    mockStripe({ sessions: { body: { data: [] } }, subs: "throw" });
    const s = await stripeState(KEY);
    expect(s.checkouts_7d).toBe(0);
    expect(s.paying_customers).toBeNull();
    // The note must not say "the till is still closed" when we could not read it.
    expect(String(s.note)).not.toMatch(/still closed/);
  });
});
