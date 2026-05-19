#!/usr/bin/env node
/**
 * idea-worker.mjs
 *
 * The "run the business from Telegram" worker.
 *
 * Triggered by the telegram-poller when a freeform (non-command) message
 * arrives. Uses Gemini (free tier) to:
 *   1. Classify intent
 *   2. Plan + execute via tools
 *   3. Report progress back via the Telegram outbox
 *
 * Tools available to the agent (all read/append-only or human-gated):
 *   - read_file(path)
 *   - write_file(path, content)
 *   - list_dir(path)
 *   - run_bash(command)
 *   - queue_telegram(text, urgency)
 *   - request_jack_tap(question, options)
 *   - finish(summary, ok)
 *
 * Requires: GEMINI_API_KEY in .env.local (free at https://aistudio.google.com/apikey)
 *
 * Run: node idea-worker.mjs --idea "text" [--chat-id ID]
 *      node idea-worker.mjs --from-inbox path/to/file.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { spawn } from "node:child_process";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const STUDIO = path.join(HOME, "Documents/studio");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const WORKER_LOG = path.join(SHARED, "poller/idea-worker.log");
const IDEAS_DIR = path.join(SHARED, "ideas");

const MAX_TURNS = 8;
const SAFE_BASH = /^(ls|cat|grep|head|tail|wc|find|git status|git log|git diff|node --version|npm list|pwd|date|echo)\s/;
// flash-lite has 15 RPM on free tier (vs 10 for full flash). Better for our use case.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const RESEARCH_MODEL = "gemini-2.5-flash"; // research can use the heavier model since it's rare
const MAX_RETRIES_429 = 2;
const RETRY_BASE_MS = 10_000;
const ENABLE_GOOGLE_SEARCH = true;

// ---- env ----
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

// ---- read active tenant for this chat (from /switch state) ----
async function getActiveTenant(chatId) {
  if (!chatId) return null;
  const stateFile = path.join(SHARED, "founder-ops/active-tenant.json");
  if (!existsSync(stateFile)) return null;
  try {
    const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
    const entry = state[String(chatId)];
    if (!entry) return null;
    if (new Date(entry.expires_at) < new Date()) {
      return null; // expired
    }
    return entry.tenant_slug || null;
  } catch {
    return null;
  }
}

// ---- read tenant from registry ----
async function getTenantConfig(slug) {
  const regPath = path.join(SHARED, "tenants.json");
  if (!existsSync(regPath)) return null;
  try {
    const reg = JSON.parse(await fs.readFile(regPath, "utf8"));
    return reg.tenants?.find((t) => t.slug === slug) || null;
  } catch {
    return null;
  }
}

// ---- read recent conversation context (last few inbox + outbox messages) ----
async function getConversationContext(chatId, limit = 6) {
  const inboxDir = path.join(SHARED, "telegram/inbox");
  const processedDir = path.join(SHARED, "telegram/processed");
  const outboxDir = path.join(SHARED, "telegram/outbox");

  const events = [];

  async function harvest(dir, role) {
    if (!existsSync(dir)) return;
    const files = (await fs.readdir(dir))
      .filter((f) => f.endsWith(".json"))
      .sort()
      .slice(-15);
    for (const f of files) {
      try {
        const data = JSON.parse(await fs.readFile(path.join(dir, f), "utf8"));
        // Match chat
        const msgChatId = data.chat?.id ?? data.chat_id;
        if (chatId && String(msgChatId) !== String(chatId)) continue;
        const text = (data.text || data.callback_data || "").trim();
        if (!text) continue;
        const ts = data.processed_at || data.queued_at || data.sent_at;
        events.push({ role, text: text.slice(0, 300), ts });
      } catch {
        // skip
      }
    }
  }

  await harvest(processedDir, "user");
  await harvest(outboxDir, "assistant");
  // Sort chronologically
  events.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  return events.slice(-limit);
}

async function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  await fs.mkdir(path.dirname(WORKER_LOG), { recursive: true });
  await fs.appendFile(WORKER_LOG, line);
}

async function queueTelegram(text, urgency = "P3", chatId) {
  await fs.mkdir(OUTBOX, { recursive: true });
  const filename = `${Date.now()}-idea-worker.json`;
  await fs.writeFile(
    path.join(OUTBOX, filename),
    JSON.stringify(
      {
        chat_id: chatId,
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

function parseArgs(argv) {
  const args = { idea: null, fromInbox: null, chatId: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--idea" && argv[i + 1]) args.idea = argv[++i];
    else if (a === "--from-inbox" && argv[i + 1]) args.fromInbox = argv[++i];
    else if (a === "--chat-id" && argv[i + 1]) args.chatId = argv[++i];
  }
  return args;
}

// ---- Gemini tool schemas ----
function buildTools() {
  return [
    {
      functionDeclarations: [
        {
          name: "research",
          description:
            "Search the web via Gemini's Google grounding. Use for: market research, niche validation, competitor analysis, current trends, statistics, news, anything requiring real-world data. Returns synthesized findings with citations.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Specific research question. The more specific the better. E.g. 'unsaturated Etsy niches 2026 with under 1000 competing listings and proven demand'" },
            },
            required: ["query"],
          },
        },
        {
          name: "read_file",
          description: "Read a text file under ~/Documents/. Returns content (truncated to 30k chars).",
          parameters: {
            type: "object",
            properties: { path: { type: "string", description: "Absolute path or ~ path" } },
            required: ["path"],
          },
        },
        {
          name: "write_file",
          description:
            "Write a text file under ~/Documents/businesses/ or ~/Documents/studio/docs/. Use for plans, drafts, notes.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string" },
              content: { type: "string" },
            },
            required: ["path", "content"],
          },
        },
        {
          name: "list_dir",
          description: "List contents of a directory under ~/Documents/.",
          parameters: {
            type: "object",
            properties: { path: { type: "string" } },
            required: ["path"],
          },
        },
        {
          name: "run_bash",
          description:
            "Run a SAFE read-only bash command. Allowed: ls, cat, grep, head, tail, wc, find, git status/log/diff, pwd, date, echo, npm list, node --version. No writes, no installs, no curl.",
          parameters: {
            type: "object",
            properties: { command: { type: "string" } },
            required: ["command"],
          },
        },
        {
          name: "queue_telegram",
          description: "Send a Telegram message to Jack. Use for progress updates, results, summaries.",
          parameters: {
            type: "object",
            properties: {
              text: { type: "string" },
              urgency: {
                type: "string",
                enum: ["P0", "P1", "P2", "P3"],
              },
            },
            required: ["text"],
          },
        },
        {
          name: "request_jack_tap",
          description:
            "Pause and ask Jack via Telegram. Use for irreversible actions, customer comms, money. Queues a P1 message; you can NOT wait for the reply this turn — finish() instead.",
          parameters: {
            type: "object",
            properties: {
              question: { type: "string" },
              options: { type: "array", items: { type: "string" } },
            },
            required: ["question"],
          },
        },
        {
          name: "append_memory",
          description:
            "Write a 1-line fact/note to persistent memory for this chat. Use for: 'Jack picked niche X', 'preferred posting time is morning', 'tenant Y is current focus', etc. Visible to future agent runs.",
          parameters: {
            type: "object",
            properties: { note: { type: "string" } },
            required: ["note"],
          },
        },
        {
          name: "finish",
          description: "End the work loop. ALWAYS call this last.",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string" },
              ok: { type: "boolean" },
            },
            required: ["summary", "ok"],
          },
        },
      ],
    },
  ];
}

// ---- research via grounded Gemini call ----
async function researchViaGrounding(apiKey, query) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: query }] }],
    tools: [{ googleSearch: {} }], // built-in grounding tool
    systemInstruction: {
      parts: [
        {
          text: "You are a research analyst. Return CONCISE findings with specific facts, numbers, and source citations. No fluff. Focus on actionable data: market size, competitor counts, search volume, pricing benchmarks, demand signals. Always cite sources inline.",
        },
      ],
    },
  };

  for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text).filter(Boolean).join("\n").slice(0, 8000);
      const sources =
        data.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.map((c) => c.web?.uri)
          .filter(Boolean)
          .slice(0, 8) || [];
      return { text, sources };
    }
    if (res.status !== 429 || attempt === MAX_RETRIES_429) {
      const errText = await res.text();
      return { error: `${res.status}: ${errText.slice(0, 200)}` };
    }
    await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)));
  }
  return { error: "retries exhausted" };
}

// ---- persistent memory per chat ----
function memoryPath(chatId) {
  return path.join(SHARED, "founder-ops", `memory-${chatId || "default"}.md`);
}

async function readMemory(chatId) {
  if (!chatId) return "";
  try {
    const t = await fs.readFile(memoryPath(chatId), "utf8");
    return t.slice(-8000); // last 8k chars
  } catch {
    return "";
  }
}

async function appendMemory(chatId, note) {
  if (!chatId) return;
  const p = memoryPath(chatId);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.appendFile(p, `\n[${new Date().toISOString()}] ${note}\n`, "utf8");
}

// ---- tool executor ----
async function executeTool(name, args, ctx) {
  const HOME_DIR = HOME;

  if (name === "research") {
    if (!ctx.geminiKey) return { error: "no GEMINI_API_KEY" };
    const out = await researchViaGrounding(ctx.geminiKey, String(args.query));
    return out;
  }

  if (name === "read_file") {
    const p = String(args.path).replace(/^~\//, `${HOME_DIR}/`);
    if (!p.startsWith(`${HOME_DIR}/Documents/`)) {
      return { error: "path must be under ~/Documents/" };
    }
    try {
      const text = await fs.readFile(p, "utf8");
      return { content: text.slice(0, 30_000) };
    } catch (err) {
      return { error: err.message };
    }
  }

  if (name === "write_file") {
    const p = String(args.path).replace(/^~\//, `${HOME_DIR}/`);
    const allowed = [
      `${HOME_DIR}/Documents/businesses/`,
      `${HOME_DIR}/Documents/studio/docs/`,
    ];
    if (!allowed.some((prefix) => p.startsWith(prefix))) {
      return { error: `writes restricted to: ${allowed.join(", ")}` };
    }
    try {
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, String(args.content), "utf8");
      ctx.artifacts.push(p);
      return { ok: true, path: p };
    } catch (err) {
      return { error: err.message };
    }
  }

  if (name === "list_dir") {
    const p = String(args.path).replace(/^~\//, `${HOME_DIR}/`);
    if (!p.startsWith(`${HOME_DIR}/Documents/`)) {
      return { error: "path must be under ~/Documents/" };
    }
    try {
      const entries = await fs.readdir(p, { withFileTypes: true });
      return {
        entries: entries.map((e) => ({
          name: e.name,
          type: e.isDirectory() ? "dir" : "file",
        })),
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  if (name === "run_bash") {
    const cmd = String(args.command).trim();
    if (!SAFE_BASH.test(cmd)) {
      return {
        error: "command not allowed. Only read-only: ls, cat, grep, head, tail, wc, find, git status/log/diff, pwd, date, echo, npm list, node --version.",
      };
    }
    return await new Promise((resolve) => {
      const child = spawn("bash", ["-c", cmd], { cwd: HOME_DIR, timeout: 8000 });
      let out = "";
      let err = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
      child.on("close", (code) => {
        resolve({
          exit_code: code,
          stdout: out.slice(0, 5000),
          stderr: err.slice(0, 1000),
        });
      });
    });
  }

  if (name === "queue_telegram") {
    let text = String(args.text || "");
    // Reject internal-reasoning dumps that occasionally slip through
    const reasoningPatterns = [
      /default_api\./,
      /the user's last message,/i,
      /I will proceed/,
      /Let's re-evaluate/,
      /Here's the plan:\n/,
      /^The user's intent/i,
    ];
    if (reasoningPatterns.some((p) => p.test(text))) {
      return {
        error: "rejected: message looks like internal reasoning, not a user-facing reply. Rewrite as a concise summary intended for the user.",
      };
    }
    // Trim runaway length
    if (text.length > 1500) text = text.slice(0, 1500) + "...";
    await queueTelegram(text, args.urgency || "P3", ctx.chatId);
    return { ok: true };
  }

  if (name === "request_jack_tap") {
    const text =
      `🤔 *Need your call*\n\n${args.question}\n\n` +
      (args.options ? `Options: ${args.options.join(", ")}` : "Reply with your decision.");
    await queueTelegram(text, "P1", ctx.chatId);
    return { queued: true, waiting: true };
  }

  if (name === "append_memory") {
    await appendMemory(ctx.chatId, String(args.note));
    return { ok: true };
  }

  if (name === "finish") {
    ctx.finished = { summary: args.summary, ok: args.ok };
    return { acknowledged: true };
  }

  return { error: `unknown tool: ${name}` };
}

// ---- system prompt ----
function systemPrompt(activeTenant = null, tenantConfig = null, memory = "") {
  const tenantBlock = activeTenant
    ? `

⚠️ ACTIVE TENANT CONTEXT: \`${activeTenant}\`${tenantConfig ? ` (${tenantConfig.name}, type: ${tenantConfig.type})` : ""}

The user used /switch to scope this session to this specific business. Treat all questions, plans, and actions as scoped to this tenant UNLESS they explicitly mention another business.

- Read this tenant's dossier first: \`~/Documents/businesses/_shared/customers/${activeTenant}/01-brand.json\`
- Write outputs into this tenant's space when possible
- If Jack asks "what's MRR" assume this tenant unless he says otherwise

`
    : "";

  const memoryBlock = memory
    ? `\n\n## Persistent memory (your notes from past sessions with this user)\n${memory}\n\n`
    : "";

  return `You are Jack's autonomous agent for Day14 OS. Run his business from Telegram.${tenantBlock}${memoryBlock}

CONTEXT:
- Jack is a solo operator in SW Florida running Day14 OS, a productized AI-leveraged build studio
- 258+ skill specs at ~/Documents/studio/docs/seeds/skills/
- 14+ hand-coded in TypeScript at ~/Documents/studio/src/lib/skills/
- Multiple tenants (businesses) — see ~/Documents/businesses/_shared/tenants.json
- Customer dossiers at ~/Documents/businesses/_shared/customers/{slug}/
- Architecture doc at ~/Documents/studio/CLAUDE.md — read it if you need orientation

CORE PRINCIPLE: **Be useful by default. Don't ask permission for things you can just do.**

For reversible work (writing drafts, research notes, plans), just produce it and report back. Jack reviews the output, not the intent. Only request_jack_tap for genuinely irreversible things.

HANDLE EACH MESSAGE:

1. **Research questions** ("what are the trends in X", "find me niches with Y") →
   - Use \`research\` tool with a SPECIFIC query (volume, competition, demand signals)
   - Synthesize findings into a doc; write to ~/Documents/businesses/day14/research/
   - Telegram-reply with top 3-5 findings + path to full doc
   - NO Jack-tap needed — research is reversible

2. **Build/plan requests** ("build me an Etsy store", "make a website for X") →
   - DO the research first (use \`research\` tool, multiple queries)
   - Draft a SPECIFIC plan with: niche choice, why, products, marketing approach, expected revenue
   - Write to ~/Documents/businesses/day14/content/drafts/{topic}-plan.md
   - Telegram-reply with the recommendation AND a follow-up suggestion
   - ONE Jack-tap at the end IF you'd be spending money or making external changes; otherwise NO TAP

3. **Ops questions** ("what's my MRR", "who's at risk") →
   - Read data immediately from \`~/Documents/businesses/_shared/\`
   - Compute, answer with numbers, NO Jack-tap

4. **Customer actions** (refund, pause, send email) →
   - request_jack_tap FIRST — these are irreversible

5. **Content** (blog, newsletter, social post) →
   - Just draft it. Don't ask. Drafts are reversible.
   - Write to ~/Documents/businesses/{tenant}/content/drafts/
   - Telegram-reply with summary + path

6. **Short replies** ("go", "approve", "yes", "do it") → look at the RECENT CONVERSATION section to understand what's being approved. Execute that.

7. **Vague** → ask ONE crisp clarifying question. Don't ramble.

AFTER EACH MESSAGE: write a 1-line note to memory via \`append_memory\` tool — facts/decisions you should remember next time. E.g., "Jack picked niche X for the Etsy store" or "Jack prefers fewer questions, just do the work".

ABSOLUTE RULES (still apply):
- NEVER execute customer-facing actions without request_jack_tap
- NEVER push to git, run npm install, run curl, run sudo
- NEVER reveal API keys/tokens/secrets in Telegram
- NEVER write outside ~/Documents/businesses/ or ~/Documents/studio/docs/
- ALWAYS finish() — max ${MAX_TURNS} turns

Be a useful agent, not a permission-asking bot. Default to producing real output.`;
}

// ---- Gemini call via REST with 429 retry ----
async function callGemini(apiKey, contents, tools, sysPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents,
    tools,
    systemInstruction: { parts: [{ text: sysPrompt }] },
  };

  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const errText = await res.text();
    if (res.status === 429 && attempt < MAX_RETRIES_429) {
      // Try to parse retryDelay from Google's response, else use exponential backoff
      let waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
      const m = errText.match(/"retryDelay":\s*"(\d+)s"/);
      if (m) waitMs = Math.max(waitMs, (parseInt(m[1], 10) + 1) * 1000);
      await log(
        `429 rate limit — waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${MAX_RETRIES_429}`
      );
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    lastErr = new Error(`Gemini API ${res.status}: ${errText.slice(0, 300)}`);
    break;
  }
  throw lastErr || new Error("Gemini retries exhausted");
}

// ---- agent loop ----
async function runAgent(idea, chatId) {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) {
    await log("GEMINI_API_KEY missing");
    await queueTelegram(
      "❌ GEMINI_API_KEY not set in .env.local. Run: bash ~/Documents/studio/scripts/connect-gemini.sh",
      "P1",
      chatId
    );
    return;
  }

  const tools = buildTools();
  const memory = await readMemory(chatId);
  const ctx = {
    chatId,
    artifacts: [],
    finished: null,
    geminiKey: env.GEMINI_API_KEY,
  };

  // Check for active tenant scope
  const activeTenant = await getActiveTenant(chatId);
  const tenantConfig = activeTenant ? await getTenantConfig(activeTenant) : null;
  const sysPrompt = systemPrompt(activeTenant, tenantConfig, memory);

  // Read recent conversation context (last 6 messages) so short replies make sense
  const recentMessages = await getConversationContext(chatId, 6);
  const contextBlock = recentMessages.length > 0
    ? `\n\nRECENT CONVERSATION (for context — Jack's current message is the LAST):\n${recentMessages
        .map((m) => `[${m.role}] ${m.text}`)
        .join("\n")}\n\nNote: If Jack's CURRENT message is short ("go", "yes", "approve", "do it", "looks good"), he's almost certainly responding to the most recent assistant question above. Read that prior question to understand what's being approved/rejected — DO NOT interpret the short reply as a new idea unless context clearly indicates so.\n`
    : "";

  const tenantBadge = activeTenant ? ` (scoped: \`${activeTenant}\`)` : "";
  await queueTelegram(
    `🧠 Working on${tenantBadge}: _${idea.slice(0, 80)}${idea.length > 80 ? "..." : ""}_`,
    "P3",
    chatId
  );

  // Gemini "contents" is the conversation history
  const contents = [
    {
      role: "user",
      parts: [
        {
          text: `Jack's current message: ${idea}${contextBlock}\n\nClassify and handle this in light of the recent conversation.`,
        },
      ],
    },
  ];

  let turn = 0;
  while (turn < MAX_TURNS && !ctx.finished) {
    turn += 1;

    let response;
    try {
      response = await callGemini(env.GEMINI_API_KEY, contents, tools, sysPrompt);
    } catch (err) {
      await log(`Gemini API error: ${err.message}`);
      const isQuota = /429|quota|rate/i.test(err.message);
      const friendly = isQuota
        ? "⏸ Hit the free Gemini rate limit. Try again in ~60 seconds, or set `GEMINI_MODEL=gemini-2.0-flash` for higher RPM."
        : `❌ Gemini error: ${err.message.slice(0, 200).replace(/[_*`[\]]/g, " ")}`;
      await queueTelegram(friendly, "P2", chatId);
      return;
    }

    const candidate = response.candidates?.[0];
    if (!candidate) {
      await log("No candidate in Gemini response");
      break;
    }

    const parts = candidate.content?.parts || [];
    // Append assistant turn to history
    contents.push({ role: "model", parts });

    // Process any function calls
    const fnCalls = parts.filter((p) => p.functionCall);
    if (fnCalls.length === 0) {
      // No tool calls; treat as final answer text
      const textOut = parts
        .map((p) => p.text)
        .filter(Boolean)
        .join("\n");
      if (textOut) {
        await queueTelegram(textOut.slice(0, 4000), "P2", chatId);
      }
      ctx.finished = { summary: "ended with text only", ok: true };
      break;
    }

    // Execute each tool call
    const fnResponses = [];
    for (const part of fnCalls) {
      const { name, args } = part.functionCall;
      const result = await executeTool(name, args || {}, ctx);
      await log(`tool ${name}: ${JSON.stringify(result).slice(0, 200)}`);
      fnResponses.push({
        functionResponse: {
          name,
          response: typeof result === "object" ? result : { result },
        },
      });
    }

    // Append tool responses as a user turn
    contents.push({ role: "user", parts: fnResponses });

    if (ctx.finished) break;
  }

  await log(`agent done: turns=${turn}, artifacts=${ctx.artifacts.length}, finished=${!!ctx.finished}`);

  if (!ctx.finished) {
    await queueTelegram(`⚠️ Agent ran ${turn} turns without finishing.`, "P2", chatId);
  }
}

// ---- main ----
async function main() {
  const args = parseArgs(process.argv);
  let idea = args.idea;
  let chatId = args.chatId;

  if (args.fromInbox) {
    try {
      const data = JSON.parse(await fs.readFile(args.fromInbox, "utf8"));
      idea = idea || data.text;
      chatId = chatId || data.chat?.id;
    } catch (err) {
      await log(`Failed to read inbox file: ${err.message}`);
      process.exit(1);
    }
  }

  if (!idea) {
    console.error("usage: idea-worker.mjs --idea \"text\" [--chat-id ID]");
    process.exit(1);
  }

  await log(`idea-worker starting: idea="${idea.slice(0, 80)}"`);
  await fs.mkdir(IDEAS_DIR, { recursive: true });

  if (!chatId) {
    const env = await loadEnv();
    chatId = env.TELEGRAM_CHAT_ID || null;
  }

  await runAgent(idea, chatId);
}

main().catch(async (err) => {
  await log(`FATAL: ${err.message}`);
  process.exit(1);
});
