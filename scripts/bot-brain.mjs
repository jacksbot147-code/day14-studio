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
import { spawn } from "node:child_process";
import { compactSnapshot, fullStateSnapshot, listTenants, tenantRevenue, recentAudit } from "./state-query-engine.mjs";
import { completeTodo, listOpenTodos } from "./_generic/operator-todos.mjs";
import { parseTargetRequest } from "./verticals/real-estate/regions.mjs";
import { addTarget, loadTargets, REALTY_SLUG } from "./verticals/real-estate/targets.mjs";

const HOME = homedir();
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const SHARED_OUTBOX = path.join(SHARED, "telegram/outbox");
const BRAIN_LOG = path.join(SHARED, "founder-ops/bot-brain.log");
const EXPANSION_INBOX = path.join(SHARED, "expansion-requests");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const STUDIO = path.join(HOME, "Documents/studio");
const GEMINI_MODEL = "gemini-2.5-flash";

/** Turn free text into a clean tenant slug. */
function slugify(s) {
  return (
    String(s)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "new-business"
  );
}

/** Derive {display_name, slug, niche, archetype} from a "start X" message. */
function deriveBusinessArgs(message, extracted) {
  let name = String(extracted.display_name || message || "").trim();
  name = name.replace(/^(start|launch|create|spin\s*up|build|open|set\s*up|make|kick\s*off)\s+/i, "");
  name = name.replace(/^(a|an|the)\s+/i, "");
  name = name.replace(/[."'!?]+$/g, "").trim();
  if (!name) name = extracted.niche || "New Business";
  const display_name = name.slice(0, 60);
  return {
    display_name,
    slug: slugify(display_name),
    niche: extracted.niche || display_name,
    archetype: extracted.archetype || "pod-store",
  };
}

async function tenantExists(slug) {
  try {
    const data = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8"));
    return (data.tenants || []).some((t) => t.slug === slug);
  } catch {
    return false;
  }
}

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

async function callAnthropic(systemPrompt, userPrompt, apiKey, opts = {}) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.BRAIN_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: opts.maxTokens || 1500,
      temperature: opts.temperature ?? 0.4,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return json?.content?.[0]?.text || "";
}

/**
 * LLM router — Anthropic first (key added 2026-06-10), Gemini fallback.
 * The Gemini free-tier key has been 429-quota-dead since May (todo-1),
 * which silently killed every freeform Telegram/console reply.
 */
async function callLLM(systemPrompt, userPrompt, env, opts = {}) {
  const errors = [];
  if (env.ANTHROPIC_API_KEY) {
    try {
      return await callAnthropic(systemPrompt, userPrompt, env.ANTHROPIC_API_KEY, opts);
    } catch (err) {
      errors.push(err.message);
    }
  }
  if (env.GEMINI_API_KEY) {
    try {
      return await callGemini(systemPrompt, userPrompt, env.GEMINI_API_KEY, opts);
    } catch (err) {
      errors.push(err.message);
    }
  }
  throw new Error(`all LLM providers failed: ${errors.join(" | ") || "no API keys configured"}`);
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
    const raw = await callLLM(INTENT_SYSTEM, message, env, { temperature: 0.1, maxTokens: 300 });
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
  return await callLLM(QA_SYSTEM, userPrompt, env, { temperature: 0.3, maxTokens: 600 });
}

const CONVERSATION_SYSTEM = `You are Jack's business co-pilot. Day14 OS runs a multi-business empire on auto. You help Jack think, plan, decide.

Voice: direct, intelligent, no pep-talks. Push back when his thinking is fuzzy. Ask one clarifying question if needed — but only if needed.

When Jack is brainstorming, you suggest specific next moves. When he's planning, you challenge assumptions. When he's stuck, you propose the smallest first move.

Keep responses tight (under 150 words). Markdown OK.`;

export async function chat(message, env) {
  const snapshot = await compactSnapshot();
  const userPrompt = `STATE:\n${snapshot}\n\n---\n\nJack: ${message}`;
  return await callLLM(CONVERSATION_SYSTEM, userPrompt, env, { temperature: 0.7, maxTokens: 600 });
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

// ── Realty county watch list ────────────────────────────────────────────
// Jack can Telegram a county ("realty Travis County, TX"), a metro ("scout
// the Tampa Bay area"), or "look at Maricopa County" — each becomes a
// standing watch target the realty scout sources, scores, and monitors.

/** Decide whether a message is a realty watch command. */
function realtyTrigger(text) {
  const t = text.trim();
  if (/^realty\b/i.test(t)) return "explicit";
  if (/^scout\s+\S/i.test(t)) return "loose";
  if (/^(start|begin)\s+(looking|scouting)\b/i.test(t)) return "loose";
  if (/^look(?:ing)?\s+(?:at|in|into)\s+\S/i.test(t)) return "loose";
  // Bare county/metro: short, mentions "county", and not a question.
  const words = t.split(/\s+/).length;
  if (
    /\bcount(?:y|ies)\b/i.test(t) &&
    words <= 10 &&
    !/^(what|which|where|how|is|are|do|does|did|why|who|when|can|could|should|would|tell|show|explain|list)\b/i.test(t)
  )
    return "loose";
  return null;
}

async function realtyListReply() {
  const targets = await loadTargets(REALTY_SLUG);
  if (!targets.length) {
    return {
      reply: `🏠 *Realty watch list is empty.*\n\nTelegram a county or metro to start — e.g. *realty Lee County, FL* or *realty Tampa Bay area*.`,
      action: "realty-list",
    };
  }
  const lines = targets.map((t) => {
    const stat =
      t.status === "active"
        ? `active · ${t.properties_sourced} properties${t.a_tier ? ` · ${t.a_tier} A-tier` : ""}`
        : t.status === "needs-csv"
          ? "awaiting county CSV"
          : t.status;
    return `*${t.label}* — ${stat}`;
  });
  return {
    reply: `🏠 *Realty watch list* (${targets.length})\n\n${lines.join("\n")}\n\nSee the board: day14.us/admin/realty`,
    action: "realty-list",
  };
}

/** Returns a reply object for a realty command, or null if not one. */
async function tryRealtyCommand(text) {
  const trig = realtyTrigger(text);
  if (!trig) return null;

  // List sub-command — "realty", "realty targets", "realty list".
  const body = text.replace(/^realty[:\s]+/i, "").trim();
  if (trig === "explicit" && /^(targets?|list|watch\s*list|watchlist|status)?$/i.test(body)) {
    return await realtyListReply();
  }

  const parsed = parseTargetRequest(text);
  if (parsed.type === "empty") {
    if (trig === "explicit") {
      return {
        reply: `🏠 Tell me a county or metro to scout — e.g. *realty Lee County, FL* or *realty Tampa Bay area*.`,
        action: "realty-noop",
      };
    }
    return null; // loose trigger, nothing parseable — let the LLM handle it
  }
  if (parsed.type === "unknown-region") {
    if (trig === "explicit") {
      return {
        reply: `🏠 I don't have *${parsed.region}* mapped to counties yet. Reply with the counties — e.g. *realty Sangamon County, IL* (comma-separate several).`,
        action: "realty-unknown-region",
      };
    }
    return null; // loose trigger on an unknown place — avoid false positives
  }

  // type "counties" or "region" — register each county.
  const added = [];
  const existing = [];
  for (const c of parsed.counties) {
    try {
      const { target, created } = await addTarget(REALTY_SLUG, {
        county: c.county,
        state: c.state,
        source: "telegram",
      });
      (created ? added : existing).push(target);
    } catch { /* skip a malformed county */ }
  }
  if (!added.length && !existing.length) {
    return { reply: `🏠 Couldn't read a county out of that. Try *realty Lee County, FL*.`, action: "realty-noop" };
  }

  // Kick the scout so sourcing begins immediately.
  try {
    const child = spawn(
      "node",
      [path.join(STUDIO, "scripts/verticals/real-estate/scout-agent.mjs"), REALTY_SLUG],
      { detached: true, stdio: "ignore", cwd: STUDIO }
    );
    child.unref();
  } catch { /* the overnight scout run will pick it up */ }

  const total = added.length + existing.length;
  const head =
    parsed.type === "region"
      ? `🏠 *Scouting the ${parsed.region} region*`
      : total === 1
        ? `🏠 *Now scouting ${(added[0] || existing[0]).label}*`
        : `🏠 *Now scouting ${total} counties*`;
  const bits = [head, ""];
  if (added.length) bits.push(`Added: ${added.map((t) => t.label).join(", ")}`);
  if (existing.length) bits.push(`Already watched: ${existing.map((t) => t.label).join(", ")}`);
  bits.push(
    "",
    "The scout is sourcing now. For any county without an automatic feed, a to-do lands on day14.us/admin with exactly where to pull the official records — drop that CSV and it scores + monitors automatically.",
    "",
    "Reply *realty targets* for your watch list."
  );
  return { reply: bits.join("\n"), action: `realty-targets:+${added.length}/${existing.length}` };
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

  // ── Fast-path: realty county / region watch list
  const realty = await tryRealtyCommand(trimmed);
  if (realty) {
    await logBrain({ direction: "in", message, intent: { intent: "realty-target" } });
    await logBrain({ direction: "out", reply: realty.reply.slice(0, 300), action: realty.action });
    return { reply: realty.reply, intent: { intent: "realty-target" }, action: realty.action };
  }

  // ── Fast-path: architect a move — draft an expansion spec from an idea
  const archMatch = trimmed.match(/^(?:architect|plan)\s+(.{6,})$/i);
  if (archMatch) {
    const idea = archMatch[1].trim();
    try {
      const child = spawn("node", [path.join(STUDIO, "scripts/move-architect.mjs"), idea], {
        detached: true,
        stdio: "ignore",
        cwd: STUDIO,
      });
      child.unref();
    } catch { /* the spec can be drafted later */ }
    const reply =
      `🧭 *Architecting that move*\n\n` +
      `Drafting the expansion spec — the fork points to decide first, an honest plan, a file map, risks, verification, and the ship plan.\n\n` +
      `It lands in \`businesses/_shared/move-specs/\` and I'll ping you the moment it's ready.`;
    await logBrain({ direction: "in", message, intent: { intent: "architect-move" } });
    await logBrain({ direction: "out", reply: reply.slice(0, 300), action: "architect-move" });
    return { reply, intent: { intent: "architect-move" }, action: "architect-move" };
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
    case "new-business": {
      const biz = deriveBusinessArgs(message, intent.extracted || {});
      if (await tenantExists(biz.slug)) {
        reply = `*${biz.display_name}* already exists as a tenant. To rebuild + fully sweep its site, reply: *sweep ${biz.slug}*`;
        action = "new-business-exists";
        break;
      }
      // Low-confidence read — confirm before spending a full build.
      if ((intent.confidence || 0) < 0.7) {
        const bizFile = await queueBusinessBootstrap(intent.extracted);
        reply = `🚀 Launch *${biz.display_name}* as a ${biz.archetype}? Reply *bootstrap now* and I'll build the whole thing — brand, full website, content, agents.`;
        action = `queued:${bizFile}`;
        break;
      }
      // Fully automatic — fire the whole pipeline now.
      const child = spawn(
        "node",
        [
          path.join(STUDIO, "scripts/business-bootstrap.mjs"),
          "--slug", biz.slug,
          "--display-name", biz.display_name,
          "--niche", biz.niche,
          "--archetype", biz.archetype,
        ],
        { detached: true, stdio: "ignore", cwd: STUDIO }
      );
      child.unref();
      reply = `🚀 *Building ${biz.display_name} now*\n\nArchetype: ${biz.archetype}\nSlug: \`${biz.slug}\`\n\nFull pipeline running — brand identity → competitor research → full multi-page website → products → operational sweep → automation agents. Anything I can't finish lands on your to-do list at day14.us/admin.\n\nI'll ping you when it's live.`;
      action = `launched:${biz.slug}`;
      break;
    }
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
