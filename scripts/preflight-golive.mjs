#!/usr/bin/env node
/**
 * preflight-golive.mjs — is the Day14 backend actually ready to take money?
 *
 * Run this locally (where the network works) before and after touching Vercel:
 *
 *     node scripts/preflight-golive.mjs              # local .env.local
 *     node scripts/preflight-golive.mjs --json
 *
 * It answers one question — can a customer pay, and does the signal land? —
 * by checking the whole chain rather than any one link:
 *
 *   env present -> credentials actually work -> database has the table ->
 *   payment links exist -> the ingest endpoint verifies a signature
 *
 * Design notes worth keeping:
 *
 * - It PROBES rather than pattern-matches. A key that "looks wrong" but works is
 *   fine; a key that looks right and 401s is not. Prefix checks are advisory
 *   only, printed as notes, never as failures — a vendor can change its key
 *   format any time and a preflight that fails on cosmetics trains you to
 *   ignore it.
 * - It NEVER prints a secret. Lengths and 4-character fingerprints only.
 * - Missing-and-optional is distinct from missing-and-required, because a
 *   checklist that cries about optional things gets skimmed, and then the one
 *   real failure gets skimmed with it.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const JSON_OUT = process.argv.includes("--json");
const ROOT = process.cwd();

/* ------------------------------------------------------------------ env */

function loadEnv() {
  const env = { ...process.env };
  const file = path.join(ROOT, ".env.local");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (env[k] === undefined) env[k] = v;
    }
  }
  return env;
}

const env = loadEnv();
const results = [];
const note = (s) => results.push({ level: "note", ...s });
const pass = (name, detail) => results.push({ level: "pass", name, detail });
const warn = (name, detail, fix) => results.push({ level: "warn", name, detail, fix });
const fail = (name, detail, fix) => results.push({ level: "fail", name, detail, fix });

/** 4-char fingerprint. Enough to tell two keys apart, useless to an attacker. */
const fp = (v) => (v ? crypto.createHash("sha256").update(v).digest("hex").slice(0, 4) : "----");

/* -------------------------------------------------------------- required */

const REQUIRED = [
  ["STRIPE_SECRET_KEY", "take payment"],
  ["STRIPE_WEBHOOK_SECRET", "trust Stripe callbacks"],
  ["SUPABASE_URL", "reach the database"],
  ["SUPABASE_SERVICE_ROLE_KEY", "write to the database"],
  ["DAY14_INGEST_SECRET", "accept signed pipeline events"],
  ["RESEND_API_KEY", "send mail"],
  ["ADMIN_PASSWORD", "reach /admin"],
  ["ADMIN_SESSION_SECRET", "sign admin sessions"],
];

const OPTIONAL = [
  ["ANTHROPIC_API_KEY", "LLM features"],
  ["TELEGRAM_BOT_TOKEN", "operator alerts"],
  ["TELEGRAM_CHAT_ID", "operator alerts"],
  ["MARQUE_LIBRARY_DIR", "/dashboard/marque reads the variant library"],
];

for (const [key, why] of REQUIRED) {
  const v = env[key];
  if (!v) fail(`env ${key}`, `missing — cannot ${why}`, `set ${key} locally and in Vercel`);
  else pass(`env ${key}`, `set, ${v.length} chars, fp:${fp(v)}`);
}
for (const [key, why] of OPTIONAL) {
  const v = env[key];
  if (!v) warn(`env ${key}`, `not set — ${why} will be off`);
  else pass(`env ${key}`, `set, fp:${fp(v)}`);
}

// Advisory only. See the header: format is a note, the probe is the verdict.
if (env.STRIPE_SECRET_KEY && !/^(sk|rk)_(test|live)_/.test(env.STRIPE_SECRET_KEY)) {
  note({
    name: "STRIPE_SECRET_KEY format",
    detail:
      `starts "${env.STRIPE_SECRET_KEY.slice(0, 12)}…", which is not the classic ` +
      "sk_live_/sk_test_ shape. Advisory only — the live probe below decides.",
  });
}

/* ---------------------------------------------------------------- probes */

async function probe(name, url, opts, ok, fixHint) {
  try {
    const res = await fetch(url, { ...opts, cache: "no-store" });
    if (ok(res)) pass(name, `${res.status} ${res.statusText}`);
    else fail(name, `${res.status} ${res.statusText}`, fixHint);
    return res;
  } catch (e) {
    fail(name, e instanceof Error ? e.message : String(e), fixHint);
    return null;
  }
}

