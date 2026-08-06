/**
 * The local Ollama backstop in scripts/_generic/llm-call.mjs.
 *
 * WHY THIS EXISTS. As of 2026-08-06 the fleet had gone ~267 consecutive
 * dual-provider failures ("Your credit balance is too low"), and the LLM ledger
 * recorded calls against `anthropic` and `gemini` only — never `local`. That
 * made a continuity measure which had never once connected look identical to
 * one that was never attempted, because a connection error escaped callLocal
 * through `finally` and was swallowed by the caller.
 *
 * These tests pin both halves: the local leg actually serves a request when
 * something is listening, and it reports its own failure when nothing is.
 *
 * No network and no real provider — a stand-in Ollama is served on loopback,
 * and HOME is redirected so the ledger write cannot touch the real file.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { AddressInfo } from "node:net";

const MODULE = "../scripts/_generic/llm-call.mjs";

type LlmResult = {
  ok: boolean;
  text?: string;
  error?: string;
  provider?: string;
  grounded?: boolean;
  degraded?: boolean;
};
type LlmCall = (opts: Record<string, unknown>) => Promise<LlmResult>;

let TMP_HOME: string;
let LEDGER_PATH: string;
let server: http.Server | null = null;
const ORIGINAL = { ...process.env };

/** A stand-in Ollama. `mode` decides how it answers /api/chat. */
async function serve(mode: "ok" | "500"): Promise<number> {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.url !== "/api/chat" || mode === "500") {
        res.writeHead(mode === "500" ? 500 : 404);
        res.end("nope");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          message: { role: "assistant", content: "pong from the local backstop" },
          prompt_eval_count: 12,
          eval_count: 7,
        }),
      );
    });
  });
  await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
  return (server!.address() as AddressInfo).port;
}

async function freshCall(): Promise<LlmCall> {
  const mod = (await import(`${MODULE}?t=${Math.random()}`)) as { llmCall: LlmCall };
  return mod.llmCall;
}

beforeAll(async () => {
  // ONE home for the whole file, deliberately. scripts/lib/llm-ledger.mjs
  // resolves its path from HOME at MODULE LOAD, not per call — so a per-test
  // home would be captured on the first import and every later test would
  // assert against a directory the ledger is no longer writing to.
  TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "llm-local-"));
  LEDGER_PATH = path.join(TMP_HOME, "Documents/studio/public/data/ops/.llm-ledger.json");
  await fs.mkdir(path.dirname(LEDGER_PATH), { recursive: true });
});

afterAll(async () => {
  await fs.rm(TMP_HOME, { recursive: true, force: true }).catch(() => {});
});

beforeEach(async () => {
  // Point the ledger at the sandbox so a test can never append to the real one.
  process.env.HOME = TMP_HOME;
  await fs.rm(LEDGER_PATH, { force: true }).catch(() => {});
  // No cloud provider, so routing must reach the local leg.
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GEMINI_API_KEY;
  process.env.DAY14_LOCAL_FALLBACK = "1";
  process.env.DAY14_AGENT_CONTEXT = "0";
});

afterEach(async () => {
  if (server) {
    await new Promise<void>((r) => server!.close(() => r()));
    server = null;
  }
  process.env = { ...ORIGINAL };
});

describe("llm-call — the local backstop", () => {
  it("serves a request when Ollama is reachable", async () => {
    const port = await serve("ok");
    process.env.DAY14_OLLAMA_URL = `http://127.0.0.1:${port}`;
    const llmCall = await freshCall();
    const r = await llmCall({ prompt: "ping", maxTokens: 8 });

    expect(r.ok).toBe(true);
    expect(r.provider).toBe("local");
    expect(r.text).toContain("pong");
  });

  it("marks local output degraded and ungrounded — triage, not publishable", async () => {
    const port = await serve("ok");
    process.env.DAY14_OLLAMA_URL = `http://127.0.0.1:${port}`;
    const r = await (await freshCall())({ prompt: "ping", maxTokens: 8 });

    // Callers must be able to tell backstop output from real cloud output.
    expect(r.degraded).toBe(true);
    expect(r.grounded).toBe(false);
  });

  it("resolves instead of throwing when nothing is listening", async () => {
    process.env.DAY14_OLLAMA_URL = "http://127.0.0.1:1";
    process.env.DAY14_LOCAL_TIMEOUT_MS = "2000";
    const llmCall = await freshCall();

    // The regression: this used to reject out of callLocal, get swallowed by the
    // caller, and leave no record anywhere.
    const r = await llmCall({ prompt: "ping", maxTokens: 8 });
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("fails fast on an unreachable host rather than hanging on the timeout", async () => {
    process.env.DAY14_OLLAMA_URL = "http://127.0.0.1:1";
    process.env.DAY14_LOCAL_TIMEOUT_MS = "20000";
    const llmCall = await freshCall();
    const t0 = Date.now();
    await llmCall({ prompt: "ping", maxTokens: 8 });
    expect(Date.now() - t0).toBeLessThan(5000);
  });

  it("survives a local server that errors", async () => {
    const port = await serve("500");
    process.env.DAY14_OLLAMA_URL = `http://127.0.0.1:${port}`;
    const r = await (await freshCall())({ prompt: "ping", maxTokens: 8 });
    expect(r.ok).toBe(false);
  });

  it("is skipped entirely when DAY14_LOCAL_FALLBACK=0", async () => {
    const port = await serve("ok");
    process.env.DAY14_OLLAMA_URL = `http://127.0.0.1:${port}`;
    process.env.DAY14_LOCAL_FALLBACK = "0";
    const r = await (await freshCall())({ prompt: "ping", maxTokens: 8 });

    // Opting out must mean opting out — not a silent local answer.
    expect(r.provider).not.toBe("local");
    expect(r.ok).toBe(false);
  });

  it("records the local attempt in the ledger, so an unreachable backstop is visible", async () => {
    process.env.DAY14_OLLAMA_URL = "http://127.0.0.1:1";
    process.env.DAY14_LOCAL_TIMEOUT_MS = "2000";
    await (await freshCall())({ prompt: "ping", maxTokens: 8 });

    const raw = await fs.readFile(LEDGER_PATH, "utf8").catch(() => null);
    expect(raw, "the local leg wrote no ledger entry at all").not.toBeNull();

    const ledger = JSON.parse(raw!) as {
      last_failure_error?: string;
      days: Record<string, { by_provider?: Record<string, { calls: number }> }>;
    };
    const providers = Object.values(ledger.days).flatMap((d) =>
      Object.keys(d.by_provider ?? {}),
    );
    expect(providers, "no `local` provider row — the blind spot is back").toContain("local");
    expect(ledger.last_failure_error ?? "").toMatch(/local unreachable/);
  });
});
