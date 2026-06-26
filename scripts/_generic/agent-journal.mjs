/**
 * agent-journal.mjs — agents write back to the Obsidian vault.
 *
 * The vault → agents path (compiled context) is one-way. This is the return
 * path: agents log what they did, leave notes for future jobs, and flag things
 * for each other / for Jack. Those notes live in the vault, so Obsidian shows
 * them AND the next `npm run context:compile` can fold them back into context —
 * closing the loop.
 *
 * All functions are best-effort and NEVER throw (journaling must not break a
 * job). Vault path defaults to ~/Claude/Projects/DAY14/Obsidian-Vault, override
 * with DAY14_VAULT_DIR.
 *
 *   import { journal, handoff, appendToNote } from "./agent-journal.mjs";
 *   await journal("cfo-agent", "Daily P&L written", { tenant: "day14" });
 *   await handoff("realty-scout", "County CSV columns changed — parser needs the new 'APN2' field", { tag: "blocker" });
 *   await appendToNote("Business — alignmd", "Confirmed partner contact: …");
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

const VAULT = process.env.DAY14_VAULT_DIR || path.join(homedir(), "Claude/Projects/DAY14/Obsidian-Vault");
const JOURNAL_DIR = path.join(VAULT, "Agent Journal");
const HANDOFFS = path.join(VAULT, "Handoffs & Open Questions.md");

function nowStamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 16);
}
function safeName(s) {
  return String(s).replace(/[^A-Za-z0-9 ._-]/g, "").slice(0, 80) || "unknown";
}
async function ensureDir(p) {
  try {
    if (!existsSync(p)) await fs.mkdir(p, { recursive: true });
  } catch {
    /* best-effort */
  }
}
async function append(file, text) {
  try {
    await ensureDir(path.dirname(file));
    await fs.appendFile(file, text);
  } catch {
    /* journaling must never break a job */
  }
}

/** Log that an agent did something. One line per call, appended to the agent's journal note. */
export async function journal(agent, summary, opts = {}) {
  const name = safeName(agent);
  const file = path.join(JOURNAL_DIR, `${name}.md`);
  if (!existsSync(file)) {
    await append(
      file,
      `---\ntitle: Agent Journal — ${name}\ntype: journal\ntags: [day14, agent-journal, ${name}]\n---\n\n# Agent Journal — ${name}\n\nAppend-only run log. Newest at the bottom.\n\n`,
    );
  }
  const tenant = opts.tenant ? ` · ${opts.tenant}` : "";
  const tag = opts.error ? " ⚠️" : "";
  await append(file, `- **${nowStamp()}**${tenant}${tag} — ${String(summary).slice(0, 400)}\n`);
}

/** Leave a message for future jobs / other agents / Jack. Goes to the shared Handoffs note. */
export async function handoff(agent, message, opts = {}) {
  if (!existsSync(HANDOFFS)) {
    await append(
      HANDOFFS,
      `---\ntitle: Handoffs & Open Questions\ntype: log\ntags: [day14, handoffs, agent-journal]\n---\n\n# Handoffs & Open Questions\n\nWhere any agent leaves a note for future jobs, other agents, or Jack. Append-only; resolve items by striking them through. Newest at the bottom.\n\n`,
    );
  }
  const tag = opts.tag ? ` \`${safeName(opts.tag)}\`` : "";
  const to = opts.to ? ` → ${safeName(opts.to)}` : "";
  await append(HANDOFFS, `- **${nowStamp()}** ${safeName(agent)}${to}${tag}: ${String(message).slice(0, 600)}\n`);
}

/** Append a timestamped line under an "## Agent log" section of an existing vault note. */
export async function appendToNote(noteName, text, opts = {}) {
  const file = path.join(VAULT, `${safeName(noteName)}.md`);
  if (!existsSync(file)) {
    // Don't fabricate curated notes; route to the agent's journal instead.
    return journal(opts.agent || "agent", `(note "${noteName}" missing) ${text}`, opts);
  }
  try {
    let body = await fs.readFile(file, "utf8");
    const line = `- **${nowStamp()}** ${opts.agent ? `${safeName(opts.agent)}: ` : ""}${String(text).slice(0, 500)}\n`;
    if (body.includes("## Agent log")) {
      body = body.replace(/## Agent log\n/, `## Agent log\n${line}`);
    } else {
      body = `${body.trimEnd()}\n\n## Agent log\n${line}`;
    }
    await fs.writeFile(file, body);
  } catch {
    return journal(opts.agent || "agent", `(append failed on "${noteName}") ${text}`, opts);
  }
}
