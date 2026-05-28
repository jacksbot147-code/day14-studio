/**
 * skill-spec-generator — hand-coded impl.
 *
 * Emits a canonical SKILL.md draft from a structured spec. Follows
 * Day14's 70-150-line format with the required sections + a growth
 * hook footer. Writes the draft to seeds/skills/_drafts/{name}/SKILL.md
 * — never to seeds/skills/ directly (that's draft-promoter's job).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { validateSkillName } from "./skill-naming-validator";

const HOME = homedir();
const DRAFTS_DIR = path.join(HOME, "Documents/studio/docs/seeds/skills/_drafts");

export interface SkillSpecInput {
  name: string;
  description: string;
  triggers: string[];
  evidence?: Array<{ situation: string; brief: string }>;
  pack?: string;
  parent_anchor?: string;
  // Optional sections — caller can fill or skill-spec-generator will scaffold
  why?: string;
  when_to_invoke?: string;
  inputs?: string;
  protocol?: string;
  output?: string;
  hard_rules?: string[];
}

export function renderSkillMarkdown(input: SkillSpecInput): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`name: ${input.name}`);
  lines.push(`description: ${input.description}`);
  lines.push("triggers:");
  for (const t of input.triggers) lines.push(`  - "${t.replace(/"/g, '\\"')}"`);
  if (input.pack) lines.push(`pack: ${input.pack}`);
  if (input.parent_anchor) lines.push(`parent_anchor: ${input.parent_anchor}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${input.name}`);
  lines.push("");
  lines.push(`> ${input.why ?? input.description}`);
  if (input.parent_anchor) {
    lines.push(`> Supporter under \`${input.parent_anchor}\`.`);
  }
  lines.push("");
  lines.push("## When to invoke");
  lines.push("");
  lines.push(input.when_to_invoke ?? "_TODO: describe the trigger conditions._");
  lines.push("");
  lines.push("## Inputs");
  lines.push("");
  lines.push(input.inputs ?? "_TODO: list required and optional inputs._");
  lines.push("");
  lines.push("## The protocol / mechanics");
  lines.push("");
  lines.push(input.protocol ?? "_TODO: describe the 1-3 steps the skill performs._");
  lines.push("");
  lines.push("## Output");
  lines.push("");
  lines.push(input.output ?? "_TODO: what does the skill write / return / change._");
  lines.push("");
  lines.push("## Hard rules");
  lines.push("");
  const rules = input.hard_rules?.length ? input.hard_rules : [
    "Never push to git remote without Jack approval.",
    "Never send customer-facing comms without Jack approval.",
    "Log every invocation to work-register via `logSkillInvocation`.",
  ];
  rules.forEach((r, i) => lines.push(`${i + 1}. **${r}**`));
  lines.push("");
  if (input.evidence?.length) {
    lines.push("## Evidence (drafted from)");
    lines.push("");
    for (const e of input.evidence) {
      lines.push(`- ${e.situation}: ${e.brief}`);
    }
    lines.push("");
  }
  lines.push("## Growth hook");
  lines.push("");
  lines.push("- Logs invocations via `logSkillInvocation(\"" + input.name + "\", ctx.context, ctx.customer_slug)`.");
  lines.push("- Ad-hoc deviations should be logged via `logAdHoc()` so skill-gap-detector can spot drift.");
  lines.push("");
  return lines.join("\n");
}

export async function writeDraft(input: SkillSpecInput): Promise<string> {
  const draftDir = path.join(DRAFTS_DIR, input.name);
  await fs.mkdir(draftDir, { recursive: true });
  const draftPath = path.join(draftDir, "SKILL.md");
  const body = renderSkillMarkdown(input);
  if (existsSync(draftPath)) {
    // Don't clobber an existing draft; write to .candidate suffix instead
    const altPath = path.join(draftDir, `SKILL.${Date.now()}.candidate.md`);
    await fs.writeFile(altPath, body, "utf8");
    return altPath;
  }
  await fs.writeFile(draftPath, body, "utf8");
  return draftPath;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<SkillSpecInput> | undefined;
  if (!input?.name || !input.description || !input.triggers?.length) {
    return {
      ok: false,
      skill: "skill-spec-generator",
      path: "hand-coded",
      error: "missing required inputs: name, description, triggers[]",
    };
  }

  const naming = await validateSkillName(input.name);
  if (!naming.ok) {
    return {
      ok: false,
      skill: "skill-spec-generator",
      path: "hand-coded",
      error: `name validation failed: ${naming.errors.join("; ")}`,
      result: naming,
    };
  }

  const draftPath = await writeDraft({
    name: input.name,
    description: input.description,
    triggers: input.triggers,
    evidence: input.evidence,
    pack: input.pack,
    parent_anchor: input.parent_anchor,
    why: input.why,
    when_to_invoke: input.when_to_invoke,
    inputs: input.inputs,
    protocol: input.protocol,
    output: input.output,
    hard_rules: input.hard_rules,
  });

  return {
    ok: true,
    skill: "skill-spec-generator",
    path: "hand-coded",
    result: { name: input.name, draft_path: draftPath, naming_warnings: naming.warnings },
    artifacts: [draftPath],
    next_actions: [
      "Jack reviews the draft.",
      "If approved: run draft-promoter to move from _drafts/ to seeds/skills/.",
    ],
  };
}
