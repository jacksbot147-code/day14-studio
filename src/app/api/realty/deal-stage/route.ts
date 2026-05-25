import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

/**
 * POST /api/realty/deal-stage
 *
 * Records the deal-pipeline stage and notes for one property. Like the other
 * realty write routes, this only works on the local Mac admin, where the
 * businesses data lives — the hosted copy (Vercel) returns 503.
 *
 * Body: { property_id, stage?, note? }
 * Writes ops/dealstages.json and mirrors it into the dashboard snapshot so
 * the gameplan page reflects the change immediately.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAGES = [
  "watching",
  "researching",
  "contacted",
  "offer-made",
  "under-contract",
  "closed",
  "passed",
];

interface StageNote {
  ts: string;
  text: string;
}
interface StageEntry {
  stage: string;
  updated_at: string;
  notes: StageNote[];
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  // Auth — the same admin-session cookie the dashboard is gated behind.
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    const expected = await sha256Hex(password + ":day14-admin");
    if (req.cookies.get("admin-session")?.value !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  let propertyId = "";
  let stage = "";
  let note = "";
  try {
    const body = await req.json();
    propertyId = String(body?.property_id || "").trim();
    stage = String(body?.stage || "").trim();
    note = String(body?.note || "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  if (!propertyId) {
    return NextResponse.json({ ok: false, error: "property_id required" }, { status: 400 });
  }
  if (stage && !STAGES.includes(stage)) {
    return NextResponse.json({ ok: false, error: "unknown stage" }, { status: 400 });
  }
  if (!stage && !note) {
    return NextResponse.json({ ok: false, error: "stage or note required" }, { status: 400 });
  }
  if (note.length > 500) note = note.slice(0, 500);

  const opsDir = path.join(homedir(), "Documents/businesses/day14-realty/ops");
  if (!existsSync(opsDir)) {
    // Hosted copy — no access to the Mac's businesses data.
    return NextResponse.json(
      { ok: false, error: "realty engine unavailable on this host" },
      { status: 503 }
    );
  }
  const storePath = path.join(opsDir, "dealstages.json");

  let store: Record<string, StageEntry> = {};
  try {
    if (existsSync(storePath)) {
      store = JSON.parse(await fs.readFile(storePath, "utf8")) as Record<string, StageEntry>;
    }
  } catch {
    store = {};
  }

  const now = new Date().toISOString();
  const entry: StageEntry = store[propertyId] || { stage: "watching", updated_at: now, notes: [] };
  if (!Array.isArray(entry.notes)) entry.notes = [];
  if (stage) entry.stage = stage;
  if (note) entry.notes.push({ ts: now, text: note });
  entry.updated_at = now;
  store[propertyId] = entry;

  try {
    await fs.writeFile(storePath, JSON.stringify(store, null, 2));
  } catch {
    return NextResponse.json({ ok: false, error: "could not save" }, { status: 500 });
  }

  // Mirror into the dashboard snapshot so the gameplan page reflects it now.
  try {
    const snapPath = path.join(process.cwd(), "public/data/ops", "day14-realty.json");
    if (existsSync(snapPath)) {
      const snap = JSON.parse(await fs.readFile(snapPath, "utf8"));
      snap.dealstages = store;
      await fs.writeFile(snapPath, JSON.stringify(snap, null, 2));
    }
  } catch {
    /* best-effort — the next scout run reconciles the snapshot anyway */
  }

  return NextResponse.json({ ok: true, entry });
}
