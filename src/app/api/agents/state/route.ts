import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { getDeck } from "@/lib/agent-deck";

/**
 * GET /api/agents/state[?tenant=<slug>]
 *
 * Read endpoint over the tenant-scoped agent-deck service. The server-rendered
 * god-view page calls getDeck() directly; this exists for live polling and for
 * the future customer client. Admin/localhost may request any tenant (or the
 * god-view with no ?tenant); a customer-facing endpoint will instead derive the
 * tenant from the authenticated session server-side (never the query string).
 *
 * Auth mirrors src/middleware.ts: localhost trusted; hosted/LAN needs the
 * admin-session cookie. Local-only data → 503 on the hosted copy.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BIZ = path.join(homedir(), "Documents/businesses");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(req: NextRequest) {
  const realHost = (req.headers.get("host") ?? "").split(":")[0] ?? "";
  const isLocal = LOCAL_HOSTS.has(realHost);
  const password = process.env.ADMIN_PASSWORD;
  if (password && !isLocal) {
    const expected = await sha256Hex(password + ":day14-admin");
    if (req.cookies.get("admin-session")?.value !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  if (!existsSync(BIZ)) {
    return NextResponse.json({ ok: false, error: "deck state is local-only — this is the hosted dashboard" }, { status: 503 });
  }

  const raw = req.nextUrl.searchParams.get("tenant");
  const tenant = raw && /^[a-z0-9][a-z0-9-]*$/i.test(raw) ? raw : null;
  try {
    const state = await getDeck(tenant);
    return NextResponse.json(state, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "could not read deck state" }, { status: 500 });
  }
}
