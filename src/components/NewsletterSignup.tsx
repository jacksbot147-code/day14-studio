"use client";

import { useState } from "react";

interface Props {
  source?: string;
  groupId?: string;
  placeholder?: string;
  buttonText?: string;
  variant?: "inline" | "stacked" | "minimal";
  successMessage?: string;
}

export function NewsletterSignup({
  source = "website",
  groupId,
  placeholder = "you@email.com",
  buttonText = "Subscribe",
  variant = "inline",
  successMessage = "You're in. Check your inbox.",
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, groupId }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("ok");
        setEmail("");
      } else {
        setErrorMsg(data.error || "Subscribe failed");
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
        <span aria-hidden="true">✓</span> {successMessage}
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          type="email"
          required
          placeholder={placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field flex-1 !py-2 text-[13px]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary shrink-0 !px-3.5 !py-2 text-[13px]"
        >
          {status === "loading" ? "…" : buttonText}
        </button>
      </form>
    );
  }

  if (variant === "stacked") {
    return (
      <form onSubmit={submit} className="flex max-w-[400px] flex-col gap-2.5">
        <input
          type="email"
          required
          placeholder={placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
        />
        <button type="submit" disabled={status === "loading"} className="btn-ember">
          {status === "loading" ? "Subscribing…" : buttonText}
        </button>
        {status === "error" ? (
          <div className="text-xs font-medium text-ember-700">{errorMsg}</div>
        ) : null}
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="relative flex max-w-[480px] flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        placeholder={placeholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="field flex-1"
      />
      <button type="submit" disabled={status === "loading"} className="btn-ember shrink-0">
        {status === "loading" ? "…" : buttonText}
      </button>
      {status === "error" ? (
        <div className="text-xs font-medium text-ember-700 sm:absolute sm:mt-12">{errorMsg}</div>
      ) : null}
    </form>
  );
}
