/**
 * /api/preview-lead — capture interest from a generated preview page.
 *
 * The instant-preview generator renders a real branded one-pager at
 * /preview/[token]. When a prospect says "I want this for real," the preview's
 * email-capture island (built separately, queue item 2) POSTs here.
 *
 * POST { name, trade, city, email, token } → append ONE JSON line to
 *   ~/Documents/businesses/_shared/growth/preview-leads.jsonl
 *
 * Behaviors, in order:
 *   1. Rate-limit by IP — 5 requests/minute, in-memory (matches /api/waitlist).
 *   2. Basic email validation (regex). Bad/oversized email → 400.
 *   3. Append-only JSONL write (auto-creates file + dir). No dedup — the log
 *      is an event stream; Jack/CRM dedup downstream.
 *
 * NO autonomous send. This endpoint only records the lead; outreach is a
 * Jack-tap later (per the hard rules — never contact a customer autonomously).
 *
 * Returns:
 *   200 { ok: true }
 *   400 { ok: false, error: "invalid email" | "invalid body" }
 *   429 { ok: false, error: "rate limited" }
 *   500 { ok: false, error: "..." }            on write failure
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROWTH_DIR = path.join(homedir(), "Documents/businesses/_shared/growth");
const LEADS_PATH = path.join(GROWTH_DIR, "preview-leads.jsonl");

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

// ---------- append-only JSONL writer -----------------------------------------

interface PreviewLead {
  name: string;
  trade: string;
  city: string;
  email: string;
  token: string;
  ts: string;
  ip: string;
}

async function appendLead(lead: PreviewLead): Promise<void> {
  await fs.mkdir(GROWTH_DIR, { recursive: true });
  await fs.appendFile(LEADS_PATH, JSON.stringify(lead) + "\n", "utf8");
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
    await appendLead(lead);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "write failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
