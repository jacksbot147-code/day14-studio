"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/**
 * WorkLogTicker — live work-log feed on the homepage.
 *
 * Reads /data/changelog.json client-side, shows the last 8 entries as a
 * scrolling vertical ticker. Pulses every 6s to surface the next entry.
 * Pauses on hover. Falls back gracefully if the JSON isn't there.
 *
 * Design intent: prove the OS is alive by showing real work as it ships.
 * Not a marketing video. Not faked. The motion is the data updating.
 */

type Entry = {
  date: string;
  tenant: string;
  kind: string;
  summary: string;
};

type Changelog = {
  generated_at?: string;
  entries: Entry[];
  tenants: Record<string, { label: string; color: string }>;
};

function relativeAge(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const days = Math.round((now - then) / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

const VISIBLE = 8;

export function WorkLogTicker() {
  const [data, setData] = useState<Changelog | null>(null);
  const [topIndex, setTopIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/changelog.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => {
        if (!cancelled) setData(json as Changelog);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data || paused) return;
    const t = setInterval(() => {
      setTopIndex((i) => (i + 1) % Math.max(1, data.entries.length));
    }, 6000);
    return () => clearInterval(t);
  }, [data, paused]);

  const visible = useMemo(() => {
    if (!data) return [];
    const n = data.entries.length;
    if (n === 0) return [];
    const out: Entry[] = [];
    for (let k = 0; k < Math.min(VISIBLE, n); k++) {
      const idx = (topIndex + k) % n;
      out.push(data.entries[idx]!);
    }
    return out;
  }, [data, topIndex]);

  return (
    <section className="bg-paper-cream py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="eyebrow mb-6 inline-flex items-center gap-2 justify-center text-ember-600">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-shipped-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-shipped-500" />
            </span>
            Day14 OS — live
          </div>
          <h2 className="text-[40px] font-extrabold leading-[1.02] tracking-tightest text-ink sm:text-[56px] lg:text-[64px]">
            What just shipped.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-[1.55] text-warm-gray-500 sm:text-[18px]">
            Real work-log from six tenants. Updates as things ship. Every other agency hides this.{" "}
            <Link href="/changelog" className="font-semibold text-ink underline decoration-warm-gray-300 underline-offset-4 hover:decoration-ember-500">
              See the full changelog →
            </Link>
          </p>
        </div>

        <div
          className="mx-auto mt-14 max-w-3xl rounded-2xl border border-warm-gray-100 bg-white p-4 shadow-[0_24px_60px_-20px_rgba(239,108,51,0.10),0_8px_24px_-8px_rgba(15,23,42,0.06)] sm:p-6"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          role="region"
          aria-label="Day14 OS work-log ticker"
        >
          {error ? (
            <p className="px-3 py-6 text-center text-[13px] text-warm-gray-500">
              Live feed paused. <Link href="/changelog" className="underline">Read the changelog directly →</Link>
            </p>
          ) : !data ? (
            <ul className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg bg-warm-gray-50 p-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-warm-gray-200" />
                  <span className="h-3 flex-1 animate-pulse rounded bg-warm-gray-100" />
                </li>
              ))}
            </ul>
          ) : visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-warm-gray-500">
              Quiet morning. Last ship loaded.
            </p>
          ) : (
            <ul className="space-y-1">
              {visible.map((e, i) => {
                const t = data.tenants[e.tenant];
                return (
                  <li
                    key={`${e.date}-${i}-${e.summary.slice(0, 12)}`}
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-300 hover:bg-warm-gray-50 sm:gap-4"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: t?.color ?? "#94a3b8" }}
                    />
                    <span className="w-[80px] shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink sm:w-[100px] sm:text-[11px]">
                      {t?.label ?? e.tenant}
                    </span>
                    <span className="w-[60px] shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-warm-gray-400 sm:w-[70px] sm:text-[11px]">
                      {relativeAge(e.date)}
                    </span>
                    <span className="flex-1 text-[13px] leading-[1.5] text-ink sm:text-[14px]">{e.summary}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-warm-gray-100 px-3 pt-3 text-[10px]">
            <span className="font-mono uppercase tracking-[0.18em] text-warm-gray-400">
              {paused ? "paused on hover" : "auto-scroll · 6s"}
            </span>
            <Link
              href="/changelog"
              className="font-mono uppercase tracking-[0.18em] text-ember-600 hover:text-ember-500"
            >
              full log →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
