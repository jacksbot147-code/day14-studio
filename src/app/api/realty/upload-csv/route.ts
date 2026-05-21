import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

/**
 * POST /api/realty/upload-csv  (multipart: file=<csv>, county=<name>)
 *
 * Receives a county property-records CSV straight from the realty dashboard,
 * drops it into the realty intake folder, and runs the scout to ingest +
 * score it. Local-only (the Mac has the realty engine + businesses data);
 * the hosted copy returns 503.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 120 * 1024 * 1024; // 120 MB

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function countySlug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/count(y|ies)/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "county"
  );
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

  // The realty engine only exists on the Mac. Hosted copy -> 503.
  const scoutScript = path.join(
    homedir(),
    "Documents/studio/scripts/verticals/real-estate/scout-agent.mjs"
  );
  try {
    await fs.access(scoutScript);
  } catch {
    return NextResponse.json(
      { ok: false, error: "realty engine unavailable on this host" },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "bad upload" }, { status: 400 });
  }

  const file = form.get("file");
  const county = String(form.get("county") || "").trim();
  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "no file in upload" }, { status: 400 });
  }
  if (!/\.csv$/i.test(file.name || "")) {
    return NextResponse.json(
      { ok: false, error: "Please upload a .csv file (export it from the county site as CSV)." },
      { status: 400 }
    );
  }
  if (!file.size) {
    return NextResponse.json({ ok: false, error: "that file is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "file too large (over 120 MB)" }, { status: 400 });
  }

  const intakeDir = path.join(homedir(), "Documents/businesses/day14-realty/intake");
  const destName = `${county ? countySlug(county) : "county"}-county.csv`;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.mkdir(intakeDir, { recursive: true });
    await fs.writeFile(path.join(intakeDir, destName), buf);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `couldn't save the file: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 500 }
    );
  }

  // Run the scout (intake -> county-feed -> ... -> evaluation) in the background.
  try {
    const child = spawn(process.execPath, [scoutScript, "day14-realty"], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    /* the scheduled scout run will pick it up */
  }

  const kb = Math.round(file.size / 1024);
  return NextResponse.json({
    ok: true,
    file: destName,
    size_kb: kb,
    message: `CSV uploaded (${kb.toLocaleString()} KB)${county ? ` for ${county}` : ""}. The scout is ingesting and scoring it now — give it a couple of minutes, then refresh to see the deals.`,
  });
}
