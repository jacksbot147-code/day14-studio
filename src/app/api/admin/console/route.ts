import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { loadEmpireState } from "@/lib/admin-state";

/**
 * /api/admin/console — the API behind the Console page (see
 * docs/admin-console-spec.md).
 *
 * GET  → runtime vitals + the last 15 console-prompt exchanges.
 * POST → { text } → INSERT a `console-prompt` event into Supabase.
 *        The mini's events-poller picks it up (≤10s), runs it through
 *        bot-brain's processIncomingMessage (the same brain Telegram
 *        uses), and PATCHes the reply back onto the event row.
 *
 * Transport is Supabase (not the local filesystem) so the console works
 * identically from the hosted Vercel admin and the mini's localhost.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARED = path.join(homedir(), "Documents", "businesses", "_shared");
const PROMPT_MAX = 2000;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    const expected = await sha256Hex(password + ":day14-admin");
    if (req.cookies.get("admin-session")?.value !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  return null;
}

function supabase(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function sbFetch(pathQuery: string, init?: RequestInit): Promise<Response> {
  const sb = supabase();
  if (!sb) throw new Error("Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  return fetch(`${sb.url}/rest/v1/${pathQuery}`, {
    ...init,
    headers: {
      apikey: sb.key,
      Authorization: `Bearer ${sb.key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

interface Vital {
  name: string;
  age_s: number | null;
  status: "green" | "red" | "unknown";
}

/** Heartbeats from the local filesystem when we ARE the runtime box,
 *  otherwise from the synced empire-state snapshot. */
async function readVitals(): Promise<{ source: string; vitals: Vital[] }> {
  const pollerDir = path.join(SHARED, "poller");
  if (existsSync(pollerDir)) {
    const names = ["growth-watcher", "telegram-poller", "events-poller"];
    const vitals: Vital[] = names.map((name) => {
      const f = path.join(pollerDir, `${name}-heartbeat.log`);
      if (!existsSync(f)) return { name, age_s: null, status: "red" };
      const age = Math.max(0, Math.round((Date.now() - statSync(f).mtimeMs) / 1000));
      return { name, age_s: age, status: age < 300 ? "green" : "red" };
    });
    return { source: "local", vitals };
  }
  // Hosted: fall back to the synced snapshot.
  try {
    const state = await loadEmpireState();
    const vitals: Vital[] = (state.heartbeats ?? []).slice(0, 8).map((hb) => ({
      name: hb.name,
      age_s: Number.isFinite(hb.ageMin) ? Math.round(hb.ageMin * 60) : null,
      status: hb.status === "healthy" ? "green" : hb.status === "error" ? "red" : "unknown",
    }));
    return { source: "synced-snapshot", vitals };
  } catch {
    return { source: "unavailable", vitals: [] };
  }
}

async function readWorkRegisterTail(): Promise<string[]> {
  const f = path.join(SHARED, "growth", "work-register.jsonl");
  if (!existsSync(f)) return [];
  try {
    const raw = await fs.readFile(f, "utf8");
    return raw.trim().split("\n").slice(-8).reverse();
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const unauthorized = await requireAuth(req);
  if (unauthorized) return unauthorized;

  const { source, vitals } = await readVitals();
  const register = await readWorkRegisterTail();

  let thread: unknown[] = [];
  let supabaseOk = false;
  if (supabase()) {
    try {
      const res = await sbFetch(
        `events?kind=eq.console-prompt&order=created_at.desc&limit=15&select=id,created_at,payload,processed_at,processed_by`
      );
      if (res.ok) {
        thread = await res.json();
        supabaseOk = true;
      }
    } catch {
      /* surfaced via supabaseOk */
    }
  }

  return NextResponse.json({
    ok: true,
    vitals_source: source,
    vitals,
    register,
    supabase: supabaseOk,
    thread,
  });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAuth(req);
  if (unauthorized) return unauthorized;

  if (!supabase()) {
    return NextResponse.json(
      { ok: false, error: "Supabase env missing — console transport unavailable here" },
      { status: 503 }
    );
  }

  let text = "";
  try {
    const body = (await req.json()) as { text?: string };
    text = (body.text ?? "").trim();
  } catch {
    /* falls through to validation */
  }
  if (!text) {
    return NextResponse.json({ ok: false, error: "empty prompt" }, { status: 400 });
  }
  if (text.length > PROMPT_MAX) {
    return NextResponse.json({ ok: false, error: `prompt over ${PROMPT_MAX} chars` }, { status: 400 });
  }

  const res = await sbFetch(`events`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      kind: "console-prompt",
      payload: { text, from: "admin-console", sent_at: new Date().toISOString() },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { ok: false, error: `Supabase insert failed (${res.status})`, detail: detail.slice(0, 200) },
      { status: 502 }
    );
  }
  const rows = (await res.json()) as Array<{ id: string | number }>;
  return NextResponse.json({ ok: true, id: rows[0]?.id ?? null });
}
