import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { getDeck } from "@/lib/agent-deck";
import { requireAdmin } from "@/lib/require-admin";

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

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
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
