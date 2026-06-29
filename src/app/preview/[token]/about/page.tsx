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
 * /preview/[token]/about — the generated "about {business}" page of the preview.
 *
 * Builds an honest, generic-but-tailored about page for the decoded business
 * from its trade + city. Same cinematic system and honesty ribbon as the
 * one-pager and services page: this is a free preview Day14 generated, not a
 * live site. Additive (new route) — nothing existing is rewired.
 *
 * HONESTY RAIL: copy is tailored to the trade/city but never fabricates a
 * founding year, owner name, team size, customer count, review, or any specific
 * claim about this real business. It describes the *kind* of business and how
 * the platform serves it — a placeholder the owner edits before going live.
 */

type Params = { token: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  // Canonical + OG/Twitter text tags + noindex, centralized (queue item 15).
  return previewMetadata(params.token, "/about");
}

const wrap: CSSProperties = { position: "relative", zIndex: 1 };

/**
 * Three honest "what you can expect" pillars. Generic across trades, tailored
 * by label/city at render time. No fabricated specifics — these describe the
 * experience the platform delivers, framed as placeholder copy to edit.
 */
const PILLARS: { title: string; body: (trade: string, place: string) => string }[] = [
  {
    title: "Easy to work with",
    body: (trade, place) =>
      `Booking ${trade} work${place} should be simple. Request a time online, get a clear quote, and pay when the job's done — no phone tag, no waiting around for a callback.`,
  },
  {
    title: "Reliable and on schedule",
    body: (trade) =>
      `Every ${trade} job is tracked, confirmed, and reminded ahead of time. You always know what's booked and when someone's showing up.`,
  },
  {
    title: "Built to answer fast",
    body: () =>
      `Questions get answered around the clock — an AI assistant handles the routine ones instantly and hands the rest off, so nothing sits in an inbox overnight.`,
  },
];

export default function AboutPreviewPage({ params }: { params: Params }) {
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
          About {name}
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

      {/* Intro — honest, editable placeholder */}
      <section
        style={{
          padding: "20px 7vw 10px",
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
            maxWidth: "62ch",
            margin: "0 auto",
          }}
        >
          {name} is a {trade} business{place} focused on doing good work and
          making it easy to book. This is starter copy Day14 generated for the
          preview — you&rsquo;ll swap in your own story, history, and team before
          it goes live.
        </p>
      </section>

      {/* Pillars */}
      <section
        id="about"
        style={{ padding: "30px 7vw 20px", maxWidth: 1040, margin: "0 auto" }}
      >
        <div className="cin-kicker" style={{ marginBottom: 16 }}>
          What to expect
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {PILLARS.map((p) => (
            <div
              key={p.title}
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
                {p.title}
              </div>
              <div
                style={{
                  fontSize: 14.5,
                  color: "var(--cin-mut)",
                  lineHeight: 1.5,
                }}
              >
                {p.body(trade, place)}
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
          Behind the scenes, {name} runs on one platform: 24/7 online booking,
          instant quoting, a customer portal, online payments, automatic
          reminders, and an AI assistant that answers customers for you — all on{" "}
          {name}&rsquo;s own domain.
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
            data-cta="book_about_final"
          >
            Make {name} real →
          </a>
          <a
            href={`/preview/${params.token}`}
            className="cin-btn"
            data-cta="about_to_preview"
          >
            ← Back to the preview
          </a>
        </div>
      </section>
    </div>
  );
}
