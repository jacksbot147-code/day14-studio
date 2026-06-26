#!/usr/bin/env node
/**
 * compile-agent-context.mjs
 *
 * Turns the Obsidian agent knowledge vault into repo-committed context files
 * that Day14 agents can actually read. The vault (edited in Obsidian) is the
 * source of truth; this script is the one-way sync into the codebase.
 *
 *   Source vault:  ~/Claude/Projects/DAY14/Obsidian-Vault/   (override: DAY14_VAULT_DIR)
 *   Output dir:    <repo>/docs/agent-context/                (override: DAY14_CONTEXT_OUT)
 *
 * Emits:
 *   AGENT-CONTEXT.md   — full compiled business + ops context (for coding agents
 *                        and any agent that wants depth; frontmatter stripped).
 *   agent-preamble.md  — a short identity + prime-directives + role-directory block
 *                        intended for runtime injection into every agent prompt.
 *
 * Run after editing the vault:
 *   node scripts/compile-agent-context.mjs        (or: npm run context:compile)
 *
 * Safe to run anytime. If the vault is missing it leaves existing outputs intact
 * and exits 0 with a warning, so it never breaks a build.
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const HOME = homedir();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const VAULT_DIR =
  process.env.DAY14_VAULT_DIR ||
  path.join(HOME, "Claude/Projects/DAY14/Obsidian-Vault");
const OUT_DIR =
  process.env.DAY14_CONTEXT_OUT ||
  path.join(REPO_ROOT, "docs/agent-context");

// Notes included in the full compiled context, in reading order.
// "Day14 — Current Open Items" is intentionally EXCLUDED — it is volatile live
// state and agents should read it fresh, not bake a stale snapshot into context.
const FULL_CONTEXT_NOTES = [
  "00 — Agent Boot (START HERE)",
  "Working with Jack",
  "Day14 — Strategic Direction",
  "Day14 — Business Scope & Pivot Points",
  "Day14 OS — System Map",
  "Agent Roster",
  "Agent Journal & Handoffs",
  "Handoffs & Open Questions",
  "Glossary & Conventions",
  "People & Contacts",
  "Businesses — Overview",
  "Business — Splash Jacks Pools",
  "Business — day14-realty",
  "Business — life-loophole",
  "Business — alignmd",
  "Build Lessons — Retired Brands",
  "Sandbox Git Playbook",
  "Shell Handoff Rules (zsh)",
  "Workflows — Index",
  "Playbook — Nightly Build & Commit Run",
  "Playbook — Customer & Telegram Comms",
  "Role — Dev & Build Agent",
  "Role — Sales & Growth Agent",
  "Role — Founder-Ops Agent",
];

// Compact runtime preamble. Hand-tuned to stay small (every agent call pays for
// it). Keep the prime directives load-bearing and the rest as pointers.
const PREAMBLE = `# Day14 Agent Preamble

You are a Day14 agent operating inside Jack's agent-run, multi-business OS.

## Who you serve
Jack — founder and the only human in the loop. He wants an advisor smarter than him who leads, not a yes-machine. Open by naming the gap or risk, never with agreement. Tag claims [Certain]/[Likely]/[Guessing].

## Prime directives (never violate)
1. No irreversible action without an explicit Jack approval: never push to a remote, move money, or send customer email/messages. Work and commit locally only.
2. Verify before you assert — check real state, don't accept assumptions.
3. Never fabricate prices, customers, businesses, or facts. Prices come ONLY from src/lib/pricing.ts.
4. Code moves via git push/pull only — never rsync the studio repo.
5. Judge agent/fleet health only by heartbeat file mtime, never logs or boot summaries.

## Where to go deeper
Full business + ops context: docs/agent-context/AGENT-CONTEXT.md
Live open items (read fresh, never cache): the vault's "Day14 — Current Open Items" note.

## Roles (read the one matching your job in AGENT-CONTEXT.md)
- Dev & Build Agent — code, builds, nightly runs.
- Sales & Growth Agent — leads, content, customer comms.
- Founder-Ops Agent — briefings, status, founder-ops docs.
`;

function stripFrontmatter(md) {
  if (md.startsWith("---")) {
    const end = md.indexOf("\n---", 3);
    if (end !== -1) {
      const after = md.indexOf("\n", end + 1);
      return md.slice(after + 1).replace(/^\s+/, "");
    }
  }
  return md;
}

async function main() {
  if (!existsSync(VAULT_DIR)) {
    console.warn(
      `[compile-agent-context] vault not found at ${VAULT_DIR} — leaving existing outputs intact.`
    );
    process.exit(0);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  const stamp = new Date().toISOString().slice(0, 10);
  const parts = [];
  parts.push(
    `# Day14 Agent Context (compiled)\n\n` +
      `> Auto-generated from the Obsidian vault by scripts/compile-agent-context.mjs on ${stamp}.\n` +
      `> Do NOT edit by hand — edit the vault notes and re-run \`npm run context:compile\`.\n` +
      `> Source: ${VAULT_DIR.replace(HOME, "~")}\n`
  );

  let included = 0;
  const missing = [];
  for (const note of FULL_CONTEXT_NOTES) {
    const file = path.join(VAULT_DIR, `${note}.md`);
    if (!existsSync(file)) {
      missing.push(note);
      continue;
    }
    const raw = await fs.readFile(file, "utf8");
    parts.push(`\n\n---\n\n${stripFrontmatter(raw).trim()}\n`);
    included++;
  }

  const fullPath = path.join(OUT_DIR, "AGENT-CONTEXT.md");
  const preamblePath = path.join(OUT_DIR, "agent-preamble.md");
  await fs.writeFile(fullPath, parts.join(""), "utf8");
  await fs.writeFile(preamblePath, PREAMBLE, "utf8");

  console.log(`[compile-agent-context] wrote ${fullPath} (${included} notes)`);
  console.log(`[compile-agent-context] wrote ${preamblePath}`);
  if (missing.length) {
    console.warn(`[compile-agent-context] WARNING missing notes: ${missing.join(", ")}`);
  }
}

main().catch((e) => {
  console.error("[compile-agent-context] failed:", e);
  process.exit(1);
});
