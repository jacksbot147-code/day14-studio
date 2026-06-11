import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SHARED = path.join(homedir(), "Documents/businesses/_shared");
const POLLER_DIR = path.join(SHARED, "poller");
const TELEGRAM_DIR = path.join(SHARED, "telegram");
const CORE_AGENTS = ["growth-watcher", "telegram-poller", "events-poller"];

export type AgentStatus = "online" | "degraded" | "offline";

export interface AgentInfo {
  name: string;
  status: AgentStatus;
  ageSec: number;
  core: boolean;
}

function statusFor(ageSec: number): AgentStatus {
  if (ageSec < 300) return "online";
  if (ageSec < 1800) return "degraded";
  return "offline";
}

async function scanAgents(): Promise<AgentInfo[]> {
  if (!existsSync(POLLER_DIR)) return [];
  const files = await fs.readdir(POLLER_DIR);
  const now = Date.now();
  const agents: AgentInfo[] = [];
  for (const f of files) {
    if (!f.endsWith("-heartbeat.log")) continue;
    const name = f.replace(/-heartbeat\.log$/, "");
    try {
      // mtime is the only truth — log contents can be stale synced data.
      const st = await fs.stat(path.join(POLLER_DIR, f));
      const ageSec = Math.max(0, Math.round((now - st.mtimeMs) / 1000));
      agents.push({ name, status: statusFor(ageSec), ageSec, core: CORE_AGENTS.includes(name) });
    } catch {
      /* skip unreadable */
    }
  }
  // Core agents with NO heartbeat file at all are offline, not invisible.
  for (const core of CORE_AGENTS) {
    if (!agents.some((a) => a.name === core)) {
      agents.push({ name: core, status: "offline", ageSec: -1, core: true });
    }
  }
  return agents.sort((a, b) => Number(b.core) - Number(a.core) || a.ageSec - b.ageSec);
}

async function countJson(dir: string): Promise<number> {
  if (!existsSync(dir)) return 0;
  const files = await fs.readdir(dir);
  return files.filter((f) => f.endsWith(".json")).length;
}

interface OutboxCard {
  file: string;
  urgency: string;
  preview: string;
  queuedAt: string | null;
}

async function readOutbox(): Promise<OutboxCard[]> {
  const dir = path.join(TELEGRAM_DIR, "outbox");
  if (!existsSync(dir)) return [];
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  const cards: OutboxCard[] = [];
  for (const f of files.slice(0, 20)) {
    try {
      const raw = await fs.readFile(path.join(dir, f), "utf8");
      const j = JSON.parse(raw);
      cards.push({
        file: f,
        urgency: j.urgency ?? "P3",
        preview: String(j.text ?? "").slice(0, 120),
        queuedAt: j.queued_at ?? null,
      });
    } catch {
      cards.push({ file: f, urgency: "P?", preview: "(unparseable JSON)", queuedAt: null });
    }
  }
  return cards;
}

interface FeedEvent {
  ts: string;
  level: "error" | "info";
  text: string;
}

async function tailPollerLog(maxEvents = 14): Promise<FeedEvent[]> {
  const file = path.join(TELEGRAM_DIR, "poller.log");
  if (!existsSync(file)) return [];
  try {
    const st = await fs.stat(file);
    const fh = await fs.open(file, "r");
    const readBytes = Math.min(st.size, 32_768);
    const buf = Buffer.alloc(readBytes);
    await fh.read(buf, 0, readBytes, st.size - readBytes);
    await fh.close();
    const lines = buf.toString("utf8").split("\n").filter(Boolean).slice(-maxEvents * 3);
    const events: FeedEvent[] = [];
    for (const line of lines) {
      const m = line.match(/^\[([^\]]+)\]\s*(.*)$/);
      if (!m) continue;
      events.push({
        ts: m[1],
        level: /error|fail|fatal/i.test(m[2]) ? "error" : "info",
        text: m[2].slice(0, 160),
      });
    }
    return events.slice(-maxEvents).reverse();
  } catch {
    return [];
  }
}

async function workRegister(): Promise<{ count: number; recent: string[] }> {
  const file = path.join(SHARED, "growth", "work-register.jsonl");
  if (!existsSync(file)) return { count: 0, recent: [] };
  try {
    const lines = (await fs.readFile(file, "utf8")).split("\n").filter(Boolean);
    return { count: lines.length, recent: lines.slice(-5).reverse().map((l) => l.slice(0, 200)) };
  } catch {
    return { count: 0, recent: [] };
  }
}

async function circuitState(): Promise<Record<string, unknown> | null> {
  const file = path.join(SHARED, "growth", "meta-circuit-state.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function skillCount(): Promise<number> {
  try {
    const file = path.join(process.cwd(), "src/lib/skill-registry.generated.ts");
    const text = await fs.readFile(file, "utf8");
    const matches = text.match(/slug:\s*["']/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

async function tenantNames(): Promise<string[]> {
  const file = path.join(SHARED, "tenants.json");
  if (!existsSync(file)) return [];
  try {
    const j = JSON.parse(await fs.readFile(file, "utf8"));
    const list = Array.isArray(j) ? j : j.tenants ?? [];
    return list.map((t: { slug?: string; name?: string }) => t.name ?? t.slug ?? "unknown");
  } catch {
    return [];
  }
}

export async function GET() {
  const [agents, outbox, deadCount, sentCount, feed, register, circuit, skills, tenants] =
    await Promise.all([
      scanAgents(),
      readOutbox(),
      countJson(path.join(TELEGRAM_DIR, "outbox", "_dead")),
      countJson(path.join(TELEGRAM_DIR, "_sent")),
      tailPollerLog(),
      workRegister(),
      circuitState(),
      skillCount(),
      tenantNames(),
    ]);

  const coreOffline = agents.filter((a) => a.core && a.status === "offline").length;
  const anyOffline = agents.filter((a) => a.status === "offline").length;
  const overall: "nominal" | "degraded" | "critical" =
    coreOffline > 0 ? "critical" : anyOffline > 0 ? "degraded" : "nominal";

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    overall,
    agents,
    outbox: { queued: outbox, dead: deadCount, sentTotal: sentCount },
    feed,
    register,
    circuit,
    skills,
    tenants,
  });
}
