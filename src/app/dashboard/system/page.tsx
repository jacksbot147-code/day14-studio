/**
 * /dashboard/system — "is the empire alive?" page.
 *
 * Live health check across every component:
 *   - 3 pollers (heartbeats fresh?)
 *   - Dev server (this page renders = yes)
 *   - Env vars (which keys are set?)
 *   - Stripe API key valid?
 *   - Supabase reachable?
 *   - Anthropic API reachable?
 *   - Telegram bot token valid?
 *   - Disk space on _shared/
 *
 * Each check shows a status pill + a one-line "what to do if red".
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import Link from "next/link";

export const dynamic = "force-dynamic";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const POLLER_DIR = path.join(SHARED, "poller");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

interface CheckResult {
  name: string;
  status: "green" | "yellow" | "red" | "unknown";
  detail: string;
  fix?: string;
}

async function checkPoller(name: string): Promise<CheckResult> {
  const hb = path.join(POLLER_DIR, `${name}-heartbeat.log`);
  if (!existsSync(hb)) {
    return {
      name: `${name} poller`,
      status: "red",
      detail: "no heartbeat file ever",
      fix: `bash ~/Documents/studio/scripts/install-${name}.sh`,
    };
  }
  try {
    const text = await fs.readFile(hb, "utf8");
    const lines = text.trim().split("\n").filter(Boolean);
    const last = lines[lines.length - 1];
    if (!last) {
      return {
        name: `${name} poller`,
        status: "red",
        detail: "heartbeat file empty",
        fix: `bash ~/Documents/studio/scripts/install-${name}.sh`,
      };
    }
    const m = last.match(/^(\S+)/);
    if (!m || !m[1]) return { name: `${name} poller`, status: "unknown", detail: "malformed heartbeat" };
    const ageMin = Math.round((Date.now() - new Date(m[1]).getTime()) / 60000);
    if (ageMin > 10) {
      return {
        name: `${name} poller`,
        status: "red",
        detail: `last heartbeat ${ageMin}m ago`,
        fix: `launchctl unload + load ~/Library/LaunchAgents/com.day14.${name}.plist`,
      };
    }
    if (ageMin > 3) {
      return {
        name: `${name} poller`,
        status: "yellow",
        detail: `heartbeat ${ageMin}m old (some lag is normal)`,
      };
    }
    return {
      name: `${name} poller`,
      status: "green",
      detail: `heartbeat ${ageMin}m ago`,
    };
  } catch (err) {
    return {
      name: `${name} poller`,
      status: "unknown",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function loadEnv(): Promise<Record<string, string>> {
  if (!existsSync(ENV_FILE)) return {};
  const text = await fs.readFile(ENV_FILE, "utf8");
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] && m[2] !== undefined && !line.trim().startsWith("#")) {
      env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
  return env;
}

function checkEnvVar(env: Record<string, string>, key: string): CheckResult {
  const v = env[key];
  if (!v) {
    return {
      name: `env: ${key}`,
      status: "red",
      detail: "not set",
      fix: `add to ~/Documents/studio/.env.local`,
    };
  }
  if (v.length < 6) {
    return {
      name: `env: ${key}`,
      status: "yellow",
      detail: "set but short — possibly placeholder",
    };
  }
  return {
    name: `env: ${key}`,
    status: "green",
    detail: `${v.slice(0, 4)}…${v.slice(-2)} (${v.length} chars)`,
  };
}

async function checkStripe(env: Record<string, string>): Promise<CheckResult> {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) {
    return { name: "Stripe API", status: "red", detail: "no key" };
  }
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (res.ok) {
      return { name: "Stripe API", status: "green", detail: "balance endpoint OK" };
    }
    return {
      name: "Stripe API",
      status: "red",
      detail: `${res.status} ${res.statusText}`,
      fix: "rotate STRIPE_SECRET_KEY",
    };
  } catch (err) {
    return {
      name: "Stripe API",
      status: "red",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkSupabase(env: Record<string, string>): Promise<CheckResult> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { name: "Supabase", status: "red", detail: "no URL" };
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
      cache: "no-store",
    });
    if (res.status < 500) {
      return {
        name: "Supabase",
        status: "green",
        detail: `reachable (${res.status})`,
      };
    }
    return {
      name: "Supabase",
      status: "red",
      detail: `${res.status}`,
    };
  } catch (err) {
    return {
      name: "Supabase",
      status: "red",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkAnthropic(env: Record<string, string>): Promise<CheckResult> {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return { name: "Anthropic API", status: "red", detail: "no key" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4,
        messages: [{ role: "user", content: "ping" }],
      }),
      cache: "no-store",
    });
    if (res.ok) {
      return { name: "Anthropic API", status: "green", detail: "responded OK" };
    }
    return {
      name: "Anthropic API",
      status: "red",
      detail: `${res.status}`,
      fix: "rotate ANTHROPIC_API_KEY",
    };
  } catch (err) {
    return {
      name: "Anthropic API",
      status: "red",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkTelegram(env: Record<string, string>): Promise<CheckResult> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return { name: "Telegram bot", status: "red", detail: "no token" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { result?: { username?: string } };
      return {
        name: "Telegram bot",
        status: "green",
        detail: `@${data.result?.username ?? "ok"}`,
      };
    }
    return {
      name: "Telegram bot",
      status: "red",
      detail: `${res.status}`,
      fix: "verify TELEGRAM_BOT_TOKEN via @BotFather",
    };
  } catch (err) {
    return {
      name: "Telegram bot",
      status: "red",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function gatherAll(): Promise<CheckResult[]> {
  const env = await loadEnv();
  const results = await Promise.all([
    checkPoller("growth-watcher"),
    checkPoller("telegram-poller"),
    checkPoller("events-poller"),
    Promise.resolve(checkEnvVar(env, "STRIPE_SECRET_KEY")),
    Promise.resolve(checkEnvVar(env, "STRIPE_WEBHOOK_SECRET")),
    Promise.resolve(checkEnvVar(env, "RESEND_API_KEY")),
    Promise.resolve(checkEnvVar(env, "ANTHROPIC_API_KEY")),
    Promise.resolve(checkEnvVar(env, "TELEGRAM_BOT_TOKEN")),
    Promise.resolve(checkEnvVar(env, "TELEGRAM_CHAT_ID")),
    Promise.resolve(checkEnvVar(env, "SUPABASE_SERVICE_ROLE_KEY")),
    checkStripe(env),
    checkSupabase(env),
    checkAnthropic(env),
    checkTelegram(env),
  ]);
  return results;
}

const STATUS_STYLES: Record<CheckResult["status"], string> = {
  green: "bg-emerald-500/20 text-emerald-300",
  yellow: "bg-yellow-500/20 text-yellow-300",
  red: "bg-red-500/20 text-red-300",
  unknown: "bg-zinc-700/40 text-zinc-300",
};

const STATUS_EMOJI: Record<CheckResult["status"], string> = {
  green: "🟢",
  yellow: "🟡",
  red: "🔴",
  unknown: "⚪",
};

export default async function SystemPage() {
  const checks = await gatherAll();
  const red = checks.filter((c) => c.status === "red").length;
  const yellow = checks.filter((c) => c.status === "yellow").length;
  const green = checks.filter((c) => c.status === "green").length;

  const overall: CheckResult["status"] =
    red > 0 ? "red" : yellow > 0 ? "yellow" : "green";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">System</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {green} green · {yellow} yellow · {red} red
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full font-medium text-sm ${STATUS_STYLES[overall]}`}>
          {STATUS_EMOJI[overall]} {overall === "green" ? "all systems go" : overall === "yellow" ? "minor issues" : "needs attention"}
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {checks.map((c) => (
          <div
            key={c.name}
            className="rounded-lg bg-zinc-900 border border-zinc-800 p-4"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-sm text-zinc-200">{c.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[c.status]}`}>
                {STATUS_EMOJI[c.status]} {c.status}
              </span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">{c.detail}</div>
            {c.fix && c.status !== "green" && (
              <div className="text-xs text-zinc-500 mt-2 font-mono">
                fix → {c.fix}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg bg-zinc-900 border border-zinc-800 p-5 text-sm">
        <h2 className="text-zinc-300 font-semibold mb-2">Boot the whole stack</h2>
        <p className="text-zinc-400 mb-2">
          If multiple things are red, the fastest fix is the full re-boot script:
        </p>
        <code className="block bg-zinc-950 px-3 py-2 rounded text-emerald-300 text-xs">
          bash ~/Documents/studio/scripts/boot-day14.sh
        </code>
        <p className="text-xs text-zinc-500 mt-2">
          Idempotent. Installs deps, regenerates registry, loads LaunchAgents, starts dev server, runs E2E.
        </p>
      </div>

      <footer className="mt-10 pt-6 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between flex-wrap gap-2">
        <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200">
          ← back to dashboard
        </Link>
        <Link
          href="/dashboard/graph"
          className="text-emerald-400 hover:text-emerald-300"
        >
          skill graph →
        </Link>
      </footer>
    </main>
  );
}
