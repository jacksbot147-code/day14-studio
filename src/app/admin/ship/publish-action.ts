"use server";

/**
 * /admin/ship pre-publish slop gate — server actions.
 *
 * Pure server-side flow (no client state):
 *
 *   1. The user pastes content into the form on /admin/ship and submits with
 *      intent="preview" — `checkSlopAction` runs `stripSlop()`, writes a
 *      snapshot to a tmp dir, sets a short-lived cookie pointing at the
 *      snapshot, then redirects back to the page. The page re-renders and
 *      reads the snapshot to show the removed phrases.
 *
 *   2. The user submits with intent="publish" (after ticking the override
 *      checkbox if more than 5 phrases were removed). `checkSlopAction`
 *      re-runs `stripSlop()`, blocks the publish if removals > 5 without
 *      override, and otherwise writes the cleaned content to the day14
 *      inbox as a publish-queue card (inbox-only — never touches a live
 *      surface).
 *
 * Per task constraints: inbox-only, never delete, never push.
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { stripSlop, totalRemoved } from "@/lib/skills/stop-slop";

/** Phrase-removal threshold above which we hard-gate the publish. */
export const SLOP_GATE_THRESHOLD = 5;

/** Cookie name pointing at the latest preview snapshot for this admin tab. */
const PREVIEW_COOKIE = "ship_slop_preview";

/** Snapshots live in the OS tmp dir so they never get committed to git. */
const PREVIEW_DIR = path.join(os.tmpdir(), "day14-ship-slop-previews");

/** Inbox destination for publish-queue cards (constraint: inbox-only). */
const PUBLISH_INBOX_DIR = path.join(
  os.homedir(),
  "Documents/businesses/day14/inbox/publish-queue",
);

export interface SlopPreviewSnapshot {
  id: string;
  ts: string;
  intent: "preview" | "publish";
  /** The original content the user pasted in. */
  original: string;
  /** The stripSlop-cleaned content. */
  cleaned: string;
  /** Per-phrase removal counts, sorted by count desc. */
  removed: { phrase: string; count: number }[];
  /** Total phrase-instances removed (sum of removed[].count). */
  totalRemoved: number;
  /** Whether the user ticked the "I've reviewed slop removals" override. */
  override: boolean;
  /**
   * Whether the gate blocked the publish. True when intent="publish" AND
   * totalRemoved > SLOP_GATE_THRESHOLD AND override is false.
   */
  blocked: boolean;
  /**
   * Absolute path of the queued publish card if the publish was accepted,
   * null otherwise. (Path is server-internal — for the work-log evidence
   * trail.)
   */
  publishedTo: string | null;
}

function snapshotPath(id: string): string {
  // Defensive: only allow hex / dashes from crypto.randomUUID — never let a
  // user-supplied id traverse the tmp dir.
  if (!/^[a-f0-9-]+$/i.test(id)) {
    throw new Error("Invalid preview id");
  }
  return path.join(PREVIEW_DIR, `${id}.json`);
}

/**
 * Read the snapshot the current preview cookie points at, if any. Called
 * from the server-component page render. Returns null when there's no
 * cookie, the cookie is stale, or the file no longer exists.
 */
export async function readCurrentPreview(): Promise<SlopPreviewSnapshot | null> {
  const id = cookies().get(PREVIEW_COOKIE)?.value;
  if (!id) return null;
  if (!/^[a-f0-9-]+$/i.test(id)) return null;
  try {
    const raw = await fs.readFile(snapshotPath(id), "utf8");
    const parsed = JSON.parse(raw) as SlopPreviewSnapshot;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Server action wired to the slop-gate form on /admin/ship.
 *
 *   intent=preview   → just run stripSlop and stash the result
 *   intent=publish   → require override if totalRemoved > THRESHOLD, write
 *                      the cleaned content to the publish-queue inbox
 *
 * Either path ends in a redirect back to /admin/ship#publish-gate so the
 * page re-renders with the new snapshot visible.
 */
export async function checkSlopAction(formData: FormData): Promise<void> {
  const content = String(formData.get("content") ?? "");
  const override = formData.get("override") === "on";
  const intentRaw = String(formData.get("intent") ?? "preview");
  const intent: "preview" | "publish" =
    intentRaw === "publish" ? "publish" : "preview";

  const { cleaned, removed } = stripSlop(content);
  const total = totalRemoved(removed);
  const blocked = intent === "publish" && total > SLOP_GATE_THRESHOLD && !override;

  let publishedTo: string | null = null;
  if (intent === "publish" && !blocked && content.trim().length > 0) {
    await fs.mkdir(PUBLISH_INBOX_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    publishedTo = path.join(PUBLISH_INBOX_DIR, `publish-${ts}.md`);
    const header =
      `<!-- queued from /admin/ship publish gate at ${new Date().toISOString()} -->\n` +
      `<!-- slop phrases removed: ${total} (${removed.length} distinct) -->\n` +
      (override
        ? `<!-- override checkbox: ticked -->\n`
        : `<!-- override checkbox: not required (under threshold) -->\n`);
    await fs.writeFile(publishedTo, header + cleaned, "utf8");
  }

  const id = crypto.randomUUID();
  const snapshot: SlopPreviewSnapshot = {
    id,
    ts: new Date().toISOString(),
    intent,
    original: content,
    cleaned,
    removed,
    totalRemoved: total,
    override,
    blocked,
    publishedTo,
  };
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  await fs.writeFile(snapshotPath(id), JSON.stringify(snapshot, null, 2), "utf8");

  cookies().set(PREVIEW_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/admin/ship",
    // 15 minutes is plenty for a paste-review-publish loop.
    maxAge: 15 * 60,
  });

  redirect("/admin/ship#publish-gate");
}
