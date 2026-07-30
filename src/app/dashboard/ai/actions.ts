"use server";

/**
 * Server actions for /dashboard/ai — the backend control surface for the radar.
 *
 * What these DO: move an item between rings, add a new item, and queue a
 * Jack-tap card for an integration. All three are reversible filesystem writes
 * against `public/data/ops/tech-radar.json` and the Telegram outbox, and all
 * three audit-log.
 *
 * What these deliberately DO NOT do (CLAUDE.md prime directives): install
 * anything, touch credentials, call Stripe/Resend, hit an external API, or
 * push to git. "Direct control" here means control of the DECISION record —
 * the radar is what gates the weekly scan, so changing a ring is the real
 * lever. Executing the integration stays a Jack tap.
 *
 * A write here also changes a file the `tech-radar` loop gate watches, which
 * is what makes that loop score as productive instead of auto-pausing.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/skills/audit-log-generator";
import {
  RADAR_RINGS,
  applyAddItem,
  applyRingMove,
  findRadarItem,
  itemSlug,
  radarSlug,
  validateRingMove,
  vaultMirrorLine,
  type RadarEffort,
  type RadarRing,
} from "@/lib/tech-radar";
import { readRadar, writeRadar } from "@/lib/tech-radar-store";

const OUTBOX = path.join(homedir(), "Documents/businesses/_shared/telegram/outbox");
const VAULT_RADAR = path.join(
  homedir(),
  "Claude/Projects/DAY14/Obsidian-Vault/Tech Radar.md"
);

function isRing(value: string): value is RadarRing {
  return (RADAR_RINGS as readonly string[]).includes(value);
}

/**
 * Move an item to a different ring. Rejected unless the radar's own rules pass:
 * evidence recorded, Hold exits cite something dated, Adopt has a full week in
 * production behind it.
 */
