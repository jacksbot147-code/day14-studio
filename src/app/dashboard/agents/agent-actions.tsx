"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Approve / Deny buttons for the Command Deck tap queue. Each click POSTs to
 * /api/dashboard/agents/approve, which audit-logs the decision then performs it.
 * On success the row is refreshed from the server.
 */
export function TapActions({ kind, id, endpoint = "/api/dashboard/agents/approve" }: { kind: "todo" | "tap"; id: string; endpoint?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function act(action: "approve" | "deny") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, action }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (res.ok && data.ok) {
        setMsg(data.message || "done");
        startTransition(() => router.refresh());
      } else {
        setMsg(data.error || data.message || `failed (${res.status})`);
      }
    } catch {
      setMsg("network error");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || pending;

  return (
    <div className="flex items-center gap-2" style={{ fontFamily: "var(--cin-font-mono)" }}>
      <button
        onClick={() => act("approve")}
        disabled={disabled}
        style={{ background: "#56b3ff", color: "#050507" }}
        className="rounded-full disabled:opacity-40 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-opacity hover:opacity-90"
      >
        Approve
      </button>
      <button
        onClick={() => act("deny")}
        disabled={disabled}
        style={{ border: "1px solid rgba(255,255,255,0.16)", color: "#9698a4" }}
        className="rounded-full disabled:opacity-40 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:text-white"
      >
        Deny
      </button>
      {msg && <span style={{ color: "#767883" }} className="text-[11px]">{msg}</span>}
    </div>
  );
}
