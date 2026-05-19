#!/usr/bin/env node
/**
 * bot-brain.mjs
 *
 * The smarter Telegram bot routing layer. Replaces direct slash-command
 * routing with a conversational LLM brain that:
 *
 *   1. Detects intent: command | question | new-skill-request | conversation
 *   2. For questions: queries Day14 state via state-query-engine and answers
 *      naturally
 *   3. For commands: dispatches via the existing skill runtime
 *   4. For new-skill-requests: triggers recursive-expansion-engine
 *   5. For conversation: chats with full Day14 context
 *
 * USAGE: import { processIncomingMessage } from this module in telegram-poller.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import { compactSnapshot, fullStateSnapshot, listTenants, tenantRevenue, recentAudit } from "./state-query-engine.mjs";
import { completeTodo, listOpenTodos } from "./_generic/operator-todos.mjs";

const HOME = homedir();
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const SHARED_OUTBOX = path.join(SHARED, "telegram/outbox");
const BRAIN_LOG = path.join(SHARED, "founder-ops/bot-brain.log");
const EXPANSION_INBOX = path.join(SHARED, "expansion-requests");
const GEMINI_MODEL = "gemini-2.5-flash";

async function loadEnv() {
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function logBrain(record) {
  await fs.mkdir(path.dirname(BRAIN_LOG), { recursive: true });
  await fs.appendFile(BRAIN_LOG, JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n");
}

async function callGemini(systemPrompt, userPrompt, apiKey, opts = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: opts.temperature || 0.4, maxOutputTokens: opts.maxTokens || 1500 },
  };
  if (opts.useGrounding) body.tools = [{ google_search: {} }];
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

const INTENT_SYSTEM = `You are the Day14 OS intent classifier. Classify a user message into ONE of:

- "command": user wants a specific action executed (publish X, refund Y, generate Z)
- "question": user is asking about state (revenue, status, what's happening, how's X doing)
- "new-skill": user wants a new capability built ("I want the bot to do X", "build me a thing that")
- "new-business": user wants to spin up a new business ("launch a", "start a", "create a store for")
- "conversation": casual chat, planning, brainstorming
- "out-of-scope": not actionable / off-topic

Return STRICT JSON: { "intent": "...", "confidence": 0-1, "extracted": {...key fields if applicable...} }

Examples:
"what's my revenue today" → {"intent":"question","confidence":0.95,"extracted":{"topic":"revenue","scope":"today"}}
"publish all hot flash drafts" → {"intent":"command","confidence":0.9,"extracted":{"action":"publish","scope":"hot-flash-co","filter":"drafts"}}
"spin up a meditation newsletter" → {"intent":"new-business","confidence":0.95,"extracted":{"archetype":"newsletter","niche":"meditation"}}
"build me a skill that auto-replies to instagram DMs" → {"intent":"new-skill","confidence":0.9,"extracted":{"description":"auto-reply to instagram DMs"}}
"how's hot flash co doing" → {"intent":"question","confidence":0.95,"extracted":{"topic":"status","scope":"hot-flash-co"}}
"thinking about launching a course business" → {"intent":"conversation","confidence":0.8,"extracted":{"topic":"course-business-planning"}}`;

export async function classifyIntent(message, env) {
  try {
    const raw = await callGemini(INTENT_SYSTEM, message, env.GEMINI_API_KEY, { temperature: 0.1, maxTokens: 300 });
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
    const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
    return JSON.parse(cleaned.slice(s, e + 1));
  } catch (err) {
    return { intent: "conversation", confidence: 0.3, extracted: {}, error: err.message };
  }
}

const QA_SYSTEM = `You are Jack's smart business operator. You have full access to Day14 OS state (revenue, products, drafts, agent activity, heartbeats).

Answer Jack's questions DIRECTLY and SPECIFICALLY using the state snapshot below. No fluff, no "let me check" preamble. Use numbers, names, and concrete facts. Markdown formatting OK for Telegram (use *bold*, _italic_, \`code\`).

Keep responses tight (under 120 words unless the data demands more). If a metric isn't in the snapshot, say so honestly — don't guess.

You can reference any tenant by slug. You know about: business-bootstrap, brand-identity-generator, merch-attacher, competitor-researcher, hot-flash-co's autopilot.`;

export async function answerQuestion(message, env) {
  const snapshot = await compactSnapshot();
  const userPrompt = `STATE SNAPSHOT:\n${snapshot}\n\n---\n\nJack asked: ${message}\n\nAnswer directly.`;
  return await callGemini(QA_SYSTEM, userPrompt, env.GEMINI_API_KEY, { temperature: 0.3, maxTokens: 600 });
}

const CONVERSATION_SYSTEM = `You are Jack's business co-pilot. Day14 OS runs a multi-business empire on auto. You help Jack think, plan, decide.

Voice: direct, intelligent, no pep-talks. Push back when his thinking is fuzzy. Ask one clarifying question if needed — but only if needed.

When Jack is brainstorming, you suggest specific next moves. When he's planning, you challenge assumptions. When he's stuck, you propose the smallest first move.

Keep responses tight (under 150 words). Markdown OK.`;

export async function chat(message, env) {
  const snapshot = await compactSnapshot();
  const userPrompt = `STATE:\n${snapshot}\n\n---\n\nJack: ${message}`;
  return await callGemini(CONVERSATION_SYSTEM, userPrompt, env.GEMINI_API_KEY, { temperature: 0.7, maxTokens: 600 });
}

export async function queueExpansionRequest(description, extracted) {
  await fs.mkdir(EXPANSION_INBOX, { recursive: true });
  const filename = `${Date.now()}-expansion-request.json`;
  await fs.writeFile(
    path.join(EXPANSION_INBOX, filename),
    JSON.stringify({
      requested_at: new Date().toISOString(),
      description,
      extracted,
      status: "pending",
    }, null, 2)
  );
  return filename;
}

export async function queueBusinessBootstrap(extracted) {
  await fs.mkdir(EXPANSION_INBOX, { recursive: true });
  const filename = `${Date.now()}-business-request.json`;
  await fs.writeFile(
    path.join(EXPANSION_INBOX, filename),
    JSON.stringify({
      requested_at: new Date().toISOString(),
      type: "new-business",
      extracted,
      status: "pending",
    }, null, 2)
  );
  return filename;
}

/**
 * Main entrypoint. Returns the bot's reply text + any side effects performed.
 */
