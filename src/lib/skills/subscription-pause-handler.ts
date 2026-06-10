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
  return history.filter(
    (p) => new Date(p.paused_at).getTime() > yearAgo
  ).length;
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

  const text = `⏸ *Pause subscription* — ${customer.slug}\n\nReason: "${req.reason}"\nPause until: ${pauseUntil.toISOString().slice(0, 10)}\nMRR deferred: $${customerMrr(customer)}\n\nConfirm? Site stays UP during pause.`;

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

export async function processPause(req: PauseRequest): Promise<{
  ok: boolean;
  pause_until?: Date;
  artifacts: string[];
  jack_tap_required: boolean;
  error?: string;
  warning?: string;
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
    return {
      ok: false,
      artifacts: [],
      jack_tap_required: true,
      error: `3rd pause in 12 months — convert to cancel-with-winback instead`,
      warning: "policy floor breached",
    };
  }

  const duration = Math.min(Math.max(req.pause_duration_days ?? 30, 1), 30);
  const pauseUntil = new Date(Date.now() + duration * 86400000);

  const statusPath = await writeStatusUpdate(customer, pauseUntil);
  const cardFile = await queuePauseConfirmationCard(customer, pauseUntil, req);

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
    error: result.error || result.warning,
  };
}
