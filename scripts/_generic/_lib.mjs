/**
 * _lib.mjs — shared utilities for generic content/marketing engines.
 *
 * All generic engines read tenant slug from process.argv[2] or env TENANT,
 * load constitution + brand-identity, write drafts to per-tenant folders.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

export const HOME = homedir();
export const BIZ = path.join(HOME, "Documents/businesses");
export const SHARED = path.join(BIZ, "_shared");
export const SHARED_OUTBOX = path.join(SHARED, "telegram/outbox");
export const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
export const TENANTS_FILE = path.join(SHARED, "tenants.json");

export const GEMINI_MODEL = "gemini-2.5-flash";
export const GEMINI_GROUNDED = "gemini-2.5-flash";
export const POLLINATIONS_MODEL = "flux";

export function tenantSlug() {
  const slug = process.argv[2] || process.env.TENANT;
  if (!slug) {
    console.error("Usage: <script>.mjs <tenant-slug>  (or set TENANT env var)");
    process.exit(1);
  }
  return slug;
}

export async function loadEnv() {
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

export async function loadTenant(slug) {
  const dir = path.join(BIZ, slug);
  const ctx = { slug, dir };
  const cPath = path.join(dir, "CONSTITUTION.md");
  if (existsSync(cPath)) ctx.constitution = await fs.readFile(cPath, "utf8");
  const iPath = path.join(dir, "brand-identity.json");
  if (existsSync(iPath)) ctx.identity = JSON.parse(await fs.readFile(iPath, "utf8"));
  const rPath = path.join(dir, "competitor-research.json");
  if (existsSync(rPath)) ctx.research = JSON.parse(await fs.readFile(rPath, "utf8"));
  if (existsSync(TENANTS_FILE)) {
    const data = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8"));
    ctx.tenant = (data.tenants || []).find((t) => t.slug === slug);
  }
  ctx.display_name = ctx.tenant?.display_name || slug;
  ctx.niche = ctx.tenant?.tagline || "";
  return ctx;
}

export async function audit(slug, record) {
  const f = path.join(BIZ, slug, "audit-log.jsonl");
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.appendFile(f, JSON.stringify({ ts: new Date().toISOString(), tenant: slug, ...record }) + "\n");
}

export async function callGemini(prompt, env, opts = {}) {
  const model = opts.model || GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: opts.temp ?? 0.7, maxOutputTokens: opts.maxTokens ?? 3000 },
  };
  if (opts.useGrounding) body.tools = [{ google_search: {} }];
  if (opts.systemPrompt) body.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export function parseJson(raw) {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const arrS = cleaned.indexOf("["), arrE = cleaned.lastIndexOf("]");
  const objS = cleaned.indexOf("{"), objE = cleaned.lastIndexOf("}");
  if (arrS !== -1 && (objS === -1 || arrS < objS)) return JSON.parse(cleaned.slice(arrS, arrE + 1));
  return JSON.parse(cleaned.slice(objS, objE + 1));
}

export async function callPollinations(prompt, opts = {}) {
  const enhanced = prompt + " High resolution. Print-ready quality.";
  const width = opts.width || 1024;
  const height = opts.height || 1024;
  const seed = opts.seed || Math.floor(Math.random() * 100000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced).slice(0, 1900)}?width=${width}&height=${height}&model=${POLLINATIONS_MODEL}&nologo=true&enhance=true&seed=${seed}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`pollinations ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5000) throw new Error("pollinations payload too small");
  return buf;
}

export async function queueTelegram(env, slug, text, urgency = "P3") {
  if (!env.TELEGRAM_CHAT_ID) return;
  await fs.mkdir(SHARED_OUTBOX, { recursive: true });
  await fs.writeFile(
    path.join(SHARED_OUTBOX, `${Date.now()}-${slug}-content.json`),
    JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
      urgency,
      queued_at: new Date().toISOString(),
      sent_at: null,
      tenant: slug,
    }, null, 2)
  );
}
