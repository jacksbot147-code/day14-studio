#!/usr/bin/env node
/**
 * RETIRED. Telegram is not part of the Day14 product.
 *
 * A LaunchAgent on Jack's Mac (com.day14.telegram-poller, installed by
 * scripts/install-telegram-poller.sh) may still point at this file. Exiting 0
 * keeps that agent from polling Telegram or crashing in a restart loop.
 * Unload: launchctl unload ~/Library/LaunchAgents/com.day14.telegram-poller.plist
 */
console.log("telegram-poller retired — not polling");
process.exit(0);
