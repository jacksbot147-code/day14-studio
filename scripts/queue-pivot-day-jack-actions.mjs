#!/usr/bin/env node
/**
 * One-shot: queue the 5 pivot-day Jack-actions.
 * Idempotent — recordJackAction dedupes per-day on `cmd`.
 */
import path from "node:path";
import { homedir } from "node:os";
import { recordJackAction } from "./lib/jack-actions.mjs";

// In sandbox runs, homedir() points at the sandbox user, not the host
// user. The studio worktree lives under the host's ~/Documents, so we
// derive the canonical COMMANDS-FOR-JACK.md path from this file's
// location (scripts/queue-pivot-day-jack-actions.mjs is two levels
// deep inside ~/Documents/studio/scripts/).
const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const STUDIO_DIR = path.resolve(SCRIPT_DIR, "..");
const DOCUMENTS_DIR = path.resolve(STUDIO_DIR, "..");
const COMMANDS_PATH = path.join(DOCUMENTS_DIR, "COMMANDS-FOR-JACK.md");
// If the derived path doesn't look right (e.g. running from somewhere
// unexpected), fall back to ~/Documents/COMMANDS-FOR-JACK.md.
const FALLBACK_PATH = path.join(homedir(), "Documents", "COMMANDS-FOR-JACK.md");
const TARGET_PATH = DOCUMENTS_DIR.endsWith("Documents") ? COMMANDS_PATH : FALLBACK_PATH;

const items = [
  {
    urgency: "high",
    label: "Record the Day14 OS Loom demo and paste URL into landing page",
    cmd: "edit src/app/page.tsx → set LOOM_EMBED_URL to the Loom share URL after recording",
    why: "Pivot-day landing page has a placeholder embed frame; needs the real Loom",
  },
  {
    urgency: "high",
    label: "Toggle Vercel Web Analytics ON for studio project",
    cmd: "vercel dashboard → studio project → Analytics → enable Web Analytics",
    why: "Need the demand signal counter live before pushing the pivot landing page",
  },
  {
    urgency: "normal",
    label: "Publish Day14 OS manifesto to a public URL",
    cmd: "publish ~/Documents/DAY14-OS-MANIFESTO.md to day14.us/manifesto OR Substack OR Notion (your call)",
    why: "Manifesto draft is ready; needs a public URL for the X thread + landing-page link",
  },
  {
    urgency: "normal",
    label: "Post the Day14 OS X thread (8 tweets)",
    cmd: "draft 8 tweets — #1 thesis, #2-7 the war stories + reframe, #8 landing-page URL",
    why: "Distribution prong of the pivot-day plan; need the 24-hour demand signal",
  },
  {
    urgency: "normal",
    label: "Final review pass on landing page before commit + push",
    cmd: "cd ~/Documents/studio && git diff src/app/page.tsx src/components/WaitlistForm.tsx src/app/api/waitlist/route.ts && commit + push when ready",
    why: "Standing constraint: customer-facing publish requires Jack-tap, not silent push",
  },
];

let filed = 0;
let dup = 0;
for (const it of items) {
  const r = await recordJackAction({ ...it, filePath: TARGET_PATH });
  if (r.filed) filed++;
  else if (r.duplicate) dup++;
  console.log(JSON.stringify({ label: it.label, ...r }));
}
console.log(`\nQueued: ${filed} new, ${dup} already-pending. Total items processed: ${items.length}.`);
