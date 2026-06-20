/**
 * subscription-pause-handler — hand-coded impl.
 *
 * Pauses a customer subscription for 30 days (max). Updates dossier,
 * schedules reactivation prompt at day 28, audit-logs.
 *
 * The actual Stripe pause call queues for Jack-tap to avoid accidental
 * cross-charges — but most pauses auto-approve (low-risk, reversible).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const SHARED = path.join(homedir(), "Documents/businesses/_shared");
const CUSTOMERS = path.join(SHARED, "customers");
const TG_OUTBOX = path.join(SHARED, "telegram/outbox");

interface PauseRequest {
  customer_slug: string;
  reason: string;
  pause_duration_days?: number; // default + max: 30
}

interface CustomerSnapshot {
  slug: string;
  pause_history?: Array<{ paused_at: string; resumed_at?: string }>;
  current_mrr?: number;
  monthly_amount?: number; // the canonical 01-brand.json field (see CLAUDE.md)
  stripe_subscription_id?: string;
  email?: string;
  status?: "active" | "paused" | "churned";
}

/** 01-brand.json carries `monthly_amount`; some snapshots use `current_mrr`. */
function customerMrr(customer: CustomerSnapshot): number {
  return customer.current_mrr ?? customer.monthly_amount ?? 0;
}

async function loadCustomer(slug: string): Promise<CustomerSnapshot | null> {
  const brandPath = path.join(CUSTOMERS, slug, "01-brand.json");
  if (!existsSync(brandPath)) return null;
  try {
    const brand = JSON.parse(await fs.readFile(brandPath, "utf8")) as Partial<CustomerSnapshot>;
    return { slug, ...brand };
  } catch {
    return null;
  }
}

function pausesIn12Months(history: CustomerSnapshot["pause_history"]): number {
  if (!history) return 0;
  const yearAgo = Date.now() - 365 * 86400000;
  return history.filter((p) => {
    const t = new Date(p?.paused_at ?? "").getTime();
    // An unparseable paused_at is still a pause that happened — count it
    // toward the policy floor instead of silently dropping it. Erring toward
    // blocking an extra pause is the safe side of spec hard rule 5.
    if (!Number.isFinite(t)) return true;
    return t > yearAgo;
  }).length;
}

async function writeStatusUpdate(
  customer: CustomerSnapshot,
  pauseUntil: Date
): Promise<string> {
  const dossierDir = path.join(CUSTOMERS, customer.slug);
  await fs.mkdir(dossierDir, { recursive: true });
  const statusPath = path.join(dossierDir, "02-status.md");

  const entry = `\n## Paused at ${new Date().toISOString()}\n\n- Pause until: ${pauseUntil.toISOString()}\n- MRR deferred: $${customerMrr(customer)}\n- Reactivation prompt scheduled: ${new Date(pauseUntil.getTime() - 2 * 86400000).toISOString()}\n`;

  if (existsSync(statusPath)) {
    await fs.appendFile(statusPath, entry, "utf8");
  } else {
    await fs.writeFile(
      statusPath,
      `# Status — ${customer.slug}\n\nstatus: paused\n${entry}`,
      "utf8"
    );
  }
  return statusPath;
}

async function queuePauseConfirmationCard(
  customer: CustomerSnapshot,
  pauseUntil: Date,
  req: PauseRequest
): Promise<string> {
  await fs.mkdir(TG_OUTBOX, { recursive: true });
  const filename = `${Date.now()}-pause-confirm-${customer.slug}.json`;
  const filepath = path.join(TG_OUTBOX, filename);

  const resumeDate = pauseUntil.toISOString().slice(0, 10);
  const text = `⏸ *Pause subscription* — ${customer.slug}\n\nReason: "${req.reason}"\nPause until: ${resumeDate}\nAuto-resumes (never auto-cancels) on ${resumeDate} — billing restarts then.\nMRR deferred: $${customerMrr(customer)}\n\nConfirm? Site stays UP during pause.`;

  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        text,
        urgency: "P2",
        queued_at: new Date().toISOString(),
        sent_at: null,
        chat_id: process.env.TELEGRAM_CHAT_ID || null,
        tap_required: true,
        action: "execute_pause",
        payload: {
          customer_slug: customer.slug,
          stripe_subscription_id: customer.stripe_subscription_id,
          pause_until: pauseUntil.toISOString(),
        },
      },
      null,
      2
    )
  );
  return filename;
}

/**
 * Spec failure mode: a customer pausing a 3rd time in 12 months converts to
 * cancel + win-back rather than another pause. Queue a real Jack-tap card so
 * the conversion actually happens (previously this path queued nothing).
 */
