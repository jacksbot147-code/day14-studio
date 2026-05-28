/**
 * lib/skills/cc-nano-banana.mjs
 *
 * Node-side wrapper around the `cc-nano-banana` Claude skill at
 * ~/.claude/skills/cc-nano-banana. That skill drives Google's nano-banana
 * (gemini-2.5-flash-image) via the `gemini` CLI, so this wrapper:
 *
 *   1. Locates the `gemini` binary on $PATH (`which gemini`).
 *   2. When present, spawns a subprocess to run the model against a prompt
 *      and (optional) reference images. Returns `{ ok:true, output, meta }`.
 *   3. When absent (the common case in headless sandboxes), returns
 *      `{ ok:false, reason: "gemini CLI not installed" }` without throwing.
 *
 * No Anthropic call here — image gen is Google's path. The skill body lives
 * at ~/.claude/skills/cc-nano-banana/SKILL.md and is treated as reference
 * documentation we surface in `meta` rather than as a system prompt.
 *
 * Public surface:
 *   invokeNanoBanana({ prompt, images?, outDir? }, opts?) -> Promise<Result>
 *   findGeminiBinary() -> Promise<string|null>
 */

import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const execFileP = promisify(execFile);
const SKILL_NAME = "cc-nano-banana";
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

/**
 * Spawn the gemini CLI with the nano-banana model. The exact invocation the
 * upstream skill uses is roughly `gemini --model gemini-2.5-flash-image -p
 * <prompt>` with optional `--image <path>` repeats; we proxy that here.
 *
 * @param {string} bin - resolved path to the gemini binary
 * @param {{prompt: string, images?: string[], model?: string, outDir?: string}} input
 * @param {object} opts
 */
function runGemini(bin, input, opts) {
  return new Promise((resolve) => {
    const args = [];
    const model = opts.model || "gemini-2.5-flash-image";
    args.push("--model", model);
    args.push("-p", input.prompt);
    if (Array.isArray(input.images)) {
      for (const img of input.images) {
        args.push("--image", img);
      }
    }
    if (input.outDir) args.push("--out", input.outDir);

    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const killTimer = setTimeout(() => {
      child.kill("SIGKILL");
    }, opts.timeoutMs || 60000);

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
 * @param {{ prompt: string, images?: string[], outDir?: string }} input
 * @param {object} [opts]
 * @param {string} [opts.model]
 * @param {number} [opts.timeoutMs]
 * @param {string} [opts.bin] override binary path (testing)
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
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: "gemini CLI not installed",
    };
  }
  // SKILL.md is informational only here — we surface its presence in meta
  // so callers can see we routed to the right skill on disk.
  const skillDoc = await readSkillDoc();
  const result = await runGemini(bin, input, opts);
  if (!result.ok) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: result.reason,
      detail: result.detail,
      meta: { bin, hasSkillDoc: Boolean(skillDoc) },
    };
  }
  return {
    ok: true,
    skill: SKILL_NAME,
    output: result.stdout.trim(),
    meta: {
      bin,
      model: opts.model || "gemini-2.5-flash-image",
      hasSkillDoc: Boolean(skillDoc),
      stderr: result.stderr.trim() || undefined,
    },
  };
}
