import type { Metadata } from "next";
import Link from "next/link";
import fs from "node:fs/promises";
import path from "node:path";

import { SITE } from "@/lib/site";
import { CinematicPage } from "@/components/cinematic/CinematicPage";
import { Reveal } from "@/components/cinematic/Reveal";

/**
 * /changelog — public ship log, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 8/10 of the rebuild — legal + info).
 * Light-touch: the shared <CinematicPage> shell + `.cin-prose` long-form. Reads
 * public/data/changelog.json and groups by date — the data-loading logic is
 * preserved verbatim; only the skin changes. Tenant dots keep their data-driven
 * colors; kind labels render as mono eyebrows. No prices appear here.
 */

const TITLE = "Changelog";
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
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

  const grouped: Record<string, Entry[]> = {};
  if (log) {
    for (const e of log.entries) {
      (grouped[e.date] ||= []).push(e);
    }
  }
  const dates = Object.keys(grouped).sort().reverse();
  const totalEntries = log?.entries.length ?? 0;

  return (
    <CinematicPage
      hero={{
        eyebrow: "Changelog",
        title: "What shipped. When. Which tenant.",
        lede: "Every meaningful change across every business running on Day14 OS. Updated when meaningful things ship. Most agencies hide their work; this is the opposite.",
      }}
    >
      <Reveal as="div" className="cin-prose">
        <p className="cin-prose-kicker">
          {totalEntries} shipped
          {log?.generated_at ? ` · last updated ${relativeAge(log.generated_at)}` : ""}{" "}
          · honest about what&rsquo;s done, honest about what&rsquo;s not
        </p>

        {!log ? (
          <p>Changelog data not available right now. Try again in a minute.</p>
        ) : (
          dates.map((date) => (
            <section key={date}>
              <h2>
                {formatDateGroup(date)}{" "}
                <span style={{ fontSize: "0.5em", opacity: 0.6 }}>
                  {relativeAge(date)}
                </span>
              </h2>
              <ul>
                {grouped[date]!.map((e, i) => {
                  const tenantMeta = log.tenants[e.tenant];
                  const kindMeta = log.kinds[e.kind];
                  return (
                    <li key={`${date}-${i}`}>
                      <strong
                        style={{
                          color: tenantMeta?.color ?? undefined,
                        }}
                      >
                        {tenantMeta?.label ?? e.tenant}
                      </strong>{" "}
                      <span style={{ opacity: 0.55, fontSize: "0.82em" }}>
                        [{kindMeta?.label ?? e.kind}]
                      </span>{" "}
                      — {e.summary}
                      {e.evidence ? (
                        <>
                          {" "}
                          <code>{e.evidence}</code>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        <hr />

        <p className="cin-prose-kicker">Why this exists</p>
        <p>
          Every web agency hides what they&rsquo;re working on. Day14 publishes
          it. If you&rsquo;re considering hiring me, you should be able to see
          the work I&rsquo;m doing for the businesses I already operate — not
          just polished after-the-fact case studies. The changelog is the work
          itself.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 28 }}>
          <a className="cin-btn cin-btn-solid" href={SITE.bookingUrl} target="_blank" rel="noopener noreferrer">
            Book a 15-min intro call
          </a>
          <Link className="cin-btn" href="/capabilities">
            See full scope
          </Link>
        </div>
      </Reveal>
    </CinematicPage>
  );
}
