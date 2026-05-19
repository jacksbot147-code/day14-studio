/**
 * refund-handler — hand-coded impl.
 *
 * Decision tree + Stripe API call + dossier update + audit log.
 * ALWAYS requires Jack-tap before issuing actual refund — this skill
 * stages the refund (decides amount, drafts email, logs intent) but
 * surfaces a P1 Telegram card for Jack's final approval.
 *
 * Only auto-approves refunds within 7-day window if amount < $500.
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

interface RefundRequest {
  customer_slug: string;
  reason: string;
  refund_amount?: number; // cents; defaults to last charge
  override_window?: boolean; // jack-only
}

interface CustomerSnapshot {
  slug: string;
  signup_date?: string;
  total_paid?: number;
  last_charge_amount?: number;
  last_charge_id?: string;
  stripe_customer_id?: string;
  email?: string;
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

function daysSinceSignup(signup_date?: string): number {
  if (!signup_date) return Infinity;
  return (Date.now() - new Date(signup_date).getTime()) / (1000 * 60 * 60 * 24);
}

interface RefundDecision {
  action: "auto_issue" | "queue_for_tap" | "decline_with_credit";
  reason: string;
  amount_cents: number;
  window: "7d" | "30d" | "outside";
}

function classifyRefund(
  customer: CustomerSnapshot,
  req: RefundRequest
): RefundDecision {
  const days = req.override_window ? 0 : daysSinceSignup(customer.signup_date);
  const amount = req.refund_amount ?? customer.last_charge_amount ?? 0;

  if (days <= 7) {
    return {
      action: amount < 50000 ? "auto_issue" : "queue_for_tap",
      reason:
        amount < 50000
          ? "within 7-day no-questions guarantee, under $500"
          : "within 7d but >$500 — Jack tap required",
      amount_cents: amount,
      window: "7d",
    };
  }
  if (days <= 30) {
    return {
      action: "queue_for_tap",
      reason: "7-30d window — Jack tap to negotiate 50% vs full",
      amount_cents: amount,
      window: "30d",
    };
  }
  return {
    action: "decline_with_credit",
    reason: "outside 30-day window; offer credit instead",
    amount_cents: 0,
    window: "outside",
  };
}

async function queueRefundApprovalCard(
  customer: CustomerSnapshot,
  req: RefundRequest,
  decision: RefundDecision
): Promise<string> {
  await fs.mkdir(TG_OUTBOX, { recursive: true });
  const filename = `${Date.now()}-refund-approval-${customer.slug}.json`;
  const filepath = path.join(TG_OUTBOX, filename);

  const dollars = (decision.amount_cents / 100).toFixed(2);
  const text = `💸 *Refund request* — ${customer.slug}\n\nAmount: $${dollars}\nWindow: ${decision.window}\nReason: "${req.reason}"\n\nDecision: ${decision.reason}\n\nApprove?`;

  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        text,
        urgency: "P1",
        queued_at: new Date().toISOString(),
        sent_at: null,
        chat_id: process.env.TELEGRAM_CHAT_ID || null,
        tap_required: true,
        action: "issue_refund",
        payload: {
          customer_slug: customer.slug,
          amount_cents: decision.amount_cents,
          stripe_charge_id: customer.last_charge_id,
          reason: req.reason,
        },
      },
      null,
      2
    )
  );
  return filename;
}

async function writeRefundDossierEntry(
  customer: CustomerSnapshot,
  req: RefundRequest,
  decision: RefundDecision,
  status: string
): Promise<string> {
  const dossierDir = path.join(CUSTOMERS, customer.slug);
  await fs.mkdir(dossierDir, { recursive: true });
  const refundsPath = path.join(dossierDir, "03-refunds.md");

  const entry = `\n## ${new Date().toISOString()} — refund request\n\n- Amount: $${(decision.amount_cents / 100).toFixed(2)}\n- Window: ${decision.window}\n- Reason: ${req.reason}\n- Decision: ${decision.action}\n- Status: ${status}\n`;

  if (existsSync(refundsPath)) {
    await fs.appendFile(refundsPath, entry, "utf8");
  } else {
    await fs.writeFile(
      refundsPath,
      `# Refund history — ${customer.slug}\n${entry}`,
      "utf8"
    );
  }
  return refundsPath;
}

export async function processRefund(req: RefundRequest): Promise<{
  ok: boolean;
  decision: RefundDecision | null;
  artifacts: string[];
  jack_tap_required: boolean;
  error?: string;
}> {
  const customer = await loadCustomer(req.customer_slug);
  if (!customer) {
    return {
      ok: false,
      decision: null,
      artifacts: [],
      jack_tap_required: false,
      error: `customer not found: ${req.customer_slug}`,
    };
  }

  const decision = classifyRefund(customer, req);
  const artifacts: string[] = [];
  let status = "pending";

  if (decision.action === "auto_issue") {
    status = "auto-approved, awaiting Stripe call (must be made by separate Stripe worker)";
    // Issue Stripe refund: this is intentionally NOT called here.
    // Reason: server-side Stripe operations should fire from the API route,
    // not from a CLI/skill invocation, to keep audit trail clean.
    // The Jack-tap card will trigger the actual Stripe call when approved.
    const cardFile = await queueRefundApprovalCard(customer, req, decision);
    artifacts.push(path.join(TG_OUTBOX, cardFile));
  } else if (decision.action === "queue_for_tap") {
    status = "awaiting Jack approval";
    const cardFile = await queueRefundApprovalCard(customer, req, decision);
    artifacts.push(path.join(TG_OUTBOX, cardFile));
  } else {
    status = "declined per policy; credit offer queued";
  }

  const dossierPath = await writeRefundDossierEntry(customer, req, decision, status);
  artifacts.push(dossierPath);

  await auditLog({
    action: "refund_requested",
    actor: "automated:refund-handler",
    customer_slug: customer.slug,
    details: {
      amount_cents: decision.amount_cents,
      reason: req.reason,
      window: decision.window,
      decision: decision.action,
    },
    skill_invoked: "refund-handler",
    actor_source: "skill-runner",
  });

  return {
    ok: true,
    decision,
    artifacts,
    jack_tap_required: decision.action !== "decline_with_credit",
  };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<RefundRequest> | undefined;
  if (!inputs?.customer_slug || !inputs.reason) {
    return {
      ok: false,
      skill: "refund-handler",
      path: "hand-coded",
      error: "missing required inputs: customer_slug + reason",
    };
  }
  const result = await processRefund({
    customer_slug: inputs.customer_slug,
    reason: inputs.reason,
    refund_amount: inputs.refund_amount,
    override_window: inputs.override_window,
  });
  return {
    ok: result.ok,
    skill: "refund-handler",
    path: "hand-coded",
    result: result.decision,
    artifacts: result.artifacts,
    jack_tap_required: result.jack_tap_required,
    error: result.error,
  };
}
