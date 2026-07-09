#!/usr/bin/env node
/**
 * provider-health-probe.mjs — hourly LLM-provider canary.
 *
 * Why (2026-07-09 audit): the shared Gemini account's prepaid credits
 * depleted ~Jun 13 and the fleet ran blind for 26 days — 580 consecutive
 * 429s in opportunity-scanner's log while every dashboard stayed green,
 * because nothing distinguishes "agent healthy" from "agent's PROVIDER
 * dead". This probe makes provider state a first-class monitored fact.
 *
 * Each run: one tiny (~8-token) call per configured provider, then
 *   - writes  _shared/ops/provider-health.json   (current state + streaks)
 *   - Telegrams Jack ONE card on state change only (fail→P1, recover→P2)
 *
 * Cost: ≤ 2 minimal calls/hour. No LLM reasoning — just liveness.
 * Runs as an hourly launchd one-shot (com.day14.provider-health, installed
 * by scripts/install-reliability-agents.sh).
 *
 * Selftest (no network): node scripts/provider-health-probe.mjs --selftest
 * Dry run (probes, no card): node scripts/provider-health-probe.mjs --dry-run
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import os from "node:os";

const BASE = process.env.DAY14_PROBE_BASE || os.homedir();
const SHARED = path.join(BASE, "Documents/businesses/_shared");
const STATE_FILE = path.join(SHARED, "ops/provider-health.json");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(BASE, "Documents/studio/.env.local");

async function loadEnv() {
  if (!existsSync(ENV_FILE)) return {};
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function probeGemini(apiKey) {
  const t0 = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "reply with the single word: ok" }] }],
          generationConfig: { maxOutputTokens: 8, temperature: 0 },
        }),
        signal: AbortSignal.timeout(20_000),
      }
    );
    if (!res.ok) {
      const body = (await res.text()).slice(0, 160);
      return { ok: false, error: `gemini ${res.status}: ${body}`, latency_ms: Date.now() - t0 };
    }
    return { ok: true, latency_ms: Date.now() - t0 };
  } catch (err) {
    return { ok: false, error: `gemini fetch: ${String(err.message).slice(0, 160)}`, latency_ms: Date.now() - t0 };
  }
}

async function probeAnthropic(apiKey) {
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8,
        messages: [{ role: "user", content: "reply with the single word: ok" }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 160);
      return { ok: false, error: `anthropic ${res.status}: ${body}`, latency_ms: Date.now() - t0 };
    }
    return { ok: true, latency_ms: Date.now() - t0 };
  } catch (err) {
    return { ok: false, error: `anthropic fetch: ${String(err.message).slice(0, 160)}`, latency_ms: Date.now() - t0 };
  }
}

/** Pure state-transition logic — selftested without network. */
export function diffProviderStates(prev, current) {
  const changes = [];
  for (const [name, cur] of Object.entries(current)) {
    const before = prev?.[name]?.status || "unknown";
    if (cur.status === "down" && before !== "down" && before !== "unknown") {
      changes.push({ provider: name, kind: "DOWN", error: cur.error });
    } else if (cur.status === "down" && before === "unknown") {
      // First observation already down — still worth one alert.
      changes.push({ provider: name, kind: "DOWN", error: cur.error });
    } else if (cur.status === "up" && before === "down") {
      changes.push({ provider: name, kind: "RECOVERED" });
    }
    // no-key ↔ anything: silent (config state, not an outage)
  }
  return changes;
}

export function buildCardText(changes, current) {
  const lines = ["🔌 *provider-health* — LLM provider state change"];
  for (const c of changes) {
    lines.push(
      c.kind === "DOWN"
        ? `🔴 P1 ${c.provider} DOWN: ${c.error || "unknown error"}`
        : `✅ ${c.provider} recovered`
    );
    if (c.kind === "DOWN" && /429|depleted|quota|credit/i.test(c.error || "")) {
      lines.push(`   ↳ looks like billing/quota — top up or rotate keys`);
    }
  }
  const summary = Object.entries(current)
    .map(([n, s]) => `${n}:${s.status}${s.latency_ms ? ` ${s.latency_ms}ms` : ""}`)
    .join(" · ");
  lines.push(`— ${summary}`);
  return lines.join("\n");
}

