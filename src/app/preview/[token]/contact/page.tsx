import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { decodePreview, tradeContent, titleCasePreview } from "@/lib/preview";
import { previewMetadata } from "../meta";
import EmailCapture from "../EmailCapture";

/**
 * /preview/[token]/contact — themed contact page (brandKit via --pv-*).
 * Honest: no fabricated phone/address/hours; EmailCapture records interest only,
 * NO autonomous send (follow-up is a Jack-tap).
 */

type Params = { token: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  return previewMetadata(params.token, "/contact");
}

const pad: CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: "0 24px" };
const kicker: CSSProperties = { fontFamily: "var(--pv-head)", fontWeight: 600, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--pv-primary)" };

export default function ContactPreviewPage({ params }: { params: Params }) {
  const d = decodePreview(params.token);
  if (!d) notFound();
  const name = titleCasePreview(d.name);
  const city = d.city ? titleCasePreview(d.city) : "";
  const tc = tradeContent(d.trade);
  const place = city ? ` in ${city}` : "";

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <section style={{ padding: "70px 0 20px" }}>
        <div style={{ ...pad, maxWidth: 760, textAlign: "center" }}>
          <div style={kicker}>{tc.label}{city ? ` · ${city}` : ""}</div>
          <h1 style={{ fontFamily: "var(--pv-head)", fontWeight: 700, letterSpacing: "-0.03em", fontSize: "clamp(32px,4.6vw,52px)", margin: "12px 0 16px", color: "var(--pv-ink)" }}>
            Get in touch with {name}.
          </h1>
          <p style={{ color: "var(--pv-mut)", fontSize: 17, lineHeight: 1.6, margin: "0 auto", maxWidth: "48ch" }}>
            On the live site this is where {name}&rsquo;s booking link, phone, and
            hours{place} would go. For now, leave your email and we&rsquo;ll reach
            out — nothing is sent without you asking.
          </p>
        </div>
      </section>
      <EmailCapture name={name} trade={d.trade} city={city} token={params.token} />
    </div>
  );
}
