import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";
import { decodePreview, tradeContent, titleCasePreview } from "@/lib/preview";
import { previewMetadata } from "../meta";

/**
 * /preview/[token]/about — themed about page (brandKit via --pv-*).
 * Honest placeholder copy — no fabricated founding year / owner / team / counts.
 */

type Params = { token: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  return previewMetadata(params.token, "/about");
}

const pad: CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: "0 24px" };
const kicker: CSSProperties = { fontFamily: "var(--pv-head)", fontWeight: 600, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--pv-primary)" };

export default function AboutPreviewPage({ params }: { params: Params }) {
  const d = decodePreview(params.token);
  if (!d) notFound();
  const name = titleCasePreview(d.name);
  const city = d.city ? titleCasePreview(d.city) : "";
  const tc = tradeContent(d.trade);
  const trade = tc.label.toLowerCase();
  const place = city ? ` in ${city}` : "";

  const pillars: [string, string][] = [
    ["Easy to work with", `Booking ${trade} work${place} should be simple — request a time online, get a clear quote, pay when it's done.`],
    ["Reliable and on schedule", `Every job is tracked, confirmed, and reminded ahead of time, so you always know what's booked.`],
    ["Built to answer fast", `An AI assistant handles routine questions instantly and hands the rest off — nothing sits overnight.`],
  ];

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <section style={{ padding: "70px 0 30px" }}>
        <div style={{ ...pad, maxWidth: 760 }}>
          <div style={kicker}>About {name}</div>
          <h1 style={{ fontFamily: "var(--pv-head)", fontWeight: 700, letterSpacing: "-0.03em", fontSize: "clamp(32px,4.6vw,52px)", margin: "12px 0 18px", color: "var(--pv-ink)" }}>
            {tc.tagline}
          </h1>
          <p style={{ color: "var(--pv-mut)", fontSize: 17, lineHeight: 1.7, margin: 0 }}>
            This is starter copy for {name}&rsquo;s about page — swap in your story
            before going live. {name} is a {trade} business{place} that makes it
            effortless to get booked, served, and paid, all in one place.
          </p>
        </div>
      </section>
      <section style={{ padding: "10px 0 60px" }}>
        <div style={{ ...pad, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
          {pillars.map(([t, b]) => (
            <div key={t} style={{ background: "var(--pv-surface)", border: "1px solid var(--pv-line)", borderRadius: 16, padding: "24px 22px" }}>
              <h3 style={{ fontFamily: "var(--pv-head)", fontWeight: 600, fontSize: 18, margin: "0 0 8px", color: "var(--pv-ink)" }}>{t}</h3>
              <p style={{ color: "var(--pv-mut)", fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>{b}</p>
            </div>
          ))}
        </div>
        <div style={{ ...pad, textAlign: "center", marginTop: 44 }}>
          <a href={SITE.bookingUrl} target="_blank" rel="noopener noreferrer" data-cta="book_preview_about" style={{ display: "inline-block", fontWeight: 600, fontSize: 15, padding: "14px 28px", borderRadius: 12, background: "var(--pv-primary)", color: "#fff", textDecoration: "none" }}>
            Work with {name} →
          </a>
        </div>
      </section>
    </div>
  );
}
