#!/usr/bin/env -S npx tsx
/**
 * scripts/mcp-server.mjs — Day14 OS MCP server (stdio transport).
 *
 * Exposes the Day14 OS read surface + a governed execution surface to any
 * MCP client (Claude Desktop, Cowork, Hermes, etc.):
 *
 *   list_skills          — search the generated skill registry
 *   get_skill            — full registry entry + skill-graph edges
 *   get_customer         — dossier summary (01-brand.json + 02-status.md tail)
 *   search_customers     — substring search over the customer index
 *   query_work_register  — tail of the append-only work-register.jsonl
 *   run_skill            — ONLY the read-only analyzer allowlist; everything
 *                          else is refused and pointed at queue_jack_tap
 *   queue_jack_tap       — file an operator to-do in the SAME store the
 *                          /admin/inbox approvals queue + approvals API use
 *                          (~/Documents/businesses/_shared/operator-todos.json)
 *   system_health        — poller heartbeat freshness (same files
 *                          /dashboard/system reads)
 *
 * Governance (CLAUDE.md): reads are free; consequential writes go through
 * the Jack-tap queue — this server NEVER executes them. Every tool call is
 * logged to the work-register (source "mcp"); run_skill and queue_jack_tap
 * are additionally audit-logged via auditLog().
 *
 * HOW IT RUNS: plain .mjs executed via tsx so it can import the compiled-
 * by-nothing TypeScript lib directly (registry-loader.ts, customer-index.ts,
 * skill-runner.ts, audit-log-generator.ts). Start with:
 *
 *   npm run mcp          # = tsx scripts/mcp-server.mjs
 *
 * IMPORTANT: stdio transport — never console.log (stdout is the protocol
 * channel). Diagnostics go to stderr.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// TypeScript lib imports — resolved by tsx at runtime.
import { getSkills, findSkill, getGraph } from "../src/lib/registry-loader.ts";
import { lookupBySlug, searchCustomers } from "../src/lib/customer-index.ts";
import { logSkillInvocation, logAction } from "../src/lib/work-register.ts";
import { auditLog } from "../src/lib/skills/audit-log-generator.ts";
import { runSkill } from "../src/lib/skill-runner.ts";
import { fileTodo } from "./lib/file-todo.mjs";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const REGISTER_PATH = path.join(SHARED, "growth/work-register.jsonl");
const POLLER_DIR = path.join(SHARED, "poller");

/**
 * Skills run_skill may execute directly. These are the read-only analyzers —
 * they compute reports from local state and never touch Stripe/Resend or
 * send anything customer-facing. Everything else must go through Jack.
 */
const RUN_SKILL_ALLOWLIST = new Set([
  "uptime-monitor",
  "customer-ltv-calculator",
  "churn-risk-scorer",
]);

const server = new McpServer({ name: "day14-os", version: "1.0.0" });

// ── helpers ─────────────────────────────────────────────────────────────────

function ok(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function fail(message, extra = {}) {
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ error: message, ...extra }, null, 2) }],
  };
}

/**
 * Wrap a tool handler with the mandatory telemetry: every MCP tool call is
 * logged to the work-register with source "mcp" (feeds growth-watcher).
 */
function withTelemetry(toolName, handler) {
  return async (args = {}) => {
    try {
      await logSkillInvocation(`mcp:${toolName}`, "mcp", args?.slug || args?.customer_slug);
    } catch {
      /* telemetry must never block the tool */
    }
    try {
      return await handler(args);
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  };
}

async function tailLines(filePath, maxLines) {
  const text = await fs.readFile(filePath, "utf8");
  const lines = text.trim().split("\n").filter(Boolean);
  return lines.slice(-maxLines);
}

// ── list_skills ─────────────────────────────────────────────────────────────
server.registerTool(
  "list_skills",
  {
    description:
      "List Day14 OS skills from the generated registry. Optional substring query " +
      "(matches name, description, triggers) and cluster filter (matches the " +
      "registry 'pack' field; pass 'meta' for meta skills).",
    inputSchema: {
      query: z.string().optional().describe("substring match on name/description/triggers"),
      cluster: z.string().optional().describe("pack name, or 'meta' for meta skills"),
    },
  },
  withTelemetry("list_skills", async ({ query, cluster }) => {
    let skills = [...(await getSkills())];
    if (cluster) {
      const c = cluster.toLowerCase();
      skills = skills.filter((s) =>
        c === "meta" ? s.isMeta : (s.pack || "").toLowerCase() === c
      );
    }
    if (query) {
      const q = query.toLowerCase();
      skills = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.triggers.some((t) => t.toLowerCase().includes(q))
      );
    }
    return ok({
      count: skills.length,
      skills: skills.map((s) => ({
        name: s.name,
        description: s.description,
        pack: s.pack || null,
        isMeta: s.isMeta,
      })),
    });
  })
);

