#!/usr/bin/env node
/**
 * browser.mjs — shared Day14 wrapper around the `agent-browser` CLI.
 *
 * One consistent entry point so any agent or scheduled task can drive a real
 * browser (navigate, inspect, extract, screenshot) without re-implementing
 * process handling. agent-browser keeps a persistent browser session between
 * CLI invocations, so `open()` then `snapshot()` act on the same page.
 *
 * Requires the `agent-browser` CLI on PATH:
 *   npm i -g agent-browser   (or)   brew install agent-browser
 *   agent-browser install    # one-time: downloads Chrome for Testing
 *
 * Self-test:  node scripts/lib/browser.mjs [url]
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Override the binary path with AGENT_BROWSER_BIN if it isn't on PATH.
const BIN = process.env.AGENT_BROWSER_BIN || "agent-browser";
const DEFAULT_TIMEOUT = 60_000;

/** Thrown when the agent-browser CLI isn't installed — lets callers that
 *  have a non-browser path catch it and fall back gracefully. */
export class BrowserUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "BrowserUnavailableError";
  }
}

/**
 * Run one `agent-browser` subcommand. Returns trimmed stdout.
 * @param {string[]} args  e.g. ["open", "https://example.com"]
 */
export async function ab(args, { timeout = DEFAULT_TIMEOUT } = {}) {
  try {
    const { stdout } = await execFileAsync(BIN, args, {
      timeout,
      maxBuffer: 32 * 1024 * 1024,
    });
    return String(stdout).trim();
  } catch (e) {
    if (e && e.code === "ENOENT") {
      throw new BrowserUnavailableError(
        "agent-browser is not installed or not on PATH. Install it with " +
          "`npm i -g agent-browser` or `brew install agent-browser`, then " +
          "run `agent-browser install`.",
      );
    }
    if (e && e.killed) {
      throw new Error(`agent-browser ${args[0]} timed out after ${timeout}ms`);
    }
    // agent-browser exits non-zero on a failed command — surface its output.
    const detail = String((e && (e.stderr || e.stdout || e.message)) || "").trim();
    throw new Error(`agent-browser ${args.join(" ")} failed: ${detail}`);
  }
}

/** True if the agent-browser CLI is installed and responding. */
export async function isAvailable() {
  try {
    await ab(["--version"], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

/** Navigate the persistent browser session to a URL. */
export const open = (url, opts) => ab(["open", url], opts);

/**
 * Accessibility snapshot of the current page.
 * interactive (default true) → only the elements you can act on, each
 * tagged with a ref like @e1 / @e2 for click()/fill().
 */
export const snapshot = (opts = {}) =>
  ab(opts.interactive === false ? ["snapshot"] : ["snapshot", "-i"], opts);

/** Click an element by its ref (e.g. "@e3"). */
export const click = (ref, opts) => ab(["click", ref], opts);

/** Fill an input element (by ref) with text. */
export const fill = (ref, text, opts) => ab(["fill", ref, String(text)], opts);

/** Capture a screenshot. Pass a file path, or omit for the default name. */
export const screenshot = (file, opts) =>
  ab(file ? ["screenshot", file] : ["screenshot"], opts);

/** Escape hatch for any subcommand not wrapped above (`agent-browser --help`). */
export const raw = (args, opts) => ab(args, opts);

/**
 * Convenience: navigate to a URL and return its interactive snapshot in one
 * call. Throws BrowserUnavailableError if agent-browser isn't installed.
 */
export async function load(url, opts) {
  await open(url, opts);
  return snapshot(opts);
}

// ── Self-test ─────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2] || "https://example.com";
  (async () => {
    if (!(await isAvailable())) {
      console.error(
        "✗ agent-browser not found. Install: npm i -g agent-browser && agent-browser install",
      );
      process.exit(1);
    }
    console.log("✓ agent-browser is installed");
    console.log(`→ opening ${url}`);
    const snap = await load(url);
    console.log(`✓ snapshot ok — ${snap.split("\n").length} line(s)`);
    await screenshot("browser-selftest.png");
    console.log("✓ screenshot saved → browser-selftest.png");
    console.log("\nbrowser.mjs helper is working.");
  })().catch((e) => {
    console.error("✗ self-test failed:", e.message);
    process.exit(1);
  });
}
