/**
 * /api/preview-lead — capture interest from a generated preview page.
 *
 * The instant-preview generator renders a real branded one-pager at
 * /preview/[token]. When a prospect says "I want this for real," the preview's
 * email-capture island POSTs here.
 *
 * POST { name, trade, city, email, token } → one row in Supabase `events`
 *   (kind `preview-lead-submitted`). Same helper as /api/intake.
 *
 * Behaviors, in order:
 *   1. Rate-limit by IP — 5 requests/minute, in-memory (matches /api/waitlist).
 *   2. Basic email validation (regex). Bad/oversized email → 400.
 *   3. Insert the lead. No dedup — the table is an event stream; Jack/CRM
 *      dedup downstream. Missing Supabase env → 500, never a silent drop.
 *
 * NO autonomous send. This endpoint only records the lead; outreach is a
 * Jack-tap later (per the hard rules — never contact a customer autonomously).
 *
 * Returns:
 *   200 { ok: true }
 *   400 { ok: false, error: "invalid email" | "invalid body" }
 *   429 { ok: false, error: "rate limited" }
 *   500 { ok: false, error: "..." }            on write / config failure
 *
 * Production env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same regex used by /api/waitlist and /api/subscribe — keep them in sync.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ---------- in-memory rate limit (mirrors /api/waitlist) ---------------------

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
  return b.count > RATE_LIMIT;
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

// ---------- event writer -----------------------------------------------------

interface PreviewLead {
  name: string;
  trade: string;
  city: string;
  email: string;
  token: string;
  ts: string;
  ip: string;
}

async function persistLead(lead: PreviewLead): Promise<void> {
  const sb = supabaseAdmin();
  const { error } = await sb.from("events").insert({
    kind: "preview-lead-submitted",
    payload: lead,
  });
  if (error) {
    throw new Error(error.message);
  }
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

  let name = "";
  let trade = "";
  let city = "";
  let email = "";
  let token = "";

  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      const body = (await req.json()) as {
        name?: string;
        trade?: string;
        city?: string;
        email?: string;
        token?: string;
      };
      name = String(body.name ?? "").trim();
      trade = String(body.trade ?? "").trim();
      city = String(body.city ?? "").trim();
      email = String(body.email ?? "").trim();
      token = String(body.token ?? "").trim();
    } catch {
      return NextResponse.json(
        { ok: false, error: "invalid body" },
        { status: 400 },
      );
    }
  } else {
    const form = await req.formData();
    name = String(form.get("name") ?? "").trim();
    trade = String(form.get("trade") ?? "").trim();
    city = String(form.get("city") ?? "").trim();
    email = String(form.get("email") ?? "").trim();
    token = String(form.get("token") ?? "").trim();
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

  const lead: PreviewLead = {
    // Clamp free-form fields so a hostile client can't bloat the log.
    name: name.slice(0, 120),
    trade: trade.slice(0, 80),
    city: city.slice(0, 80),
    email: email.toLowerCase(),
    token: token.slice(0, 2048),
    ts: new Date().toISOString(),
    ip,
  };

  try {
    await persistLead(lead);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "write failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
