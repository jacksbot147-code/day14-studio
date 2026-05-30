/**
 * lib/skills/cc-nano-banana.mjs
 *
 * Real bridge for the `cc-nano-banana` Claude plugin that lives at
 * ~/.claude/plugins/cc-nano-banana (Gemini-based image gen via the
 * `gemini-2.5-flash-image` model).
 *
 * Public surface for the runtime (the contract Day14 T15 calls):
 *
 *   generateImage({ prompt, size = "1024x1024", style = "photo", tenant })
 *     -> { path, cached, ok, reason? }
 *
 *   - Cache key: sha256(prompt + size + style)
 *   - Cache path: <studio>/public/data/cache/banana/<hash>.png
 *   - Cache hit -> returns immediately with { ok:true, cached:true, path }
 *   - No GEMINI_API_KEY -> writes a deterministic placeholder card
 *     (400x400 PNG, brand teal, prompt embedded as tEXt metadata) to the
 *     same cache path and returns { ok:false, cached:false, reason:"no-key",
 *     path } so downstream callers that paste the path into <img src=…>
 *     don't break.
 *
 * Every call appends a single audit line to <studio>/WORK-LOG.md so we can
 * audit Gemini spend later. The bridge is non-throwing on expected failure
 * paths (the daemon contract).
 *
 * Back-compat exports kept so existing callers don't break:
 *   - findGeminiBinary()
 *   - invokeNanoBanana({ prompt, images?, outDir? }, opts?)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import zlib from "node:zlib";
import { checkBudget, recordBudgetUse } from "../budget-gate.mjs";

const execFileP = promisify(execFile);
const SKILL_NAME = "cc-nano-banana";
const NANO_BANANA_MODEL = "gemini-2.5-flash-image";
const BUDGET_DOMAIN = "banana";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// scripts/lib/skills/<this file> -> studio root is three dirs up.
const STUDIO_ROOT = path.resolve(HERE, "..", "..", "..");
const CACHE_DIR = path.join(STUDIO_ROOT, "public", "data", "cache", "banana");
const WORK_LOG = path.join(STUDIO_ROOT, "WORK-LOG.md");

// ---------- cache helpers ------------------------------------------------

function cacheKey(prompt, size, style) {
  return createHash("sha256")
    .update(String(prompt))
    .update(":")
    .update(String(size))
    .update(":")
    .update(String(style))
    .digest("hex");
}

function cachePathFor(hash) {
  return path.join(CACHE_DIR, `${hash}.png`);
}

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// ---------- work-log append ---------------------------------------------

async function appendWorkLog(line) {
  try {
    // Newline-prefixed so we never collide with the tail of an existing entry.
    await fs.appendFile(WORK_LOG, `\n${line}\n`, "utf8");
  } catch {
    // Audit logging must never break the hot path.
  }
}

function isoNow() {
  return new Date().toISOString();
}

// ---------- placeholder PNG encoder (zero-dep) ---------------------------
//
// Writes a valid 400x400 PNG filled with brand-teal #0F766E plus a tEXt
// chunk that carries the original prompt. Pure-Node, no canvas dep. We
// can't rasterize glyphs without a font engine, so the "prompt text" lives
// in PNG metadata — image viewers that inspect chunks (Preview's Inspector,
// `exiftool -tEXt:Prompt`, `pngcheck -t`) will show it.

function makeCrcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n >>> 0;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) >>> 0 : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
}
const CRC_TABLE = makeCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePlaceholderPng({ width = 400, height = 400, rgb = [15, 118, 110], textChunks = [] } = {}) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(2, 9); // color type: RGB
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const rowLen = 1 + width * 3;
  const raw = Buffer.alloc(rowLen * height);
  const [r, g, b] = rgb;
  for (let y = 0; y < height; y++) {
    const off = y * rowLen;
    raw[off] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const p = off + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }
  const idat = zlib.deflateSync(raw);

  const chunks = [pngChunk("IHDR", ihdr)];
  for (const [k, v] of textChunks) {
    const safeK = String(k).slice(0, 79);
    const safeV = String(v).slice(0, 4096);
    chunks.push(
      pngChunk(
        "tEXt",
        Buffer.concat([Buffer.from(safeK, "latin1"), Buffer.from([0]), Buffer.from(safeV, "latin1")]),
      ),
    );
  }
  chunks.push(pngChunk("IDAT", idat));
  chunks.push(pngChunk("IEND", Buffer.alloc(0)));
  return Buffer.concat([sig, ...chunks]);
}

async function writePlaceholderCard({ prompt, size, style, tenant, destPath }) {
  await ensureCacheDir();
  const png = makePlaceholderPng({
    width: 400,
    height: 400,
    rgb: [15, 118, 110], // brand teal
    textChunks: [
      ["Software", "day14-studio/cc-nano-banana-bridge"],
      ["Prompt", prompt],
      ["Size", size],
      ["Style", style],
      ["Tenant", tenant || ""],
      ["Placeholder", "no-GEMINI_API_KEY"],
    ],
  });
  await fs.writeFile(destPath, png);
}

// ---------- Gemini REST call (matches src/lib/skills/image-generator.ts) -

function parseSize(size) {
  const m = /^(\d+)\s*x\s*(\d+)$/i.exec(String(size).trim());
  if (!m) return { width: 1024, height: 1024 };
  return { width: Number(m[1]), height: Number(m[2]) };
}

function aspectRatioFor(size) {
  const { width, height } = parseSize(size);
  // Map to the closest Imagen-supported ratio. Nano-banana itself ignores
  // this, but we keep the field so future Imagen-path swaps are trivial.
  if (width === height) return "1:1";
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.1) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.1) return "9:16";
  if (Math.abs(ratio - 4 / 3) < 0.1) return "4:3";
  if (Math.abs(ratio - 3 / 4) < 0.1) return "3:4";
  return "1:1";
}

function styledPrompt(prompt, style) {
  const s = (style || "photo").toLowerCase();
  if (s === "photo") return `${prompt}. Photographic, natural lighting, sharp focus.`;
  if (s === "illustration") return `${prompt}. Clean vector illustration, flat shading.`;
  if (s === "abstract") return `${prompt}. Abstract, painterly, no text.`;
  if (s === "minimal") return `${prompt}. Minimalist composition, generous negative space.`;
  return `${prompt}. Style: ${style}.`;
}

async function callGemini({ prompt, size, style, apiKey }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${NANO_BANANA_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: styledPrompt(prompt, style) }] }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
  };
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, reason: "network-error", detail: String(err?.message || err) };
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return {
      ok: false,
      reason: `gemini-http-${res.status}`,
      detail: errText.slice(0, 300),
    };
  }
  let data;
  try {
    data = await res.json();
  } catch (err) {
    return { ok: false, reason: "gemini-bad-json", detail: String(err?.message || err) };
  }
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const inlineB64 = parts.map((p) => p?.inlineData?.data).find((d) => typeof d === "string" && d.length > 0);
  if (!inlineB64) {
    return { ok: false, reason: "gemini-no-image", detail: "candidates[0].content.parts had no inlineData" };
  }
  const buf = Buffer.from(inlineB64, "base64");
  // Size param is requested but not enforced server-side; we record what we asked for.
  void parseSize(size);
  return { ok: true, buffer: buf };
}

// ---------- public: generateImage ---------------------------------------

/**
 * Generate (or fetch-from-cache) an image for the given prompt.
 *
 * @param {object} input
 * @param {string} input.prompt
 * @param {string} [input.size="1024x1024"]   "WxH" string, e.g. "256x256"
 * @param {string} [input.style="photo"]      "photo" | "illustration" | "abstract" | "minimal" | custom
 * @param {string} [input.tenant]             tenant slug, used in audit log only
 * @returns {Promise<{ path: string, cached: boolean, ok: boolean, reason?: string }>}
 */
