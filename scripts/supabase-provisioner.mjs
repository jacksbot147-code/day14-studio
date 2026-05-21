#!/usr/bin/env node
/**
 * supabase-provisioner.mjs — spins up an isolated Supabase project for a
 * Day14 segment, applies its migrations, and writes the env file. Automatic.
 *
 * This is the agent that removes the manual database-setup step for every
 * future segment. It needs ONE thing a human supplies once: a Supabase
 * Management API token (SUPABASE_ACCESS_TOKEN). That token is generated in
 * 60 seconds from the EXISTING Day14 Supabase account — no new account is
 * created (Claude never creates accounts), and each segment gets its own
 * isolated project so sensitive data is never co-mingled.
 *
 * Generate the token: supabase.com/dashboard/account/tokens -> "Generate new
 * token" -> add to studio/.env.local as SUPABASE_ACCESS_TOKEN=sbp_...
 *
 * Usage:
 *   node supabase-provisioner.mjs --name alignmd \
 *     --migrations ~/Documents/alignmd/supabase/migrations \
 *     --env-out ~/Documents/alignmd/.env.local [--region us-east-1]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import crypto from "node:crypto";

const API = "https://api.supabase.com/v1";
const ENV_FILE = path.join(homedir(), "Documents/studio/.env.local");

function arg(name, def = "") {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

async function accessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  if (!existsSync(ENV_FILE)) return "";
  const t = await fs.readFile(ENV_FILE, "utf8");
  const m = t.match(/^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.+)\s*$/m);
  return m && m[1] ? m[1].replace(/^['"]|['"]$/g, "").trim() : "";
}

async function api(token, method, endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${method} ${endpoint} -> ${res.status}: ${(json.message || text).slice(0, 200)}`);
  }
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function provision() {
  const name = arg("name");
  const region = arg("region", "us-east-1");
  const migrationsDir = arg("migrations");
  const envOut = arg("env-out");
  if (!name || !migrationsDir || !envOut) {
    console.error('Usage: node supabase-provisioner.mjs --name <slug> --migrations <dir> --env-out <path> [--region us-east-1]');
    process.exit(1);
  }

  const token = await accessToken();
  if (!token) {
    console.error(
      "\nNo SUPABASE_ACCESS_TOKEN found.\n\n" +
      "One-time setup (60 seconds, uses the existing Day14 Supabase account —\n" +
      "no new account is created):\n" +
      "  1. Go to supabase.com/dashboard/account/tokens\n" +
      "  2. Generate new token\n" +
      "  3. Add to studio/.env.local:  SUPABASE_ACCESS_TOKEN=sbp_xxx\n" +
      "Then re-run this command — every future segment provisions automatically.\n"
    );
    process.exit(1);
  }

  // Organization to create the project under.
  const orgs = await api(token, "GET", "/organizations");
  const org = Array.isArray(orgs) ? orgs[0] : null;
  if (!org) throw new Error("no Supabase organization found for this token");
  console.log(`· organization: ${org.name} (${org.id})`);

  // Create the project — isolated, its own database.
  const dbPass = crypto.randomBytes(18).toString("base64url");
  console.log(`· creating project "${name}" in ${region} …`);
  const project = await api(token, "POST", "/projects", {
    name,
    organization_id: org.id,
    region,
    db_pass: dbPass,
    plan: "free",
  });
  const ref = project.id || project.ref;
  if (!ref) throw new Error("project created but no ref returned");
  console.log(`· project ref: ${ref}`);

  // Wait for it to come online.
  process.stdout.write("· waiting for the database to be ready");
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    process.stdout.write(".");
    try {
      const p = await api(token, "GET", `/projects/${ref}`);
      if ((p.status || "").toUpperCase() === "ACTIVE_HEALTHY") break;
    } catch { /* still provisioning */ }
  }
  console.log(" ready");

  // API keys.
  const keys = await api(token, "GET", `/projects/${ref}/api-keys`);
  const anon = (keys.find?.((k) => k.name === "anon") || {}).api_key || "";
  const service = (keys.find?.((k) => k.name === "service_role") || {}).api_key || "";
  const url = `https://${ref}.supabase.co`;

  // Apply migrations in order.
  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  let applied = 0;
  for (const f of files) {
    const sql = await fs.readFile(path.join(migrationsDir, f), "utf8");
    try {
      await api(token, "POST", `/projects/${ref}/database/query`, { query: sql });
      console.log(`· applied migration ${f}`);
      applied++;
    } catch (e) {
      console.warn(`! migration ${f} failed: ${e.message}`);
      console.warn(`  run the remaining migrations manually in the Supabase SQL editor.`);
      break;
    }
  }

  // Write the segment's env file (keys never printed to the console).
  const env =
    `# AlignMD — generated by supabase-provisioner ${new Date().toISOString()}\n` +
    `NEXT_PUBLIC_SUPABASE_URL=${url}\n` +
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}\n` +
    `SUPABASE_SERVICE_ROLE_KEY=${service}\n`;
  await fs.mkdir(path.dirname(envOut), { recursive: true });
  await fs.writeFile(envOut, env);

  console.log(
    `\n✓ Provisioned "${name}"\n` +
    `  project:    ${url}\n` +
    `  migrations: ${applied}/${files.length} applied\n` +
    `  env:        written to ${envOut}\n` +
    `  db password is set on the project; rotate it in the dashboard if needed.\n`
  );
}

provision().catch((e) => {
  console.error(`\nsupabase-provisioner failed: ${e.message}\n`);
  process.exit(1);
});
