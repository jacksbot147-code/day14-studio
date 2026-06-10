import { NextResponse, type NextRequest } from "next/server";

/**
 * Protects internal surfaces behind ADMIN_PASSWORD env var.
 *
 * Covered routes:
 *   - /admin/*      — command center (redirects to /admin/login)
 *   - /dashboard/*  — empire dashboard (redirects to /admin/login)
 *   - /data/empire-state.json, /data/ops/*, /data/inboxes/*,
 *     /data/cs-templates/* — internal state JSON (404s, no redirect:
 *     these are fetched as data, not visited as pages)
 *
 * Localhost bypass: requests to localhost/127.0.0.1 skip auth entirely —
 * the local dev loop (Jack's daily surface) stays frictionless, and local
 * /admin no longer 503s when ADMIN_PASSWORD is unset in .env.local.
 *
 * Auth check (unchanged scheme):
 *   - Reads `admin-session` cookie
 *   - Compares to hash of ADMIN_PASSWORD
 *   - On mismatch → redirect to /admin/login (pages) or 404 (data)
 *
 * The cookie value is set by /api/admin/auth and uses a simple
 * hash-based scheme (not bcrypt — this is a single-user admin, the
 * password never appears in transit after login, and the cookie is
 * httpOnly + secure).
 */

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/data/empire-state.json",
    "/data/ops/:path*",
    "/data/inboxes/:path*",
    "/data/cs-templates/:path*",
  ],
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Local dev: no gate.
  if (LOCAL_HOSTS.has(url.hostname)) return NextResponse.next();

  // Login page is public
  if (url.pathname === "/admin/login") return NextResponse.next();

  const isDataPath = url.pathname.startsWith("/data/");

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    // Data files: hard 404 — never serve internal state unconfigured.
    if (isDataPath) return new NextResponse(null, { status: 404 });
    return new NextResponse("Admin not configured (ADMIN_PASSWORD missing)", { status: 503 });
  }

  const expected = await sha256Hex(password + ":day14-admin");
  const cookie = req.cookies.get("admin-session")?.value;

  if (cookie !== expected) {
    if (isDataPath) return new NextResponse(null, { status: 404 });
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", url.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}
