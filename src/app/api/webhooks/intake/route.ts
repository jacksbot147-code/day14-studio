/**
 * Intake webhook handler — day14.us/api/webhooks/intake
 *
 * Receives Typeform / Notion / custom form submissions; parses into the
 * canonical shape; updates customer dossier + Supabase row.
 *
 * Implementation of the `vercel-route-intake-webhook` skill.
 *
 * Built on createWebhookHandler (src/lib/webhook-handler.ts): per-source
 * signature verification preserved exactly; zod-validated payload;
 * file-backed idempotency on submission_id (plus the existing Supabase
 * `events` table check inside the handler).
 */

import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createWebhookHandler } from "@/lib/webhook-handler";
import {
  parseIntakePayload,
  applyIntakeToDossier,
  type IntakeSource,
} from "@/lib/intake-parser";
import { logSkillInvocation, logError } from "@/lib/work-register";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Form payloads are heterogeneous (Typeform/Notion/custom) — the canonical
// parse happens in parseIntakePayload. Validate it's a JSON object.
const intakeSchema = z.record(z.string(), z.unknown());

export const POST = createWebhookHandler<typeof intakeSchema, { source: IntakeSource }, NextRequest>({
  source: "intake",

  verify: (req, body) => {
    // 1. Identify source via custom header (Typeform/Notion/custom all pre-tagged)
    const source = (req.headers.get("x-day14-intake-source") ??
      "custom") as IntakeSource;

    if (!["typeform", "notion", "custom", "manual"].includes(source)) {
      return {
        ok: false,
        response: new Response(`Unknown intake source: ${source}`, { status: 400 }),
      };
    }

    // 2. Verify signature per source
    const verified = verifySignature(req, body, source);
    if (!verified) {
      return { ok: false, response: new Response("Invalid signature", { status: 401 }) };
    }

    return { ok: true, context: { source } };
  },

  parse: (_req, body) => {
    try {
      return { ok: true, payload: JSON.parse(body) };
    } catch {
      return { ok: false, response: new Response("Invalid JSON body", { status: 400 }) };
    }
  },

  schema: intakeSchema,

  // Idempotency — submission_id when present, else hash of the body
  // (same derivation the route has always used)
  eventId: (payload, _verified, body) =>
    (payload.submission_id as string | undefined) ??
    crypto.createHash("sha256").update(body).digest("hex").slice(0, 32),

  handle: async ({ payload, verified, eventId: submission_id }) => {
    const { source } = verified;
    const sb = supabaseAdmin();

    // Idempotency (second layer) — Supabase events table
    const { data: existing } = await sb
      .from("events")
      .select("id")
      .eq("kind", "intake-received")
      .filter("payload->>submission_id", "eq", submission_id)
      .maybeSingle();

    if (existing) {
      return Response.json({ received: true, duplicate: true });
    }

    // Parse the form into canonical shape
    const parsed = parseIntakePayload(payload, source);
    await logSkillInvocation("intake-parser", `intake-${source}`, undefined);

    if (!parsed.fields.email) {
      return new Response("Submission missing email field", { status: 400 });
    }

    // Identify customer by email (most recent match)
    const { data: customer } = await sb
      .from("customers")
      .select("id, slug, status")
      .eq("email", parsed.fields.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let customer_id: string | null = null;
    let slug: string | null = null;

    if (customer) {
      customer_id = customer.id;
      slug = customer.slug;

      // Update customers row
      const updates: Record<string, unknown> = {
        intake_done_at: new Date().toISOString(),
        intake_json: parsed.fields,
      };
      if (customer.status === "awaiting-intake") {
        updates.status = "building";
      }
      if (parsed.fields.phone) updates.phone = parsed.fields.phone;
      if (parsed.fields.sku) updates.sku = parsed.fields.sku;
      if (parsed.fields.vertical) updates.vertical = parsed.fields.vertical;

      await sb.from("customers").update(updates).eq("id", customer_id);

      // Apply to dossier files (00-intake.md + 01-brand.json)
      try {
        if (slug) {
          await applyIntakeToDossier(slug, parsed);
        }
      } catch (err) {
        await logError(
          "intake-webhook",
          err,
          slug ? `customer-${slug}` : `intake-${submission_id}`,
          "failed to apply intake to dossier"
        );
        // Don't fail the request — Supabase write succeeded
      }
    } else {
      // No matching customer row — this is a "lead" / pre-deposit intake
      // Don't auto-create a customer row; surface for Jack
      console.log(
        `[intake-webhook] Intake from unknown email: ${parsed.fields.email} — tagged as lead`
      );
    }

    // Append event
    await sb.from("events").insert({
      customer_id,
      kind: "intake-received",
      payload: {
        submission_id,
        source,
        email: parsed.fields.email,
        slug,
        confidence: parsed.confidence,
        validation_issues: parsed.validation_issues,
      },
    });

    // Funnel into unified dispatcher for downstream skill invocations + telemetry
    try {
      const { dispatch } = await import("@/lib/dispatch");
      await dispatch({
        source: "intake-webhook",
        type: slug ? "submission" : "lead",
        context: `intake-${submission_id}`,
        customer_slug: slug ?? undefined,
        intentText: `intake ${parsed.fields.vertical ?? "unknown"} ${parsed.fields.company_name ?? ""}`,
        payload: { submission_id, email: parsed.fields.email, slug },
      });
    } catch (dispatchErr) {
      await logError("intake-webhook", dispatchErr, `intake-${submission_id}`, "dispatch failed");
    }

    return Response.json({
      received: true,
      customer_slug: slug,
      confidence: parsed.confidence,
      validation_issues: parsed.validation_issues,
    });
  },
});

// ============================================================
// Signature verification per source
// ============================================================

function verifySignature(
  req: NextRequest,
  body: string,
  source: IntakeSource
): boolean {
  switch (source) {
    case "typeform": {
      const sig = req.headers.get("typeform-signature");
      const secret = process.env.TYPEFORM_WEBHOOK_SECRET;
      if (!sig || !secret) return false;
      // Typeform format: "sha256=<base64>"
      const expected =
        "sha256=" +
        crypto.createHmac("sha256", secret).update(body).digest("base64");
      return safeEqual(sig, expected);
    }
    case "notion": {
      // Notion's webhook (if used via Zapier/Make) — fallback to shared secret
      const provided = req.headers.get("x-day14-secret");
      const expected = process.env.NOTION_INTAKE_SHARED_SECRET;
      if (!provided || !expected) return false;
      return safeEqual(provided, expected);
    }
    case "custom": {
      const sig = req.headers.get("x-day14-signature");
      const secret = process.env.INTAKE_WEBHOOK_SECRET;
      if (!sig || !secret) return false;
      const expected = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");
      return safeEqual(sig, expected);
    }
    case "manual":
      // Manual posts (from Jack pasting into a tool) — require auth header
      return (
        req.headers.get("authorization") ===
        `Bearer ${process.env.INTAKE_WEBHOOK_SECRET}`
      );
    default:
      return false;
  }
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
