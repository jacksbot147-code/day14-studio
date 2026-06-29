import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";
import { decodePreview, tradeContent, titleCasePreview } from "@/lib/preview";
import { previewMetadata } from "./meta";
import EmailCapture from "./EmailCapture";

/**
 * /preview/[token] — a real, themed, shareable preview SITE for a prospect.
 *
 * Themed per the business's trade via the `--pv-*` variables set in layout.tsx
 * (brandKit). Looks like THEIR site — coastal pool, luxe salon, bold roofer —
 * not Day14. Honest: ribbon (in layout) marks it a free preview; capability
 * demos are clearly illustrative; no fabricated reviews/metrics/prices.
 */

type Params = { token: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  return previewMetadata(params.token, "");
}

const pad: CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: "0 24px" };
const sec: CSSProperties = { padding: "72px 0" };
const card: CSSProperties = {
  background: "var(--pv-surface)",
  border: "1px solid var(--pv-line)",
  borderRadius: 16,
};
const kicker: CSSProperties = {
  fontFamily: "var(--pv-head)",
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--pv-primary)",
};
const h2: CSSProperties = {
  fontFamily: "var(--pv-head)",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  fontSize: "clamp(28px,4vw,44px)",
  margin: "12px 0 0",
  color: "var(--pv-ink)",
};
const btnSolid: CSSProperties = {
  display: "inline-block",
  fontWeight: 600,
  fontSize: 15,
  padding: "14px 26px",
  borderRadius: 12,
  textDecoration: "none",
  background: "var(--pv-primary)",
  color: "#fff",
};
const btnGhost: CSSProperties = {
  display: "inline-block",
  fontWeight: 600,
  fontSize: 15,
  padding: "14px 26px",
  borderRadius: 12,
  textDecoration: "none",
  border: "1.5px solid var(--pv-line)",
  color: "var(--pv-primary)",
};

