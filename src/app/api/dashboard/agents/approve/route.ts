import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { resolveDeckTap } from "@/lib/agent-deck";

/**
 * POST /api/dashboard/agents/approve
 *
 * The deck's tap write path. Delegates to the tenant-scoped agent-deck service
 * (resolveDeckTap), which audit-logs every decision before mutating and enforces
 * tenant isolation. This route is the GOD-VIEW endpoint (tenant = null); a
 * customer's scoped view will get its own endpoint deriving the tenant from the
 * authenticated session server-side (never client-supplied).
 *
 * Body: { kind: "todo" | "tap", id: string, action: "approve" | "deny" }
 * Auth mirrors src/middleware.ts: localhost is trusted; hosted/LAN needs the
 * admin-session cookie. Local-only (503 where the businesses data is absent).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BIZ = path.join(homedir(), "Documents/businesses");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const KINDS = ["todo", "tap"] as const;
const ACTIONS = ["approve", "deny"] as const;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  const realHost = (req.headers.get("host") ?? "").split(":")[0] ?? "";
  const isLocal = LOCAL_HOSTS.has(realHost);
  const password = process.env.ADMIN_PASSWORD;
  if (password && !isLocal) {
    const expected = await sha256Hex(password + ":day14-admin");
    if (req.cookies.get("admin-session")?.value !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
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
  if (!existsSync(BIZ)) {
    return NextResponse.json({ ok: false, error: "command deck is local-only — this is the hosted dashboard" }, { status: 503 });
  }

  try {
    const result = await resolveDeckTap(null, kind as (typeof KINDS)[number], id, action as (typeof ACTIONS)[number]);
    return NextResponse.json(result, { status: result.ok ? 200 : result.code ?? 404 });
  } catch {
    return NextResponse.json({ ok: false, error: "could not complete the action" }, { status: 500 });
  }
}
