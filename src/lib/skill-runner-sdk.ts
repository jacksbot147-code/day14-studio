/**
 * skill-runner-sdk — the LLM path of runSkill(), ported to
 * @anthropic-ai/claude-agent-sdk. This is the DEFAULT runner; the old
 * hand-rolled loop survives in skill-runner-legacy.ts behind
 * DAY14_RUNNER=legacy.
 *
 * How the port maps onto the SDK:
 *   - the SKILL.md spec drives the same systemPrompt + initial user
 *     message the legacy loop built (shared builders, not forked)
 *   - the six agent tools (read_file, write_file, queue_telegram_card,
 *     log_action, request_jack_tap, finish) become in-process MCP tools
 *     via createSdkMcpServer() + tool(); every handler delegates to the
 *     SAME executeTool() the legacy loop used, so path restrictions and
 *     side effects are byte-identical
 *   - `tools: []` disables every built-in Claude Code tool — the agent
 *     gets EXACTLY the six Day14 tools and nothing else (no Bash, no
 *     Edit, no WebFetch). No new side-effect capabilities vs legacy.
 *   - maxTurns mirrors the legacy MAX_TURNS cap
 *
 * Governance preserved: same absolute rules in the system prompt, same
 * Jack-tap escalation tool, same work-register logging on completion.
 */

import { loadSkill, type SkillInvocationContext } from "./skill-runtime";
import { logAction } from "./work-register";
import type { SkillOutcome } from "./skill-runner";
import {
  MAX_TURNS,
  buildSystemPrompt,
  buildInitialUserMessage,
  executeTool,
} from "./skill-runner-legacy";

const SERVER_NAME = "day14-skill-tools";

/** Fully-qualified MCP tool names the SDK exposes to the model. */
export const SDK_TOOL_NAMES = [
  "read_file",
  "write_file",
  "queue_telegram_card",
  "log_action",
  "request_jack_tap",
  "finish",
].map((t) => `mcp__${SERVER_NAME}__${t}`);

export async function runViaAgentSdk(
  name: string,
  ctx: SkillInvocationContext
): Promise<SkillOutcome> {
  // Lazy import so a missing SDK doesn't break the module (and so tests
  // can mock the module without it spawning anything).
  let sdk: typeof import("@anthropic-ai/claude-agent-sdk");
  try {
    sdk = await import("@anthropic-ai/claude-agent-sdk");
  } catch {
    return {
      ok: false,
      skill: name,
      path: "llm-agent",
      error: "@anthropic-ai/claude-agent-sdk not installed — run `npm install`",
      next_actions: ["npm install"],
    };
  }
  const { z } = await import("zod");

  const skill = await loadSkill(name);
  if (!skill) {
    return { ok: false, skill: name, path: "llm-agent", error: "spec missing" };
  }

  // Mutable run state captured by the tool handlers. Object properties
  // (not bare lets) so TypeScript doesn't over-narrow across the closures.
  const state = {
    artifacts: [] as string[],
    jackTapRequired: false,
    finished: null as { summary: string; ok: boolean } | null,
  };

  // Every handler funnels through the legacy executeTool() — identical
  // side effects, identical write-path restrictions.
  const exec = async (toolName: string, input: Record<string, unknown>) => {
    const result = await executeTool(toolName, input, ctx);
    if (result.artifacts) state.artifacts.push(...result.artifacts);
    if (toolName === "finish") {
      state.finished = result.finished || { summary: "completed", ok: true };
    }
    if (toolName === "request_jack_tap") {
      state.jackTapRequired = true;
    }
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(result.output ?? {}) },
      ],
    };
  };

  const server = sdk.createSdkMcpServer({
    name: SERVER_NAME,
    version: "1.0.0",
    tools: [
      sdk.tool(
        "read_file",
        "Read a file from the user's filesystem. Paths must be under ~/Documents/.",
        { path: z.string() },
        (args) => exec("read_file", args)
      ),
      sdk.tool(
        "write_file",
        "Write a file under ~/Documents/businesses/_shared/ or customer dossier dirs only.",
        { path: z.string(), content: z.string() },
        (args) => exec("write_file", args)
      ),
      sdk.tool(
        "queue_telegram_card",
        "Queue a Telegram outbox card. Does NOT send — Jack's outbox-poller does.",
        { text: z.string(), urgency: z.enum(["P0", "P1", "P2", "P3"]) },
        (args) => exec("queue_telegram_card", args)
      ),
      sdk.tool(
        "log_action",
        "Append to work-register for telemetry.",
        { action_phrase: z.string(), notes: z.string().optional() },
        (args) => exec("log_action", args)
      ),
      sdk.tool(
        "request_jack_tap",
        "Pause the skill and queue a Jack-tap approval card. Use for irreversible actions, customer comms, financial moves.",
        { question: z.string(), options: z.array(z.string()).optional() },
        (args) => exec("request_jack_tap", args)
      ),
      sdk.tool(
        "finish",
        "Mark the skill complete. ALWAYS call this last.",
        { summary: z.string(), ok: z.boolean() },
        (args) => exec("finish", args)
      ),
    ],
  });

  let turnCount = 0;
  let resultOk = false;
  let resultError: string | undefined;

  try {
    const q = sdk.query({
      prompt: buildInitialUserMessage(skill, ctx),
      options: {
        systemPrompt: buildSystemPrompt(skill, ctx),
        mcpServers: { [SERVER_NAME]: server },
        // No built-in tools at all — the model gets exactly the six
        // Day14 tools, auto-allowed so it never blocks on permissions.
        tools: [],
        allowedTools: [...SDK_TOOL_NAMES],
        maxTurns: MAX_TURNS,
      },
    });

    for await (const message of q) {
      if (message.type === "result") {
        turnCount = message.num_turns;
        if (message.subtype === "success") {
          resultOk = !message.is_error;
        } else {
          resultError = `agent-sdk: ${message.subtype}`;
        }
      }
    }
  } catch (err) {
    return {
      ok: false,
      skill: name,
      path: "llm-agent",
      error: err instanceof Error ? err.message : String(err),
      artifacts: state.artifacts,
      jack_tap_required: state.jackTapRequired,
      turn_count: turnCount,
    };
  }

  await logAction({
    action_phrase: `ran ${name} via LLM agent`,
    context: ctx.context,
    invoked_skill: name,
    notes: `runner=agent-sdk, turns=${turnCount}, jack_tap=${state.jackTapRequired}, finished=${!!state.finished}`,
  });

  return {
    ok: state.finished?.ok ?? resultOk,
    skill: name,
    path: "llm-agent",
    result: state.finished,
    error: resultError,
    artifacts: state.artifacts,
    jack_tap_required: state.jackTapRequired,
    turn_count: turnCount,
  };
}
