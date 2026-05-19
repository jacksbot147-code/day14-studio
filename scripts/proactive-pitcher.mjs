#!/usr/bin/env node
/**
 * proactive-pitcher.mjs
 *
 * The bot's "hey check this out" feature. Runs at 7am daily + on-demand.
 *
 * Each run:
 *   1. Reads all open opportunities from _shared/opportunities/
 *   2. Filters: not yet pitched, score >= 60
 *   3. Picks the top 1-2 by score
 *   4. If not already pitched, runs idea-pitcher.mjs
 *   5. Sends Jack a curated digest: "Here's what I found while you slept"
 *
 * Also wires the "bootstrap-pitch <id>" reply pattern so Jack can launch
 * with one tap.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { homedir } from "node:os";

const HOME = homedir();
const STUDIO = path.join(HOME, "Documents/studio");
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const OPPS_DIR = path.join(SHARED, "opportunities");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(STUDIO, ".env.local");

async function loadEnv() {
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function loadAllOpps() {
  if (!existsSync(OPPS_DIR)) return [];
  const opps = [];
  for (const f of await fs.readdir(OPPS_DIR)) {
    if (!f.endsWith(".json")) continue;
    try {
      const data = JSON.parse(await fs.readFile(path.join(OPPS_DIR, f), "utf8"));
      data._filename = f;
      opps.push(data);
    } catch {}
  }
  return opps;
}

async function main() {
  const env = await loadEnv();
  const all = await loadAllOpps();
  const open = all.filter((o) => o.status === "open" && (o.total_score || 0) >= 60);
  open.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

  console.log(`→ ${all.length} total opps, ${open.length} open ≥60`);

  // Pitch top 1-2 not yet pitched
  const toPitch = open.filter((o) => !o.pitched).slice(0, 2);
  for (const o of toPitch) {
    const r = spawnSync("node", [
      path.join(STUDIO, "scripts/idea-pitcher.mjs"),
      "--id", o.id || o._filename.replace(/\.json$/, ""),
      "--urgent", (o.total_score || 0) >= 85 ? "true" : "false",
    ], { stdio: "inherit" });
    if (r.status !== 0) console.warn(`pitch failed for ${o.id}`);
  }

  // Build a digest of pitched-but-not-launched opportunities
  const pitched = (await loadAllOpps()).filter((o) => o.pitched && o.status === "open");
  pitched.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  const digest = pitched.slice(0, 5);

  if (env.TELEGRAM_CHAT_ID && digest.length > 0) {
    await fs.mkdir(OUTBOX, { recursive: true });
    const lines = [
      `📬 *Morning ideas — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}*`,
      ``,
      `${pitched.length} pitched, waiting on your call:`,
      ``,
      ...digest.map((o, i) => `${i + 1}. *${o.niche}* — ${o.total_score}/100\n   ${(o.rationale || "").slice(0, 140)}\n   Launch: \`bootstrap-pitch ${o.id || o._filename.replace(/\.json$/, "")}\``),
      ``,
      `Reply *show pitch <id>* for full pitch, or *skip-pitch <id>* to retire.`,
    ];
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-morning-ideas.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: lines.join("\n"),
        parse_mode: "Markdown",
        urgency: "P2",
        queued_at: new Date().toISOString(),
        sent_at: null,
      }, null, 2)
    );
    console.log(`✓ morning digest pushed with ${digest.length} pitches`);
  } else {
    console.log("no pitches to digest or no TELEGRAM_CHAT_ID");
  }
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
