/**
 * /api/waitlist — Day14 OS pivot-day waitlist endpoint.
 *
 * POST { email } → records the signup. Behaviors, in order:
 *   1. Basic email validation (regex). Bad email → 400.
 *   2. Rate-limit by IP — 5 requests per minute, in-memory counter.
 *      Hot reloads in dev will clear the counter; that's fine.
 *   3. Atomic append to public/data/waitlist.json (temp-then-rename).
 *      Idempotent — same email twice is a no-op, no duplicates.
 *   4. If MAILERLITE_API_KEY is configured, also POST to MailerLite.
 *      Idempotent there too (MailerLite returns 200 on re-subscribe).
 *
 * Returns:
 *   200 { ok: true, alreadyOnList?: boolean }   on success
 *   400 { ok: false, error: "invalid email" }
 *   429 { ok: false, error: "rate limited" }
 *   500 { ok: false, error: "..." }             on write failure
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { subscribe } from "@/lib/mailerlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WAITLIST_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "waitlist.json",
);

// Same regex used by /api/subscribe — keep them in sync.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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

// ---------- atomic waitlist.json writer --------------------------------------

interface WaitlistEntry {
  email: string;
  ts: string;
  source: string;
}

interface WaitlistFile {
  entries: WaitlistEntry[];
}

async function readWaitlist(): Promise<WaitlistFile> {
  try {
    const raw = await fs.readFile(WAITLIST_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<WaitlistFile>;
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e && e.code === "ENOENT") return { entries: [] };
    throw err;
  }
}

async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const suffix = crypto.randomBytes(4).toString("hex");
  const tmp = path.join(dir, `.${path.basename(filePath)}.tmp.${process.pid}.${suffix}`);
  await fs.writeFile(tmp, contents, "utf8");
  await fs.rename(tmp, filePath);
}

/**
 * Append an entry to the waitlist file if the email is new.
 * Returns alreadyOnList: true if the email was a duplicate.
 */
async function recordLocal(email: string, source: string): Promise<{ alreadyOnList: boolean }> {
  const current = await readWaitlist();
  const normalized = email.toLowerCase().trim();
  const dup = current.entries.some((e) => e.email.toLowerCase() === normalized);
  if (dup) return { alreadyOnList: true };

  const next: WaitlistFile = {
    entries: [
      ...current.entries,
      { email: normalized, ts: new Date().toISOString(), source },
    ],
  };
  await atomicWrite(WAITLIST_PATH, JSON.stringify(next, null, 2) + "\n");
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

  let alreadyOnList = false;
  try {
    const result = await recordLocal(email, source);
    alreadyOnList = result.alreadyOnList;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "write failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  // Best-effort MailerLite mirror. Failure here doesn't fail the
  // request — the local JSON write is the source of truth.
  if (process.env.MAILERLITE_API_KEY) {
    try {
      await subscribe({
        email,
        source,
        groupId: process.env.MAILERLITE_DAY14_OS_GROUP_ID,
      });
    } catch {
      // Swallow; the local write succeeded, that's the contract.
    }
  }

  return NextResponse.json({ ok: true, alreadyOnList }, { status: 200 });
}
