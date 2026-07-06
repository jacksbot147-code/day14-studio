import { NextRequest, NextResponse } from "next/server";
import { signSession, legacyToken, DEFAULT_TTL_MS } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  if (submitted !== password) {
    return NextResponse.redirect(new URL(`/admin/login?error=1&next=${encodeURIComponent(next)}`, base), 303);
  }

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
