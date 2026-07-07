import { NextRequest, NextResponse } from "next/server";
import { verifySession, legacyToken } from "@/lib/admin-session";

/**
 * requireAdmin — the ONE auth guard for every admin write route.
 *
 * Closes security blocker C2 (see DAY14/security re-verify #11, 2026-07-06):
 * the write APIs previously compared the cookie against the legacy static
 * sha256(password) token with a fail-open `if (password)` wrapper. That had
 * two consequences: (1) ADMIN_PASSWORD unset → zero auth on writes (the
 * middleware matcher does not cover /api/*), and (2) once ADMIN_SESSION_SECRET
 * was set, login minted HMAC tokens the write routes didn't recognize → 401
 * for a legitimately logged-in Jack.
 *
 * This guard: fails CLOSED (503 when ADMIN_PASSWORD is missing), verifies the
 * signed 12h session when ADMIN_SESSION_SECRET is set, and falls back to the
 * legacy token only when it isn't — exactly mirroring the middleware's page
 * gate so page auth and write auth can never diverge again.
 *
 * Usage, first lines of every admin write handler:
 *   const denied = await requireAdmin(req);
 *   if (denied) return denied;
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  // Dev-only localhost bypass, mirroring the middleware's C1-fixed gate: the
  // local loop stays login-free under `next dev`, but a production process
  // (incl. behind a tunnel) never honors a client-controlled Host header.
  const realHost =
    (req.headers.get("host") ?? req.nextUrl.hostname).split(":")[0] ?? "";
  if (process.env.NODE_ENV === "development" && LOCAL_HOSTS.has(realHost)) {
    return null;
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { ok: false, error: "admin not configured" },
      { status: 503 },
    );
  }
  const cookie = req.cookies.get("admin-session")?.value;
  const secret = process.env.ADMIN_SESSION_SECRET;
  const valid = secret
    ? await verifySession(secret, cookie)
    : !!cookie && cookie === (await legacyToken(password));
  if (!valid) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}
