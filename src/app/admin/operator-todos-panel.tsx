"use client";

/**
 * operator-todos-panel.tsx — the "Needs you" panel on the empire homescreen.
 *
 * Each open operator to-do is a click-to-expand row. Expanding reveals the
 * structured `instructions` an agent filed via operator-todo-writer.mjs:
 *   - steps : numbered list of plain-English actions
 *   - links : real anchors that open in a new tab
 *   - code  : monospace terminal block with a copy button
 *
 * Rows with no instructions still render (title + detail + meta) and simply
 * have nothing to expand — fully backward-compatible with legacy todos.
 *
 * MARK DONE — the local write path.
 *   The "Mark done" button POSTs to /api/admin/approvals
 *   ({ kind:"todo", id, action:"approve" }), which flips the to-do to
 *   status:"done" + stamps completed_at in operator-todos.json and mirrors the
 *   empire-state.json snapshot — the exact same convention the Telegram
 *   "done N" command used, now driven straight from the dashboard. The row is
 *   removed optimistically on success. If the write path is unavailable (the
 *   hosted Vercel copy is view-only and returns 503), the button degrades to
 *   the original Telegram fallback so the operator always has a way through.
 */

import { useState } from "react";
import type { HumanTodo } from "@/lib/admin-state";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="todo-copy-btn"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          },
          () => {}
        );
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** Telegram fallback affordance — only shown if the local write path fails. */
function TelegramFallback({ seq, botUser }: { seq: number; botUser: string | null }) {
  if (botUser) {
    return (
      <a
        href={`https://t.me/${botUser}?text=${encodeURIComponent(`done ${seq}`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        mark done in Telegram
      </a>
    );
  }
  return (
    <span>
      Telegram: <code>done {seq}</code>
    </span>
  );
}

function TodoRow({
  todo,
  botUser,
  onDone,
}: {
  todo: HumanTodo;
  botUser: string | null;
  onDone: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ins = todo.instructions;
  const hasInstructions = !!(
    ins &&
    ((ins.steps && ins.steps.length) ||
      (ins.links && ins.links.length) ||
      (ins.code && ins.code.trim()))
  );

  async function markDone() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "todo", id: todo.id, action: "approve" }),
      });
      if (res.ok) {
        onDone(todo.id); // optimistic — drop the row, it's persisted
        return;
      }
      const data = (await res.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;
      setError(data?.error || data?.message || "Couldn’t mark this done here.");
    } catch {
      setError("Couldn’t reach the dashboard.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`todo-row ${todo.priority === "high" ? "pri-high" : ""}`}>
      <div className="todo-seq">{todo.seq}</div>
      <div className="todo-body">
        <button
          type="button"
          className={`todo-head ${hasInstructions ? "expandable" : ""}`}
          onClick={() => hasInstructions && setOpen((v) => !v)}
          aria-expanded={hasInstructions ? open : undefined}
        >
          <span className="todo-title">{todo.title}</span>
          {hasInstructions ? (
            <span className={`todo-caret ${open ? "open" : ""}`} aria-hidden="true">
              ›
            </span>
          ) : null}
        </button>
        {todo.detail ? <div className="todo-detail">{todo.detail}</div> : null}

        {hasInstructions && open ? (
          <div className="todo-instructions">
            {ins?.steps && ins.steps.length ? (
              <div className="todo-ins-block">
                <div className="todo-ins-label">Steps</div>
                <ol className="todo-steps">
                  {ins.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            {ins?.links && ins.links.length ? (
              <div className="todo-ins-block">
                <div className="todo-ins-label">Links</div>
                <ul className="todo-links">
                  {ins.links.map((l, i) => (
                    <li key={i}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer">
                        {l.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {ins?.code && ins.code.trim() ? (
              <div className="todo-ins-block">
                <div className="todo-ins-label todo-ins-label-row">
                  <span>Run in Terminal</span>
                  <CopyButton text={ins.code} />
                </div>
                <pre className="todo-code">{ins.code}</pre>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="todo-meta">
          <span className={`pill ${todo.priority === "high" ? "pri-high" : ""}`}>
            {todo.priority}
          </span>
          <span className="pill">{todo.tenant}</span>
          <span className="pill">{todo.category}</span>
          {hasInstructions ? (
            <button type="button" className="todo-expand-link" onClick={() => setOpen((v) => !v)}>
              {open ? "Hide instructions" : "Show instructions"}
            </button>
          ) : null}
        </div>
      </div>
      <div className="todo-action">
        <button
          type="button"
          className="todo-done-btn"
          onClick={markDone}
          disabled={saving}
          aria-busy={saving}
        >
          {saving ? "Marking…" : "Mark done"}
        </button>
        {error ? (
          <span className="todo-done-hint">
            {error} <TelegramFallback seq={todo.seq} botUser={botUser} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function OperatorTodosPanel({
  todos,
  botUser,
}: {
  todos: HumanTodo[];
  botUser: string | null;
}) {
  const [items, setItems] = useState<HumanTodo[]>(todos);
  const removeTodo = (id: string) =>
    setItems((cur) => cur.filter((t) => t.id !== id));

  return (
    <div className={`todo-panel ${items.length > 0 ? "has-items" : ""}`}>
      {items.length === 0 ? (
        <div className="todo-empty">
          Nothing needs you right now — the agents have it covered.
        </div>
      ) : (
        items.map((t) => (
          <TodoRow key={t.id} todo={t} botUser={botUser} onDone={removeTodo} />
        ))
      )}
    </div>
  );
}
