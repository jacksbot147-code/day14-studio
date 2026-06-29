import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";
import {
  decodePreview,
  tradeContent,
  titleCasePreview,
} from "@/lib/preview";
import { previewMetadata } from "./meta";
import EmailCapture from "./EmailCapture";
import Proof from "./Proof";
import Faq from "./Faq";
import BrandStarter from "./BrandStarter";

/**
 * /preview/[token] — an instant, real, shareable preview SITE for a prospect.
 *
 * The token (base64url of {n,t,c}) decodes to a business name, trade, and city;
 * we render a genuine branded one-pager for THAT business using the cinematic
 * system. This is what the hero's "Build it" and the daily prospect finder link
 * to — a stranger can open it and see their own site.
 *
 * HONESTY RAIL: a persistent ribbon makes clear this is a free preview Day14
 * generated, not their live site, and links to book the real build. No invented
 * prices, metrics, or testimonials.
 */

type Params = { token: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  // Canonical + OG/Twitter text tags + noindex, centralized (queue item 15).
  return previewMetadata(params.token, "");
}

const wrap: CSSProperties = { position: "relative", zIndex: 1 };

export default function PreviewPage({ params }: { params: Params }) {
  const d = decodePreview(params.token);
  if (!d) notFound();

  const name = titleCasePreview(d.name);
  const city = d.city ? titleCasePreview(d.city) : "";
  const tc = tradeContent(d.trade);

  return (
    <div className="cinematic" id="top" style={{ background: "var(--cin-bg)", minHeight: "100vh" }}>
      {/* Honesty ribbon + nav now live in the shared layout (queue item 8). */}

      {/* Hero */}
      <header
        style={{
          minHeight: "78vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "60px 7vw",
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
        <div className="cin-kicker" style={{ ...wrap, marginBottom: 20 }}>
          {tc.label}
          {city ? ` · ${city}` : ""}
        </div>
        <h1
          style={{
            ...wrap,
            fontWeight: 300,
            letterSpacing: "-0.045em",
            lineHeight: 0.98,
            fontSize: "clamp(40px, 8vw, 104px)",
            maxWidth: "16ch",
            margin: 0,
          }}
        >
          {name}
        </h1>
        <p
          style={{
            ...wrap,
            marginTop: 24,
            fontSize: "clamp(17px, 2vw, 23px)",
            color: "var(--cin-ink)",
            maxWidth: "30ch",
            lineHeight: 1.4,
          }}
        >
          {tc.tagline}
        </p>
        <div className="cin-hcta" style={{ ...wrap, marginTop: 36 }}>
          <a
            href={SITE.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cin-btn cin-btn-solid"
            data-cta="book_preview_hero"
          >
            Book a free 15-min walkthrough
          </a>
          <a href="#services" className="cin-btn">
            See what&rsquo;s included
          </a>
        </div>
      </header>

      {/* Services */}
      <section
        id="services"
        style={{ padding: "40px 7vw 20px", maxWidth: 1040, margin: "0 auto" }}
      >
        <div className="cin-kicker" style={{ marginBottom: 14 }}>
          What {name} offers
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
          }}
        >
          {tc.services.map((s) => (
            <div
              key={s}
              style={{
                border: "1px solid var(--cin-line)",
                borderRadius: 14,
                background: "rgba(255,255,255,0.02)",
                padding: "20px 22px",
                fontSize: 16,
                color: "var(--cin-ink)",
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </section>

      {/* Under the hood */}
      <section style={{ padding: "40px 7vw 20px", maxWidth: 1040, margin: "0 auto", textAlign: "center" }}>
        <p style={{ color: "var(--cin-mut)", fontSize: "clamp(15px,1.6vw,18px)", lineHeight: 1.6, maxWidth: "60ch", margin: "0 auto" }}>
          Behind this page: 24/7 online booking, instant quoting, a customer
          portal, online payments, automatic reminders, and an AI assistant that
          answers customers for you — one platform, on {name}&rsquo;s own domain.
        </p>
      </section>

      {/* Honest proof — links real publicly-live Day14 builds (queue item 10) */}
      <Proof />

      {/* FAQ — how fast / what's included / pricing / ownership (queue item 11) */}
      <Faq name={name} />

      {/* Brand starter — text-only palette + font pairing, no logo (queue item 16) */}
      <BrandStarter name={name} trade={d.trade} token={params.token} />

      {/* Email capture — record interest, no autonomous send (queue item 2) */}
      <EmailCapture name={name} trade={d.trade} city={city} token={params.token} />

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
            data-cta="book_preview_final"
          >
            Make {name} real →
          </a>
          <a href="/" className="cin-btn" data-cta="preview_to_home">
            Built by Day14 — see how
          </a>
        </div>
      </section>
    </div>
  );
}
