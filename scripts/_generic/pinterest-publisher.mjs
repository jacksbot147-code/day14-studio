#!/usr/bin/env node
/**
 * pinterest-publisher.mjs <tenant-slug>
 *
 * Scans <tenant>/social-queue/pinterest/ for entries with status="approved",
 * publishes them via Pinterest API, updates state to "posted".
 *
 * Requires: PINTEREST_ACCESS_TOKEN in .env.local
 *   - Get it at https://developers.pinterest.com (free)
 *   - Need at least one Pinterest board first
 *
 * If no token: writes a "manual-publish" instruction file the user can follow.
 *
 * Pinterest API docs: https://developers.pinterest.com/docs/api/v5/
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  tenantSlug, loadEnv, loadTenant, audit, queueTelegram, BIZ,
} from "./_lib.mjs";

const PINTEREST_API = "https://api.pinterest.com/v5";

async function getDefaultBoard(token, slug) {
  const res = await fetch(`${PINTEREST_API}/boards?page_size=25`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`pinterest boards ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const boards = data.items || [];
  if (!boards.length) throw new Error(`no Pinterest boards — create one for ${slug} first`);
  // Prefer a board name matching the tenant slug
  const match = boards.find((b) => (b.name || "").toLowerCase().includes(slug.replace(/-/g, " ")));
  return (match || boards[0]).id;
}

async function uploadAndPublishPin(token, boardId, imagePath, title, description) {
  // Pinterest API requires the image to be publicly accessible via URL OR
  // we upload via media endpoint first. For local images, we use the
  // create-pin endpoint with image_url… BUT for local files we need to
  // either host them or use base64 upload via /media.
  //
  // For simplicity here: use base64 — Pinterest supports image_base64 on POST /pins.
  const buf = await fs.readFile(imagePath);
  const body = {
    title: title.slice(0, 100),
    description: description.slice(0, 800),
    board_id: boardId,
    media_source: {
      source_type: "image_base64",
      content_type: "image/png",
      data: buf.toString("base64"),
    },
  };
  const res = await fetch(`${PINTEREST_API}/pins`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`pinterest pin ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return await res.json();
}

function parseCopy(text) {
  const titleMatch = text.match(/TITLE:\s*\n([^\n]+)/);
  const descMatch = text.match(/DESCRIPTION:\s*\n([\s\S]+?)(\n\nIMAGE|$)/);
  return {
    title: titleMatch?.[1]?.trim() || "Hot Flash Co",
    description: descMatch?.[1]?.trim() || "",
  };
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);
  const queueDir = path.join(BIZ, slug, "social-queue/pinterest");
  if (!existsSync(queueDir)) {
    console.log("nothing in pinterest queue");
    return;
  }

  const files = (await fs.readdir(queueDir)).filter((f) => f.endsWith(".json"));
  const approved = [];
  for (const f of files) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(queueDir, f), "utf8"));
      if (data.status === "approved" && !data.posted_at) approved.push({ path: path.join(queueDir, f), data });
    } catch {}
  }

  if (approved.length === 0) {
    console.log("no approved Pinterest posts ready");
    return;
  }

  if (!env.PINTEREST_ACCESS_TOKEN) {
    // No token — write instructions
    const instr = path.join(queueDir, "_MANUAL_PUBLISH_INSTRUCTIONS.md");
    const lines = [
      `# Pinterest publisher — manual mode`,
      ``,
      `${approved.length} pins approved but PINTEREST_ACCESS_TOKEN not set in .env.local.`,
      ``,
      `To enable auto-publishing:`,
      `  1. Sign up at https://developers.pinterest.com (free)`,
      `  2. Create an app + generate access token`,
      `  3. Add PINTEREST_ACCESS_TOKEN=<token> to ~/Documents/studio/.env.local`,
      `  4. Re-run this script`,
      ``,
      `Manual posting (until then):`,
      ...approved.map((a, i) => `  ${i + 1}. ${a.data.content.image_path}  (use copy from same folder's .txt)`),
    ];
    await fs.writeFile(instr, lines.join("\n"));
    await queueTelegram(env, slug, `📌 *${approved.length} Pinterest pins ready, no API token yet.*\nInstructions: \`${instr}\``);
    console.log(`wrote ${instr}`);
    return;
  }

  console.log(`→ Publishing ${approved.length} Pinterest pins for ${ctx.display_name}`);
  const boardId = await getDefaultBoard(env.PINTEREST_ACCESS_TOKEN, slug);
  console.log(`  board: ${boardId}`);

  const results = [];
  for (const a of approved) {
    const copy = parseCopy(a.data.content.copy || "");
    process.stdout.write(`  ${a.data.content.slug.padEnd(30)} `);
    try {
      const pin = await uploadAndPublishPin(env.PINTEREST_ACCESS_TOKEN, boardId, a.data.content.image_path, copy.title, copy.description);
      a.data.status = "posted";
      a.data.posted_at = new Date().toISOString();
      a.data.posted_url = `https://www.pinterest.com/pin/${pin.id}`;
      await fs.writeFile(a.path, JSON.stringify(a.data, null, 2));
      results.push({ ok: true, slug: a.data.content.slug, url: a.data.posted_url });
      console.log(`✓ ${a.data.posted_url}`);
    } catch (err) {
      results.push({ ok: false, slug: a.data.content.slug, error: err.message });
      console.log(`✗ ${err.message.slice(0, 100)}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  const ok = results.filter((r) => r.ok);
  await queueTelegram(env, slug, `📌 *Pinterest published — ${ctx.display_name}*\n\n${ok.length}/${results.length} pins live:\n${ok.map((r) => `• ${r.url}`).join("\n")}`);
  await audit(slug, { actor: "pinterest-publisher", action: "pins_published", count: ok.length, results });
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
