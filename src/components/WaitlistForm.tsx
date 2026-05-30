"use client";

import { useState } from "react";

/**
 * WaitlistForm — Day14 OS pivot-day signup.
 * Posts to /api/waitlist. Idempotent server-side; safe to resubmit.
 */
export function WaitlistForm({
  placeholder = "you@example.com",
  buttonText = "Get on the waitlist",
  source = "day14-os-landing",
}: {
  placeholder?: string;
  buttonText?: string;
  source?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [alreadyOnList, setAlreadyOnList] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json()) as { ok: boolean; alreadyOnList?: boolean; error?: string };
      if (data.ok) {
        setAlreadyOnList(Boolean(data.alreadyOnList));
        setStatus("ok");
        setEmail("");
      } else {
        setErrorMsg(data.error || "That didn't go through. Try again?");
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-shipped-500/30 bg-shipped-500/10 px-4 py-3 text-sm font-medium text-shipped-600">
        <span aria-hidden="true">✓</span>
        {alreadyOnList
          ? "Already on the list — I'll email Sunday with where the signal landed."
          : "You're on. I'll email Sunday with where the signal landed."}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="email"
        required
        placeholder={placeholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="field flex-1"
        aria-label="Email address"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-ember shrink-0"
      >
        {status === "loading" ? "Sending…" : buttonText}
      </button>
      {status === "error" ? (
        <p className="basis-full text-xs text-ember-600 sm:mt-1">{errorMsg}</p>
      ) : null}
    </form>
  );
}
