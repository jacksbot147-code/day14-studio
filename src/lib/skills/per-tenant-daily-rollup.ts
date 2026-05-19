/**
 * per-tenant-daily-rollup — hand-coded impl.
 *
 * For each active tenant, produce a concise daily rollup.
 * Writes per-tenant report + queues one Telegram message per tenant.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { getActiveTenants } from "../tenants";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const REGISTER = path.join(SHARED, "growth/work-register.jsonl");
const OUTBOX = path.join(SHARED, "telegram/outbox");

interface TenantRollup {
  slug: string;
  name: string;
  type: string;
  mrr: number;
  activity_today: number;
  activity_yesterday: number;
  recent_actions: string[];
  one_thing: string;
  is_quiet: boolean;
}

async function loadEnv() {
  const envPath = path.join(HOME, "Documents/studio/.env.local");
  if (!existsSync(envPath)) return {};
  const text = await fs.readFile(envPath, "utf8");
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] && m[2] !== undefined && !line.trim().startsWith("#")) {
      env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
  return env;
}

async function tenantActions(slug: string): Promise<{ today: number; yesterday: number; recent: string[] }> {
  if (!existsSync(REGISTER)) return { today: 0, yesterday: 0, recent: [] };
  const text = await fs.readFile(REGISTER, "utf8");
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const todayMs = today0.getTime();
  const yesterdayMs = todayMs - 86400000;

  let today = 0;
  let yesterday = 0;
  const recent: string[] = [];

  for (const line of text.split("\n").reverse()) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e.customer_slug !== slug && e.context !== slug) continue;
      const ts = new Date(e.timestamp).getTime();
      if (ts >= todayMs) today += 1;
      else if (ts >= yesterdayMs) yesterday += 1;
      if (recent.length < 5) {
        recent.push(`${new Date(e.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} — ${e.invoked_skill || e.action_phrase?.slice(0, 50)}`);
      }
    } catch {
      // skip
    }
  }
  return { today, yesterday, recent };
}

function pickOneThing(rollup: Partial<TenantRollup>): string {
  if (rollup.activity_today === 0 && rollup.activity_yesterday === 0) {
    return `No activity in 2 days. Worth checking in with this tenant.`;
  }
  if (rollup.recent_actions?.some((r) => /cancel|refund|complaint/i.test(r))) {
    return `Customer-facing concern in recent activity. Review the dossier.`;
  }
  if (!rollup.mrr && rollup.type !== "productized-build-shop") {
    return `Tenant has no MRR set. Confirm billing config or mark as non-revenue.`;
  }
  return `Routine. No specific action needed today.`;
}

export async function computeRollups(): Promise<TenantRollup[]> {
  const tenants = getActiveTenants();
  const rollups: TenantRollup[] = [];

  for (const t of tenants) {
    const acts = await tenantActions(t.slug);
    const rollup: TenantRollup = {
      slug: t.slug,
      name: t.name,
      type: t.type,
      mrr: t.billing?.monthly_amount ?? 0,
      activity_today: acts.today,
      activity_yesterday: acts.yesterday,
      recent_actions: acts.recent,
      one_thing: "",
      is_quiet: acts.today === 0 && acts.yesterday === 0,
    };
    rollup.one_thing = pickOneThing(rollup);
    rollups.push(rollup);
  }

  return rollups;
}

export async function writeRollups(rollups: TenantRollup[]): Promise<string[]> {
  const paths: string[] = [];
  for (const r of rollups) {
    const dir = path.join(HOME, "Documents/businesses", r.slug, "rollups");
    // If not in jack's personal businesses, try _shared/customers
    const altDir = path.join(SHARED, "customers", r.slug, "rollups");
    const targetDir = existsSync(path.dirname(dir)) ? dir : altDir;
    await fs.mkdir(targetDir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const reportPath = path.join(targetDir, `${date}.md`);

    const lines: string[] = [];
    lines.push(`# Daily rollup — ${r.name}`);
    lines.push(`## ${date}`);
    lines.push("");
    lines.push(`- MRR: $${r.mrr.toLocaleString()}`);
    lines.push(`- Activity today: ${r.activity_today}`);
    lines.push(`- Activity yesterday: ${r.activity_yesterday}`);
    lines.push("");
    lines.push(`## Today's one thing`);
    lines.push(`> ${r.one_thing}`);
    lines.push("");
    if (r.recent_actions.length > 0) {
      lines.push(`## Recent activity`);
      for (const a of r.recent_actions) lines.push(`- ${a}`);
    }
    lines.push("");
    lines.push(`_Tenant: \`${r.slug}\`_`);

    await fs.writeFile(reportPath, lines.join("\n"), "utf8");
    paths.push(reportPath);
  }
  return paths;
}

async function queueTelegramRollup(rollups: TenantRollup[]) {
  const env = await loadEnv();
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!chatId) return;
  await fs.mkdir(OUTBOX, { recursive: true });

  // One summary card aggregating all tenants
  const lines: string[] = [];
  lines.push(`☀️ *Per-tenant daily rollup*`);
  lines.push("");
  for (const r of rollups) {
    const emoji = r.is_quiet ? "💤" : "🟢";
    lines.push(`${emoji} \`${r.slug}\` — ${r.activity_today}↑ / ${r.activity_yesterday}↗ — ${r.one_thing.slice(0, 80)}`);
  }
  lines.push("");
  lines.push(`Dashboard: http://localhost:3000/dashboard/tenants`);

  await fs.writeFile(
    path.join(OUTBOX, `${Date.now()}-per-tenant-rollup.json`),
    JSON.stringify(
      {
        chat_id: chatId,
        text: lines.join("\n"),
        parse_mode: "Markdown",
        urgency: "P3",
        queued_at: new Date().toISOString(),
        sent_at: null,
      },
      null,
      2
    )
  );
}

export async function run(_ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const rollups = await computeRollups();
  const paths = await writeRollups(rollups);
  await queueTelegramRollup(rollups);
  return {
    ok: true,
    skill: "per-tenant-daily-rollup",
    path: "hand-coded",
    result: { tenants: rollups.length, quiet: rollups.filter((r) => r.is_quiet).length },
    artifacts: paths,
  };
}
