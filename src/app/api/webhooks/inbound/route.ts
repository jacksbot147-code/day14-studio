/**
 * Resend inbound webhook handler — day14.us/api/webhooks/inbound
 *
 * Receives parsed email events from Resend's inbound webhook. Verifies
 * signature, classifies the message, appends to customer dossier, drafts
 * a reply, fires downstream event.
 *
 * Implementation of `vercel-route-resend-inbound` skill.
 */

import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-server";
import { classifyInbound } from "@/lib/inbound-classifier";
import { appendFeedbackEntry } from "@/lib/dossier-feedback";
import { logSkillInvocation } from "@/lib/work-register";
import { detectTenant } from "@/lib/tenant-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResendInboundEvent {
  type: "email.received" | string;
  created_at: string;
  data: {
    message_id: string;
    from: { email: string; name?: string };
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    headers?: Record<string, string>;
    attachments?: Array<{ filename: string; content_type: string; size: number }>;
  };
}

export async function POST(req: NextRequest) {
  // 1. Verify signature
  const sig = req.headers.get("resend-signature") ?? req.headers.get("svix-signature");
  const ts = req.headers.get("resend-timestamp") ?? req.headers.get("svix-timestamp");
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return new Response("Missing signature or secret", { status: 401 });
  }

  const body = await req.text();

  if (!verifyResendSignature(body, sig, ts, secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: ResendInboundEvent;
  try {
    event = JSON.parse(body) as ResendInboundEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // 2. Only process email.received events
  if (event.type !== "email.received") {
    return Response.json({ received: true, ignored: true });
  }

  const sb = supabaseAdmin();

  // 3. Idempotency
  const messageId = event.data.message_id;
  const { data: existing } = await sb
    .from("events")
    .select("id")
    .eq("kind", "customer-reply-received")
    .filter("payload->>message_id", "eq", messageId)
    .maybeSingle();

  if (existing) {
    return Response.json({ received: true, duplicate: true });
  }

  // 4. Identify customer by sender email
  const senderEmail = event.data.from.email.toLowerCase();
  const { data: customer } = await sb
    .from("customers")
    .select("id, slug, status, company_name")
    .eq("email", senderEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 5. Classify
  const bodyText = event.data.text ?? stripHtml(event.data.html ?? "");
  const classification = classifyInbound(
    senderEmail,
    event.data.subject ?? "",
    bodyText,
    { is_known_customer: Boolean(customer) }
  );
  await logSkillInvocation(
    "inbound-classifier",
    `inbound-${classification.tag}`,
    customer?.slug ?? undefined
  );

  // 6. Write to dossier (or leads inbox if unknown sender)
  const slug = customer?.slug ?? null;
  let dossier_path: string | null = null;
  try {
    dossier_path = await appendFeedbackEntry({
      slug,
      from_email: senderEmail,
      from_name: event.data.from.name,
      subject: event.data.subject ?? "(no subject)",
      body_text: bodyText.slice(0, 5000),
      classification,
      message_id: messageId,
      received_at: event.created_at,
    });
  } catch (err) {
    console.error("[inbound-webhook] Failed to write feedback:", err);
  }

  // 7. Append event (this fires the events-poller chain)
  await sb.from("events").insert({
    customer_id: customer?.id ?? null,
    kind: "customer-reply-received",
    payload: {
      message_id: messageId,
      from: senderEmail,
      from_name: event.data.from.name,
      subject: event.data.subject,
      classification: classification.tag,
      confidence: classification.confidence,
      signals: classification.signals_matched.slice(0, 5),
      slug,
      dossier_path,
      is_complaint: classification.tag === "complaint",
      is_spam: classification.tag === "spam",
    },
  });

  // Detect which tenant this inbound belongs to (hot-flash-co, day14, etc.)
  const tenantDetection = detectTenant({
    recipient_email: event.data.to?.[0],
    sender_email: senderEmail,
    subject: event.data.subject ?? "",
    body: bodyText,
  });

  // Funnel into unified dispatcher
  try {
    const { dispatch } = await import("@/lib/dispatch");
    const evData = event.data;
    // When we detected a non-default tenant with reasonable confidence, route
    // directly to customer-service-triage with full tenant context.
    const isTenantSpecific =
      tenantDetection.tenant !== "day14" && tenantDetection.confidence >= 0.7;
    await dispatch({
      source: "resend-inbound",
      type: "email.inbound.received",
      context: `inbound-${Date.now()}`,
      customer_slug: slug ?? undefined,
      intentText: `${classification.tag}: ${(evData?.subject ?? "").slice(0, 60)}`,
      targetSkill: isTenantSpecific ? "customer-service-triage" : undefined,
      payload: {
        classification: classification.tag,
        confidence: classification.confidence,
        from: evData?.from?.email,
        tenant: tenantDetection.tenant,
        tenant_confidence: tenantDetection.confidence,
        tenant_signals: tenantDetection.signals,
        // Fields customer-service-triage reads:
        channel: "email" as const,
        subject: evData?.subject,
        message_text: bodyText,
        customer_email: senderEmail,
        customer_slug: slug ?? undefined,
      },
    });
  } catch (dispatchErr) {
    console.error("[inbound-webhook] dispatch failed:", dispatchErr);
  }

  return Response.json({
    received: true,
    customer_slug: slug,
    classification: classification.tag,
    confidence: classification.confidence,
    dossier_path,
  });
}

// ============================================================
// Signature verification (Resend uses Svix-style HMAC)
// ============================================================

function verifyResendSignature(
  body: string,
  signatureHeader: string,
  timestamp: string | null,
  secret: string
): boolean {
  if (!timestamp) return false;

  // Svix format: "v1,<base64sig> v1,<base64sig>..."
  // We accept any v1 signature in the header
  const signedPayload = `${timestamp}.${body}`;
  const expectedRaw = crypto
    .createHmac("sha256", secret.replace(/^whsec_/, ""))
    .update(signedPayload)
    .digest("base64");
  const expected = `v1,${expectedRaw}`;

  const signatures = signatureHeader.split(" ");
  for (const candidate of signatures) {
    if (safeEqual(candidate.trim(), expected)) return true;
  }
  return false;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function stripHtml(html: string): string {
  // Quick-and-dirty HTML→text. For prod, use a library; this is fine for inbound emails.
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, "")
    .replace(/<style[^>]*>.*?<\/style>/gis, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
