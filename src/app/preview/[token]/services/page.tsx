import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";
import { decodePreview, tradeContent, titleCasePreview } from "@/lib/preview";
import { previewMetadata } from "../meta";

/**
 * /preview/[token]/services — themed services page (brandKit via --pv-*).
 * Honest: generic-but-tailored supporting copy, no fabricated prices/metrics.
 */

type Params = { token: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  return previewMetadata(params.token, "/services");
}

const SUPPORT = [
  "Booked online in seconds, scheduled around you, confirmed automatically.",
  "Clear quotes up front, simple online payment, no phone tag.",
  "Handled on a reliable schedule with reminders before every visit.",
  "Tracked in your customer portal so nothing slips through the cracks.",
  "Requested any time — the AI assistant answers and books while you work.",
  "Invoiced and receipted automatically, so the paperwork runs itself.",
];

const pad: CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: "0 24px" };
const kicker: CSSProperties = { fontFamily: "var(--pv-head)", fontWeight: 600, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--pv-primary)" };

export default function ServicesPreviewPage({ params }: { params: Params }) {
  const d = decodePreview(params.token);
  if (!d) notFound();
  const name = titleCasePreview(d.name);
  const city = d.city ? titleCasePreview(d.city) : "";
  const tc = tradeContent(d.trade);

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <section style={{ padding: "70px 0 40px" }}>
        <div style={{ ...pad, textAlign: "center", maxWidth: 720 }}>
          <div style={kicker}>{tc.label}{city ? ` · ${city}` : ""}</div>
          <h1 style={{ fontFamily: "var(--pv-head)", fontWeight: 700, letterSpacing: "-0.03em", fontSize: "clamp(34px,5vw,56px)", margin: "12px 0 0", color: "var(--pv-ink)" }}>
            What {name} does.
          </h1>
          <p style={{ marginTop: 14, color: "var(--pv-mut)", fontSize: 18, lineHeight: 1.6 }}>{tc.tagline}</p>
        </div>
      </section>
      <section style={{ padding: "0 0 70px" }}>
        <div style={{ ...pad, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
          {tc.services.map((s, i) => (
            <div key={s} style={{ background: "var(--pv-surface)", border: "1px solid var(--pv-line)", borderRadius: 16, borderTop: "3px solid var(--pv-accent)", padding: "24px 22px" }}>
              <div style={{ fontFamily: "var(--pv-head)", fontWeight: 600, fontSize: 12, color: "var(--pv-label)" }}>{String(i + 1).padStart(2, "0")}</div>
              <h3 style={{ fontFamily: "var(--pv-head)", fontWeight: 600, fontSize: 18, margin: "8px 0 8px", color: "var(--pv-ink)" }}>{s}</h3>
              <p style={{ color: "var(--pv-mut)", fontSize: 14, lineHeight: 1.55, margin: 0 }}>{SUPPORT[i % SUPPORT.length]}</p>
            </div>
          ))}
        </div>
        <div style={{ ...pad, textAlign: "center", marginTop: 44 }}>
          <a href={SITE.bookingUrl} target="_blank" rel="noopener noreferrer" data-cta="book_preview_services" style={{ display: "inline-block", fontWeight: 600, fontSize: 15, padding: "14px 28px", borderRadius: 12, background: "var(--pv-primary)", color: "var(--pv-on-primary)", textDecoration: "none" }}>
            Book {name} →
          </a>
        </div>
      </section>
    </div>
  );
}
