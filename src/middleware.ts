import { NextResponse, type NextRequest } from "next/server";
import { verifySession, legacyToken } from "@/lib/admin-session";

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
 * Auth check (hardened scheme):
 *   - Reads `admin-session` cookie
 *   - If ADMIN_SESSION_SECRET is set → cookie must be a valid, NON-EXPIRED
 *     HMAC-signed session (see src/lib/admin-session.ts). Tokens carry a
 *     12h TTL minted at login; tampered or stale tokens fail closed.
 *   - If ADMIN_SESSION_SECRET is UNSET → falls back to the legacy static
 *     hash of ADMIN_PASSWORD, so nothing breaks before Jack sets the new
 *     secret. (Internet exposure REQUIRES setting ADMIN_SESSION_SECRET —
 *     the legacy token is replayable forever and is localhost-only safe.)
 *   - On mismatch → redirect to /admin/login (pages) or 404 (data)
 *
 * The cookie is set by /api/admin/auth and stays httpOnly + secure +
 * sameSite=lax.
 */

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/app/:path*",
    "/data/empire-state.json",
    "/data/ops/:path*",
    "/data/inboxes/:path*",
    "/data/cs-templates/:path*",
  ],
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Local dev: no gate. Read the real Host header — Next dev rewrites
  // nextUrl.hostname to "localhost" for every request, which would
  // otherwise bypass the gate for LAN/remote visitors too.
  const realHost = (req.headers.get("host") ?? url.hostname).split(":")[0] ?? "";
  if (LOCAL_HOSTS.has(realHost)) return NextResponse.next();

  // Login page is public
  if (url.pathname === "/admin/login") return NextResponse.next();

  const isDataPath = url.pathname.startsWith("/data/");

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    // Data files: hard 404 — never serve internal state unconfigured.
    if (isDataPath) return new NextResponse(null, { status: 404 });
    return new NextResponse("Admin not configured (ADMIN_PASSWORD missing)", { status: 503 });
  }

  const cookie = req.cookies.get("admin-session")?.value;
  const secret = process.env.ADMIN_SESSION_SECRET;

  let valid: boolean;
  if (secret) {
    // Hardened path: signed + non-expired session.
    valid = await verifySession(secret, cookie);
  } else {
    // Legacy fallback (localhost-only safe): static hash of the password.
    valid = !!cookie && cookie === (await legacyToken(password));
  }

  if (!valid) {
    if (isDataPath) return new NextResponse(null, { status: 404 });
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", url.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}
