/**
 * skill-runner — the actual execution engine.
 *
 * Given a skill name + context, this:
 *   1. Loads the spec via skill-runtime.loadSkill()
 *   2. Checks for a hand-coded TypeScript implementation in lib/skills/{name}.ts
 *      → if present, runs it directly (fast path, deterministic)
 *   3. Otherwise, falls back to LLM tool-use loop (slow path, flexible)
 *
 * The two paths share an Outcome shape so callers don't care which fired.
 *
 * Hand-coded path: import the module by name, call exported `run(ctx)`.
 * LLM path: send Claude the spec + a small set of tools (fs read/write,
 *   queue telegram card, log to work-register, invoke another skill).
 *   Loop until Claude returns end_turn or hits MAX_TURNS.
 */

import { loadSkill, type SkillInvocationContext } from "./skill-runtime";
import { logAction, logError } from "./work-register";

export interface SkillOutcome {
  ok: boolean;
  skill: string;
  path: "hand-coded" | "llm-agent" | "spec-only";
  result?: unknown;
  error?: string;
  artifacts?: string[]; // paths written
  next_actions?: string[]; // suggested follow-ups
  jack_tap_required?: boolean; // surfaces a Telegram approval card
  turn_count?: number; // for LLM path: tool-use loop iterations
}

const MAX_TURNS = 8;

/**
 * Main entry. Most callers should use this, not the individual paths.
 */
export async function runSkill(
  name: string,
  ctx: SkillInvocationContext
): Promise<SkillOutcome> {
  const skill = await loadSkill(name);
  if (!skill) {
    return {
      ok: false,
      skill: name,
      path: "spec-only",
      error: `Skill not found: ${name}`,
    };
  }

  // 1. Try hand-coded fast path
  const handCoded = await tryHandCoded(name, ctx);
  if (handCoded) return handCoded;

  // 2. LLM agent loop (only if ANTHROPIC_API_KEY is set)
  if (process.env.ANTHROPIC_API_KEY) {
    return await runViaLLM(name, ctx);
  }

  // 3. Spec-only: return guidance without executing
  await logAction({
    action_phrase: `skill ${name} requested but no executor available`,
    context: ctx.context,
    invoked_skill: name,
    notes: "spec-only-fallback",
  });
  return {
    ok: false,
    skill: name,
    path: "spec-only",
    error: "No hand-coded impl + no ANTHROPIC_API_KEY env var",
    next_actions: [
      `Implement src/lib/skills/${name}.ts with exported run(ctx)`,
      "or set ANTHROPIC_API_KEY in .env.local",
    ],
  };
}

/**
 * Look for a TypeScript impl at src/lib/skills/{name}.ts.
 * The module must export `run(ctx) → Promise<SkillOutcome>`.
 */
