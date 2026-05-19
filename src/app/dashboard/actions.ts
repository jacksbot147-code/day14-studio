"use server";

/**
 * Server actions for the empire dashboard.
 *
 * Each action is single-tap: promote a draft, archive it, mark a
 * Telegram card sent, dismiss an item. All actions audit-log + update
 * filesystem state.
 *
 * Actions intentionally do NOT push to git or make external API calls —
 * those need explicit Jack-tap via Telegram. These are reversible filesystem ops.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/skills/audit-log-generator";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const SEEDS = path.join(HOME, "Documents/studio/docs/seeds/skills");
const DRAFTS = path.join(SEEDS, "_drafts");
const META_DRAFTS = path.join(DRAFTS, "_meta");
const ARCHIVED = path.join(SEEDS, "_archived");

export interface ActionResult {
  ok: boolean;
  message: string;
  artifacts?: string[];
}

/**
 * Promote a draft from _drafts/{name}/ to seeds/skills/{name}/.
 * The skill becomes part of the empire.
 */
export async function promoteDraft(
  draftName: string,
  isMeta: boolean = false
): Promise<ActionResult> {
  const sourceDir = isMeta
    ? path.join(META_DRAFTS, draftName)
    : path.join(DRAFTS, draftName);
  const targetDir = path.join(SEEDS, draftName);

  if (!existsSync(sourceDir)) {
    return { ok: false, message: `Draft not found: ${draftName}` };
  }
  if (existsSync(targetDir)) {
    return {
      ok: false,
      message: `Target already exists: skills/${draftName}/`,
    };
  }

  try {
    await fs.rename(sourceDir, targetDir);

    // Strip "AUTO-DRAFT" header lines from SKILL.md
    const skillPath = path.join(targetDir, "SKILL.md");
    if (existsSync(skillPath)) {
      let text = await fs.readFile(skillPath, "utf8");
      text = text.replace(/\nstatus: (draft|meta-draft)\n/, "\n");
      text = text.replace(/\nauto_generated_at: .+\n/, "\n");
      await fs.writeFile(skillPath, text, "utf8");
    }

    await auditLog({
      action: "draft_promoted",
      actor: "jack@day14",
      details: { draft_name: draftName, is_meta: isMeta },
      skill_invoked: "draft-promoter",
      actor_source: "dashboard",
    });

    revalidatePath("/dashboard");
    return {
      ok: true,
      message: `Promoted ${draftName} to seeds/skills/`,
      artifacts: [targetDir],
    };
  } catch (err) {
    return {
      ok: false,
      message: `Failed to promote: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Archive a draft (move to _archived/). Reversible.
 */
export async function archiveDraft(
  draftName: string,
  isMeta: boolean = false,
  reason?: string
): Promise<ActionResult> {
  const sourceDir = isMeta
    ? path.join(META_DRAFTS, draftName)
    : path.join(DRAFTS, draftName);

  if (!existsSync(sourceDir)) {
    return { ok: false, message: `Draft not found: ${draftName}` };
  }

  try {
    await fs.mkdir(ARCHIVED, { recursive: true });
    const targetDir = path.join(ARCHIVED, `${draftName}-${Date.now()}`);
    await fs.rename(sourceDir, targetDir);

    // Write a tombstone with the archive reason
    await fs.writeFile(
      path.join(targetDir, "_archive-reason.txt"),
      `Archived: ${new Date().toISOString()}\nReason: ${reason || "no reason given"}\n`,
      "utf8"
    );

    await auditLog({
      action: "draft_archived",
      actor: "jack@day14",
      details: { draft_name: draftName, is_meta: isMeta, reason: reason || null },
      skill_invoked: "skill-deprecation-flagger",
      actor_source: "dashboard",
    });

    revalidatePath("/dashboard");
    return { ok: true, message: `Archived ${draftName}`, artifacts: [targetDir] };
  } catch (err) {
    return {
      ok: false,
      message: `Failed to archive: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Mark a Telegram outbox card as sent (without actually sending).
 * Useful for dismissing stale cards or marking ones sent manually.
 */
export async function markCardSent(filename: string): Promise<ActionResult> {
  const filepath = path.join(SHARED, "telegram/outbox", filename);
  if (!existsSync(filepath)) {
    return { ok: false, message: `Card not found: ${filename}` };
  }
  try {
    const text = await fs.readFile(filepath, "utf8");
    const data = JSON.parse(text);
    data.sent_at = new Date().toISOString();
    data.sent_via = "dashboard-manual";
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf8");

    await auditLog({
      action: "telegram_card_marked_sent",
      actor: "jack@day14",
      details: { filename, urgency: data.urgency },
      actor_source: "dashboard",
    });

    revalidatePath("/dashboard");
    return { ok: true, message: `Marked ${filename} sent` };
  } catch (err) {
    return {
      ok: false,
      message: `Failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Dismiss (delete) a Telegram outbox card. Different from mark-sent —
 * this removes the card entirely. Use when the card became stale/irrelevant.
 */
export async function dismissCard(filename: string): Promise<ActionResult> {
  const filepath = path.join(SHARED, "telegram/outbox", filename);
  if (!existsSync(filepath)) {
    return { ok: false, message: `Card not found: ${filename}` };
  }
  try {
    // Move to archive instead of deleting — reversible
    const archiveDir = path.join(SHARED, "telegram/outbox-archive");
    await fs.mkdir(archiveDir, { recursive: true });
    await fs.rename(filepath, path.join(archiveDir, filename));

    await auditLog({
      action: "telegram_card_dismissed",
      actor: "jack@day14",
      details: { filename },
      actor_source: "dashboard",
    });

    revalidatePath("/dashboard");
    return { ok: true, message: `Dismissed ${filename}` };
  } catch (err) {
    return {
      ok: false,
      message: `Failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Reset the meta-growth circuit breaker. Single-tap recovery.
 */
export async function resetMetaCircuit(): Promise<ActionResult> {
  const circuitPath = path.join(SHARED, "growth/meta-circuit-state.json");
  try {
    await fs.writeFile(
      circuitPath,
      JSON.stringify(
        {
          open: false,
          since: null,
          reason: null,
          drafts_in_flight: 0,
          reset_at: new Date().toISOString(),
          reset_by: "jack@day14 via dashboard",
        },
        null,
        2
      )
    );

    await auditLog({
      action: "meta_circuit_reset",
      actor: "jack@day14",
      actor_source: "dashboard",
    });

    revalidatePath("/dashboard");
    return { ok: true, message: "Meta-circuit reset to closed" };
  } catch (err) {
    return {
      ok: false,
      message: `Failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Log an energy check-in from the dashboard. Faster than via Telegram.
 */
export async function logEnergyCheckin(
  energy: number,
  mood: number,
  note?: string
): Promise<ActionResult> {
  const founderDir = path.join(SHARED, "founder-ops");
  await fs.mkdir(founderDir, { recursive: true });
  const logPath = path.join(founderDir, "energy-log.jsonl");

  const entry = {
    date: new Date().toISOString().slice(0, 10),
    energy,
    mood,
    note: note || "",
    timestamp: new Date().toISOString(),
  };

  try {
    await fs.appendFile(logPath, JSON.stringify(entry) + "\n", "utf8");
    revalidatePath("/dashboard");
    return { ok: true, message: `Logged: ${energy}/10 energy, ${mood}/5 mood` };
  } catch (err) {
    return {
      ok: false,
      message: `Failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
