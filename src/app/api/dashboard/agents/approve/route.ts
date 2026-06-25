import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { auditLog } from "@/lib/skills/audit-log-generator";

/**
 * POST /api/dashboard/agents/approve
 *
 * The write side of the Agent Command Deck's tap queue. Unlike the existing
 * /api/admin/approvals route, EVERY action here is recorded through the
 * hash-chained audit log first (auditLog), then performed — so the deck's
 * promise ("one-tap approve/deny that writes back through the audit log")
 * holds literally.
 *
 * Scope is deliberately narrow + safe:
 *   - kind "todo" : flip an operator-todo (approve→done / deny→dismissed) and
 *                   mirror it out of the empire-state snapshot. Same convention
 *                   as /api/admin/approvals, re-implemented here so the live
 *                   route is untouched.
 *   - kind "tap"  : resolve a Telegram-outbox jack-tap file (clears it from the
 *                   awaiting queue + records Jack's decision). It does NOT
 *                   auto-execute the tap's proposed action — irreversible work
 *                   still runs by the agent/Jack, never by a dashboard click.
 *
 * Body: { kind: "todo" | "tap", id: string, action: "approve" | "deny" }
 * Local-only (returns 503 on the hosted copy where businesses data is absent).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const STUDIO = path.join(HOME, "Documents/studio");
const TODOS_FILE = path.join(SHARED, "operator-todos.json");
const OUTBOX = path.join(SHARED, "telegram/outbox");

const KINDS = ["todo", "tap"] as const;
type Kind = (typeof KINDS)[number];
const ACTIONS = ["approve", "deny"] as const;
type Action = (typeof ACTIONS)[number];

type Result = { ok: boolean; message: string };

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Allow a single outbox filename like `1718900000-jack-tap.json`. */
function isSafeFile(s: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(s) && !s.includes("..") && !s.includes("/");
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

interface TodoStore {
  todos: Array<{ id: string; seq: number; title: string; status: string; completed_at: string | null; [k: string]: unknown }>;
  [k: string]: unknown;
}

async function handleTodo(id: string, action: Action): Promise<Result> {
  if (!existsSync(TODOS_FILE)) return { ok: false, message: "operator to-do list unavailable" };
  const store = await readJson<TodoStore>(TODOS_FILE);
  if (!store || !Array.isArray(store.todos)) return { ok: false, message: "could not read to-do list" };
  const n = parseInt(String(id).replace(/[^0-9]/g, ""), 10);
  const todo =
    store.todos.find((t) => t.id === id) ||
    (Number.isNaN(n) ? undefined : store.todos.find((t) => t.seq === n));
  if (!todo) return { ok: false, message: `no to-do matching: ${id}` };

  todo.status = action === "approve" ? "done" : "dismissed";
  todo.completed_at = new Date().toISOString();
  try {
    await fs.writeFile(TODOS_FILE, JSON.stringify(store, null, 2));
  } catch {
    return { ok: false, message: "could not save the to-do list" };
  }

  // Best-effort mirror out of the snapshot the deck reads.
  try {
    const snapPath = path.join(STUDIO, "public/data/empire-state.json");
    if (existsSync(snapPath)) {
      const snap = await readJson<{ human_todos?: Array<{ id: string }> }>(snapPath);
      if (snap && Array.isArray(snap.human_todos)) {
        snap.human_todos = snap.human_todos.filter((t) => t.id !== todo.id);
        await fs.writeFile(snapPath, JSON.stringify(snap, null, 2));
      }
    }
  } catch {
    /* sync-empire-state reconciles later */
  }

  return {
    ok: true,
    message: action === "approve" ? `Marked done: ${todo.title}` : `Dismissed: ${todo.title}`,
  };
}

async function handleTap(id: string, action: Action): Promise<Result> {
  if (!isSafeFile(id)) return { ok: false, message: "invalid tap id" };
  const filePath = path.join(OUTBOX, id);
  if (!existsSync(filePath)) return { ok: false, message: `no tap file: ${id}` };
  const data = await readJson<Record<string, unknown>>(filePath);
  if (!data) return { ok: false, message: "could not read the tap" };
  data.tap_required = false;
  data.resolved_at = new Date().toISOString();
  data.resolved_action = action;
  data.resolved_by = "jack-deck";
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch {
    return { ok: false, message: "could not save the tap" };
  }
  return {
    ok: true,
    message:
      action === "approve"
        ? "Tap approved — decision recorded; the agent acts on it"
        : "Tap dismissed — cleared from your queue",
  };
}

export async function POST(req: NextRequest) {
  // Same admin gate the dashboard write routes use.
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
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

  if (!KINDS.includes(kind as Kind)) return NextResponse.json({ ok: false, error: "unknown kind" }, { status: 400 });
  if (!ACTIONS.includes(action as Action)) return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  if (!existsSync(BIZ)) {
    return NextResponse.json(
      { ok: false, error: "command deck is local-only — this is the hosted dashboard" },
      { status: 503 }
    );
  }

  // Audit FIRST — the decision is recorded whether or not the mutation succeeds.
  try {
    await auditLog({
      action: "deck_tap_decision",
      actor: "jack@day14",
      actor_source: "cowork",
      details: { kind, id, decision: action },
    });
  } catch {
    /* never block the action on an audit hiccup, but it's best-effort logged */
  }

  let result: Result;
  try {
    result = kind === "todo" ? await handleTodo(id, action as Action) : await handleTap(id, action as Action);
  } catch {
    return NextResponse.json({ ok: false, error: "could not complete the action" }, { status: 500 });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