export async function processIncomingMessage(message, ctx = {}) {
  const env = await loadEnv();
  const trimmed = (message || "").trim();

  // ── Fast-path: complete an operator to-do ("done 3", "completed #3", "✓ 3")
  const doneMatch = trimmed.match(/^(?:done|complete|completed|finished|✓|✅)\s+#?(\d+)$/i);
  if (doneMatch) {
    const todo = await completeTodo(doneMatch[1]);
    let reply;
    if (!todo) {
      reply = `Couldn't find an open to-do #${doneMatch[1]}. Send *todos* to see your list.`;
    } else {
      const remaining = await listOpenTodos();
      reply = `✅ Done: *${todo.title}*\n\n${remaining.length} item${remaining.length === 1 ? "" : "s"} left on your to-do list.`;
    }
    await logBrain({ direction: "in", message, intent: { intent: "todo-complete" } });
    await logBrain({ direction: "out", reply: reply.slice(0, 300), action: "todo-completed" });
    return { reply, intent: { intent: "todo-complete" }, action: "todo-completed" };
  }

  // ── Fast-path: list operator to-dos ("todos", "to-do list", "what's on my plate")
  if (/^(todos?|to-?do list|my list|what'?s on my (list|plate)\??)$/i.test(trimmed)) {
    const open = await listOpenTodos();
    let reply;
    if (!open.length) {
      reply = `🎉 Your operator to-do list is empty — the agents have everything covered.`;
    } else {
      reply =
        `📋 *Your operator to-do list* (${open.length})\n\n` +
        open
          .map((t) => `*${t.seq}.* ${t.title}\n   _${t.tenant} · ${t.priority}_`)
          .join("\n\n") +
        `\n\nReply *done N* to check one off.`;
    }
    await logBrain({ direction: "in", message, intent: { intent: "todo-list" } });
    await logBrain({ direction: "out", reply: reply.slice(0, 300), action: "todo-list" });
    return { reply, intent: { intent: "todo-list" }, action: "todo-list" };
  }

  const intent = await classifyIntent(message, env);
  await logBrain({ direction: "in", message, intent });

  let reply = "";
  let action = null;

  switch (intent.intent) {
    case "question":
      reply = await answerQuestion(message, env);
      action = "answered";
      break;
    case "new-skill":
      const skillFile = await queueExpansionRequest(intent.extracted?.description || message, intent.extracted);
      reply = `🧠 *Expansion request queued*\n\nDescription: ${intent.extracted?.description || message}\n\nThe recursive-expansion-engine will draft the skill (SKILL.md + implementation stub) on its next cycle. You'll get a tap-to-approve card.`;
      action = `queued:${skillFile}`;
      break;
    case "new-business":
      const bizFile = await queueBusinessBootstrap(intent.extracted);
      reply = `🚀 *New business request captured*\n\nNiche: ${intent.extracted?.niche || "?"}\nArchetype: ${intent.extracted?.archetype || "auto-detect"}\n\nQueued. Reply *bootstrap now* to launch with auto-defaults, or *details* to set slug + display name first.`;
      action = `queued:${bizFile}`;
      break;
    case "command":
      reply = `⚙️ Command detected: ${JSON.stringify(intent.extracted)}\n\nDispatching via skill runtime...`;
      action = "command-dispatched";
      break;
    case "conversation":
      reply = await chat(message, env);
      action = "chatted";
      break;
    case "out-of-scope":
      reply = `Heard you, but not sure that's actionable. Want me to:\n1) Note it for later?\n2) Try answering as a question?\n3) Spin up something new?`;
      action = "deflected";
      break;
    default:
      reply = await chat(message, env);
      action = "chatted-fallback";
  }

  await logBrain({ direction: "out", reply: reply.slice(0, 300), action });
  return { reply, intent, action };
}

// CLI for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const msg = process.argv.slice(2).join(" ");
  if (!msg) {
    console.error("Usage: bot-brain.mjs <message>");
    process.exit(1);
  }
  const result = await processIncomingMessage(msg);
  console.log("INTENT:", JSON.stringify(result.intent, null, 2));
  console.log("\nREPLY:\n", result.reply);
  console.log("\nACTION:", result.action);
}
