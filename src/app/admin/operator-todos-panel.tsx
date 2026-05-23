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

function TodoRow({ todo, botUser }: { todo: HumanTodo; botUser: string | null }) {
  const [open, setOpen] = useState(false);
  const ins = todo.instructions;
  const hasInstructions = !!(
    ins &&
    ((ins.steps && ins.steps.length) ||
      (ins.links && ins.links.length) ||
      (ins.code && ins.code.trim()))
  );

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
        {botUser ? (
          <a
            className="todo-done-btn"
            href={`https://t.me/${botUser}?text=${encodeURIComponent(`done ${todo.seq}`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mark done
          </a>
        ) : (
          <span className="todo-done-hint">
            Telegram: <code>done {todo.seq}</code>
          </span>
        )}
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
  return (
    <div className={`todo-panel ${todos.length > 0 ? "has-items" : ""}`}>
      {todos.length === 0 ? (
        <div className="todo-empty">
          Nothing needs you right now — the agents have it covered.
        </div>
      ) : (
        todos.map((t) => <TodoRow key={t.id} todo={t} botUser={botUser} />)
      )}
    </div>
  );
}
