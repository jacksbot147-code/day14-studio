"use client";

import { useTransition } from "react";
import { promoteDraft, archiveDraft, dismissCard, markCardSent, resetMetaCircuit, logEnergyCheckin } from "./actions";

export function DraftActions({ name, isMeta }: { name: string; isMeta: boolean }) {
  const [pending, start] = useTransition();
  return (
    <span className="ml-auto flex gap-2">
      <button
        disabled={pending}
        onClick={() => start(() => void promoteDraft(name, isMeta))}
        className="text-xs px-2 py-1 rounded bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 disabled:opacity-50"
      >
        promote
      </button>
      <button
        disabled={pending}
        onClick={() => start(() => void archiveDraft(name, isMeta))}
        className="text-xs px-2 py-1 rounded bg-zinc-700/40 text-zinc-300 hover:bg-zinc-700/70 disabled:opacity-50"
      >
        archive
      </button>
    </span>
  );
}

export function CardActions({ filename }: { filename: string }) {
  const [pending, start] = useTransition();
  return (
    <span className="ml-auto flex gap-2">
      <button
        disabled={pending}
        onClick={() => start(() => void markCardSent(filename))}
        className="text-xs px-2 py-1 rounded bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 disabled:opacity-50"
      >
        sent
      </button>
      <button
        disabled={pending}
        onClick={() => start(() => void dismissCard(filename))}
        className="text-xs px-2 py-1 rounded bg-zinc-700/40 text-zinc-300 hover:bg-zinc-700/70 disabled:opacity-50"
      >
        dismiss
      </button>
    </span>
  );
}

export function ResetCircuitButton() {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => void resetMetaCircuit())}
      className="mt-2 text-xs px-3 py-1.5 rounded bg-red-600/30 text-red-300 hover:bg-red-600/50 disabled:opacity-50"
    >
      {pending ? "resetting..." : "reset circuit"}
    </button>
  );
}

export function EnergyCheckinForm() {
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const energy = Number(fd.get("energy") || 0);
        const mood = Number(fd.get("mood") || 0);
        const note = String(fd.get("note") || "");
        start(() => void logEnergyCheckin(energy, mood, note));
        e.currentTarget.reset();
      }}
      className="flex flex-wrap items-center gap-2 text-xs mt-3"
    >
      <label className="flex items-center gap-1">
        <span className="text-zinc-400">energy</span>
        <select
          name="energy"
          defaultValue="7"
          className="bg-zinc-800 text-zinc-100 rounded px-1.5 py-0.5"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        <span className="text-zinc-400">mood</span>
        <select
          name="mood"
          defaultValue="4"
          className="bg-zinc-800 text-zinc-100 rounded px-1.5 py-0.5"
        >
          {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <input
        type="text"
        name="note"
        placeholder="optional note"
        className="bg-zinc-800 text-zinc-100 rounded px-2 py-0.5 flex-1 min-w-32"
      />
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-1 rounded bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 disabled:opacity-50"
      >
        log
      </button>
    </form>
  );
}
