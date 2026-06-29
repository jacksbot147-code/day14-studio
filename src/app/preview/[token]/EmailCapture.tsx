"use client";

/**
 * EmailCapture — the "make it real" lead island on /preview/[token].
 *
 * A small client form rendered on the generated preview one-pager: a prospect
 * who likes their preview drops an email and we record interest. POSTs JSON to
 * /api/preview-lead (queue item 1), which appends a lead line — there is NO
 * autonomous send here or downstream; follow-up is a Jack-tap (drafts only).
 *
 * Honest framing: the copy says we'll reach out, never that anything is live or
 * purchased. Success/error states resolve inline (no navigation). The form
 * carries name/trade/city/token so the lead line is self-describing.
 *
 * Cinematic: reuses the .cin-seg console input + .cin-btn button styles and the
 * var(--cin-*) tokens so it matches the rest of the preview without new CSS.
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
  maxWidth: 560,
  margin: "0 auto",
  border: "1px solid var(--cin-line)",
  borderRadius: 16,
  background: "rgba(255,255,255,0.02)",
  padding: "30px 28px",
  textAlign: "center",
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
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
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
    <section
      id="claim"
      style={{ padding: "30px 7vw 60px", scrollMarginTop: 70 }}
    >
      <div style={card}>
        {status === "done" ? (
          <>
            <div
              className="cin-kicker"
              style={{ justifyContent: "center", marginBottom: 12 }}
            >
              <span style={{ color: "var(--cin-cyan)" }}>✦</span> Got it
            </div>
            <p
              style={{
                color: "var(--cin-ink)",
                fontSize: 18,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Thanks — we&rsquo;ll reach out about making {name} real. No
              charge, no spam.
            </p>
          </>
        ) : (
          <>
            <h2
              className="cin-h2"
              style={{ marginTop: 0, marginBottom: 8, fontSize: "clamp(22px,3vw,30px)" }}
            >
              Want this site for real?
            </h2>
            <p
              style={{
                color: "var(--cin-mut)",
                fontSize: 15.5,
                lineHeight: 1.5,
                margin: "0 auto 22px",
                maxWidth: "42ch",
              }}
            >
              Drop your email and we&rsquo;ll reach out to make {name} live —
              on your own domain. We never send without you asking.
            </p>
            <form
              onSubmit={submit}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
                alignItems: "stretch",
              }}
            >
              <label htmlFor="preview-email" className="cin-sr-only">
                Email address
              </label>
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
                  border: "1px solid var(--cin-line)",
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--cin-ink)",
                  font: "inherit",
                  fontSize: 15,
                  padding: "12px 18px",
                }}
              />
              <button
                type="submit"
                className="cin-btn cin-btn-solid"
                data-cta="preview_lead_submit"
                disabled={status === "sending"}
                style={{ flex: "0 0 auto" }}
              >
                {status === "sending" ? "Sending…" : "Make it real →"}
              </button>
            </form>
            <p
              role={status === "error" ? "alert" : undefined}
              aria-live="polite"
              style={{
                minHeight: 18,
                marginTop: 12,
                marginBottom: 0,
                fontSize: 13,
                color: status === "error" ? "#ff8a8a" : "var(--cin-faint)",
              }}
            >
              {status === "error" ? error : "We’ll only use it to follow up."}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
