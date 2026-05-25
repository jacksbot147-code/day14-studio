import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

/**
 * POST /api/admin/approvals
 *
 * The write side of the unified Approvals queue (/admin/inbox). Every kind of
 * thing that needs Jack — open operator to-dos, queued social posts, skill
 * drafts, expansion requests, opportunity pitches — is approved or skipped
 * from one screen, so nothing is lost even when the Telegram bridge is down.
 *
 * This deliberately reuses the EXACT state conventions the existing systems
 * already use, so a Telegram action and a dashboard action are interchangeable:
 *   - operator to-do  → operator-todos.json: status "open" -> "done" (+ mirror
 *                       into the empire-state.json snapshot the page reads)
 *   - social post     → social-queue JSON: status "queued" -> "approved" /
 *                       "skipped" (same fields approval-handler.mjs writes)
 *   - skill draft     → docs/seeds/skills/_drafts/<name> moved to live, or
 *                       removed — same as approveSkill/skipSkill
 *   - expansion req   → expansion-requests JSON: status "pending" -> "approved"
 *                       / "dismissed"
 *   - opportunity     → _shared/opportunities/<id>.json: status -> "approved"
 *                       (queued to launch) / "skipped"
 *
 * Like the realty write routes, this only works on the local Mac admin where
 * the businesses data lives — the hosted Vercel copy is view-only by design
 * and returns 503.
 *
 * Body: { kind, id, action }
 *   kind   : "todo" | "social" | "skill" | "expansion" | "opportunity"
 *   id     : the item identifier (see resolveItem per kind)
 *   action : "approve" | "skip"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const STUDIO = path.join(HOME, "Documents/studio");
const TODOS_FILE = path.join(SHARED, "operator-todos.json");
const SKILLS_DIR = path.join(STUDIO, "docs/seeds/skills");
const SKILLS_DRAFTS = path.join(SKILLS_DIR, "_drafts");
const EXPANSION_INBOX = path.join(SHARED, "expansion-requests");
const OPPORTUNITIES = path.join(SHARED, "opportunities");

const KINDS = ["todo", "social", "skill", "expansion", "opportunity"] as const;
type Kind = (typeof KINDS)[number];
const ACTIONS = ["approve", "skip"] as const;
type Action = (typeof ACTIONS)[number];

type Result = { ok: boolean; message: string };

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** A safe, single path segment — blocks traversal in any caller-supplied id. */
function isSafeSegment(s: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(s) && !s.includes("..");
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

// ── todo: mark an operator to-do done (the "done N" convention) ────────────
interface TodoStore {
  schema_version?: number;
  next_seq?: number;
  todos: Array<{
    id: string;
    seq: number;
    title: string;
    status: string;
    completed_at: string | null;
    [k: string]: unknown;
  }>;
}

async function handleTodo(id: string, action: Action): Promise<Result> {
  if (!existsSync(TODOS_FILE)) {
    return { ok: false, message: "operator to-do list unavailable on this host" };
  }
  const store = await readJson<TodoStore>(TODOS_FILE);
  if (!store || !Array.isArray(store.todos)) {
    return { ok: false, message: "could not read the operator to-do list" };
  }
  const n = parseInt(String(id).replace(/[^0-9]/g, ""), 10);
  const todo =
    store.todos.find((t) => t.id === id) ||
    (Number.isNaN(n) ? undefined : store.todos.find((t) => t.seq === n));
  if (!todo) return { ok: false, message: `no to-do matching: ${id}` };

  // "approve" = mark done; "skip" = dismiss. Both retire the item the same way
  // completeTodo does — flip status, stamp completed_at.
  todo.status = action === "approve" ? "done" : "dismissed";
  todo.completed_at = new Date().toISOString();

  try {
    await fs.writeFile(TODOS_FILE, JSON.stringify(store, null, 2));
  } catch {
    return { ok: false, message: "could not save the to-do list" };
  }

  // Mirror into the dashboard snapshot so the queue reflects it on refresh —
  // same best-effort mirror the realty routes use.
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
    /* next sync-empire-state run reconciles the snapshot anyway */
  }

  return {
    ok: true,
    message: action === "approve" ? `Marked done: ${todo.title}` : `Dismissed: ${todo.title}`,
  };
}