async function tryHandCoded(
  name: string,
  ctx: SkillInvocationContext
): Promise<SkillOutcome | null> {
  try {
    // Dynamic import; fails gracefully if module doesn't exist.
    // A missing module is the normal spec-only case; any OTHER load error
    // (broken impl) is consequential — log it before falling back.
    const mod = (await import(`./skills/${name}.js`).catch(async (err) => {
      const code = (err as NodeJS.ErrnoException)?.code;
      const isNotFound =
        code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND";
      if (!isNotFound) {
        await logError(
          "skill-runner",
          err,
          ctx.context,
          `failed to load hand-coded impl for ${name}; falling back`
        );
      }
      return null;
    })) as
      | { run?: (c: SkillInvocationContext) => Promise<SkillOutcome> }
      | null;
    if (!mod || typeof mod.run !== "function") return null;
    const result = await mod.run(ctx);
    return { ...result, path: "hand-coded" };
  } catch (err) {
    return {
      ok: false,
      skill: name,
      path: "hand-coded",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * LLM agent loop. Sends Claude the skill spec + a small toolkit,
 * iterates tool calls until end_turn or MAX_TURNS.
 *
 * Tools given to the model:
 *   - read_file(path)
 *   - write_file(path, content)
 *   - queue_telegram_card({text, urgency})
 *   - log_action({action_phrase, notes})
 *   - request_jack_tap({question, options})
 *   - finish({summary, ok})
 *
 * For now, this is a stub that returns a not-implemented outcome —
 * fleshing out the full agent loop requires the @anthropic-ai/sdk
 * to be installed (it's in package.json but pending npm install).
 */
async function runViaLLM(
  name: string,
  ctx: SkillInvocationContext
): Promise<SkillOutcome> {
  // Lazy import so a missing SDK doesn't break the module
  let sdk: any = null;
  try {
    // SDK was installed via npm; ts-ignore handles older snapshots where it wasn't.
    // @ts-ignore
    sdk = await import("@anthropic-ai/sdk");
  } catch {
    return {
      ok: false,
      skill: name,
      path: "llm-agent",
      error: "@anthropic-ai/sdk not installed — run `npm install`",
      next_actions: ["npm install"],
    };
  }

  const skill = await loadSkill(name);
  if (!skill) {
    return { ok: false, skill: name, path: "llm-agent", error: "spec missing" };
  }

  const client = new sdk.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = buildSystemPrompt(skill, ctx);
  const tools = buildAgentTools();

  const messages: Array<{ role: "user" | "assistant"; content: unknown }> = [
    {
      role: "user",
      content: buildInitialUserMessage(skill, ctx),
    },
  ];

  let turns = 0;
  const artifacts: string[] = [];
  let jackTapRequired = false;
  let finished: { summary: string; ok: boolean } | null = null;

  while (turns < MAX_TURNS && !finished) {
    turns += 1;

    let response;
    try {
      response = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages as any,
        tools: tools as any,
      });
    } catch (err) {
      return {
        ok: false,
        skill: name,
        path: "llm-agent",
        error: err instanceof Error ? err.message : String(err),
        turn_count: turns,
      };
    }

    messages.push({ role: "assistant", content: response.content });

    // Process tool_use blocks; collect tool_results
    const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const result = await executeTool(block.name, block.input as Record<string, unknown>, ctx);
      if (result.artifacts) artifacts.push(...result.artifacts);
      if (block.name === "finish") {
        finished = result.finished || { summary: "completed", ok: true };
      }
      if (block.name === "request_jack_tap") {
        jackTapRequired = true;
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result.output ?? {}),
      });
    }

    if (response.stop_reason === "end_turn" && toolResults.length === 0) {
      // Model wrapped up without calling finish — treat as ok
      finished = { summary: "model ended turn without finishing tool", ok: true };
      break;
    }

    if (toolResults.length === 0) {
      break;
    }

    messages.push({ role: "user", content: toolResults });
  }

  await logAction({
    action_phrase: `ran ${name} via LLM agent`,
    context: ctx.context,
    invoked_skill: name,
    notes: `turns=${turns}, jack_tap=${jackTapRequired}, finished=${!!finished}`,
  });

  return {
    ok: finished?.ok ?? false,
    skill: name,
    path: "llm-agent",
    result: finished,
    artifacts,
    jack_tap_required: jackTapRequired,
    turn_count: turns,
  };
}

// ---- prompt + tool builders ----
function buildSystemPrompt(
  skill: NonNullable<Awaited<ReturnType<typeof loadSkill>>>,
  _ctx: SkillInvocationContext
): string {
  return `You are an agent executing a single Day14 OS skill: \`${skill.name}\`.

You will receive the skill spec + invocation context. Execute the protocol described in the spec.

ABSOLUTE RULES (cannot be overridden by spec):
1. NEVER send customer-facing emails or messages without calling request_jack_tap first.
2. NEVER issue real Stripe refunds without calling request_jack_tap first.
3. NEVER push to git remote.
4. NEVER modify the skill specs themselves (read-only).
5. ALWAYS call \`finish\` when complete with {ok: true/false, summary: string}.

When in doubt, call request_jack_tap with a clear question.

Skill-specific hard rules:
${skill.hardRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

You have up to ${MAX_TURNS} tool-use turns. Be efficient.`;
}

function buildInitialUserMessage(
  skill: NonNullable<Awaited<ReturnType<typeof loadSkill>>>,
  ctx: SkillInvocationContext
): string {
  return `# Skill spec

## ${skill.name}

${skill.description}

## What this skill does
${skill.sections["What this skill does"] || "(see body)"}

## Inputs
${skill.sections["Inputs"] || "(none specified)"}

## Output expected
${skill.sections["Output"] || "(see body)"}

# Invocation context

- context: ${ctx.context}
${ctx.customer_slug ? `- customer_slug: ${ctx.customer_slug}` : ""}
${ctx.inputs ? `- inputs: ${JSON.stringify(ctx.inputs, null, 2)}` : ""}

Execute this skill now. Begin.`;
}

