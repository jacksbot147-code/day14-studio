import { NextResponse, type NextRequest } from "next/server";

/**
 * Protects /admin/* routes behind ADMIN_PASSWORD env var.
 *
 * Auth check:
 *   - Reads `admin-session` cookie
 *   - Compares to hash of ADMIN_PASSWORD
 *   - On mismatch → redirect to /admin/login
 *
 * The cookie value is set by /api/admin/auth and uses a simple
 * hash-based scheme (not bcrypt — this is a single-user admin, the
 * password never appears in transit after login, and the cookie is
 * httpOnly + secure).
 */

export const config = {
  matcher: ["/admin/:path*"],
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Login page is public
  if (url.pathname === "/admin/login") return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse("Admin not configured (ADMIN_PASSWORD missing)", { status: 503 });
  }

  const expected = await sha256Hex(password + ":day14-admin");
  const cookie = req.cookies.get("admin-session")?.value;

  if (cookie !== expected) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", url.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}
