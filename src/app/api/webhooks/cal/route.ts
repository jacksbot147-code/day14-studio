/**
 * Cal.com webhook handler — day14.us/api/webhooks/cal
 *
 * Receives Cal.com booking events: created, rescheduled, canceled, meeting-ended.
 * MEETING_ENDED is the trigger to start the 14-day build clock.
 *
 * Implementation of the `vercel-route-cal-com-webhook` skill.
 */

import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CalTriggerEvent =
  | "BOOKING_CREATED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_CANCELLED"
  | "MEETING_ENDED";

interface CalEventPayload {
  uid?: string;
  bookingId?: number;
  startTime?: string;
  endTime?: string;
  attendees?: Array<{
    email?: string;
    name?: string;
    timeZone?: string;
  }>;
  cancellationReason?: string;
}

interface CalWebhookEvent {
  triggerEvent: CalTriggerEvent;
  createdAt: string;
  payload: CalEventPayload;
}

export async function POST(req: NextRequest) {
  // 1. Verify signature
  const sig = req.headers.get("x-cal-signature-256");
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return new Response("Missing signature or secret", { status: 401 });
  }

  const body = await req.text();
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (!safeEqual(sig, expected)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: CalWebhookEvent;
  try {
    event = JSON.parse(body) as CalWebhookEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const sb = supabaseAdmin();

  // 2. Idempotency — Cal.com sends a unique uid per booking
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

  // 3. Identify customer by attendee email
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

    // 4. Per-event-type handler
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

  // 5. Append event
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
    console.error("[cal-webhook] dispatch failed:", dispatchErr);
  }

  return Response.json({
    received: true,
    customer_slug: slug,
    trigger: event.triggerEvent,
  });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