// ── social: approve / skip a queued post (approval-handler.mjs convention) ──
async function handleSocial(id: string, action: Action): Promise<Result> {
  if (!existsSync(BIZ)) {
    return { ok: false, message: "social queue unavailable on this host" };
  }
  const tenants = (await fs.readdir(BIZ, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
    .map((d) => d.name);

  for (const t of tenants) {
    const queueRoot = path.join(BIZ, t, "social-queue");
    if (!existsSync(queueRoot)) continue;
    for (const p of await fs.readdir(queueRoot)) {
      const platformDir = path.join(queueRoot, p);
      const files = (await fs.readdir(platformDir).catch(() => [])).filter((f) =>
        f.endsWith(".json")
      );
      for (const f of files) {
        const filePath = path.join(platformDir, f);
        const data = await readJson<{
          id?: string;
          status?: string;
          platform?: string;
          content?: { slug?: string };
        }>(filePath);
        if (!data) continue;
        if (data.id !== id && data.content?.slug !== id) continue;
        // Approve = "approved" (the publisher picks it up). Skip = "skipped".
        data.status = action === "approve" ? "approved" : "skipped";
        const now = new Date().toISOString();
        if (action === "approve") {
          (data as Record<string, unknown>).approved_at = now;
          (data as Record<string, unknown>).approved_by = "jack-admin";
        } else {
          (data as Record<string, unknown>).skipped_at = now;
        }
        try {
          await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        } catch {
          return { ok: false, message: "could not save the queued post" };
        }
        return {
          ok: true,
          message:
            action === "approve"
              ? `Approved post — the publisher will pick it up`
              : `Skipped post`,
        };
      }
    }
  }
  return { ok: false, message: `no queued post matching: ${id}` };
}

// ── skill: approve (move draft -> live) / skip (delete draft) ───────────────
async function handleSkill(id: string, action: Action): Promise<Result> {
  if (!isSafeSegment(id)) return { ok: false, message: "invalid skill name" };
  const draftDir = path.join(SKILLS_DRAFTS, id);
  if (!existsSync(draftDir)) return { ok: false, message: `no skill draft: ${id}` };

  if (action === "skip") {
    try {
      await fs.rm(draftDir, { recursive: true, force: true });
    } catch {
      return { ok: false, message: "could not remove the draft" };
    }
    return { ok: true, message: `Skipped skill draft: ${id}` };
  }

  // approve — same as approveSkill in approval-handler.mjs: move to live.
  const liveDir = path.join(SKILLS_DIR, id);
  if (existsSync(liveDir)) return { ok: false, message: `skill already live: ${id}` };
  try {
    await fs.rename(draftDir, liveDir);
  } catch {
    return { ok: false, message: "could not promote the draft" };
  }
  return {
    ok: true,
    message: `Approved skill ${id} — now live (registry regenerates on next sync)`,
  };
}

// ── expansion: approve / dismiss a pending expansion request ────────────────
async function handleExpansion(id: string, action: Action): Promise<Result> {
  if (!isSafeSegment(id)) return { ok: false, message: "invalid request id" };
  const filePath = path.join(EXPANSION_INBOX, id.endsWith(".json") ? id : `${id}.json`);
  if (!existsSync(filePath)) return { ok: false, message: `no expansion request: ${id}` };
  const data = await readJson<{ status?: string; type?: string }>(filePath);
  if (!data) return { ok: false, message: "could not read the request" };
  data.status = action === "approve" ? "approved" : "dismissed";
  (data as Record<string, unknown>)[action === "approve" ? "approved_at" : "dismissed_at"] =
    new Date().toISOString();
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch {
    return { ok: false, message: "could not save the request" };
  }
  return {
    ok: true,
    message:
      action === "approve"
        ? `Approved — bootstrap can run for this request`
        : `Dismissed expansion request`,
  };
}

// ── opportunity: approve (queue to launch) / skip a pitched opportunity ──────
async function handleOpportunity(id: string, action: Action): Promise<Result> {
  if (!isSafeSegment(id)) return { ok: false, message: "invalid opportunity id" };
  const filePath = path.join(OPPORTUNITIES, `${id}.json`);
  if (!existsSync(filePath)) return { ok: false, message: `no opportunity: ${id}` };
  const data = await readJson<{ status?: string; niche?: string }>(filePath);
  if (!data) return { ok: false, message: "could not read the opportunity" };
  // approve = queued for launch (a human bootstrap-pitch decision); skip = retire.
  data.status = action === "approve" ? "approved" : "skipped";
  (data as Record<string, unknown>)[action === "approve" ? "approved_at" : "skipped_at"] =
    new Date().toISOString();
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch {
    return { ok: false, message: "could not save the opportunity" };
  }
  return {
    ok: true,
    message:
      action === "approve"
        ? `Approved pitch — queued to launch`
        : `Skipped opportunity`,
  };
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

  if (!KINDS.includes(kind as Kind)) {
    return NextResponse.json({ ok: false, error: "unknown kind" }, { status: 400 });
  }
  if (!ACTIONS.includes(action as Action)) {
    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }

  // The businesses data layer only exists on the local Mac admin.
  if (!existsSync(BIZ)) {
    return NextResponse.json(
      { ok: false, error: "approvals queue is local-only — this is the hosted dashboard" },
      { status: 503 }
    );
  }

  let result: Result;
  try {
    switch (kind as Kind) {
      case "todo":
        result = await handleTodo(id, action as Action);
        break;
      case "social":
        result = await handleSocial(id, action as Action);
        break;
      case "skill":
        result = await handleSkill(id, action as Action);
        break;
      case "expansion":
        result = await handleExpansion(id, action as Action);
        break;
      case "opportunity":
        result = await handleOpportunity(id, action as Action);
        break;
      default:
        result = { ok: false, message: "unknown kind" };
    }
  } catch {
    return NextResponse.json({ ok: false, error: "could not complete the action" }, { status: 500 });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
