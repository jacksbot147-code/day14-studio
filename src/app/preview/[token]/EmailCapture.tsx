"use client";

/**
 * EmailCapture — the "make it real" lead island on /preview/[token].
 *
 * Records interest: POSTs JSON to /api/preview-lead — NO autonomous send;
 * follow-up is a Jack-tap. Honest copy (we'll reach out, nothing is live/charged).
 * Themed via the preview's --pv-* variables so it matches each business's brand.
 */

import { useState, type CSSProperties, type FormEvent } from "react";

interface Props {
  name: string;
  trade: string;
  city: string;
  token: string;
}

type Status = "idle" | "sending" | "done" | "error";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const card: CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  border: "1px solid var(--pv-line)",
  borderRadius: 18,
  background: "var(--pv-surface)",
  padding: "34px 30px",
  textAlign: "center",
};
const srOnly: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
};

export default function EmailCapture({ name, trade, city, token }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value) || value.length > 254) {
      setError("Enter a valid email.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/preview-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, trade, city, email: value, token }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(
          res.status === 429
            ? "Too many tries — give it a minute."
            : body?.error
              ? `Couldn't save that: ${body.error}.`
              : "Something went wrong. Try again.",
        );
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Network hiccup — try again.");
      setStatus("error");
    }
  }

  return (
    <section id="claim" style={{ padding: "30px 24px 70px", scrollMarginTop: 70 }}>
      <div style={card}>
        {status === "done" ? (
          <p style={{ color: "var(--pv-ink)", fontSize: 18, lineHeight: 1.5, margin: 0 }}>
            <span style={{ color: "var(--pv-label)" }}>✦</span> Thanks — we&rsquo;ll
            reach out about making {name} real. No charge, no spam.
          </p>
        ) : (
          <>
            <h2 style={{ fontFamily: "var(--pv-head)", fontWeight: 700, color: "var(--pv-ink)", margin: "0 0 8px", fontSize: "clamp(22px,3vw,30px)" }}>
              Want this site for real?
            </h2>
            <p style={{ color: "var(--pv-mut)", fontSize: 15.5, lineHeight: 1.5, margin: "0 auto 22px", maxWidth: "42ch" }}>
              Drop your email and we&rsquo;ll reach out to make {name} live — on
              your own domain. We never send without you asking.
            </p>
            <form onSubmit={submit} style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              <label htmlFor="preview-email" style={srOnly}>Email address</label>
              <input
                id="preview-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@business.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                disabled={status === "sending"}
                style={{
                  flex: "1 1 240px",
                  minWidth: 0,
                  border: "1px solid var(--pv-line)",
                  borderRadius: 100,
                  background: "color-mix(in srgb, var(--pv-ink) 4%, transparent)",
                  color: "var(--pv-ink)",
                  font: "inherit",
                  fontSize: 15,
                  padding: "12px 18px",
                }}
              />
              <button
                type="submit"
                data-cta="preview_lead_submit"
                disabled={status === "sending"}
                style={{
                  flex: "0 0 auto",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 15,
                  padding: "12px 24px",
                  borderRadius: 100,
                  background: "var(--pv-primary)",
                  color: "var(--pv-on-primary)",
                }}
              >
                {status === "sending" ? "Sending…" : "Make it real →"}
              </button>
            </form>
            <p
              role={status === "error" ? "alert" : undefined}
              aria-live="polite"
              style={{ minHeight: 18, marginTop: 12, marginBottom: 0, fontSize: 13, color: status === "error" ? "#d8453f" : "var(--pv-mut)" }}
            >
              {status === "error" ? error : "We’ll only use it to follow up."}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
