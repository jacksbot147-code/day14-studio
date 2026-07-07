import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { resolveDeckTap, isKnownTenant } from "@/lib/agent-deck";
import { requireAdmin } from "@/lib/require-admin";

/**
 * POST /api/app/[tenant]/agents/approve
 *
 * Tenant-scoped tap write. The tenant is taken from the ROUTE (server-side) and
 * passed to resolveDeckTap, which re-checks isolation (a tenant can only resolve
 * its own items) and audit-logs the decision. A customer literally cannot act on
 * another tenant's taps even if they forge the request body.
 *
 * Auth today mirrors src/middleware.ts (localhost trusted; hosted needs the
 * admin-session cookie) — i.e. Jack-preview. Real per-customer auth, where the
 * route tenant must equal the authenticated customer's tenant, is the next phase.
 *
 * Body: { kind: "todo" | "tap", id, action: "approve" | "deny" }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BIZ = path.join(homedir(), "Documents/businesses");
const KINDS = ["todo", "tap"] as const;
const ACTIONS = ["approve", "deny"] as const;

export async function POST(req: NextRequest, { params }: { params: { tenant: string } }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const tenant = params.tenant;
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(tenant) || !(await isKnownTenant(tenant))) {
    return NextResponse.json({ ok: false, error: "unknown tenant" }, { status: 404 });
  }

  let kind = "";
  let id = "";
  let action = "";
  try {
    const body = await req.json();
    kind = String(body?.kind || "").trim();
    id = String(body?.id || "").trim();
    action = String(body?.action || "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  if (!KINDS.includes(kind as (typeof KINDS)[number])) return NextResponse.json({ ok: false, error: "unknown kind" }, { status: 400 });
  if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  if (!existsSync(BIZ)) return NextResponse.json({ ok: false, error: "deck is local-only — hosted dashboard" }, { status: 503 });

  try {
    const result = await resolveDeckTap(tenant, kind as (typeof KINDS)[number], id, action as (typeof ACTIONS)[number]);
    return NextResponse.json(result, { status: result.ok ? 200 : result.code ?? 404 });
  } catch {
    return NextResponse.json({ ok: false, error: "could not complete the action" }, { status: 500 });
  }
}
