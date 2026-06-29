import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";
import {
  decodePreview,
  tradeContent,
  titleCasePreview,
} from "@/lib/preview";
import { previewMetadata } from "../meta";
import EmailCapture from "../EmailCapture";

/**
 * /preview/[token]/contact — the generated contact page of the preview.
 *
 * Mirrors the services/about routes (sticky honesty ribbon, cinematic
 * var(--cin-*) tokens + .cin-* classes, noindex metadata) and embeds the
 * EmailCapture island from queue item 2 so a prospect can drop their email
 * right here. Additive (new route) — nothing existing is rewired.
 *
 * HONESTY RAIL: this is a free preview Day14 generated, not a live site. Copy
 * is tailored to the trade/city but never fabricates a phone number, address,
 * hours, owner name, or any specific contact detail for this real business —
 * EmailCapture is the only real channel, and it records interest with NO
 * autonomous send (follow-up is a Jack-tap, drafts only).
 */

type Params = { token: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  // Canonical + OG/Twitter text tags + noindex, centralized (queue item 15).
  return previewMetadata(params.token, "/contact");
}

const wrap: CSSProperties = { position: "relative", zIndex: 1 };

export default function ContactPreviewPage({ params }: { params: Params }) {
  const d = decodePreview(params.token);
  if (!d) notFound();

  const name = titleCasePreview(d.name);
  const city = d.city ? titleCasePreview(d.city) : "";
  const tc = tradeContent(d.trade);
  const trade = tc.label.toLowerCase();
  const place = city ? ` in ${city}` : "";

  return (
    <div
      className="cinematic"
      id="top"
      style={{ background: "var(--cin-bg)", minHeight: "100vh" }}
    >
      {/* Honesty ribbon + nav now live in the shared layout (queue item 8). */}

      {/* Header */}
      <header
        style={{
          minHeight: "40vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "60px 7vw 30px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "-20% 0 30% 0",
            zIndex: 0,
            pointerEvents: "none",
            filter: "blur(70px)",
            opacity: 0.5,
            background:
              "radial-gradient(40% 55% at 50% 22%, rgba(31,79,255,0.5), transparent 70%), radial-gradient(34% 48% at 72% 18%, rgba(57,230,212,0.32), transparent 70%)",
          }}
        />
        <div className="cin-kicker" style={{ ...wrap, marginBottom: 18 }}>
          {tc.label}
          {city ? ` · ${city}` : ""}
        </div>
        <h1
          style={{
            ...wrap,
            fontWeight: 300,
            letterSpacing: "-0.045em",
            lineHeight: 1.0,
            fontSize: "clamp(34px, 6vw, 76px)",
            maxWidth: "18ch",
            margin: 0,
          }}
        >
          Get in touch with {name}
        </h1>
        <p
          style={{
            ...wrap,
            marginTop: 22,
            fontSize: "clamp(16px, 2vw, 21px)",
            color: "var(--cin-ink)",
            maxWidth: "36ch",
            lineHeight: 1.45,
          }}
        >
          Booking {trade} work{place} should be easy — start right here.
        </p>
      </header>

      {/* Intro — honest, editable placeholder */}
      <section
        style={{
          padding: "10px 7vw 0",
          maxWidth: 1040,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "var(--cin-mut)",
            fontSize: "clamp(16px,1.7vw,19px)",
            lineHeight: 1.65,
            maxWidth: "60ch",
            margin: "0 auto",
          }}
        >
          On the live site, this is where {name} would put its real booking
          link, phone, and hours. For now it&rsquo;s a preview — drop your email
          below and we&rsquo;ll reach out to make it real, on {name}&rsquo;s own
          domain.
        </p>
      </section>

      {/* Email capture — record interest, no autonomous send (queue item 2) */}
      <EmailCapture name={name} trade={d.trade} city={city} token={params.token} />

      {/* Closing */}
      <section style={{ padding: "10px 7vw 90px", textAlign: "center" }}>
        <h2 className="cin-h2" style={{ marginBottom: 16 }}>
          This was generated in seconds. The real thing ships in 14 days.
        </h2>
        <div className="cin-hcta" style={{ justifyContent: "center" }}>
          <a
            href={SITE.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cin-btn cin-btn-solid"
            data-cta="book_contact_final"
          >
            Make {name} real →
          </a>
          <a
            href={`/preview/${params.token}`}
            className="cin-btn"
            data-cta="contact_to_preview"
          >
            ← Back to the preview
          </a>
        </div>
      </section>
    </div>
  );
}