async function queueCard(text, urgency, env, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] would queue ${urgency} card:\n${text}`);
    return;
  }
  if (!env.TELEGRAM_CHAT_ID) return;
  await fs.mkdir(OUTBOX, { recursive: true });
  await fs.writeFile(
    path.join(OUTBOX, `${Date.now()}-provider-health.json`),
    JSON.stringify(
      {
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
        urgency,
        queued_at: new Date().toISOString(),
        sent_at: null,
      },
      null,
      2
    )
  );
}

async function runOnce({ dryRun = false } = {}) {
  const env = await loadEnv();

  const current = {};
  if (env.GEMINI_API_KEY) {
    const r = await probeGemini(env.GEMINI_API_KEY);
    current.gemini = { status: r.ok ? "up" : "down", latency_ms: r.latency_ms, error: r.error || null };
  } else {
    current.gemini = { status: "no-key", latency_ms: null, error: null };
  }
  if (env.ANTHROPIC_API_KEY) {
    const r = await probeAnthropic(env.ANTHROPIC_API_KEY);
    current.anthropic = { status: r.ok ? "up" : "down", latency_ms: r.latency_ms, error: r.error || null };
  } else {
    current.anthropic = { status: "no-key", latency_ms: null, error: null };
  }

  let prevState = {};
  if (existsSync(STATE_FILE)) {
    try {
      prevState = JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
    } catch {
      /* first run */
    }
  }
  const prev = prevState.providers || {};

  const changes = diffProviderStates(prev, current);
  if (changes.length > 0) {
    const urgency = changes.some((c) => c.kind === "DOWN") ? "P1" : "P2";
    await queueCard(buildCardText(changes, current), urgency, env, dryRun);
  }

  // Streaks: consecutive checks in the current status.
  const streaks = {};
  for (const [name, cur] of Object.entries(current)) {
    const prevStreak = prevState.streaks?.[name];
    streaks[name] =
      prevStreak && prev[name]?.status === cur.status ? prevStreak + 1 : 1;
  }

  const out = {
    checked_at: new Date().toISOString(),
    providers: current,
    streaks,
  };
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  const tmp = `${STATE_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(out, null, 2));
  await fs.rename(tmp, STATE_FILE);

  console.log(
    `provider-health: ${Object.entries(current)
      .map(([n, s]) => `${n}=${s.status}`)
      .join(" ")} (${changes.length} change${changes.length === 1 ? "" : "s"})`
  );
}

// ---------------------------------------------------------------------------
async function selftest() {
  let pass = 0,
    fail = 0;
  const assert = (cond, name) => {
    if (cond) {
      pass++;
      console.log(`  ✓ ${name}`);
    } else {
      fail++;
      console.error(`  ✗ ${name}`);
    }
  };

  // up→down alerts
  let ch = diffProviderStates(
    { gemini: { status: "up" } },
    { gemini: { status: "down", error: "gemini 429: prepayment credits are depleted" } }
  );
  assert(ch.length === 1 && ch[0].kind === "DOWN", "up→down raises DOWN");

  // billing hint appears
  const text = buildCardText(ch, { gemini: { status: "down", latency_ms: 200 } });
  assert(text.includes("billing/quota"), "429/depleted errors get the billing hint");

  // down→down silent
  ch = diffProviderStates({ gemini: { status: "down" } }, { gemini: { status: "down", error: "x" } });
  assert(ch.length === 0, "down→down stays silent");

  // down→up recovers
  ch = diffProviderStates({ gemini: { status: "down" } }, { gemini: { status: "up" } });
  assert(ch.length === 1 && ch[0].kind === "RECOVERED", "down→up raises RECOVERED");

  // unknown→down still alerts once (the Jun-13 scenario: first probe after install finds it dead)
  ch = diffProviderStates({}, { gemini: { status: "down", error: "429" } });
  assert(ch.length === 1 && ch[0].kind === "DOWN", "first-observation-down alerts");

  // no-key transitions are silent
  ch = diffProviderStates({ anthropic: { status: "up" } }, { anthropic: { status: "no-key" } });
  assert(ch.length === 0, "no-key is config, not an outage");

  console.log(`\nselftest: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

const argv = process.argv.slice(2);
if (argv.includes("--selftest")) {
  selftest();
} else {
  runOnce({ dryRun: argv.includes("--dry-run") }).catch((err) => {
    console.error("FATAL:", err.message);
    process.exit(1);
  });
}
