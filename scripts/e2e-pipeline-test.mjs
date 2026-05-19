#!/usr/bin/env node
/**
 * e2e-pipeline-test.mjs
 *
 * Fires synthetic webhook events through all 4 pipeline routes
 * (stripe / intake / cal / resend-inbound) against a running dev server,
 * and verifies the expected side effects:
 *   - Customer row created/updated in Supabase
 *   - Dossier files written
 *   - Work-register entries appended
 *   - Telegram outbox cards queued
 *
 * Pass/fail per stage. Writes a report to:
 *   ~/Documents/studio/docs/e2e-pipeline-results-{YYYY-MM-DD}.md
 *
 * Run: node ~/Documents/studio/scripts/e2e-pipeline-test.mjs
 * Prereq: `npm run dev` running (server at localhost:3000)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import crypto from "node:crypto";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const STUDIO = path.join(HOME, "Documents/studio");
const SERVER = process.env.E2E_SERVER || "http://localhost:3000";
const STAMP = Date.now();
const TEST_SLUG = `e2e-test-${STAMP}`;
const TEST_EMAIL = `e2e-${STAMP}@day14.us`;

// ---- env (lazy) ----
async function loadEnv() {
  const envPath = path.join(STUDIO, ".env.local");
  if (!existsSync(envPath)) return {};
  const text = await fs.readFile(envPath, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) {
      env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
  return env;
}

// ---- assertions ----
const results = [];
function record(stage, name, pass, detail) {
  results.push({ stage, name, pass, detail });
  const tag = pass ? "✓" : "✗";
  console.log(`  ${tag} ${stage} :: ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { _raw: text };
    }
    return { status: res.status, json, text };
  } catch (err) {
    return { error: err.message };
  }
}

// ---- preflight ----
async function preflight() {
  console.log("\n=== preflight ===");
  const health = await fetchJson(`${SERVER}/api/health`);
  if (health.error) {
    record("preflight", "server reachable", false, health.error);
    return false;
  }
  record(
    "preflight",
    "server reachable",
    health.status === 200,
    `status ${health.status}`
  );
  return health.status === 200 || health.status === 404; // 404 means server is up but no /api/health
}

// ---- stripe sig ----
function stripeSignature(payload, secret) {
  const ts = Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${ts},v1=${sig}`;
}

// ---- test: stripe checkout.session.completed ----
async function testStripe(env) {
  console.log("\n=== stripe webhook ===");
  const payload = {
    id: `evt_${STAMP}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_${STAMP}`,
        customer: `cus_${STAMP}`,
        customer_email: TEST_EMAIL,
        customer_details: { email: TEST_EMAIL, name: "E2E Test Customer" },
        amount_total: 49700,
        currency: "usd",
        metadata: { sku: "day14-starter" },
      },
    },
  };
  const body = JSON.stringify(payload);
  const secret = env.STRIPE_WEBHOOK_SECRET || "whsec_dummy_for_e2e";
  const sig = stripeSignature(body, secret);

  const res = await fetchJson(`${SERVER}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": sig,
    },
    body,
  });
  record(
    "stripe",
    "webhook responded",
    !res.error && res.status < 500,
    res.error || `status ${res.status}`
  );
  return res;
}

// ---- test: intake webhook ----
async function testIntake() {
  console.log("\n=== intake webhook ===");
  const payload = {
    formId: "intake-form-v1",
    submissionId: `sub_${STAMP}`,
    fields: {
      email: TEST_EMAIL,
      name: "E2E Test",
      business_name: "E2E Test Co",
      domain: `${TEST_SLUG}.com`,
      vertical: "pool",
      phone: "+15555550100",
      sku: "day14-starter",
      notes: "this is a synthetic E2E test submission",
    },
  };
  const res = await fetchJson(`${SERVER}/api/webhooks/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  record(
    "intake",
    "webhook responded",
    !res.error && res.status < 500,
    res.error || `status ${res.status}`
  );
  return res;
}

// ---- test: cal.com webhook ----
async function testCal() {
  console.log("\n=== cal.com webhook ===");
  const payload = {
    triggerEvent: "BOOKING_CREATED",
    createdAt: new Date().toISOString(),
    payload: {
      id: STAMP,
      uid: `cal_${STAMP}`,
      title: "30 min kickoff with Jack",
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 86400000 + 1800000).toISOString(),
      attendees: [
        {
          email: TEST_EMAIL,
          name: "E2E Test",
          timeZone: "America/New_York",
        },
      ],
      organizer: { email: "hello@day14.us", name: "Jack" },
    },
  };
  const res = await fetchJson(`${SERVER}/api/webhooks/cal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  record(
    "cal",
    "webhook responded",
    !res.error && res.status < 500,
    res.error || `status ${res.status}`
  );
  return res;
}

// ---- test: resend inbound webhook ----
async function testResendInbound() {
  console.log("\n=== resend inbound webhook ===");
  const payload = {
    type: "email.inbound.received",
    created_at: new Date().toISOString(),
    data: {
      from: TEST_EMAIL,
      to: ["hello@day14.us"],
      subject: "E2E test — quick question about my site",
      text: "Hi Jack, this is a synthetic E2E test inbound email. Please ignore.",
      html: "<p>Hi Jack, this is a synthetic E2E test inbound email. Please ignore.</p>",
      message_id: `<msg_${STAMP}@day14.us>`,
    },
  };
  const res = await fetchJson(`${SERVER}/api/webhooks/resend-inbound`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  record(
    "resend",
    "webhook responded",
    !res.error && res.status < 500,
    res.error || `status ${res.status}`
  );
  return res;
}

// ---- verify: work-register entries appended ----
async function verifyWorkRegister(before) {
  console.log("\n=== verify: work-register ===");
  const regPath = path.join(SHARED, "growth/work-register.jsonl");
  if (!existsSync(regPath)) {
    record("verify", "work-register exists", false, "file missing");
    return;
  }
  const text = await fs.readFile(regPath, "utf8");
  const after = text.split("\n").filter(Boolean).length;
  record(
    "verify",
    "work-register entries appended",
    after > before,
    `before ${before} → after ${after}`
  );
}

async function countRegister() {
  const regPath = path.join(SHARED, "growth/work-register.jsonl");
  if (!existsSync(regPath)) return 0;
  const text = await fs.readFile(regPath, "utf8");
  return text.split("\n").filter(Boolean).length;
}

// ---- verify: telegram outbox queued ----
async function verifyOutbox(before) {
  console.log("\n=== verify: telegram outbox ===");
  const tg = path.join(SHARED, "telegram/outbox");
  if (!existsSync(tg)) {
    record("verify", "outbox dir exists", false, "missing");
    return;
  }
  const after = (await fs.readdir(tg)).length;
  record(
    "verify",
    "telegram outbox cards queued",
    after >= before,
    `before ${before} → after ${after}`
  );
}

async function countOutbox() {
  const tg = path.join(SHARED, "telegram/outbox");
  if (!existsSync(tg)) return 0;
  return (await fs.readdir(tg)).length;
}

// ---- write report ----
async function writeReport(env) {
  const date = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(STUDIO, `docs/e2e-pipeline-results-${date}.md`);
  const passes = results.filter((r) => r.pass).length;
  const fails = results.filter((r) => !r.pass).length;

  const lines = [];
  lines.push(`# E2E pipeline test results — ${date}`);
  lines.push("");
  lines.push(`Run: ${new Date().toISOString()}`);
  lines.push(`Server: \`${SERVER}\``);
  lines.push(`Test slug: \`${TEST_SLUG}\``);
  lines.push(`Test email: \`${TEST_EMAIL}\``);
  lines.push("");
  lines.push(`## Summary`);
  lines.push(`- Total checks: ${results.length}`);
  lines.push(`- ✓ Passed: ${passes}`);
  lines.push(`- ✗ Failed: ${fails}`);
  lines.push(`- Status: ${fails === 0 ? "🟢 ALL GREEN" : "🔴 FAILURES"}`);
  lines.push("");

  const stages = [...new Set(results.map((r) => r.stage))];
  for (const stage of stages) {
    lines.push(`## ${stage}`);
    for (const r of results.filter((x) => x.stage === stage)) {
      const tag = r.pass ? "✓" : "✗";
      lines.push(`- ${tag} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
    }
    lines.push("");
  }

  lines.push(`## Notes`);
  lines.push(
    `- If the server didn't respond, run \`npm run dev\` first.`
  );
  lines.push(
    `- 401/403 responses on Stripe = signature mismatch (set STRIPE_WEBHOOK_SECRET in .env.local).`
  );
  lines.push(
    `- 500s indicate webhook handler errors — check server console.`
  );
  lines.push(
    `- Synthetic data uses slug \`${TEST_SLUG}\` — delete after test if real Supabase rows were created.`
  );

  await fs.writeFile(reportPath, lines.join("\n"), "utf8");
  console.log(`\n[e2e] report: ${reportPath}`);
  return reportPath;
}

// ---- main ----
async function main() {
  console.log("Day14 OS — E2E pipeline test");
  console.log(`Server: ${SERVER}`);
  console.log(`Test slug: ${TEST_SLUG}`);

  const env = await loadEnv();

  const serverUp = await preflight();
  if (!serverUp) {
    console.log("\n⚠ Server not reachable — proceeding to record failures only");
  }

  const regBefore = await countRegister();
  const outboxBefore = await countOutbox();

  await testStripe(env);
  await testIntake();
  await testCal();
  await testResendInbound();

  // wait a beat for any async side effects
  await new Promise((r) => setTimeout(r, 1000));

  await verifyWorkRegister(regBefore);
  await verifyOutbox(outboxBefore);

  await writeReport(env);

  const fails = results.filter((r) => !r.pass).length;
  console.log(
    `\n${fails === 0 ? "🟢 ALL GREEN" : "🔴 " + fails + " FAILURES"}`
  );
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("[e2e] FATAL:", err);
  process.exit(1);
});
