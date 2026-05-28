/**
 * content-calendar-orchestrator — hand-coded impl.
 *
 * Plans a Mon-Sun content rhythm across blog/newsletter/social/video.
 * Reads a per-tenant calendar.jsonl, computes what's scheduled vs done
 * for the week, reports gaps. Deterministic — no LLM in the loop.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();
const CUSTOMERS_BASE = path.join(HOME, "Documents/businesses");

export type Channel = "blog" | "newsletter" | "linkedin" | "twitter" | "threads" | "youtube" | "instagram" | "tiktok";

export interface PlannedSlot {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1=Mon
  half: "AM" | "PM";
  channel: Channel;
  skill: string;
}

export interface CalendarEntry {
  iso_week: string; // e.g. "2026-W22"
  day: number;
  half: "AM" | "PM";
  channel: Channel;
  status: "planned" | "drafted" | "scheduled" | "published" | "missed";
  skill?: string;
  artifact_path?: string;
  timestamp: string;
}

export interface OrchestratorInput {
  tenant?: string;
  week_iso?: string; // defaults to current ISO week
}

export interface OrchestratorResult {
  iso_week: string;
  planned: PlannedSlot[];
  state: Record<string, CalendarEntry[]>; // keyed by day-half-channel
  gaps: Array<{ day: number; half: "AM" | "PM"; channel: Channel; skill: string }>;
  calendar_path: string;
  appended_count: number;
}

const PLAN: PlannedSlot[] = [
  { day: 1, half: "AM", channel: "blog", skill: "blog-post-generator" },
  { day: 1, half: "AM", channel: "linkedin", skill: "linkedin-thought-leadership-post" },
  { day: 2, half: "AM", channel: "newsletter", skill: "email-newsletter-composer" },
  { day: 2, half: "AM", channel: "twitter", skill: "social-cross-post" },
  { day: 3, half: "PM", channel: "linkedin", skill: "linkedin-thought-leadership-post" },
  { day: 3, half: "PM", channel: "blog", skill: "blog-post-generator" },
  { day: 4, half: "AM", channel: "threads", skill: "social-cross-post" },
  { day: 4, half: "AM", channel: "youtube", skill: "youtube-shorts-caption-writer" },
  { day: 5, half: "AM", channel: "linkedin", skill: "linkedin-thought-leadership-post" },
  { day: 6, half: "AM", channel: "youtube", skill: "youtube-script-from-blog" },
  { day: 7, half: "AM", channel: "newsletter", skill: "email-newsletter-composer" },
];

function isoWeek(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function key(d: number, h: "AM" | "PM", c: Channel): string {
  return `${d}-${h}-${c}`;
}

async function readEntries(filePath: string, week: string): Promise<CalendarEntry[]> {
  if (!existsSync(filePath)) return [];
  const text = await fs.readFile(filePath, "utf8");
  const out: CalendarEntry[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as CalendarEntry;
      if (parsed.iso_week === week) out.push(parsed);
    } catch {
      // skip
    }
  }
  return out;
}

export async function orchestrateCalendar(input: OrchestratorInput): Promise<OrchestratorResult> {
  const tenant = input.tenant || "day14";
  const week = input.week_iso || isoWeek();
  const calendarPath = path.join(CUSTOMERS_BASE, tenant, "content/calendar.jsonl");
  await fs.mkdir(path.dirname(calendarPath), { recursive: true });
  const entries = await readEntries(calendarPath, week);
  const state: Record<string, CalendarEntry[]> = {};
  for (const e of entries) {
    const k = key(e.day, e.half, e.channel);
    if (!state[k]) state[k] = [];
    state[k].push(e);
  }
  const gaps: OrchestratorResult["gaps"] = [];
  const newEntries: CalendarEntry[] = [];
  const nowIso = new Date().toISOString();
  for (const slot of PLAN) {
    const k = key(slot.day, slot.half, slot.channel);
    if (!state[k] || state[k].length === 0) {
      const planned: CalendarEntry = {
        iso_week: week,
        day: slot.day,
        half: slot.half,
        channel: slot.channel,
        status: "planned",
        skill: slot.skill,
        timestamp: nowIso,
      };
      newEntries.push(planned);
      state[k] = [planned];
      gaps.push({ day: slot.day, half: slot.half, channel: slot.channel, skill: slot.skill });
    }
  }
  if (newEntries.length > 0) {
    const lines = newEntries.map((e) => JSON.stringify(e)).join("\n") + "\n";
    await fs.appendFile(calendarPath, lines, "utf8");
  }
  await auditLog({
    action: "content_calendar_orchestrated",
    actor: "automated:content-calendar-orchestrator",
    details: { tenant, week, planned_slots: PLAN.length, appended: newEntries.length, gaps: gaps.length },
    skill_invoked: "content-calendar-orchestrator",
    actor_source: "skill-runner",
  });
  return {
    iso_week: week,
    planned: PLAN,
    state,
    gaps,
    calendar_path: calendarPath,
    appended_count: newEntries.length,
  };
}

export async function invokeContentCalendarOrchestrator(
  input: OrchestratorInput
): Promise<OrchestratorResult> {
  return orchestrateCalendar(input);
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = (ctx.inputs as Partial<OrchestratorInput> | undefined) ?? {};
  const result = await invokeContentCalendarOrchestrator(input);
  return {
    ok: true,
    skill: "content-calendar-orchestrator",
    path: "hand-coded",
    result,
    artifacts: [result.calendar_path],
    next_actions: result.gaps.length > 0 ? [`fire ${result.gaps.length} planned skills via scheduled tasks`] : [],
  };
}
