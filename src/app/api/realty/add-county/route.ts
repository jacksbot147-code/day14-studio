import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { homedir } from "node:os";

/**
 * POST /api/realty/add-county
 *
 * Registers a county/metro on the realty watch list and starts the scout —
 * directly, no Telegram. This only works when the admin runs locally on the
 * Mac (where the realty engine + businesses data live). On the hosted copy
 * (Vercel) the realty script isn't present, so this returns 503 and the
 * dashboard falls back to the Telegram hand-off.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  // Auth — same admin-session cookie the dashboard is gated behind.
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    const expected = await sha256Hex(password + ":day14-admin");
    if (req.cookies.get("admin-session")?.value !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  let county = "";
  try {
    const body = await req.json();
    county = String(body?.county || "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  if (!county) return NextResponse.json({ ok: false, error: "county required" }, { status: 400 });
  if (county.length > 120) {
    return NextResponse.json({ ok: false, error: "county too long" }, { status: 400 });
  }

  const script = path.join(
    homedir(),
    "Documents/studio/scripts/verticals/real-estate/add-target.mjs"
  );

  try {
    const { stdout } = await execFileP(process.execPath, [script, county], {
      timeout: 20_000,
      maxBuffer: 1024 * 1024,
    });
    const line = stdout.trim().split("\n").filter(Boolean).pop() || "{}";
    const result = JSON.parse(line);
    return NextResponse.json(result);
  } catch {
    // The realty engine isn't reachable on this host (hosted copy, or the
    // local service is down). The dashboard falls back to Telegram.
    return NextResponse.json(
      { ok: false, error: "realty engine unavailable on this host" },
      { status: 503 }
    );
  }
}
