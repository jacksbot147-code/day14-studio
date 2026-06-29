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

/**
 * /preview/[token]/services — the full services page of the generated preview.
 *
 * Expands the one-pager's compact services grid into a dedicated, cinematic page
 * built entirely from tradeContent().services for the decoded business. Same
 * honesty ribbon as the one-pager: this is a free preview Day14 generated, not a
 * live site. Additive (new route) — nothing on the main preview page is rewired.
 *
 * HONESTY RAIL: copy is generic-but-tailored to the trade. No invented prices,
 * metrics, or testimonials; the supporting lines describe how the platform
 * handles each service, not any claim about this specific business's results.
 */

type Params = { token: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  // Canonical + OG/Twitter text tags + noindex, centralized (queue item 15).
  return previewMetadata(params.token, "/services");
}

const wrap: CSSProperties = { position: "relative", zIndex: 1 };

/**
 * Generic, honest supporting line for a service. Cycles a small pool so the
 * grid reads as a real services page without fabricating any specific claim.
 * Describes how the booking platform handles the service — not a result.
 */
const SUPPORT = [
  "Booked online in seconds, scheduled around you, and confirmed automatically.",
  "Clear quotes up front, simple online payment, no phone tag.",
  "Handled on a reliable schedule with reminders before every visit.",
  "Tracked in your customer portal so nothing slips through the cracks.",
  "Requested any time — the AI assistant answers and books while you work.",
  "Invoiced and receipted automatically, so the paperwork runs itself.",
];

function support(i: number): string {
  return SUPPORT[i % SUPPORT.length]!;
}

export default function ServicesPreviewPage({ params }: { params: Params }) {
  const d = decodePreview(params.token);
  if (!d) notFound();

  const name = titleCasePreview(d.name);
  const city = d.city ? titleCasePreview(d.city) : "";
  const tc = tradeContent(d.trade);

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
          minHeight: "44vh",
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
          What {name} does
        </h1>
        <p
          style={{
            ...wrap,
            marginTop: 22,
            fontSize: "clamp(16px, 2vw, 21px)",
            color: "var(--cin-ink)",
            maxWidth: "34ch",
            lineHeight: 1.45,
          }}
        >
          {tc.tagline}
        </p>
      </header>

      {/* Full services list */}
      <section
        id="services"
        style={{ padding: "20px 7vw 30px", maxWidth: 1040, margin: "0 auto" }}
      >
        <div className="cin-kicker" style={{ marginBottom: 16 }}>
          Services
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {tc.services.map((s, i) => (
            <div
              key={s}
              style={{
                border: "1px solid var(--cin-line)",
                borderRadius: 16,
                background: "rgba(255,255,255,0.02)",
                padding: "22px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  color: "var(--cin-ink)",
                  letterSpacing: "-0.01em",
                }}
              >
                {s}
              </div>
              <div
                style={{
                  fontSize: 14.5,
                  color: "var(--cin-mut)",
                  lineHeight: 1.5,
                }}
              >
                {support(i)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Under the hood */}
      <section
        style={{
          padding: "30px 7vw 20px",
          maxWidth: 1040,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "var(--cin-mut)",
            fontSize: "clamp(15px,1.6vw,18px)",
            lineHeight: 1.6,
            maxWidth: "60ch",
            margin: "0 auto",
          }}
        >
          Every service above is bookable 24/7 with instant quoting, a customer
          portal, online payments, automatic reminders, and an AI assistant that
          answers customers for you — one platform, on {name}&rsquo;s own domain.
        </p>
      </section>

      {/* Closing */}
      <section style={{ padding: "30px 7vw 90px", textAlign: "center" }}>
        <h2 className="cin-h2" style={{ marginBottom: 16 }}>
          This was generated in seconds. The real thing ships in 14 days.
        </h2>
        <div className="cin-hcta" style={{ justifyContent: "center" }}>
          <a
            href={SITE.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cin-btn cin-btn-solid"
            data-cta="book_services_final"
          >
            Make {name} real →
          </a>
          <a
            href={`/preview/${params.token}`}
            className="cin-btn"
            data-cta="services_to_preview"
          >
            ← Back to the preview
          </a>
        </div>
      </section>
    </div>
  );
}