async function queueCancelWinbackCard(
  customer: CustomerSnapshot,
  req: PauseRequest,
  recentPauses: number
): Promise<string> {
  await fs.mkdir(TG_OUTBOX, { recursive: true });
  const filename = `${Date.now()}-pause-to-cancel-${customer.slug}.json`;
  const filepath = path.join(TG_OUTBOX, filename);

  const text = `🛑 *Pause limit hit* — ${customer.slug}\n\n${recentPauses} pauses in the last 12 months; spec floor is 2. Per policy this converts to *cancel + win-back* rather than a ${recentPauses + 1}th pause.\n\nReason given: "${req.reason}"\nMRR at stake: $${customerMrr(customer)}\n\nApprove cancel-with-win-back?`;

  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        text,
        urgency: "P2",
        queued_at: new Date().toISOString(),
        sent_at: null,
        chat_id: process.env.TELEGRAM_CHAT_ID || null,
        tap_required: true,
        action: "convert_pause_to_cancel_winback",
        payload: {
          customer_slug: customer.slug,
          stripe_subscription_id: customer.stripe_subscription_id,
          recent_pauses_12mo: recentPauses,
          reason: req.reason,
        },
      },
      null,
      2
    )
  );
  return filename;
}

export async function processPause(req: PauseRequest): Promise<{
  ok: boolean;
  pause_until?: Date;
  artifacts: string[];
  jack_tap_required: boolean;
  error?: string;
  warning?: string;
  next_actions?: string[];
}> {
  const customer = await loadCustomer(req.customer_slug);
  if (!customer) {
    return {
      ok: false,
      artifacts: [],
      jack_tap_required: false,
      error: `customer not found: ${req.customer_slug}`,
    };
  }

  if (customer.status === "paused") {
    return {
      ok: false,
      artifacts: [],
      jack_tap_required: false,
      error: "customer already paused — use resume flow instead",
    };
  }

  const recentPauses = pausesIn12Months(customer.pause_history);
  if (recentPauses >= 2) {
    // Spec failure mode: "Customer pauses 3rd time in 12 months → convert to
    // cancel + offer win-back." Queue a real Jack-tap card, schedule the
    // win-back, and audit-log the policy decision (CLAUDE.md rule 5).
    let cardArtifact: string[] = [];
    try {
      const cardFile = await queueCancelWinbackCard(customer, req, recentPauses);
      cardArtifact = [path.join(TG_OUTBOX, cardFile)];
    } catch (err) {
      return {
        ok: false,
        artifacts: [],
        jack_tap_required: true,
        error: `pause-limit conversion failed to queue: ${(err as Error).message}`,
        warning: "policy floor breached",
      };
    }
    await auditLog({
      action: "pause_blocked_converted_to_cancel",
      actor: "automated:subscription-pause-handler",
      customer_slug: customer.slug,
      details: {
        reason: req.reason,
        recent_pauses_12mo: recentPauses,
        mrr_at_stake: customerMrr(customer),
      },
      skill_invoked: "subscription-pause-handler",
      actor_source: "skill-runner",
    });
    const winBack = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .slice(0, 10);
    return {
      ok: false,
      artifacts: cardArtifact,
      jack_tap_required: true,
      error: `pause #${recentPauses + 1} in 12 months — converting to cancel-with-win-back per policy`,
      warning: "policy floor breached",
      next_actions: [
        `trigger win-back-campaign-trigger for ${customer.slug} on ${winBack}`,
      ],
    };
  }

  // Guard non-finite inputs (NaN/Infinity) — otherwise a bad duration yields
  // an Invalid Date that flows straight into the status file and Jack-tap card.
  const requested = req.pause_duration_days;
  const safeRequested = Number.isFinite(requested) ? (requested as number) : 30;
  const duration = Math.min(Math.max(safeRequested, 1), 30);
  const pauseUntil = new Date(Date.now() + duration * 86400000);

  let statusPath: string;
  let cardFile: string;
  try {
    statusPath = await writeStatusUpdate(customer, pauseUntil);
    cardFile = await queuePauseConfirmationCard(customer, pauseUntil, req);
  } catch (err) {
    return {
      ok: false,
      artifacts: [],
      jack_tap_required: false,
      error: `pause side-effects failed: ${(err as Error).message}`,
    };
  }

  await auditLog({
    action: "pause_requested",
    actor: "automated:subscription-pause-handler",
    customer_slug: customer.slug,
    details: {
      reason: req.reason,
      duration_days: duration,
      pause_until: pauseUntil.toISOString(),
      mrr_deferred: customerMrr(customer),
    },
    skill_invoked: "subscription-pause-handler",
    actor_source: "skill-runner",
  });

  return {
    ok: true,
    pause_until: pauseUntil,
    artifacts: [statusPath, path.join(TG_OUTBOX, cardFile)],
    jack_tap_required: true,
  };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<PauseRequest> | undefined;
  if (!inputs?.customer_slug || !inputs.reason) {
    return {
      ok: false,
      skill: "subscription-pause-handler",
      path: "hand-coded",
      error: "missing required inputs: customer_slug + reason",
    };
  }
  const result = await processPause({
    customer_slug: inputs.customer_slug,
    reason: inputs.reason,
    pause_duration_days: inputs.pause_duration_days,
  });
  return {
    ok: result.ok,
    skill: "subscription-pause-handler",
    path: "hand-coded",
    result: { pause_until: result.pause_until },
    artifacts: result.artifacts,
    jack_tap_required: result.jack_tap_required,
    next_actions: result.next_actions,
    error: result.error || result.warning,
  };
}
