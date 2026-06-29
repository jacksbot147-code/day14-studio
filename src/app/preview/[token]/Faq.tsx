import type { CSSProperties } from "react";

/**
 * Faq — a short, honest FAQ for the generated preview one-pager (queue item 11).
 *
 * Covers the four questions a prospect actually asks when they land on a preview:
 * how fast it ships, what's included, what it costs, and who owns it.
 *
 * HONESTY RAIL: no prices are stated here — the pricing answer LINKS to the real
 * pricing page (which renders only from pricing.ts) so this component can never
 * drift from the source of truth. No fabricated metrics, guarantees, or
 * testimonials. The ownership answer states the plain truth: the site is built
 * on the prospect's own domain and is theirs.
 */

const qaWrap: CSSProperties = {
  border: "1px solid var(--cin-line)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.02)",
  padding: "20px 24px",
};

const qStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 500,
  color: "var(--cin-fg)",
};

const aStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 15,
  lineHeight: 1.6,
  color: "var(--cin-mut)",
};

export default function Faq({ name }: { name: string }) {
  const biz = name.trim() || "your business";

  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: "How fast can this go live?",
      a: (
        <>
          This preview was generated in seconds. The real build — on{" "}
          {biz}&rsquo;s own domain, with booking, payments, and the rest wired
          up — ships in 14 days. That&rsquo;s the whole idea behind the name.
        </>
      ),
    },
    {
      q: "What’s included?",
      a: (
        <>
          A real branded site plus the platform behind it: 24/7 online booking,
          instant quoting, a customer portal, online payments, automatic
          reminders, and an AI assistant that answers customers for you — one
          system, not six logins.
        </>
      ),
    },
    {
      q: "What does it cost?",
      a: (
        <>
          Straightforward, published pricing — no surprises and nothing hidden.
          See the current setup and monthly options on the{" "}
          <a
            href="/pricing"
            className="cin-link"
            data-cta="preview_faq_pricing"
            style={{ color: "var(--cin-ink)", textDecoration: "underline" }}
          >
            pricing page
          </a>
          .
        </>
      ),
    },
    {
      q: "Who owns the site?",
      a: (
        <>
          You do. It lives on {biz}&rsquo;s own domain and the content is yours
          to keep. This preview page is a free sample we made for you — not a
          locked-in trial.
        </>
      ),
    },
  ];

  return (
    <section
      id="faq"
      style={{ padding: "40px 7vw 20px", maxWidth: 1040, margin: "0 auto" }}
    >
      <div className="cin-kicker" style={{ marginBottom: 14 }}>
        Questions, answered
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={qaWrap}>
            <p style={qStyle}>{it.q}</p>
            <p style={aStyle}>{it.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