// ── get_skill ───────────────────────────────────────────────────────────────
server.registerTool(
  "get_skill",
  {
    description:
      "Full registry entry for one skill plus its skill-graph edges (what it " +
      "references and what references it).",
    inputSchema: { name: z.string().describe("canonical kebab-case skill name") },
  },
  withTelemetry("get_skill", async ({ name }) => {
    const entry = await findSkill(name);
    if (!entry) return fail(`Skill not found: ${name}`);
    const graph = await getGraph();
    const outgoing = graph.EDGES.filter((e) => e.source === name);
    const incoming = graph.EDGES.filter((e) => e.target === name);
    return ok({
      ...entry,
      graph: {
        outgoing: outgoing.map((e) => ({ to: e.target, weight: e.weight })),
        incoming: incoming.map((e) => ({ from: e.source, weight: e.weight })),
      },
    });
  })
);

// ── get_customer ────────────────────────────────────────────────────────────
server.registerTool(
  "get_customer",
  {
    description:
      "Dossier summary for one customer: 01-brand.json plus the last entries " +
      "of 02-status.md and the list of dossier files present.",
    inputSchema: { slug: z.string().describe("customer slug") },
  },
  withTelemetry("get_customer", async ({ slug }) => {
    const entry = await lookupBySlug(slug);
    if (!entry) return fail(`Customer not found: ${slug}`);
    const dir = path.join(SHARED, "customers", slug);
    const files = await fs.readdir(dir).catch(() => []);
    let statusTail = null;
    const statusPath = path.join(dir, "02-status.md");
    if (existsSync(statusPath)) {
      statusTail = (await tailLines(statusPath, 30)).join("\n");
    }
    return ok({
      slug: entry.slug,
      email: entry.email || null,
      stripe_customer_id: entry.stripe_customer_id || null,
      brand: entry.brand,
      dossier_files: files,
      status_tail: statusTail,
    });
  })
);

// ── search_customers ────────────────────────────────────────────────────────
server.registerTool(
  "search_customers",
  {
    description:
      "Case-insensitive substring search over the customer index (slug, email, " +
      "and 01-brand.json string fields like name/vertical/status).",
    inputSchema: { query: z.string().describe("search text; empty returns all") },
  },
  withTelemetry("search_customers", async ({ query }) => {
    const matches = await searchCustomers(query || "");
    return ok({
      count: matches.length,
      customers: matches.map((c) => ({
        slug: c.slug,
        email: c.email || null,
        stripe_customer_id: c.stripe_customer_id || null,
        name: typeof c.brand.name === "string" ? c.brand.name : null,
        vertical: typeof c.brand.vertical === "string" ? c.brand.vertical : null,
        status: typeof c.brand.status === "string" ? c.brand.status : null,
      })),
    });
  })
);

// ── query_work_register ─────────────────────────────────────────────────────
server.registerTool(
  "query_work_register",
  {
    description:
      "Tail of the append-only work-register (telemetry of everything agents " +
      "did). Filter by since (ISO timestamp), type (e.g. 'error'), source.",
    inputSchema: {
      since: z.string().optional().describe("ISO timestamp lower bound"),
      type: z.string().optional().describe("entry type, e.g. 'error'"),
      source: z.string().optional().describe("entry source module"),
      limit: z.number().int().min(1).max(500).optional().describe("max entries (default 50)"),
    },
  },
  withTelemetry("query_work_register", async ({ since, type, source, limit }) => {
    const max = limit ?? 50;
    if (!existsSync(REGISTER_PATH)) return ok({ count: 0, entries: [] });
    // Scan the most recent slice generously, then filter down.
    const lines = await tailLines(REGISTER_PATH, 5000);
    const sinceTs = since ? new Date(since).getTime() : null;
    const entries = [];
    for (let i = lines.length - 1; i >= 0 && entries.length < max; i--) {
      let parsed;
      try {
        parsed = JSON.parse(lines[i]);
      } catch {
        continue;
      }
      if (sinceTs && new Date(parsed.timestamp).getTime() < sinceTs) continue;
      if (type && parsed.type !== type) continue;
      if (source && parsed.source !== source && parsed.agent !== source) continue;
      entries.push(parsed);
    }
    entries.reverse(); // chronological
    return ok({ count: entries.length, entries });
  })
);

// ── run_skill ───────────────────────────────────────────────────────────────
server.registerTool(
  "run_skill",
  {
    description:
      "Execute one of the SAFE read-only analyzer skills directly: " +
      "uptime-monitor, customer-ltv-calculator, churn-risk-scorer. Any other " +
      "skill is refused — queue a Jack-tap approval instead (queue_jack_tap).",
    inputSchema: {
      name: z.string().describe("skill name (must be on the allowlist)"),
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("optional inputs forwarded as the skill's ctx.inputs"),
      customer_slug: z.string().optional(),
    },
  },
  withTelemetry("run_skill", async ({ name, context, customer_slug }) => {
    if (!RUN_SKILL_ALLOWLIST.has(name)) {
      return fail(
        `'${name}' is not on the MCP run allowlist. Only read-only analyzers ` +
          `(${[...RUN_SKILL_ALLOWLIST].join(", ")}) run directly. For anything ` +
          `consequential, call queue_jack_tap so Jack can approve and execute it.`,
        { allowlist: [...RUN_SKILL_ALLOWLIST] }
      );
    }
    // Telemetry: log the actual skill invocation (feeds skill-coverage-auditor)
    await logSkillInvocation(name, "mcp", customer_slug);
    const outcome = await runSkill(name, {
      context: "mcp",
      customer_slug,
      inputs: context,
      caller: "mcp-server",
    });
    await auditLog({
      action: "mcp_run_skill",
      actor: "automated:mcp-server",
      actor_source: "mcp",
      skill_invoked: name,
      customer_slug,
      details: { ok: outcome.ok, path: outcome.path, error: outcome.error ?? null },
    });
    return ok(outcome);
  })
);

