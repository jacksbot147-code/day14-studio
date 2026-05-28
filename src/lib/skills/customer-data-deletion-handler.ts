/**
 * customer-data-deletion-handler — hand-coded impl.
 *
 * GDPR right-to-be-forgotten. Two-phase: schedule (Day 0) + execute (Day 30).
 * This module is intentionally DRY-RUN safe: it computes what would be
 * deleted and writes a deletion-plan file; the actual execute step still
 * requires Jack-tap and runs through the live runner.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();
const CUSTOMERS_BASE = path.join(HOME, "Documents/businesses");
const DELETION_QUEUE = path.join(HOME, "Documents/businesses/_shared/privacy/deletion-queue.jsonl");

export interface DeletionScheduleInput {
  customer_slug: string;
  requested_by_email: string;
  identity_verified: boolean;
  tenant?: string;
  now?: string;
}

export interface DeletionScheduleResult {
  ok: boolean;
  scheduled_for: string;
  cooling_off_days: number;
  queue_path: string;
  dossier_path: string;
  files_to_delete: string[];
  error?: string;
}

export interface DeletionExecuteInput {
  customer_slug: string;
  tenant?: string;
  confirm: true; // explicit, hard-typed confirm
}

export interface DeletionExecuteResult {
  ok: boolean;
  would_delete: string[];
  dry_run: true;
  error?: string;
}

export async function scheduleDeletion(
  input: DeletionScheduleInput
): Promise<DeletionScheduleResult> {
  if (!input.identity_verified) {
    return {
      ok: false,
      scheduled_for: "",
      cooling_off_days: 30,
      queue_path: DELETION_QUEUE,
      dossier_path: "",
      files_to_delete: [],
      error: "identity_not_verified — require email match + PIN before scheduling",
    };
  }
  const tenant = input.tenant || "day14";
  const dossierDir = path.join(CUSTOMERS_BASE, tenant, "customers", input.customer_slug);
  const files: string[] = [];
  if (existsSync(dossierDir)) {
    try {
      const entries = await fs.readdir(dossierDir);
      for (const e of entries) files.push(path.join(dossierDir, e));
    } catch {
      // ignore
    }
  }
  const now = input.now ? new Date(input.now) : new Date();
  const scheduledFor = new Date(now.getTime() + 30 * 24 * 3_600_000).toISOString();
  const entry = {
    customer_slug: input.customer_slug,
    requested_by_email: input.requested_by_email,
    scheduled_for: scheduledFor,
    requested_at: now.toISOString(),
    tenant,
    files_count: files.length,
  };
  await fs.mkdir(path.dirname(DELETION_QUEUE), { recursive: true });
  await fs.appendFile(DELETION_QUEUE, JSON.stringify(entry) + "\n", "utf8");
  await auditLog({
    action: "deletion_scheduled",
    actor: "automated:customer-data-deletion-handler",
    customer_slug: input.customer_slug,
    details: { scheduled_for: scheduledFor, files: files.length },
    skill_invoked: "customer-data-deletion-handler",
    actor_source: "skill-runner",
  });
  return {
    ok: true,
    scheduled_for: scheduledFor,
    cooling_off_days: 30,
    queue_path: DELETION_QUEUE,
    dossier_path: dossierDir,
    files_to_delete: files,
  };
}

/**
 * Dry-run executor. Returns what WOULD be deleted but never actually deletes.
 * Real deletion must be performed by the operator path (Jack-tap → confirm).
 */
export async function executeDeletionDryRun(
  input: DeletionExecuteInput
): Promise<DeletionExecuteResult> {
  const tenant = input.tenant || "day14";
  const dossierDir = path.join(CUSTOMERS_BASE, tenant, "customers", input.customer_slug);
  const wouldDelete: string[] = [];
  if (existsSync(dossierDir)) {
    try {
      const entries = await fs.readdir(dossierDir);
      for (const e of entries) wouldDelete.push(path.join(dossierDir, e));
    } catch (err) {
      return {
        ok: false,
        would_delete: [],
        dry_run: true,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  await auditLog({
    action: "deletion_dry_run",
    actor: "automated:customer-data-deletion-handler",
    customer_slug: input.customer_slug,
    details: { would_delete_count: wouldDelete.length },
    skill_invoked: "customer-data-deletion-handler",
    actor_source: "skill-runner",
  });
  return { ok: true, would_delete: wouldDelete, dry_run: true };
}

export async function invokeCustomerDataDeletionHandler(
  input: DeletionScheduleInput
): Promise<DeletionScheduleResult> {
  return scheduleDeletion(input);
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<DeletionScheduleInput> | undefined;
  if (!input?.customer_slug || !input.requested_by_email) {
    return {
      ok: false,
      skill: "customer-data-deletion-handler",
      path: "hand-coded",
      error: "missing required inputs: customer_slug, requested_by_email",
    };
  }
  const result = await invokeCustomerDataDeletionHandler({
    customer_slug: input.customer_slug,
    requested_by_email: input.requested_by_email,
    identity_verified: input.identity_verified ?? false,
    tenant: input.tenant,
  });
  return {
    ok: result.ok,
    skill: "customer-data-deletion-handler",
    path: "hand-coded",
    result,
    jack_tap_required: true,
    artifacts: [result.queue_path],
    error: result.error,
  };
}