export async function generateImage({ prompt, size = "1024x1024", style = "photo", tenant } = {}) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    return {
      ok: false,
      cached: false,
      path: "",
      reason: "bad-input: prompt must be a non-empty string",
    };
  }

  await ensureCacheDir();

  const hash = cacheKey(prompt, size, style);
  const destPath = cachePathFor(hash);

  // Cache hit -> return immediately, log a 1-line audit entry.
  if (await pathExists(destPath)) {
    await appendWorkLog(
      `${isoNow()} cc-nano-banana cache-hit hash=${hash.slice(0, 12)} size=${size} style=${style} tenant=${tenant || "-"} prompt="${prompt.slice(0, 80)}"`,
    );
    return { ok: true, cached: true, path: destPath };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    await writePlaceholderCard({ prompt, size, style, tenant, destPath });
    await appendWorkLog(
      `${isoNow()} cc-nano-banana placeholder no-key hash=${hash.slice(0, 12)} size=${size} style=${style} tenant=${tenant || "-"} prompt="${prompt.slice(0, 80)}"`,
    );
    return { ok: false, cached: false, path: destPath, reason: "no-key" };
  }

  // Budget gate (E6) — soft governor before the paid Gemini call. Cache
  // hits and placeholders above are free and stay outside the gate; only
  // a real external call consumes budget. On gate-block, write a
  // placeholder so downstream <img> tags don't 404.
  const gate = await checkBudget(BUDGET_DOMAIN);
  if (!gate.allowed) {
    await writePlaceholderCard({ prompt, size, style, tenant, destPath });
    await appendWorkLog(
      `${isoNow()} cc-nano-banana budget-gate ${gate.reason} hash=${hash.slice(0, 12)} size=${size} style=${style} tenant=${tenant || "-"} prompt="${prompt.slice(0, 80)}"`,
    );
    return {
      ok: false,
      cached: false,
      path: destPath,
      reason: `budget-gate: ${gate.reason}`,
    };
  }

  const result = await callGemini({ prompt, size, style, apiKey });
  if (!result.ok || !result.buffer) {
    // Hard fail: still write a placeholder so downstream <img> tags don't 404.
    await writePlaceholderCard({ prompt, size, style, tenant, destPath });
    await appendWorkLog(
      `${isoNow()} cc-nano-banana fail reason=${result.reason} hash=${hash.slice(0, 12)} size=${size} style=${style} tenant=${tenant || "-"} prompt="${prompt.slice(0, 80)}"`,
    );
    return { ok: false, cached: false, path: destPath, reason: result.reason };
  }

  await fs.writeFile(destPath, result.buffer);
  // Record use on success only — failed calls don't consume budget.
  try {
    await recordBudgetUse(BUDGET_DOMAIN, 1);
  } catch {
    // counters are best-effort; never let a counter write fail the call.
  }
  await appendWorkLog(
    `${isoNow()} cc-nano-banana gen ok hash=${hash.slice(0, 12)} bytes=${result.buffer.length} size=${size} style=${style} tenant=${tenant || "-"} prompt="${prompt.slice(0, 80)}"`,
  );
  return { ok: true, cached: false, path: destPath };
}

