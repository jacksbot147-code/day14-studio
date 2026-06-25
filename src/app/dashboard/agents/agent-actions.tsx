"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Approve / Deny buttons for the Command Deck tap queue. Each click POSTs to
 * /api/dashboard/agents/approve, which audit-logs the decision then performs it.
 * On success the row is refreshed from the server.
 */
export function TapActions({ kind, id }: { kind: "todo" | "tap"; id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function act(action: "approve" | "deny") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/dashboard/agents/approve", {
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
    <div className="flex items-center gap-2">
      <button
        onClick={() => act("approve")}
        disabled={disabled}
        className="rounded-md bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-40 px-2.5 py-1 text-xs font-semibold text-white transition-colors"
      >
        Approve
      </button>
      <button
        onClick={() => act("deny")}
        disabled={disabled}
        className="rounded-md bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 px-2.5 py-1 text-xs font-semibold text-zinc-100 transition-colors"
      >
        Deny
      </button>
      {msg && <span className="text-xs text-zinc-400">{msg}</span>}
    </div>
  );
}
