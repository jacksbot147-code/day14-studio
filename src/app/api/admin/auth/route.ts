import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { signSession, legacyToken, DEFAULT_TTL_MS } from "@/lib/admin-session";
import { clientIp } from "@/lib/client-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Constant-time password compare (HMAC both sides so length isn't leaked and
 * there is no early-exit). */
function safeEqual(a: string, b: string): boolean {
  const k = "day14-admin-cmp";
  const ha = createHmac("sha256", k).update(a).digest();
  const hb = createHmac("sha256", k).update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Best-effort brute-force throttle keyed on the TRUSTED client IP. Per-instance
 * (serverless) so not perfect, but it turns unlimited online guessing of the
 * single admin password into a locked, slow one. Keyed on the real IP (not the
 * spoofable leftmost XFF), so an attacker can't rotate the key or lock out the
 * real admin (different IP). */
const FAILS = new Map<string, { n: number; until: number }>();
const MAX_FAILS = 8;
const WINDOW_MS = 10 * 60_000;
function isLocked(ip: string): boolean {
  const e = FAILS.get(ip);
  return !!e && e.n >= MAX_FAILS && Date.now() < e.until;
}
function recordFail(ip: string): void {
  const now = Date.now();
  const e = FAILS.get(ip);
  if (!e || now > e.until) FAILS.set(ip, { n: 1, until: now + WINDOW_MS });
  else {
    e.n += 1;
    e.until = now + WINDOW_MS;
  }
}

export async function POST(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return NextResponse.json({ ok: false, error: "ADMIN_PASSWORD not configured" }, { status: 503 });

  const form = await req.formData();
  const submitted = String(form.get("password") || "");
  const next = String(form.get("next") || "/admin");

  // Build redirects from the REAL Host header — Next dev rewrites req.url
  // to localhost, which strands LAN visitors on a dead localhost page.
  const host = req.headers.get("host") ?? new URL(req.url).host;
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${host}`;

  const ip = clientIp(req);
  if (isLocked(ip)) {
    return NextResponse.redirect(new URL(`/admin/login?error=locked&next=${encodeURIComponent(next)}`, base), 303);
  }

  if (!safeEqual(submitted, password)) {
    recordFail(ip);
    return NextResponse.redirect(new URL(`/admin/login?error=1&next=${encodeURIComponent(next)}`, base), 303);
  }
  FAILS.delete(ip); // successful login clears the counter

  // Hardened: mint a signed, 12h-expiring session when ADMIN_SESSION_SECRET
  // is set. Fall back to the legacy static token (replayable, no expiry —
  // localhost-only safe) when it is unset, so login keeps working before
  // Jack rotates in the new secret.
  const secret = process.env.ADMIN_SESSION_SECRET;
  const sessionToken = secret
    ? await signSession(secret, DEFAULT_TTL_MS)
    : await legacyToken(password);
  // Cookie maxAge mirrors the token's own lifetime: 12h signed, 30d legacy.
  const maxAge = secret ? Math.floor(DEFAULT_TTL_MS / 1000) : 60 * 60 * 24 * 30;

  const res = NextResponse.redirect(new URL(next, base), 303);
  res.cookies.set("admin-session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url), 303);
  res.cookies.delete("admin-session");
  return res;
}
