import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Refund Policy — Day14",
  description: "Launch by Day 14 or your deposit refunds in full. The full policy.",
};

export default function RefundsPage() {
  return (
    <>
    <SiteHeader />
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "80px 32px", fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif", color: "#2F2A33", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 40, letterSpacing: "-0.02em", marginBottom: 8 }}>Refund Policy</h1>
      <p style={{ color: "#7A6F8F", fontSize: 16, marginBottom: 40 }}>Short version: we carry the timeline risk so you don't.</p>

      <div style={{ background: "#FAF8F4", border: "1px solid #E5DDD0", borderRadius: 12, padding: 24, marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12, letterSpacing: "-0.01em" }}>The day-14 guarantee</h2>
        <p style={{ marginBottom: 12 }}>If your Portal-tier project isn't live and able to accept real customer payments by the end of day 14, your deposit refunds in full and you keep everything we've shipped — the repo, the preview deployment, the work in progress.</p>
        <p style={{ marginBottom: 0, fontSize: 14, color: "#666" }}>
          "Day 14" means 14 calendar days from the day we receive your signed order form and 50% deposit. The clock pauses only if you take longer than 48 hours to respond to a blocker we've flagged.
        </p>
      </div>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Per-SKU specifics</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li><strong>Site ($2,500):</strong> Shipped within 7 days or deposit refunds. We've never missed.</li>
        <li><strong>Portal ($5,000):</strong> Live + Stripe-accepting payments within 14 days or deposit refunds.</li>
        <li><strong>Platform ($10,000):</strong> Live within 21 days or deposit refunds. We extend by 7 days because the operator admin app has more surface area.</li>
      </ul>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Monthly hosting</h2>
      <p>Cancel anytime with 30 days notice. No long-term contract, no early-termination fee. When you cancel, the final invoice is prorated and we deliver a migration runbook within 7 days.</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>What's not refundable</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li>Change requests already completed at your written authorization ($200/hr work).</li>
        <li>The final 50% balance after launch (because the deliverable is live in production).</li>
        <li>Third-party costs we passed through (domain registration, paid API tiers, etc.) — those refund per the third party's policy.</li>
      </ul>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>How to request a refund</h2>
      <p>Email <a href="mailto:hello@day14.us">hello@day14.us</a> with your order form ID. We refund via the original payment method within 7 business days.</p>

      <div style={{ marginTop: 40, padding: 32, background: "white", border: "1px solid #E5DDD0", borderRadius: 12, textAlign: "center" }}>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>Questions about the guarantee?</h3>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>Easier to talk through on the call. We'll walk through the exact timeline for your build.</p>
        <a href="https://cal.com/day14/intro" style={{ display: "inline-block", padding: "12px 24px", background: "#2F2A33", color: "white", borderRadius: 8, textDecoration: "none", fontSize: 14 }}>Book intro call</a>
        <Link href="/terms" style={{ marginLeft: 12, display: "inline-block", padding: "12px 24px", background: "white", border: "1px solid #E5DDD0", color: "#2F2A33", borderRadius: 8, textDecoration: "none", fontSize: 14 }}>Read full terms</Link>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