// ── queue_jack_tap ──────────────────────────────────────────────────────────
server.registerTool(
  "queue_jack_tap",
  {
    description:
      "Queue an approval card for Jack. Appends an open operator to-do to " +
      "~/Documents/businesses/_shared/operator-todos.json — the same store the " +
      "/admin/inbox approvals queue and the approvals API read/write. Nothing " +
      "executes until Jack approves. Dedup-safe (won't re-file an open near-duplicate).",
    inputSchema: {
      title: z.string().describe("one-line summary of what needs approval"),
      body: z.string().describe("why this needs Jack — context and consequences"),
      action: z.string().describe("the exact action Jack would approve/execute"),
    },
  },
  withTelemetry("queue_jack_tap", async ({ title, body, action }) => {
    const result = await fileTodo({
      tenant: "empire",
      title,
      detail: `${body}\n\nProposed action: ${action}`,
      category: "review",
      priority: "high",
      source: "mcp-server",
      instructions: { steps: [action] },
    });
    await auditLog({
      action: "jack_tap_queued",
      actor: "automated:mcp-server",
      actor_source: "mcp",
      details: {
        title,
        proposed_action: action,
        filed: result.filed,
        todo_id: result.todo?.id ?? null,
        duplicate_of: result.duplicateOf ?? null,
      },
    });
    await logAction({
      action_phrase: `queued jack-tap approval card: ${title}`.slice(0, 200),
      context: "mcp",
      agent: "mcp-server",
      notes: result.filed ? `filed ${result.todo.id}` : `dedup → ${result.duplicateOf}`,
    });
    if (!result.filed) {
      return ok({
        filed: false,
        reason: result.reason,
        duplicate_of: result.duplicateOf ?? null,
        note: "An open near-duplicate already exists in the approvals queue.",
      });
    }
    return ok({
      filed: true,
      todo_id: result.todo.id,
      seq: result.todo.seq,
      surfaces: ["/admin/inbox approvals queue", `telegram: done ${result.todo.seq}`],
    });
  })
);

// ── system_health ───────────────────────────────────────────────────────────
const CORE_POLLERS = ["growth-watcher", "telegram-poller", "events-poller"];

async function checkHeartbeat(name) {
  const hb = path.join(POLLER_DIR, `${name}-heartbeat.log`);
  if (!existsSync(hb)) {
    return { name, status: "red", detail: "no heartbeat file ever" };
  }
  try {
    const lines = await tailLines(hb, 1);
    const last = lines[0];
    if (!last) return { name, status: "red", detail: "heartbeat file empty" };
    const m = last.match(/^(\S+)/);
    if (!m) return { name, status: "unknown", detail: "malformed heartbeat" };
    const ageMin = Math.round((Date.now() - new Date(m[1]).getTime()) / 60000);
    // Same thresholds as /dashboard/system: >10m red, >3m yellow.
    const status = ageMin > 10 ? "red" : ageMin > 3 ? "yellow" : "green";
    return { name, status, age_min: ageMin, detail: `last heartbeat ${ageMin}m ago` };
  } catch (err) {
    return { name, status: "unknown", detail: err instanceof Error ? err.message : String(err) };
  }
}

server.registerTool(
  "system_health",
  {
    description:
      "Poller heartbeat freshness — the same _shared/poller/*-heartbeat.log " +
      "files /dashboard/system reads. >10m old = red, >3m = yellow.",
    inputSchema: {},
  },
  withTelemetry("system_health", async () => {
    const core = await Promise.all(CORE_POLLERS.map(checkHeartbeat));
    // Also surface any other heartbeat files living in the poller dir.
    const known = new Set(CORE_POLLERS.map((n) => `${n}-heartbeat.log`));
    const extras = [];
    for (const f of await fs.readdir(POLLER_DIR).catch(() => [])) {
      if (f.endsWith("-heartbeat.log") && !known.has(f)) {
        extras.push(await checkHeartbeat(f.replace(/-heartbeat\.log$/, "")));
      }
    }
    const all = [...core, ...extras];
    const overall = all.some((c) => c.status === "red")
      ? "red"
      : all.some((c) => c.status === "yellow")
        ? "yellow"
        : "green";
    return ok({ overall, core_pollers: core, other_heartbeats: extras });
  })
);

// ── boot ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[day14-mcp] server ready on stdio (8 tools)");