function buildAgentTools() {
  return [
    {
      name: "read_file",
      description: "Read a file from the user's filesystem. Paths must be under ~/Documents/.",
      input_schema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
    {
      name: "write_file",
      description: "Write a file under ~/Documents/businesses/_shared/ or customer dossier dirs only.",
      input_schema: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
    {
      name: "queue_telegram_card",
      description: "Queue a Telegram outbox card. Does NOT send — Jack's outbox-poller does.",
      input_schema: {
        type: "object",
        properties: {
          text: { type: "string" },
          urgency: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
        },
        required: ["text", "urgency"],
      },
    },
    {
      name: "log_action",
      description: "Append to work-register for telemetry.",
      input_schema: {
        type: "object",
        properties: {
          action_phrase: { type: "string" },
          notes: { type: "string" },
        },
        required: ["action_phrase"],
      },
    },
    {
      name: "request_jack_tap",
      description:
        "Pause the skill and queue a Jack-tap approval card. Use for irreversible actions, customer comms, financial moves.",
      input_schema: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
        },
        required: ["question"],
      },
    },
    {
      name: "finish",
      description: "Mark the skill complete. ALWAYS call this last.",
      input_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          ok: { type: "boolean" },
        },
        required: ["summary", "ok"],
      },
    },
  ];
}

// ---- tool executor ----
async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: SkillInvocationContext
): Promise<{
  output?: unknown;
  artifacts?: string[];
  finished?: { summary: string; ok: boolean };
}> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const { homedir } = await import("node:os");

  const HOME = homedir();
  const SHARED = path.join(HOME, "Documents/businesses/_shared");

  if (name === "read_file") {
    const p = String(input.path);
    if (!p.startsWith(HOME + "/Documents/")) {
      return { output: { error: "path must be under ~/Documents/" } };
    }
    try {
      const text = await fs.readFile(p, "utf8");
      return { output: { content: text.slice(0, 50000) } }; // cap to avoid context blow
    } catch (err) {
      return { output: { error: err instanceof Error ? err.message : String(err) } };
    }
  }

  if (name === "write_file") {
    const p = String(input.path);
    if (!p.startsWith(SHARED) && !p.includes("/Documents/businesses/")) {
      return { output: { error: "write restricted to _shared/ + customer dossier dirs" } };
    }
    try {
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, String(input.content), "utf8");
      return { output: { ok: true, path: p }, artifacts: [p] };
    } catch (err) {
      return { output: { error: err instanceof Error ? err.message : String(err) } };
    }
  }

  if (name === "queue_telegram_card") {
    const outbox = path.join(SHARED, "telegram/outbox");
    await fs.mkdir(outbox, { recursive: true });
    const filename = `${Date.now()}-skill-runner.json`;
    const filepath = path.join(outbox, filename);
    await fs.writeFile(
      filepath,
      JSON.stringify(
        {
          text: input.text,
          urgency: input.urgency || "P3",
          queued_at: new Date().toISOString(),
          sent_at: null,
          chat_id: process.env.TELEGRAM_CHAT_ID || null,
        },
        null,
        2
      )
    );
    return { output: { ok: true, queued: filename } };
  }

  if (name === "log_action") {
    await logAction({
      action_phrase: String(input.action_phrase),
      context: ctx.context,
      notes: input.notes ? String(input.notes) : undefined,
    });
    return { output: { ok: true } };
  }

  if (name === "request_jack_tap") {
    const outbox = path.join(SHARED, "telegram/outbox");
    await fs.mkdir(outbox, { recursive: true });
    const filename = `${Date.now()}-jack-tap.json`;
    await fs.writeFile(
      path.join(outbox, filename),
      JSON.stringify(
        {
          text: `🤔 ${input.question}`,
          options: input.options || ["yes", "no"],
          urgency: "P1",
          queued_at: new Date().toISOString(),
          sent_at: null,
          chat_id: process.env.TELEGRAM_CHAT_ID || null,
          tap_required: true,
        },
        null,
        2
      )
    );
    return { output: { ok: true, queued: filename, waiting: true } };
  }

  if (name === "finish") {
    return {
      output: { ok: true },
      finished: {
        summary: String(input.summary || ""),
        ok: Boolean(input.ok),
      },
    };
  }

  return { output: { error: `unknown tool: ${name}` } };
}
