import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "FAQ — Day14",
  description: "Common questions about Day14: pricing, ownership, AI agents, timelines, cancellation, technical stack.",
};

const FAQS = [
  {
    q: "Why not just use Jobber, Housecall Pro, or GoHighLevel?",
    a: "Because you're renting. SaaS platforms charge $69–$329/mo forever, lock you into their templates, hold your customer data, and put their branding inside your customer-facing app. Day14 builds you something that's yours — your domain, repo, database, customer relationships.",
  },
  {
    q: "Do I own the code?",
    a: "Yes. The repo is in your name on GitHub from day one. If you cancel hosting we hand you a tarball and a migration runbook so you can take it in-house or to another developer.",
  },
  {
    q: "Is this actually built by AI?",
    a: "It's built by one operator using Claude-based agents to do the heavy lifting. We review every line, write the architecture, and own every customer relationship. The agents are the leverage; the judgment is human.",
  },
  {
    q: "What if I cancel?",
    a: "30 days notice, no annual contract. You keep the code, the domain, the customer data. We unwire the integrations and walk you through self-hosting if you want it.",
  },
  {
    q: "Why is this so much cheaper than an agency?",
    a: "Agencies have project managers, designers, frontend, backend, QA, account managers. We have one operator and a fleet of agents. Same output, no overhead. We pass the savings on.",
  },
  {
    q: "Do you only do service businesses?",
    a: "No. We've shipped service-business platforms, brand-heavy event sites, two-sided marketplaces, and autonomous POD stores. Anything that fits in Site / Portal / Platform we'll quote on the call.",
  },
  {
    q: "What about hosting and infrastructure costs?",
    a: "Included in your monthly fee. Vercel, Supabase, Resend, Twilio — all rolled in. No surprise bills, no separate vendor accounts to manage.",
  },
  {
    q: "What if I need changes after launch?",
    a: "Your monthly includes one hour of changes. Anything bigger is $200/hr with a 4-hour minimum, billed in advance. Major adds usually roll into a Platform upgrade.",
  },
  {
    q: "What's the 'launch by day 14 or deposit back' guarantee?",
    a: "If your Portal isn't live and accepting real customer payments by end of day 14, your deposit refunds in full and you keep everything we've shipped. We carry the timeline risk so you don't.",
  },
  {
    q: "Do you do logos and branding from scratch?",
    a: "Not from scratch. We use the logo and colors you already have. If you don't have a logo yet, we'll point you to a designer we trust who can usually turn one around inside our 14-day window.",
  },
  {
    q: "Can I migrate off Day14 hosting?",
    a: "Yes. Everything we build runs on standard open-source infrastructure (Next.js, Postgres, Stripe). Any competent developer can take it over.",
  },
  {
    q: "Who owns the domain?",
    a: "You. Always. We register it in your name, or you bring your own. We never hold a customer's domain hostage.",
  },
];

export default function FAQPage() {
  return (
    <>
    <SiteHeader />
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "80px 32px", fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif", color: "#2F2A33", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 44, letterSpacing: "-0.02em", marginBottom: 16 }}>FAQ</h1>
      <p style={{ fontSize: 18, color: "#7A6F8F", marginBottom: 48 }}>
        The questions every small-business owner asks. If yours isn't here, ask on <a href="https://cal.com/day14/intro" style={{ color: "#7A6F8F" }}>the intro call</a> or email <a href="mailto:hello@day14.us" style={{ color: "#7A6F8F" }}>hello@day14.us</a>.
      </p>

      {FAQS.map((f, i) => (
        <details key={i} style={{ borderBottom: "1px solid #E5DDD0", padding: "20px 0" }}>
          <summary style={{ cursor: "pointer", fontSize: 17, fontWeight: 600, listStyle: "none", color: "#2F2A33" }}>
            <span style={{ color: "#7A6F8F", marginRight: 12, fontSize: 14 }}>{String(i + 1).padStart(2, "0")}</span>
            {f.q}
          </summary>
          <div style={{ marginTop: 12, color: "#444", paddingLeft: 36 }}>{f.a}</div>
        </details>
      ))}

      <div style={{ marginTop: 60, padding: 32, background: "#FAF8F4", borderRadius: 12, textAlign: "center" }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Still have questions?</h2>
        <p style={{ color: "#666", marginBottom: 20 }}>30 minutes, no deck, live demo. We tell you if it's a fit on the call.</p>
        <a href="https://cal.com/day14/intro" style={{ display: "inline-block", padding: "12px 24px", background: "#2F2A33", color: "white", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Book intro call</a>
        <Link href="/stack" style={{ marginLeft: 12, display: "inline-block", padding: "12px 24px", background: "white", border: "1px solid #E5DDD0", color: "#2F2A33", borderRadius: 8, textDecoration: "none", fontSize: 14 }}>See the stack</Link>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
