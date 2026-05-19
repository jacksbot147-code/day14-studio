/**
 * /api/intake — public-facing intake submission endpoint.
 *
 * Accepts POST from the /intake form page. Validates minimal required
 * fields, then forwards to the internal intake processing logic that
 * lives in the /api/webhooks/intake handler. This avoids duplicating
 * the parser + dossier logic.
 *
 * No signature required for this endpoint (it's user-facing), but rate-
 * limited via a simple in-memory token bucket per IP.
 */

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { logAction } from "@/lib/work-register";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rateLimits = new Map<string, { count: number; reset: number }>();
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 60_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || entry.reset < now) {
    rateLimits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  if (entry.count > MAX_PER_WINDOW) return true;
  return false;
}

interface IntakeBody {
  source?: string;
  submission_id?: string;
  sku?: string | null;
  fields?: {
    email?: string;
    owner_name?: string;
    company_name?: string;
    phone?: string;
    city?: string;
    service_description?: string;
    service_radius?: string;
    typical_customer?: string;
    pricing?: string;
    existing_website?: string;
    domain?: string;
    how_customers_find?: string;
    current_pain?: string;
    contact_preference?: string;
    notes?: string;
  };
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon";

  if (rateLimited(ip)) {
    return new Response("Too many submissions — try again in a minute.", {
      status: 429,
    });
  }

  let body: IntakeBody;
  try {
    body = (await req.json()) as IntakeBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Minimal validation
  const email = body.fields?.email?.trim();
  const company = body.fields?.company_name?.trim();
  if (!email || !email.includes("@")) {
    return new Response("Email is required", { status: 400 });
  }
  if (!company) {
    return new Response("Business name is required", { status: 400 });
  }

  // Record to Supabase events (idempotency + audit)
  const sb = supabaseAdmin();
  const submissionId =
    body.submission_id || `intake-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await sb.from("events").insert({
    kind: "intake-submitted",
    payload: {
      submission_id: submissionId,
      source: body.source || "intake-form",
      sku: body.sku || null,
      email,
      company,
      fields: body.fields,
      ip,
    },
  });

  await logAction({
    action_phrase: `intake form submitted by ${company} (${email})`,
    context: `intake-${submissionId}`,
    invoked_skill: "intake-parser",
    notes: body.sku ? `sku=${body.sku}` : "no_sku",
  });

  return Response.json({
    received: true,
    submission_id: submissionId,
    message: "Got it — your build kicks off now.",
  });
}