export async function moveRing(
  slug: string,
  to: string,
  evidence: string
): Promise<{ ok: boolean; message: string; mirrorLine?: string }> {
  if (!isRing(to)) return { ok: false, message: `Unknown ring: ${to}` };

  const radar = await readRadar();
  if (!radar) return { ok: false, message: "tech-radar.json is missing or unparseable." };

  const found = findRadarItem(radar, slug);
  if (!found) return { ok: false, message: `No radar item with slug: ${slug}` };

  const check = validateRingMove(found.item, found.ring, to, evidence);
  if (!check.ok) {
    return {
      ok: false,
      message: check.rule ? `Rule ${check.rule}: ${check.error}` : (check.error ?? "Rejected."),
    };
  }

  const { radar: next, entry } = applyRingMove(
    radar,
    slug,
    to,
    evidence,
    "jack@day14 via dashboard"
  );

  try {
    await writeRadar(next);
  } catch (err) {
    return {
      ok: false,
      message: `Write failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  await auditLog({
    action: "tech_radar_ring_moved",
    actor: "jack@day14",
    actor_source: "dashboard",
    details: {
      item: entry.item,
      from: entry.from,
      to: entry.to,
      evidence: entry.evidence,
    },
  });

  revalidatePath("/dashboard/ai");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: `${entry.note}. The vault note is the human source of truth — paste the line below into ${path.basename(VAULT_RADAR)}.`,
    mirrorLine: vaultMirrorLine(entry),
  };
}

/**
 * Add a new item. Refuses anything already on the radar in any ring — that is
 * the delta baseline doing its job, not an error to work around.
 */
export async function addRadarItem(
  name: string,
  ring: string,
  rationale: string,
  nextAction: string,
  effort: string
): Promise<{ ok: boolean; message: string; mirrorLine?: string }> {
  if (!isRing(ring)) return { ok: false, message: `Unknown ring: ${ring}` };
  const trimmedName = name.trim();
  if (trimmedName.length < 3) return { ok: false, message: "Give the item a name." };
  if (rationale.trim().length < 40) {
    return {
      ok: false,
      message: "Write at least 40 characters of rationale — what Day14 decision does this change?",
    };
  }
  if (ring === "adopt") {
    return {
      ok: false,
      message:
        "Nothing enters at Adopt. Rule 1: a week running in production first. Add it to Trial and move it when the window closes.",
    };
  }

  const radar = await readRadar();
  if (!radar) return { ok: false, message: "tech-radar.json is missing or unparseable." };

  const effortValue: RadarEffort | undefined = (
    ["minutes", "hours", "days", "weeks"] as const
  ).includes(effort as RadarEffort)
    ? (effort as RadarEffort)
    : undefined;

  try {
    const { radar: next, entry } = applyAddItem(
      radar,
      {
        item: trimmedName,
        slug: radarSlug(trimmedName),
        ...(ring === "hold"
          ? { reason: rationale.trim() }
          : { why: rationale.trim() }),
        ...(nextAction.trim() ? { next_action: nextAction.trim() } : {}),
        ...(effortValue ? { effort: effortValue } : {}),
        in_production_since: null,
      },
      ring,
      "jack@day14 via dashboard"
    );
    await writeRadar(next);

    await auditLog({
      action: "tech_radar_item_added",
      actor: "jack@day14",
      actor_source: "dashboard",
      details: { item: trimmedName, ring, rationale: rationale.trim() },
    });

    revalidatePath("/dashboard/ai");
    return {
      ok: true,
      message: `Added "${trimmedName}" to ${ring}.`,
      mirrorLine: vaultMirrorLine(entry),
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Queue a Telegram Jack-tap card for an integration's next action.
 *
 * This is the honest edge of "direct control": the dashboard cannot install
 * Ollama, arm a Healthchecks ping, or clear a Stripe restriction. It can put
 * the exact next step in front of Jack with the context attached.
 */
export async function queueIntegrationTap(
  slug: string
): Promise<{ ok: boolean; message: string }> {
  const radar = await readRadar();
  if (!radar) return { ok: false, message: "tech-radar.json is missing or unparseable." };

  const found = findRadarItem(radar, slug);
  if (!found) return { ok: false, message: `No radar item with slug: ${slug}` };
  const { item, ring } = found;
  if (!item.next_action) {
    return { ok: false, message: `"${item.item}" has no next action recorded.` };
  }

  const text =
    `🧭 *Radar integration* — ${item.item}\n\n` +
    `Ring: ${ring}${item.effort ? ` · effort: ${item.effort}` : ""}\n` +
    (item.capability ? `Capability: ${item.capability}\n` : "") +
    `\n*Next action:*\n${item.next_action}\n` +
    (item.blocked_by ? `\n⚠️ Blocked by: ${item.blocked_by}\n` : "") +
    (item.status ? `\nStatus: ${item.status}\n` : "") +
    `\nQueued from /dashboard/ai. Nothing has been executed.`;

  try {
    await fs.mkdir(OUTBOX, { recursive: true });
    const filename = `${Date.now()}-radar-${itemSlug(item).slice(0, 32)}.json`;
    await fs.writeFile(
      path.join(OUTBOX, filename),
      JSON.stringify(
        {
          text,
          urgency: item.blocked_by ? "P2" : "P1",
          queued_at: new Date().toISOString(),
          sent_at: null,
          chat_id: process.env.TELEGRAM_CHAT_ID || null,
          tap_required: true,
          source: "dashboard/ai",
        },
        null,
        2
      ),
      "utf8"
    );

    await auditLog({
      action: "radar_integration_queued",
      actor: "jack@day14",
      actor_source: "dashboard",
      details: { item: item.item, ring, next_action: item.next_action },
    });

    revalidatePath("/dashboard/ai");
    return { ok: true, message: `Queued a tap card for "${item.item}".` };
  } catch (err) {
    return {
      ok: false,
      message: `Failed to queue: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
