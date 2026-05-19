#!/usr/bin/env node
/**
 * get-chat-id.mjs
 *
 * Reads TELEGRAM_BOT_TOKEN from .env.local, hits Telegram's getUpdates,
 * extracts the chat_id from the most recent message, writes it back to
 * .env.local. No Python, no heredoc — uses Node's native fetch + fs.
 *
 * Usage:
 *   1. Make sure you've sent your bot any message ("hi") via Telegram
 *   2. Run: node ~/Documents/studio/scripts/get-chat-id.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

const ENV_PATH = path.join(homedir(), "Documents/studio/.env.local");

function readEnv() {
  const text = fs.readFileSync(ENV_PATH, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return { text, env };
}

function writeEnvKey(key, value) {
  const { text } = readEnv();
  let updated;
  if (new RegExp(`^${key}=`, "m").test(text)) {
    updated = text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
  } else {
    updated = text + (text.endsWith("\n") ? "" : "\n") + `${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_PATH, updated, "utf8");
}

async function main() {
  const { env } = readEnv();
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("✗ TELEGRAM_BOT_TOKEN not set in .env.local");
    process.exit(1);
  }
  console.log("✓ Token loaded (last 4):", "..." + token.slice(-4));

  // Verify
  console.log("Verifying token with Telegram...");
  let meRes;
  try {
    meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  } catch (err) {
    console.error("✗ Network error:", err.message);
    process.exit(1);
  }
  const me = await meRes.json();
  if (!me.ok) {
    console.error("✗ Telegram rejected token:", me);
    process.exit(1);
  }
  console.log("✓ Bot is @" + me.result.username);

  // Get chat_id from getUpdates
  console.log("\nFetching getUpdates...");
  const upRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const updates = await upRes.json();
  if (!updates.ok) {
    console.error("✗ getUpdates failed:", updates);
    process.exit(1);
  }
  if (!updates.result || updates.result.length === 0) {
    console.error("✗ No messages in queue.");
    console.error("  → Send your bot any message ('hi') on Telegram first.");
    console.error("  → Then re-run this script.");
    process.exit(1);
  }

  // Find most recent chat_id
  let chatId = null;
  for (const u of [...updates.result].reverse()) {
    const msg = u.message || u.edited_message;
    if (msg?.chat?.id) {
      chatId = msg.chat.id;
      break;
    }
  }
  if (!chatId) {
    console.error("✗ No chat ID found in updates.");
    process.exit(1);
  }
  console.log("✓ Found chat_id:", chatId);

  // Write back
  writeEnvKey("TELEGRAM_CHAT_ID", String(chatId));
  console.log("✓ Wrote TELEGRAM_CHAT_ID to .env.local");

  // Restart suggestion
  console.log("\nNow restart the telegram poller:");
  console.log(
    "  launchctl unload ~/Library/LaunchAgents/com.day14.telegram-poller.plist 2>/dev/null"
  );
  console.log(
    "  launchctl load ~/Library/LaunchAgents/com.day14.telegram-poller.plist"
  );
  console.log("\nThen text your bot /help — should reply with command list.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
