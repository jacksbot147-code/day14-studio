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
    return <div style={{ padding: "12px 16px", background: "rgba(108, 214, 108, 0.1)", border: "1px solid rgba(108, 214, 108, 0.3)", borderRadius: 8, color: "#6cd66c", fontSize: 14 }}>✓ {successMessage}</div>;
  }

  const baseInput = { padding: "12px 14px", border: "1px solid #2a2535", borderRadius: 8, fontSize: 14, background: "#13111a", color: "#e8e6ea", fontFamily: "inherit" } as const;
  const baseButton = { padding: "12px 20px", background: "linear-gradient(135deg,#a855f7,#06b6d4)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" } as const;

  if (variant === "minimal") {
    return (
      <form onSubmit={submit} style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="email" required placeholder={placeholder} value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...baseInput, flex: 1, fontSize: 13, padding: "8px 12px" }} />
        <button type="submit" disabled={status === "loading"} style={{ ...baseButton, fontSize: 13, padding: "8px 14px" }}>{status === "loading" ? "…" : buttonText}</button>
      </form>
    );
  }

  if (variant === "stacked") {
    return (
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400 }}>
        <input type="email" required placeholder={placeholder} value={email} onChange={(e) => setEmail(e.target.value)} style={baseInput} />
        <button type="submit" disabled={status === "loading"} style={baseButton}>{status === "loading" ? "Subscribing…" : buttonText}</button>
        {status === "error" ? <div style={{ fontSize: 12, color: "#ff6b6b" }}>{errorMsg}</div> : null}
      </form>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, maxWidth: 480 }}>
      <input type="email" required placeholder={placeholder} value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...baseInput, flex: 1 }} />
      <button type="submit" disabled={status === "loading"} style={baseButton}>{status === "loading" ? "…" : buttonText}</button>
      {status === "error" ? <div style={{ position: "absolute", marginTop: 48, fontSize: 12, color: "#ff6b6b" }}>{errorMsg}</div> : null}
    </form>
  );
}
