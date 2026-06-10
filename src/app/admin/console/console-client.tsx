"use client";

/**
 * Console client island — prompt box, quick actions, and the polled
 * exchange thread. See docs/admin-console-spec.md.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface Vital {
  name: string;
  age_s: number | null;
  status: "green" | "red" | "unknown";
}

interface ConsoleEvent {
  id: string | number;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  payload: {
    text?: string;
    reply?: string;
    action?: string | null;
    replied_at?: string;
  };
}

interface ConsoleData {
  ok: boolean;
  vitals_source: string;
  vitals: Vital[];
  register: string[];
  supabase: boolean;
  thread: ConsoleEvent[];
}

const QUICK_ACTIONS = ["todos", "status", "realty targets"];

function age(s: number | null): string {
  if (s === null) return "never";
  if (s < 90) return `${s}s`;
  if (s < 5400) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
}

function rel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

export function ConsoleClient() {
  const [data, setData] = useState<ConsoleData | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/console", { cache: "no-store" });
      if (res.ok) setData((await res.json()) as ConsoleData);
    } catch {
      /* transient; next poll retries */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  const send = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || sending) return;
      setSending(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/console", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });
        const body = (await res.json()) as { ok: boolean; error?: string };
        if (!body.ok) {
          setError(body.error ?? `send failed (${res.status})`);
        } else {
          setText("");
          await refresh();
        }
      } catch {
        setError("network error — prompt not sent");
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [refresh, sending]
  );

  return (
    <div>
      {/* Vitals strip */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {(data?.vitals ?? []).map((v) => (
          <span
            key={v.name}
            className="chip"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              padding: "4px 10px",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              color: v.status === "green" ? "var(--text)" : "var(--accent-text)",
            }}
            title={`heartbeat ${age(v.age_s)} ago`}
          >
            {v.status === "green" ? "🟢" : v.status === "red" ? "🔴" : "⚪"} {v.name} · {age(v.age_s)}
          </span>
        ))}
        {data && (
          <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>
            vitals: {data.vitals_source}
            {!data.supabase && " · ⚠ supabase unreachable — prompts disabled"}
          </span>
        )}
      </div>

      {/* Prompt box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
        style={{ display: "flex", gap: 8, marginBottom: 8 }}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Command the runtime — try "todos" or "status"'
          maxLength={2000}
          style={{
            flex: 1,
            padding: "10px 12px",
            fontSize: 14,
            fontFamily: "var(--mono)",
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-sm)",
            color: "var(--text)",
          }}
        />
        <button
          type="submit"
          disabled={sending || !text.trim() || !data?.supabase}
          style={{
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--r-sm)",
            cursor: "pointer",
            opacity: sending || !text.trim() || !data?.supabase ? 0.5 : 1,
          }}
        >
          {sending ? "…" : "Send"}
        </button>
      </form>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa}
            type="button"
            onClick={() => void send(qa)}
            disabled={sending || !data?.supabase}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              fontFamily: "var(--mono)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              color: "var(--text-2)",
              cursor: "pointer",
            }}
          >
            {qa}
          </button>
        ))}
      </div>

      {error && (
        <p style={{ color: "var(--accent-text)", fontSize: 13, marginBottom: 12 }}>✗ {error}</p>
      )}

      {/* Thread */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(data?.thread ?? []).map((ev) => {
          const isError = (ev.processed_by ?? "").includes("ERROR");
          const pending = !ev.payload?.reply && !isError;
          return (
            <div
              key={String(ev.id)}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                padding: "12px 14px",
                background: "var(--surface)",
              }}
            >
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text)" }}>
                <span style={{ color: "var(--accent-text)" }}>›</span> {ev.payload?.text}
                <span style={{ float: "right", fontSize: 11, color: "var(--muted)" }}>
                  {rel(ev.created_at)}
                </span>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, whiteSpace: "pre-wrap", color: "var(--text-2)" }}>
                {isError
                  ? "✗ handler errored — see events table / master log"
                  : pending
                    ? "⏳ waiting for the runtime…"
                    : ev.payload?.reply}
              </div>
            </div>
          );
        })}
        {data && data.thread.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            No console exchanges yet. Send the first command above.
          </p>
        )}
      </div>

      {/* Work-register tail (local runtime only) */}
      {data && data.register.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ marginBottom: 8 }}>Recent runtime activity</h3>
          <pre
            style={{
              fontSize: 11,
              fontFamily: "var(--mono)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              padding: 12,
              overflowX: "auto",
              color: "var(--text-2)",
            }}
          >
            {data.register.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}
