/**
 * deal-alerter.mjs — A-tier deal alerts.
 *
 * OPERATE: every run, checks the evaluations for A-tier deals that have not
 *   been alerted before, and queues a Telegram message so Jack hears about a
 *   strong deal the moment it scores. State-tracked so each deal alerts once.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { loadStore, scaffold, opsDir, money, auditRE } from "./brain.mjs";

export const BUILD_SPEC = {
  capability: "deal-alerter",
  beyond: "Push the instant an A-tier deal scores — you act on the best deals first, not on the next dashboard check.",
  ui_next: "Alert preferences (score threshold, play filter) on /admin/realty.",
};

const ENV_FILE = path.join(homedir(), "Documents/studio/.env.local");
const OUTBOX = path.join(homedir(), "Documents/businesses/_shared/telegram/outbox");

async function chatId() {
  if (!existsSync(ENV_FILE)) return "";
  try {
    const t = await fs.readFile(ENV_FILE, "utf8");
    const m = t.match(/^\s*TELEGRAM_CHAT_ID\s*=\s*(.+)\s*$/m);
    return m && m[1] ? m[1].replace(/^['"]|['"]$/g, "").trim() : "";
  } catch {
    return "";
  }
}

export async function operate(slug) {
  await scaffold(slug);
  const evals = await loadStore(slug, "evaluations");
  const aTier = evals.filter((e) => String(e.tier || "").startsWith("A"));

  const statePath = path.join(opsDir(slug), "alert-state.json");
  let alerted = [];
  if (existsSync(statePath)) {
    try {
      alerted = JSON.parse(await fs.readFile(statePath, "utf8"));
    } catch {}
  }
  const alertedSet = new Set(alerted);
  const fresh = aTier.filter((e) => !alertedSet.has(e.property_id));

  if (fresh.length) {
    const cid = await chatId();
    if (cid) {
      await fs.mkdir(OUTBOX, { recursive: true });
      const lines = [`🏠 *${fresh.length} new A-tier deal${fresh.length === 1 ? "" : "s"} — ${slug}*`, ``];
      for (const d of fresh.slice(0, 8)) {
        lines.push(`*${d.score}* ${d.address || "(no address)"} — ${d.best_play} · ${money(d.value_cents)}`);
      }
      lines.push(``, `See the board: day14.us/admin/realty`);
      await fs.writeFile(
        path.join(OUTBOX, `${Date.now()}-realty-alert.json`),
        JSON.stringify(
          {
            chat_id: cid,
            text: lines.join("\n"),
            parse_mode: "Markdown",
            urgency: "P2",
            queued_at: new Date().toISOString(),
            sent_at: null,
            tenant: slug,
          },
          null,
          2
        )
      );
    }
    await fs.writeFile(
      statePath,
      JSON.stringify([...alertedSet, ...fresh.map((e) => e.property_id)], null, 2)
    );
  }

  const summary = { a_tier: aTier.length, new_alerts: fresh.length };
  await auditRE(slug, { actor: "re-deal-alerter", action: "deals_alerted", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2] || "day14-realty";
  operate(slug).then((r) =>
    console.log(`deal-alerter ${slug}: ${r.a_tier} A-tier · ${r.new_alerts} new alert(s) queued`)
  );
}
