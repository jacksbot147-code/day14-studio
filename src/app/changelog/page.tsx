import type { Metadata } from "next";
import Link from "next/link";
import fs from "node:fs/promises";
import path from "node:path";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * /changelog — public ship log. Reads public/data/changelog.json + groups
 * by date. Compounds the transparency story: every visitor can see what
 * actually shipped, when, across every tenant. No agency does this.
 */

const TITLE = "Day14 Changelog — what shipped, when, on which tenant";
const DESCRIPTION =
  "Public ship log across every business running on Day14 OS. Updated when meaningful things ship. Transparency is the moat.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
    url: `https://${SITE.domain}/changelog`,
    siteName: SITE.brand,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
  },
};

type Entry = {
  date: string;
  tenant: string;
  kind: string;
  summary: string;
  evidence?: string;
};

type Changelog = {
  generated_at: string;
  entries: Entry[];
  tenants: Record<string, { label: string; color: string }>;
  kinds: Record<string, { label: string; color: string }>;
};

const KIND_STYLES: Record<string, string> = {
  ember: "text-ember-600 bg-ember-50 border-ember-200",
  amber: "text-amber-600 bg-amber-50 border-amber-200",
  blue: "text-blue-600 bg-blue-50 border-blue-200",
  gray: "text-warm-gray-500 bg-warm-gray-50 border-warm-gray-200",
  purple: "text-purple-600 bg-purple-50 border-purple-200",
  rose: "text-rose-600 bg-rose-50 border-rose-200",
  teal: "text-teal-600 bg-teal-50 border-teal-200",
  green: "text-shipped-600 bg-shipped-50 border-shipped-200",
};

async function loadChangelog(): Promise<Changelog | null> {
  try {
    const p = path.join(process.cwd(), "public", "data", "changelog.json");
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw) as Changelog;
  } catch {
    return null;
  }
}

function formatDateGroup(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function relativeAge(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const days = Math.round((now - then) / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

export default async function ChangelogPage() {
  const log = await loadChangelog();

  // Group entries by date
  const grouped: Record<string, Entry[]> = {};
  if (log) {
    for (const e of log.entries) {
      (grouped[e.date] ||= []).push(e);
    }
  }
  const dates = Object.keys(grouped).sort().reverse();
  const totalEntries = log?.entries.length ?? 0;

  return (
    <>
      <SiteHeader />
      <main className="container-page pt-14 pb-20 sm:pt-20">
        <div className="eyebrow mb-6">Changelog</div>
        <h1 className="max-w-3xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
          What shipped.
          <br className="hidden sm:block" /> When. Which tenant.
        </h1>
        <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
          Every meaningful change across every business running on Day14 OS. Updated when meaningful things ship. Most agencies hide their work; this is the opposite.
        </p>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-500">
          <span>{totalEntries} shipped</span>
          {log?.generated_at ? (
            <span>· Last updated {relativeAge(log.generated_at)}</span>
          ) : null}
          <span>· Honest about what's done, honest about what's not</span>
        </div>

        {!log ? (
          <div className="mt-16 rounded-2xl border border-warm-gray-100 bg-paper-cream p-7">
            <p className="text-ink-500">Changelog data not available right now. Try again in a minute.</p>
          </div>
        ) : (
          <div className="mt-16 space-y-14">
            {dates.map((date) => (
              <section key={date}>
                <header className="mb-6 flex items-baseline gap-4 border-b border-warm-gray-100 pb-3">
                  <h2 className="text-xl font-extrabold tracking-tightest text-ink">{formatDateGroup(date)}</h2>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-400">
                    {relativeAge(date)}
                  </span>
                </header>
                <ul className="space-y-4">
                  {grouped[date]!.map((e, i) => {
                    const tenantMeta = log.tenants[e.tenant];
                    const kindMeta = log.kinds[e.kind];
                    const kindClass = kindMeta ? KIND_STYLES[kindMeta.color] ?? KIND_STYLES.gray : KIND_STYLES.gray;
                    return (
                      <li
                        key={`${date}-${i}`}
                        className="flex flex-col gap-3 rounded-xl border border-warm-gray-100 bg-white p-5 sm:flex-row sm:items-start sm:gap-5"
                      >
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            aria-hidden
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: tenantMeta?.color ?? "#94a3b8" }}
                          />
                          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink">
                            {tenantMeta?.label ?? e.tenant}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[15px] leading-[1.55] text-ink">{e.summary}</p>
                          {e.evidence ? (
                            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-warm-gray-400">
                              evidence: {e.evidence}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={
                            "self-start rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] " +
                            kindClass
                          }
                        >
                          {kindMeta?.label ?? e.kind}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="mt-20 rounded-2xl border border-warm-gray-100 bg-paper-cream p-7">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-500">
            Why this exists
          </div>
          <p className="mt-3 max-w-3xl text-[14px] leading-[1.6] text-ink-500">
            Every web agency hides what they're working on. Day14 publishes it. If you're considering hiring me, you should be able to see the work I'm doing for the businesses I already operate &mdash; not just polished after-the-fact case studies. The changelog is the work itself.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/#book" className="btn-ember">
              Book a 15-min intro call
            </Link>
            <Link href="/capabilities" className="btn-ghost">
              See full scope
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
