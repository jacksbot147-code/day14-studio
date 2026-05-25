import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

/**
 * POST /api/realty/buyer-profile
 *
 * Saves the buyer profile the acquisition strategist uses to personalize the
 * least-cash routes. Local-Mac admin only — the hosted copy returns 503.
 *
 * Body: { cash_available, credit_band, has_llc, will_owner_occupy, goal }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CREDIT = ["excellent", "good", "fair", "limited", "unknown"];
const GOALS = ["flip", "rental", "wholesale", "mixed"];

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    const expected = await sha256Hex(password + ":day14-admin");
    if (req.cookies.get("admin-session")?.value !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const cashDollars = Math.max(0, Math.min(1e11, Number(body.cash_available) || 0));
  const creditBand = String(body.credit_band || "unknown");
  const goal = String(body.goal || "mixed");
  if (!CREDIT.includes(creditBand)) {
    return NextResponse.json({ ok: false, error: "bad credit_band" }, { status: 400 });
  }
  if (!GOALS.includes(goal)) {
    return NextResponse.json({ ok: false, error: "bad goal" }, { status: 400 });
  }

  const profile = {
    cash_available_cents: Math.round(cashDollars * 100),
    credit_band: creditBand,
    has_llc: !!body.has_llc,
    will_owner_occupy: !!body.will_owner_occupy,
    goal,
    updated_at: new Date().toISOString(),
  };

  const opsDir = path.join(homedir(), "Documents/businesses/day14-realty/ops");
  if (!existsSync(opsDir)) {
    return NextResponse.json(
      { ok: false, error: "realty engine unavailable on this host" },
      { status: 503 }
    );
  }

  try {
    await fs.writeFile(
      path.join(opsDir, "buyerprofile.json"),
      JSON.stringify(profile, null, 2)
    );
  } catch {
    return NextResponse.json({ ok: false, error: "could not save" }, { status: 500 });
  }

  // Mirror into the dashboard snapshot so the gameplan reflects it now.
  try {
    const snapPath = path.join(process.cwd(), "public/data/ops", "day14-realty.json");
    if (existsSync(snapPath)) {
      const snap = JSON.parse(await fs.readFile(snapPath, "utf8"));
      snap.buyerprofile = profile;
      await fs.writeFile(snapPath, JSON.stringify(snap, null, 2));
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true, profile });
}
