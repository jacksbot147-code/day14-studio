"use client";

/**
 * Client controls for the radar. Every button here calls a server action in
 * ./actions.ts — none of them execute an integration, they change the decision
 * record or queue a tap card.
 *
 * The evidence textarea is not decoration: the server rejects a move without
 * it, so the form makes the requirement visible instead of surprising.
 */

import { useState, useTransition } from "react";
import { addRadarItem, moveRing, queueIntegrationTap } from "./actions";

type Result = { ok: boolean; message: string; mirrorLine?: string } | null;

const RINGS = ["adopt", "trial", "assess", "hold"] as const;

function ResultNote({ result }: { result: Result }) {
  if (!result) return null;
  return (
    <div
      className={`mt-2 w-full rounded p-2.5 text-xs ${
        result.ok ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"
      }`}
    >
      <p>{result.message}</p>
      {result.mirrorLine && (
        <>
          <p className="mt-2 text-[11px] uppercase tracking-wider text-zinc-400">
            paste into the vault note
          </p>
          <code className="mt-1 block break-words rounded bg-zinc-950/70 p-2 font-mono text-[11px] text-zinc-300">
            {result.mirrorLine}
          </code>
        </>
      )}
    </div>
  );
}

export function RingMoveControl({
  slug,
  currentRing,
  itemName,
}: {
  slug: string;
  currentRing: string;
  itemName: string;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="ml-auto shrink-0 rounded bg-zinc-700/40 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700/70"
        >
          move ring
        </button>
        <ResultNote result={result} />
      </>
    );
  }

  return (
    <form
      className="mt-2 w-full space-y-2 rounded border border-zinc-700 bg-zinc-950/60 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const to = String(fd.get("to") || "");
        const evidence = String(fd.get("evidence") || "");
        start(async () => {
          const r = await moveRing(slug, to, evidence);
          setResult(r);
          if (r.ok) setOpen(false);
        });
      }}
    >
      <p className="text-xs text-zinc-400">
        Moving <span className="text-zinc-200">{itemName}</span> out of{" "}
        <span className="font-mono">{currentRing}</span>.
      </p>
      <label className="flex items-center gap-2 text-xs">
        <span className="text-zinc-400">to ring</span>
        <select
          name="to"
          defaultValue={currentRing === "hold" ? "assess" : "hold"}
          className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-100"
        >
          {RINGS.filter((r) => r !== currentRing).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <textarea
        name="evidence"
        rows={3}
        placeholder="Evidence (min 40 chars). Leaving Hold must cite a date (YYYY-MM-DD) or a URL — a launch, a benchmark, a shipped GA feature, a real price."
        className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-emerald-600/30 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-600/50 disabled:opacity-50"
        >
          {pending ? "checking rules..." : "record move"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded bg-zinc-700/40 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700/70"
        >
          cancel
        </button>
      </div>
      <ResultNote result={result} />
    </form>
  );
}

export function QueueTapButton({ slug, label }: { slug: string; label?: string }) {
  const [result, setResult] = useState<Result>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => setResult(await queueIntegrationTap(slug)))
        }
        className="shrink-0 rounded bg-blue-600/30 px-2 py-1 text-xs text-blue-300 hover:bg-blue-600/50 disabled:opacity-50"
      >
        {pending ? "queueing..." : (label ?? "queue tap")}
      </button>
      <ResultNote result={result} />
    </>
  );
}

export function AddRadarItemForm() {
  const [result, setResult] = useState<Result>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const r = await addRadarItem(
            String(fd.get("name") || ""),
            String(fd.get("ring") || "assess"),
            String(fd.get("rationale") || ""),
            String(fd.get("next_action") || ""),
            String(fd.get("effort") || "")
          );
          setResult(r);
          if (r.ok) form.reset();
        });
      }}
    >
      <input
        name="name"
        placeholder="Item name"
        className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500"
      />
      <textarea
        name="rationale"
        rows={2}
        placeholder="Rationale (min 40 chars) — which Day14 decision does this change? A price, a build order, a buy-vs-build call."
        className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500"
      />
      <input
        name="next_action"
        placeholder="The one next concrete step (optional)"
        className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500"
      />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1">
          <span className="text-zinc-400">ring</span>
          <select
            name="ring"
            defaultValue="assess"
            className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-100"
          >
            <option value="trial">trial</option>
            <option value="assess">assess</option>
            <option value="hold">hold</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-zinc-400">effort</span>
          <select
            name="effort"
            defaultValue="hours"
            className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-100"
          >
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
            <option value="weeks">weeks</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-emerald-600/30 px-3 py-1 text-emerald-300 hover:bg-emerald-600/50 disabled:opacity-50"
        >
          {pending ? "adding..." : "add to radar"}
        </button>
      </div>
      <p className="text-[11px] text-zinc-500">
        Adopt is not offered — nothing enters at Adopt (rule 1). Anything already on
        the radar in any ring is rejected as settled.
      </p>
      <ResultNote result={result} />
    </form>
  );
}