// ---------- back-compat: gemini CLI subprocess path ---------------------

const SKILL_DIR = path.join(homedir(), ".claude", "skills", "cc-nano-banana");

/** Resolve `gemini` on PATH. Returns the absolute path or null. */
export async function findGeminiBinary() {
  try {
    const { stdout } = await execFileP("which", ["gemini"], { timeout: 2000 });
    const out = stdout.trim();
    return out || null;
  } catch {
    return null;
  }
}

async function readSkillDoc() {
  const p = path.join(SKILL_DIR, "SKILL.md");
  if (!existsSync(p)) return null;
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

function runGeminiCli(bin, input, opts) {
  return new Promise((resolve) => {
    const args = [];
    const model = opts.model || NANO_BANANA_MODEL;
    args.push("--model", model);
    args.push("-p", input.prompt);
    if (Array.isArray(input.images)) {
      for (const img of input.images) args.push("--image", img);
    }
    if (input.outDir) args.push("--out", input.outDir);

    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const killTimer = setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs || 60000);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(killTimer);
      resolve({ ok: false, reason: "gemini spawn failed", detail: err.message });
    });
    child.on("close", (code) => {
      clearTimeout(killTimer);
      if (code !== 0) {
        resolve({
          ok: false,
          reason: `gemini exited with code ${code}`,
          detail: stderr.trim() || stdout.trim(),
        });
      } else {
        resolve({ ok: true, stdout, stderr });
      }
    });
  });
}

/**
 * Original wrapper kept for callers that already speak the
 * { prompt, images, outDir } shape. New code should use generateImage().
 */
export async function invokeNanoBanana(input, opts = {}) {
  if (!input || typeof input.prompt !== "string" || !input.prompt.trim()) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: "cc-nano-banana expects { prompt: string, images?: string[], outDir?: string }",
    };
  }
  const bin = opts.bin || (await findGeminiBinary());
  if (!bin) {
    // No CLI -> fall back to the REST bridge so callers still get something.
    const gen = await generateImage({
      prompt: input.prompt,
      size: opts.size || "1024x1024",
      style: opts.style || "photo",
      tenant: opts.tenant,
    });
    return {
      ok: gen.ok,
      skill: SKILL_NAME,
      output: gen.path,
      reason: gen.ok ? undefined : gen.reason,
      meta: { path: gen.path, cached: gen.cached, via: "rest" },
    };
  }
  const skillDoc = await readSkillDoc();
  const result = await runGeminiCli(bin, input, opts);
  if (!result.ok) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: result.reason,
      detail: result.detail,
      meta: { bin, hasSkillDoc: Boolean(skillDoc), via: "cli" },
    };
  }
  return {
    ok: true,
    skill: SKILL_NAME,
    output: result.stdout.trim(),
    meta: {
      bin,
      model: opts.model || NANO_BANANA_MODEL,
      hasSkillDoc: Boolean(skillDoc),
      stderr: result.stderr.trim() || undefined,
      via: "cli",
    },
  };
}

// ---------- internal exports for testing -------------------------------

export const __internals = {
  cacheKey,
  cachePathFor,
  makePlaceholderPng,
  parseSize,
  aspectRatioFor,
  styledPrompt,
  CACHE_DIR,
  WORK_LOG,
  STUDIO_ROOT,
};
