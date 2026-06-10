/**
 * Tests for skill-runner — the execution engine's path selection.
 *
 * Verifies:
 *   - hand-coded path still wins when an impl exists (neither LLM runner fires)
 *   - DAY14_RUNNER=legacy selects the legacy loop; default selects the SDK path
 *   - spec-only fallback when no impl and no ANTHROPIC_API_KEY
 *   - the SDK path calls query() with the skill-spec system prompt, the
 *     in-process MCP tool server, no built-in tools, and the MAX_TURNS cap
 *
 * The Agent SDK module is mocked — no real API calls, nothing spawned.
 * work-register + skill-runtime are mocked so nothing hits the real
 * filesystem except the audit-log test's tmp HOME.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// ---- mocks ----------------------------------------------------------------

const loadSkillMock = vi.fn();
vi.mock("../src/lib/skill-runtime", () => ({
  loadSkill: (...args: unknown[]) => loadSkillMock(...args),
}));

vi.mock("../src/lib/work-register", () => ({
  logAction: vi.fn(async () => {}),
  logAdHoc: vi.fn(async () => {}),
  logSkillInvocation: vi.fn(async () => {}),
  logError: vi.fn(async () => {}),
}));

const legacyRunMock = vi.fn();
vi.mock("../src/lib/skill-runner-legacy", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    runViaLLMLegacy: (...args: unknown[]) => legacyRunMock(...args),
  };
});

// Agent SDK mock: query() yields a single result message; createSdkMcpServer
// and tool() record what they were given.
const queryMock = vi.fn();
const createSdkMcpServerMock = vi.fn();
const toolMock = vi.fn();
vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: (...args: unknown[]) => queryMock(...args),
  createSdkMcpServer: (...args: unknown[]) => createSdkMcpServerMock(...args),
  tool: (...args: unknown[]) => toolMock(...args),
}));

function fakeSkill(name: string) {
  return {
    name,
    description: `${name} description`,
    triggers: [],
    isMeta: false,
    pack: "",
    pathRelative: `docs/seeds/skills/${name}/SKILL.md`,
    frontmatter: {},
    body: "",
    sections: { "What this skill does": "test protocol" },
    hardRules: ["Never test in production"],
  };
}

async function* sdkResultStream() {
  yield {
    type: "result",
    subtype: "success",
    is_error: false,
    num_turns: 3,
    result: "done",
  };
}

const SPEC_ONLY = "definitely-not-a-hand-coded-skill";

beforeEach(() => {
  vi.resetModules();
  loadSkillMock.mockReset();
  legacyRunMock.mockReset();
  queryMock.mockReset();
  createSdkMcpServerMock.mockReset();
  toolMock.mockReset();

  loadSkillMock.mockImplementation(async (name: string) => fakeSkill(name));
  legacyRunMock.mockResolvedValue({
    ok: true,
    skill: "x",
    path: "llm-agent",
    result: { summary: "legacy ran", ok: true },
  });
  createSdkMcpServerMock.mockReturnValue({ type: "sdk", name: "day14-skill-tools" });
  toolMock.mockImplementation((name: string) => ({ name }));
  queryMock.mockImplementation(() => sdkResultStream());

  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("DAY14_RUNNER", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function importRunner() {
  return import("../src/lib/skill-runner");
}

// ---- hand-coded path ------------------------------------------------------

describe("hand-coded path", () => {
  let TMP_HOME: string;

  beforeEach(async () => {
    // audit-log-generator (a real hand-coded impl) writes under HOME —
    // point it at a tmp dir like the other suites do.
    TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "skill-runner-test-"));
    process.env.HOME = TMP_HOME;
  });

  afterEach(async () => {
    await fs.rm(TMP_HOME, { recursive: true, force: true });
  });

  test("hand-coded impl wins; neither LLM runner fires", async () => {
    const { runSkill } = await importRunner();
    const outcome = await runSkill("audit-log-generator", {
      context: "test",
      inputs: { action: "test_action", actor: "vitest" },
    });
    expect(outcome.path).toBe("hand-coded");
    expect(outcome.ok).toBe(true);
    expect(legacyRunMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });
});

// ---- runner selection by env ----------------------------------------------

describe("runner selection", () => {
  test("default (no DAY14_RUNNER) uses the Agent SDK path", async () => {
    const { runSkill } = await importRunner();
    const outcome = await runSkill(SPEC_ONLY, { context: "test" });
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(legacyRunMock).not.toHaveBeenCalled();
    expect(outcome.path).toBe("llm-agent");
  });

  test("DAY14_RUNNER=legacy routes to the legacy loop", async () => {
    vi.stubEnv("DAY14_RUNNER", "legacy");
    const { runSkill } = await importRunner();
    const outcome = await runSkill(SPEC_ONLY, { context: "test" });
    expect(legacyRunMock).toHaveBeenCalledTimes(1);
    expect(legacyRunMock).toHaveBeenCalledWith(
      SPEC_ONLY,
      expect.objectContaining({ context: "test" })
    );
    expect(queryMock).not.toHaveBeenCalled();
    expect(outcome.result).toEqual({ summary: "legacy ran", ok: true });
  });

  test("no ANTHROPIC_API_KEY → spec-only fallback, no runner fires", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { runSkill } = await importRunner();
    const outcome = await runSkill(SPEC_ONLY, { context: "test" });
    expect(outcome.path).toBe("spec-only");
    expect(outcome.ok).toBe(false);
    expect(legacyRunMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });
});

// ---- SDK path wiring --------------------------------------------------------

describe("agent-sdk path", () => {
  test("query() gets the skill-spec system prompt + governed options", async () => {
    const { runSkill } = await importRunner();
    const outcome = await runSkill(SPEC_ONLY, {
      context: "test-ctx",
      customer_slug: "acme",
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
    const call = queryMock.mock.calls[0]![0] as {
      prompt: string;
      options: Record<string, unknown>;
    };

    // System prompt carries the skill name, the absolute rules, and the
    // skill's hard rules — same builder the legacy loop used.
    const sys = String(call.options.systemPrompt);
    expect(sys).toContain(`\`${SPEC_ONLY}\``);
    expect(sys).toContain("NEVER send customer-facing emails");
    expect(sys).toContain("Never test in production");

    // Initial prompt carries spec + invocation context.
    expect(call.prompt).toContain(`## ${SPEC_ONLY}`);
    expect(call.prompt).toContain("customer_slug: acme");

    // Governance: built-ins disabled, only the six Day14 MCP tools allowed,
    // turn cap preserved.
    expect(call.options.tools).toEqual([]);
    expect(call.options.allowedTools).toEqual([
      "mcp__day14-skill-tools__read_file",
      "mcp__day14-skill-tools__write_file",
      "mcp__day14-skill-tools__queue_telegram_card",
      "mcp__day14-skill-tools__log_action",
      "mcp__day14-skill-tools__request_jack_tap",
      "mcp__day14-skill-tools__finish",
    ]);
    expect(call.options.maxTurns).toBe(8);
    expect(call.options.mcpServers).toHaveProperty("day14-skill-tools");

    // The in-process server was built with all six tools.
    expect(createSdkMcpServerMock).toHaveBeenCalledTimes(1);
    expect(toolMock).toHaveBeenCalledTimes(6);
    const toolNames = toolMock.mock.calls.map((c) => c[0]);
    expect(toolNames).toEqual([
      "read_file",
      "write_file",
      "queue_telegram_card",
      "log_action",
      "request_jack_tap",
      "finish",
    ]);

    // Outcome reflects the result message from the stream.
    expect(outcome.ok).toBe(true);
    expect(outcome.turn_count).toBe(3);
    expect(outcome.path).toBe("llm-agent");
  });

  test("SDK errors surface as a failed outcome, not a throw", async () => {
    queryMock.mockImplementation(() => {
      throw new Error("spawn failed");
    });
    const { runSkill } = await importRunner();
    const outcome = await runSkill(SPEC_ONLY, { context: "test" });
    expect(outcome.ok).toBe(false);
    expect(outcome.path).toBe("llm-agent");
    expect(outcome.error).toContain("spawn failed");
  });
});
