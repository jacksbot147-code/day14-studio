"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ *
 * Life Loophole — checklist email-capture form (client leaf).
 * Optimistic "joined" state + fire-and-forget POST. Extracted from
 * page.tsx so the landing page itself stays a server component.
 * ------------------------------------------------------------------ */

export function ChecklistForm() {
  const [joined, setJoined] = useState(false);

  return (
    <>
      <form
        className="signup"
        onSubmit={(ev) => {
          ev.preventDefault();
          const formEl = ev.currentTarget;
          const data = new FormData(formEl);
          const email = String(data.get("email") || "").trim();
          setJoined(true);
          if (!email) return;
          // Fire-and-forget — the UI already says success. The inbox
          // write happens server-side regardless of the user's path.
          fetch("/api/brands/life-loophole/checklist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          }).catch(() => {
            /* best-effort */
          });
        }}
      >
        <input
          type="email"
          name="email"
          placeholder="you@email.com"
          required
          aria-label="Email address"
        />
        <button type="submit" className="btn lg">Send me the checklist</button>
      </form>
      {joined ? (
        <div className="get-ok">✓ You are on the list — the checklist is on its way.</div>
      ) : null}
    </>
  );
}