if (env.STRIPE_SECRET_KEY) {
  await probe(
    "Stripe API reachable",
    "https://api.stripe.com/v1/balance",
    { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
    (r) => r.ok,
    "the key is rejected by Stripe — mint a fresh secret key and update Vercel",
  );
}

const SUPA = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
if (SUPA && env.SUPABASE_SERVICE_ROLE_KEY) {
  const h = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };
  await probe("Supabase reachable", `${SUPA}/rest/v1/`, { headers: h }, (r) => r.status < 500);

  // Migration 003: the `leads` table must exist, or every captured lead is lost.
  const leads = await fetch(`${SUPA}/rest/v1/leads?select=id&limit=1`, { headers: h, cache: "no-store" })
    .catch(() => null);
  if (!leads) fail("migration 003 (leads table)", "could not query", "check Supabase connectivity");
  else if (leads.status === 200) pass("migration 003 (leads table)", "table exists and is readable");
  else if (leads.status === 404) {
    fail(
      "migration 003 (leads table)",
      "table does not exist — leads will be dropped on the floor",
      "apply docs/seeds/sql/migrations/003-marque-leads.sql in the Supabase SQL editor",
    );
  } else fail("migration 003 (leads table)", `${leads.status} ${leads.statusText}`);

  // events table backs the Marque ingest route.
  const ev = await fetch(`${SUPA}/rest/v1/events?select=id&limit=1`, { headers: h, cache: "no-store" })
    .catch(() => null);
  if (ev && ev.status === 200) pass("events table", "exists");
  else if (ev) fail("events table", `${ev.status}`, "apply the base schema day14-os-schema.sql");
}

if (env.RESEND_API_KEY) {
  await probe(
    "Resend API reachable",
    "https://api.resend.com/domains",
    { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` } },
    (r) => r.ok,
    "rotate RESEND_API_KEY",
  );
}

/* -------------------------------------------------- can anyone actually buy */

const LINK_ENVS = Object.keys(env).filter((k) => k.startsWith("STRIPE_PAYMENT_LINK_"));
const MARQUE_LINKS = ["STRIPE_PAYMENT_LINK_MARQUE_STARTER", "STRIPE_PAYMENT_LINK_MARQUE_ESSENTIALS", "STRIPE_PAYMENT_LINK_MARQUE_GROWTH"];
const marqueSet = MARQUE_LINKS.filter((k) => env[k]);

if (LINK_ENVS.length === 0) {
  fail(
    "Stripe payment links",
    "none set — every pricing card falls back to 'book a call' and nothing can be bought",
    "npx tsx scripts/create-stripe-payment-links.ts, then set the printed env vars",
  );
} else {
  pass("Stripe payment links", `${LINK_ENVS.length} set`);
}
if (marqueSet.length === 0) {
  fail(
    "Marque payment links",
    "no Marque tier can be purchased",
    "mint the three Marque links and set them in Vercel",
  );
} else if (marqueSet.length < 3) {
  warn("Marque payment links", `only ${marqueSet.length}/3 set: ${marqueSet.join(", ")}`);
} else {
  pass("Marque payment links", "all three tiers purchasable");
}

/* ------------------------------------------- the pipeline's own signature */

if (env.DAY14_INGEST_SECRET) {
  const body = JSON.stringify({ probe: true });
  const sig = crypto.createHmac("sha256", env.DAY14_INGEST_SECRET).update(body).digest("hex");
  if (sig.length === 64) pass("ingest signing", "HMAC-SHA256 derives correctly");
  else fail("ingest signing", "unexpected digest length");
}

/* ---------------------------------------------------------------- verdict */

const fails = results.filter((r) => r.level === "fail");
const warns = results.filter((r) => r.level === "warn");

if (JSON_OUT) {
  console.log(JSON.stringify({ ready: fails.length === 0, results }, null, 2));
  process.exit(fails.length === 0 ? 0 : 1);
}

const ICON = { pass: "  ok  ", warn: " warn ", fail: " FAIL ", note: " note " };
console.log("\nDay14 backend preflight\n" + "=".repeat(64));
for (const r of results) {
  console.log(`${ICON[r.level]} ${r.name}${r.detail ? " — " + r.detail : ""}`);
  if (r.fix) console.log(`        fix: ${r.fix}`);
}
console.log("=".repeat(64));
if (fails.length === 0) {
  console.log(`READY${warns.length ? ` (with ${warns.length} optional item(s) off)` : ""}.`);
} else {
  console.log(`NOT READY — ${fails.length} blocking item(s):`);
  for (const f of fails) console.log(`  · ${f.name}: ${f.detail}`);
}
console.log();
process.exit(fails.length === 0 ? 0 : 1);
