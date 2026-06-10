/**
 * Cal.com webhook handler — day14.us/api/webhooks/cal
 *
 * Receives Cal.com booking events: created, rescheduled, canceled, meeting-ended.
 * MEETING_ENDED is the trigger to start the 14-day build clock.
 *
 * Implementation of the `vercel-route-cal-com-webhook` skill.
 *
 * Built on createWebhookHandler (src/lib/webhook-handler.ts): HMAC
 * verification preserved exactly; zod-validated payload; file-backed
 * idempotency on triggerEvent + booking uid (plus the existing
 * Supabase `events` table check inside the handler).
 */

import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createWebhookHandler } from "@/lib/webhook-handler";
import { logError } from "@/lib/work-register";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const calEventSchema = z.looseObject({
  // Kept as string (not enum) so trigger types beyond the four we handle
  // are still acknowledged + recorded, exactly as before
  triggerEvent: z.string(),
  createdAt: z.string().optional(),
  payload: z.looseObject({
    uid: z.string().optional(),
    bookingId: z.number().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    attendees: z
      .array(
        z.looseObject({
          email: z.string().optional(),
          name: z.string().optional(),
          timeZone: z.string().optional(),
        })
      )
      .optional(),
    cancellationReason: z.string().optional(),
  }),
});

export const POST = createWebhookHandler<typeof calEventSchema, null, NextRequest>({
  source: "cal",

  verify: (req, body) => {
    const sig = req.headers.get("x-cal-signature-256");
    const secret = process.env.CAL_WEBHOOK_SECRET;
    if (!sig || !secret) {
      return {
        ok: false,
        response: new Response("Missing signature or secret", { status: 401 }),
      };
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (!safeEqual(sig, expected)) {
      return { ok: false, response: new Response("Invalid signature", { status: 401 }) };
    }

    return { ok: true, context: null };
  },

  parse: (_req, body) => {
    try {
      return { ok: true, payload: JSON.parse(body) };
    } catch {
      return { ok: false, response: new Response("Invalid JSON", { status: 400 }) };
    }
  },

  schema: calEventSchema,

  // Cal.com sends a unique uid per booking; pair it with the trigger so
  // distinct lifecycle events for the same booking aren't deduped together
  eventId: (event) =>
    `${event.triggerEvent}:${event.payload.uid ?? String(event.payload.bookingId ?? "unknown")}`,

  handle: async ({ payload: event }) => {
    const sb = supabaseAdmin();

    // Idempotency (second layer) — Supabase events table
    const bookingUid =
      event.payload.uid ?? String(event.payload.bookingId ?? "unknown");
    const { data: existing } = await sb
      .from("events")
      .select("id")
      .eq("kind", `cal-${event.triggerEvent.toLowerCase()}`)
      .filter("payload->>booking_uid", "eq", bookingUid)
      .maybeSingle();

    if (existing) {
      return Response.json({ received: true, duplicate: true });
    }

    // Identify customer by attendee email
    const attendeeEmail = event.payload.attendees?.[0]?.email?.toLowerCase();
    if (!attendeeEmail) {
      console.warn("[cal-webhook] Event has no attendee email");
      return Response.json({ received: true, warning: "no_attendee_email" });
    }

    const { data: customer } = await sb
      .from("customers")
      .select("id, slug, status, kickoff_call_at")
      .eq("email", attendeeEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let customer_id: string | null = null;
    let slug: string | null = null;

    if (customer) {
      customer_id = customer.id;
      slug = customer.slug;

      // Per-event-type handler
      switch (event.triggerEvent) {
        case "BOOKING_CREATED":
          await sb
            .from("customers")
            .update({
              kickoff_call_at: event.payload.startTime,
            })
            .eq("id", customer_id);
          break;

        case "BOOKING_RESCHEDULED":
          await sb
            .from("customers")
            .update({
              kickoff_call_at: event.payload.startTime,
            })
            .eq("id", customer_id);
          break;

        case "BOOKING_CANCELLED":
          await sb
            .from("customers")
            .update({
              kickoff_call_at: null,
              notes: `Kickoff cancelled at ${new Date().toISOString()}: ${event.payload.cancellationReason ?? "no reason given"}`,
            })
            .eq("id", customer_id);
          break;

        case "MEETING_ENDED":
          // THIS is the build-clock start trigger.
          // Only fires if customer has done intake (otherwise still awaiting-intake)
          if (customer.status === "building") {
            // already in building; that's fine, mark explicit clock start
            await sb.from("customers").update({
              // Note: schema doesn't have day14_build_start_at column yet — using notes for now
              notes: `Kickoff complete; 14-day clock started ${new Date().toISOString()}`,
            }).eq("id", customer_id);
          } else if (customer.status === "awaiting-intake") {
            // Intake somehow didn't fire first; still mark kickoff done
            await sb.from("customers").update({
              notes: `Kickoff complete BEFORE intake (anomaly); awaiting intake submission`,
            }).eq("id", customer_id);
          }
          break;
      }
    } else {
      console.log(
        `[cal-webhook] Event for unknown attendee: ${attendeeEmail} (${event.triggerEvent})`
      );
    }

    // Append event
    await sb.from("events").insert({
      customer_id,
      kind: `cal-${event.triggerEvent.toLowerCase()}`,
      payload: {
        booking_uid: bookingUid,
        trigger: event.triggerEvent,
        attendee_email: attendeeEmail,
        start_time: event.payload.startTime,
        end_time: event.payload.endTime,
        slug,
      },
    });

    // Funnel into unified dispatcher
    try {
      const { dispatch } = await import("@/lib/dispatch");
      await dispatch({
        source: "cal-webhook",
        type: event.triggerEvent,
        context: `cal-${event.payload?.uid ?? Date.now()}`,
        customer_slug: slug ?? undefined,
        intentText: event.triggerEvent,
        payload: { uid: event.payload?.uid, attendee_email: attendeeEmail },
      });
    } catch (dispatchErr) {
      await logError("cal-webhook", dispatchErr, `cal-${bookingUid}`, "dispatch failed");
    }

    return Response.json({
      received: true,
      customer_slug: slug,
      trigger: event.triggerEvent,
    });
  },
});

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
