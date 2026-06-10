/**
 * Tests for dispatch — the event → skill router.
 *
 * Verifies:
 *   - SOURCE_ROUTES: (source, type) pairs map to the expected skill
 *   - explicit targetSkill override wins over routing
 *   - unknown source/type falls back to inbound-classifier
 *
 * skill-runtime + work-register are mocked so no skills execute and
 * nothing is written to the real filesystem.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

const invokeSkillMock = vi.fn();
const suggestSkillsMock = vi.fn();

vi.mock("../src/lib/skill-runtime", () => ({
  invokeSkill: (...args: unknown[]) => invokeSkillMock(...args),
  suggestSkills: (...args: unknown[]) => suggestSkillsMock(...args),
}));

vi.mock("../src/lib/work-register", () => ({
  logAction: vi.fn(async () => {}),
  logAdHoc: vi.fn(async () => {}),
  logSkillInvocation: vi.fn(async () => {}),
  logError: vi.fn(async () => {}),
}));

import { dispatch, dispatchTelegramCommand } from "../src/lib/dispatch";

beforeEach(() => {
  invokeSkillMock.mockReset();
  suggestSkillsMock.mockReset();
  invokeSkillMock.mockResolvedValue({ ok: true, skill: null, guidance: "" });
  suggestSkillsMock.mockResolvedValue([]);
});

describe("SOURCE_ROUTES routing", () => {
  test("stripe subscription.paused → subscription-pause-handler", async () => {
    const result = await dispatch({
      source: "stripe-webhook",
      type: "customer.subscription.paused",
      context: "stripe-evt_1",
    });
    expect(result.ok).toBe(true);
    expect(result.skill_invoked).toBe("subscription-pause-handler");
    expect(result.reason).toBe("source_route");
    expect(invokeSkillMock).toHaveBeenCalledWith(
      "subscription-pause-handler",
      expect.objectContaining({ context: "stripe-evt_1", caller: "stripe-webhook" })
    );
  });

  test("stripe invoice.payment_failed → failed-payment-retry", async () => {
    const result = await dispatch({
      source: "stripe-webhook",
      type: "invoice.payment_failed",
      context: "stripe-evt_2",
    });
    expect(result.skill_invoked).toBe("failed-payment-retry");
    expect(result.reason).toBe("source_route");
  });

  test("cal BOOKING_CREATED → vercel-route-cal-com-webhook", async () => {
    const result = await dispatch({
      source: "cal-webhook",
      type: "BOOKING_CREATED",
      context: "cal-uid-1",
      customer_slug: "alpha",
    });
    expect(result.skill_invoked).toBe("vercel-route-cal-com-webhook");
    expect(invokeSkillMock).toHaveBeenCalledWith(
      "vercel-route-cal-com-webhook",
      expect.objectContaining({ customer_slug: "alpha" })
    );
  });

  test("telegram /refund → refund-handler", async () => {
    const result = await dispatchTelegramCommand("/refund", "tg-session-1", "beta");
    expect(result.skill_invoked).toBe("refund-handler");
    expect(result.reason).toBe("source_route");
  });

  test("explicit targetSkill override wins over source routing", async () => {
    const result = await dispatch({
      source: "stripe-webhook",
      type: "invoice.payment_failed",
      context: "stripe-evt_3",
      targetSkill: "uptime-monitor",
    });
    expect(result.skill_invoked).toBe("uptime-monitor");
    expect(result.reason).toBe("explicit_override");
    expect(invokeSkillMock).toHaveBeenCalledTimes(1);
  });
});

describe("unknown events", () => {
  test("unknown source/type falls back to inbound-classifier", async () => {
    const result = await dispatch({
      source: "manual",
      type: "something-nobody-routed",
      context: "session-x",
    });
    expect(result.skill_invoked).toBe("inbound-classifier");
    expect(result.fallback_used).toBe(true);
    expect(result.reason).toBe("fallback_to_classifier");
    // The unrouted event details are forwarded for classification
    expect(invokeSkillMock).toHaveBeenCalledWith(
      "inbound-classifier",
      expect.objectContaining({
        inputs: expect.objectContaining({
          unrouted_event: expect.objectContaining({
            source: "manual",
            type: "something-nobody-routed",
          }),
        }),
      })
    );
  });

  test("intent text routes through suggestSkills when no source route", async () => {
    suggestSkillsMock.mockResolvedValue([
      { name: "blog-post-generator" },
      { name: "email-newsletter-composer" },
    ]);
    const result = await dispatch({
      source: "manual",
      type: "freeform",
      context: "session-y",
      intentText: "write a blog post about hurricanes",
    });
    expect(result.skill_invoked).toBe("blog-post-generator");
    expect(result.reason).toBe("intent_match");
    expect(result.candidates_considered).toEqual([
      "blog-post-generator",
      "email-newsletter-composer",
    ]);
  });
});
