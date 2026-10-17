/**
 * /api/waitlist — Day14 OS pivot-day waitlist endpoint.
 *
 * POST { email } → records the signup. Behaviors, in order:
 *   1. Basic email validation (regex). Bad email → 400.
 *   2. Rate-limit by IP — 5 requests per minute, in-memory counter.
 *      Hot reloads in dev will clear the counter; that's fine.
 *   3. Insert into Supabase `events` (kind `waitlist-submitted`).
 *      Idempotent — same email twice is a no-op, no duplicate row.
 *      Missing Supabase env → 500, never a silent drop.
 *   4. If MAILERLITE_API_KEY is configured, also POST to MailerLite.
 *      Idempotent there too (MailerLite returns 200 on re-subscribe).
 *
 * Returns:
 *   200 { ok: true, alreadyOnList?: boolean }   on success
 *   400 { ok: false, error: "invalid email" }
 *   429 { ok: false, error: "rate limited" }
 *   500 { ok: false, error: "..." }             on write / config failure
 *
 * Production env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Optional mirror: MAILERLITE_API_KEY, MAILERLITE_DAY14_OS_GROUP_ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { subscribe } from "@/lib/mailerlite";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same regex used by /api/subscribe — keep them in sync.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const EVENT_KIND = "waitlist-submitted";

// ---------- in-memory rate limit ---------------------------------------------

interface Bucket {
  windowStart: number;
  count: number;
}

const RATE_BUCKETS = new Map<string, Bucket>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;

function rateLimited(ip: string, now: number): boolean {
  const b = RATE_BUCKETS.get(ip);
  if (!b || now - b.windowStart > RATE_WINDOW_MS) {
    RATE_BUCKETS.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  b.count++;
  if (b.count > RATE_LIMIT) return true;
  return false;
}

function clientIp(req: NextRequest): string {
  // x-forwarded-for is set by Vercel; first hop is the client.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0];
    if (first) return first.trim();
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

// ---------- Supabase events writer -------------------------------------------

/**
 * Insert the email if it is new.
 * Returns alreadyOnList: true if a prior waitlist-submitted event exists.
 */
async function recordLead(
  email: string,
  source: string,
): Promise<{ alreadyOnList: boolean }> {
  const sb = supabaseAdmin();
  const normalized = email.toLowerCase().trim();

  const { data: existing, error: lookupError } = await sb
    .from("events")
    .select("id")
    .eq("kind", EVENT_KIND)
    .filter("payload->>email", "eq", normalized)
    .limit(1);

  if (lookupError) {
    throw new Error(lookupError.message);
  }
  if (existing && existing.length > 0) {
    return { alreadyOnList: true };
  }

  const { error: insertError } = await sb.from("events").insert({
    kind: EVENT_KIND,
    payload: {
      email: normalized,
      ts: new Date().toISOString(),
      source,
    },
  });
  if (insertError) {
    throw new Error(insertError.message);
  }
  return { alreadyOnList: false };
}

// ---------- POST handler -----------------------------------------------------

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (rateLimited(ip, Date.now())) {
    return NextResponse.json(
      { ok: false, error: "rate limited" },
      { status: 429 },
    );
  }

  let email = "";
  let source = "day14-os-landing";

  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      const body = (await req.json()) as { email?: string; source?: string };
      email = String(body.email ?? "").trim();
      if (body.source) source = String(body.source);
    } catch {
      return NextResponse.json(
        { ok: false, error: "invalid body" },
        { status: 400 },
      );
    }
  } else {
    const form = await req.formData();
    email = String(form.get("email") ?? "").trim();
    const s = form.get("source");
    if (s) source = String(s);
  }

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { ok: false, error: "invalid email" },
      { status: 400 },
    );
  }

  if (!supabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 500 },
    );
  }

  let alreadyOnList = false;
  try {
    const result = await recordLead(email, source);
    alreadyOnList = result.alreadyOnList;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "write failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  // Best-effort MailerLite mirror. Failure here doesn't fail the
  // request — the Supabase events row is the source of truth.
  if (process.env.MAILERLITE_API_KEY) {
    try {
      await subscribe({
        email,
        source,
        groupId: process.env.MAILERLITE_DAY14_OS_GROUP_ID,
      });
    } catch {
      // Swallow; the events insert succeeded, that's the contract.
    }
  }

  return NextResponse.json({ ok: true, alreadyOnList }, { status: 200 });
}