function Cap({
  n,
  title,
  body,
  children,
}: {
  n: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div style={{ ...card, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "24px 24px 6px" }}>
        <div style={{ fontFamily: "var(--pv-head)", fontWeight: 600, fontSize: 11, letterSpacing: "0.14em", color: "var(--pv-accent)" }}>
          {n}
        </div>
        <h3 style={{ fontFamily: "var(--pv-head)", fontWeight: 600, fontSize: 21, margin: "9px 0 7px", color: "var(--pv-ink)" }}>{title}</h3>
        <p style={{ color: "var(--pv-mut)", fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>{body}</p>
      </div>
      <div style={{ marginTop: 16, padding: "16px 24px", borderTop: "1px solid var(--pv-line)" }}>{children}</div>
    </div>
  );
}

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 13,
  color: "var(--pv-mut)",
  padding: "7px 0",
};
const pill: CSSProperties = {
  fontSize: 9,
  padding: "3px 9px",
  borderRadius: 20,
  background: "color-mix(in srgb, var(--pv-accent) 22%, transparent)",
  color: "var(--pv-primary)",
  fontWeight: 600,
};

export default function PreviewPage({ params }: { params: Params }) {
  const d = decodePreview(params.token);
  if (!d) notFound();

  const name = titleCasePreview(d.name);
  const city = d.city ? titleCasePreview(d.city) : "";
  const tc = tradeContent(d.trade);
  const book = SITE.bookingUrl;

  return (
    <div id="top">
      {/* HERO */}
      <header style={{ background: "var(--pv-hero)", overflow: "hidden" }}>
        <div
          style={{
            ...pad,
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 40,
            alignItems: "center",
            padding: "84px 24px 78px",
          }}
        >
          <div>
            <div style={kicker}>
              {tc.label}
              {city ? ` · ${city}` : ""}
            </div>
            <h1
              style={{
                fontFamily: "var(--pv-head)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.02,
                fontSize: "clamp(38px,5.5vw,62px)",
                margin: "14px 0 0",
                color: "var(--pv-ink)",
              }}
            >
              {tc.tagline}
            </h1>
            <p style={{ marginTop: 18, fontSize: "clamp(16px,1.7vw,20px)", color: "var(--pv-mut)", maxWidth: "34ch", lineHeight: 1.5 }}>
              {name} — booked online in 60 seconds, handled start to finish.
            </p>
            <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href={book} target="_blank" rel="noopener noreferrer" style={btnSolid} data-cta="book_preview_hero">
                Book a visit
              </a>
              <a href="#what" style={btnGhost} data-cta="preview_see_more">
                See what we do
              </a>
            </div>
            <div style={{ marginTop: 20, fontSize: 13, color: "var(--pv-mut)" }}>
              Licensed &amp; insured · serving {city || "your area"}
            </div>
          </div>
          {/* site shot card */}
          <div style={{ ...card, padding: 18, boxShadow: "0 30px 70px -34px rgba(10,20,30,.45)" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--pv-line)" }} />
              ))}
            </div>
            <div style={{ height: 120, borderRadius: 12, background: "linear-gradient(135deg,var(--pv-accent),var(--pv-primary))" }} />
            <div style={{ height: 9, borderRadius: 5, background: "var(--pv-line)", margin: "11px 0" }} />
            <div style={{ height: 9, width: "60%", borderRadius: 5, background: "var(--pv-line)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pv-ink)" }}>Request a visit</span>
              <span style={{ ...btnSolid, padding: "7px 13px", fontSize: 12 }}>Book →</span>
            </div>
          </div>
        </div>
      </header>

      {/* YOUR NEW WEBSITE */}
      <section id="what" style={sec}>
        <div style={pad}>
          <div style={{ textAlign: "center", maxWidth: "60ch", margin: "0 auto 40px" }}>
            <div style={kicker}>Your new website</div>
            <h2 style={h2}>A real site that gets you found and booked.</h2>
            <p style={{ marginTop: 12, color: "var(--pv-mut)", fontSize: 17, lineHeight: 1.6 }}>
              Fast, mobile-perfect, on your own domain — built to turn Google
              searches into scheduled jobs.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
            {[
              ["Home", "hero + offer"],
              ["Services", "what you do"],
              ["Gallery", "before / after"],
              ["Reviews", "5-star proof"],
              ["Booking", "request a visit"],
              ["Contact", "map + hours"],
            ].map(([t, s]) => (
              <div key={t} style={{ ...card, padding: 16 }}>
                <b style={{ color: "var(--pv-ink)", fontWeight: 600 }}>{t}</b>
                <div style={{ color: "var(--pv-mut)", fontSize: 13 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITY WALKTHROUGH */}
      <section style={{ ...sec, background: "color-mix(in srgb, var(--pv-ink) 4%, transparent)" }}>
        <div style={pad}>
          <div style={{ textAlign: "center", maxWidth: "60ch", margin: "0 auto 40px" }}>
            <div style={kicker}>More than a website</div>
            <h2 style={h2}>The system that runs {name}.</h2>
            <p style={{ marginTop: 12, color: "var(--pv-mut)", fontSize: 17, lineHeight: 1.6 }}>
              Everything below is included and working from day one — your whole
              operation, online.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Cap n="01 · BOOKING" title="24/7 online booking" body="Customers pick a slot any time — it lands scheduled, not as a voicemail.">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
                {["M", "T", "W", "T", "F", "S", "S", "2", "3", "4", "5", "6", "7", "8"].map((x, i) => (
                  <span key={i} style={{ aspectRatio: "1", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, background: i === 8 || i === 12 ? "var(--pv-primary)" : "var(--pv-line)", color: i === 8 || i === 12 ? "#fff" : "var(--pv-mut)", fontWeight: i === 8 || i === 12 ? 700 : 400 }}>{x}</span>
                ))}
              </div>
            </Cap>
            <Cap n="02 · AI ASSISTANT" title="Answers customers for you" body="Trained on your services + pricing. Replies and books while you're on a job.">
              <div style={{ background: "var(--pv-line)", color: "var(--pv-ink)", maxWidth: "82%", padding: "9px 13px", borderRadius: 13, fontSize: 13 }}>Can you come Friday for a green pool?</div>
              <div style={{ background: "var(--pv-primary)", color: "#fff", maxWidth: "82%", marginLeft: "auto", marginTop: 6, padding: "9px 13px", borderRadius: 13, fontSize: 13 }}>Fri 9:30a works — book it?</div>
            </Cap>
            <Cap n="03 · PAYMENTS" title="Get paid online, on time" body="Card on file, auto-invoices, recurring billing — no chasing checks.">
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: "var(--pv-head)", fontWeight: 700, fontSize: 30, color: "var(--pv-ink)" }}>$185</span>
                <span style={{ color: "var(--pv-mut)", fontSize: 12 }}>paid · weekly plan</span>
                <span style={{ ...pill, marginLeft: "auto" }}>Auto</span>
              </div>
            </Cap>
            <Cap n="04 · JOB BOARD" title="The day runs itself" body="Routes and status on one board, sequenced automatically.">
              <div style={{ ...row, borderTop: "none" }}><span>Mon · route 1</span><span style={pill}>done</span></div>
              <div style={{ ...row, borderTop: "1px solid var(--pv-line)" }}><span>Tue · route 2</span><span style={pill}>queued</span></div>
            </Cap>
            <Cap n="05 · PHOTO-PROOF" title="Proof on every visit" body="GPS + timestamped photos auto-attach — customers see the work.">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[0, 1].map((i) => (
                  <div key={i} style={{ aspectRatio: "16/10", borderRadius: 8, background: "linear-gradient(135deg,var(--pv-accent),var(--pv-primary))", position: "relative" }}>
                    <span style={{ position: "absolute", left: 7, bottom: 6, fontSize: 9, color: "#fff", fontWeight: 600 }}>✓ GPS · 9:41a</span>
                  </div>
                ))}
              </div>
            </Cap>
            <Cap n="06 · PORTAL + REVIEWS" title="A portal that earns 5 stars" body="Visit history, logins, and one-tap review requests that fill your Google profile.">
              <div style={{ color: "#f4b400", letterSpacing: 2, fontSize: 15 }}>★★★★★ <span style={{ color: "var(--pv-mut)", fontSize: 12 }}>review request sent</span></div>
            </Cap>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section style={sec}>
        <div style={pad}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={kicker}>Our services</div>
            <h2 style={h2}>Built around what you do.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 13 }}>
            {tc.services.map((s, i) => (
              <div key={s} style={{ ...card, padding: 22, borderTop: "3px solid var(--pv-accent)" }}>
                <div style={{ fontFamily: "var(--pv-head)", fontWeight: 600, fontSize: 12, color: "var(--pv-accent)" }}>{String(i + 1).padStart(2, "0")}</div>
                <span style={{ display: "block", marginTop: 8, fontSize: 16, fontWeight: 500, color: "var(--pv-ink)" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ ...sec, paddingTop: 0 }}>
        <div style={{ ...pad, maxWidth: 760 }}>
          <div style={{ ...kicker, textAlign: "center" }}>Common questions</div>
          {[
            ["How fast can this be live?", `Day14 ships ${name}'s real site in about 14 days.`],
            ["What's included?", "Site, booking, payments, customer portal, reminders, and the AI assistant — one platform on your own domain."],
            ["Who owns it?", `It's yours — your domain, your brand, your customers.`],
          ].map(([q, a]) => (
            <div key={q} style={{ borderTop: "1px solid var(--pv-line)", padding: "18px 0" }}>
              <div style={{ fontFamily: "var(--pv-head)", fontWeight: 600, fontSize: 17, color: "var(--pv-ink)" }}>{q}</div>
              <p style={{ margin: "6px 0 0", color: "var(--pv-mut)", fontSize: 15, lineHeight: 1.6 }}>{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LEAD CAPTURE (themed via --pv-*) */}
      <EmailCapture name={name} trade={d.trade} city={city} token={params.token} />

      {/* CLOSING */}
      <section style={{ background: "linear-gradient(160deg,var(--pv-primary),color-mix(in srgb, var(--pv-primary) 55%, #000))", color: "#fff", textAlign: "center", padding: "84px 24px" }}>
        <h2 style={{ fontFamily: "var(--pv-head)", fontWeight: 700, color: "#fff", fontSize: "clamp(28px,4.2vw,44px)", maxWidth: "20ch", margin: "0 auto 22px" }}>
          Ready when you are.
        </h2>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={book} target="_blank" rel="noopener noreferrer" style={{ ...btnSolid, background: "#fff", color: "var(--pv-primary)" }} data-cta="book_preview_final">
            Book your first visit
          </a>
          <a href="/" style={{ ...btnGhost, border: "1.5px solid rgba(255,255,255,.5)", color: "#fff" }} data-cta="preview_to_home">
            Built by Day14 — see how
          </a>
        </div>
      </section>

      <div style={{ background: "color-mix(in srgb, var(--pv-ink) 8%, transparent)", color: "var(--pv-mut)", textAlign: "center", fontSize: 12.5, padding: 24 }}>
        A free website preview built by Day14 · not {name}&rsquo;s live site · no
        fabricated reviews or numbers shown.
      </div>
    </div>
  );
}
