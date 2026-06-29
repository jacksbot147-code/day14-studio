import type { CSSProperties } from "react";
import { CASE_STUDIES } from "@/lib/site";

/**
 * Proof — an honest "this is built on the platform already running real
 * businesses" section for the generated preview pages (queue item 10).
 *
 * HONESTY RAIL: this section makes NO claim about the prospect's own results
 * and invents NO testimonials, metrics, or quotes. It only points at Day14's
 * real, publicly-live builds (pulled from CASE_STUDIES in site.ts) so a
 * stranger can click through and verify the work for themselves.
 *
 * We deliberately surface only case studies that are `state: "Live"` AND have
 * a public `url` — never SSO-gated or internal builds — because a cold preview
 * visitor should be able to open every link. (The private equity-play build,
 * AlignMD, is intentionally NOT marketed to cold traffic per the Day14
 * positioning north-star, so it is not linked here.)
 */

const cardBase: CSSProperties = {
  border: "1px solid var(--cin-line)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.02)",
  padding: "22px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  textDecoration: "none",
  color: "inherit",
};

export default function Proof() {
  // Only publicly-verifiable, live builds — every card must be clickable.
  const proof = CASE_STUDIES.filter(
    (c) => c.state === "Live" && !!c.url,
  ).slice(0, 3);

  if (proof.length === 0) return null;

  return (
    <section
      style={{ padding: "40px 7vw 20px", maxWidth: 1040, margin: "0 auto" }}
    >
      <div className="cin-kicker" style={{ marginBottom: 14 }}>
        Built on the platform already running real businesses
      </div>
      <p
        style={{
          color: "var(--cin-mut)",
          fontSize: "clamp(15px,1.6vw,18px)",
          lineHeight: 1.6,
          maxWidth: "60ch",
          margin: "0 0 22px",
        }}
      >
        This preview isn&rsquo;t a template demo — it&rsquo;s generated from the
        same Day14 platform that powers live businesses you can open and check
        for yourself. Real sites, real owners, real domains.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {proof.map((c) => (
          <a
            key={c.slug}
            href={c.url!}
            target="_blank"
            rel="noopener noreferrer"
            className="cin-proof-card"
            style={cardBase}
            data-cta={`preview_proof_${c.slug}`}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 18, fontWeight: 500, color: "var(--cin-fg)" }}>
                {c.name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--cin-acc, var(--cin-ink))",
                  border: "1px solid var(--cin-line)",
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                {c.sku} · {c.state}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--cin-mut)" }}>
              {c.industry} · {c.location}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--cin-ink)" }}>
              {c.summary}
            </p>
            <span style={{ marginTop: "auto", fontSize: 13, color: "var(--cin-ink)" }}>
              {c.url!.replace(/^https?:\/\//, "")} →
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
