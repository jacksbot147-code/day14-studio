import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Privacy Policy — Day14",
  description: "How Day14 handles your data. Short version: we collect the minimum, we don't sell it, you can delete it.",
};

const UPDATED = "May 19, 2026";

export default function PrivacyPage() {
  return (
    <>
    <SiteHeader />
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "80px 32px", fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif", color: "#2F2A33", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 40, letterSpacing: "-0.02em", marginBottom: 8 }}>Privacy</h1>
      <p style={{ color: "#7A6F8F", fontSize: 14, marginBottom: 40 }}>Last updated {UPDATED}</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>The short version</h2>
      <p>We collect the minimum data needed to do work for you. We never sell email addresses or customer data. We can delete everything we have about you within 7 days of you asking.</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>What we collect</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li><strong>If you book an intro call:</strong> name, email, company, and whatever you write in the form.</li>
        <li><strong>If you subscribe to the newsletter:</strong> just your email + (optionally) a first name.</li>
        <li><strong>If you become a customer:</strong> the business info needed to build your project (services, pricing, brand assets, customer list if migrated).</li>
        <li><strong>If you message the AI chatbot:</strong> the conversation, stored for up to 90 days to improve the model. No personal data is shared with third-party LLMs beyond what you type.</li>
        <li><strong>Visit data:</strong> anonymized page views via Vercel Analytics. No individual tracking, no third-party cookies.</li>
      </ul>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Who we share with</h2>
      <p>Service providers we actually use, named, so you can audit them:</p>
      <ul style={{ paddingLeft: 24 }}>
        <li><strong>Vercel</strong> — hosting</li>
        <li><strong>Supabase</strong> — database (Postgres)</li>
        <li><strong>Stripe</strong> — payments</li>
        <li><strong>Resend</strong> — transactional email</li>
        <li><strong>MailerLite</strong> — newsletter</li>
        <li><strong>Cal.com</strong> — booking</li>
        <li><strong>Anthropic / Google</strong> — LLM inference for the chatbot</li>
      </ul>
      <p>We never sell or rent data. We don't use it for ad targeting.</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Your rights</h2>
      <p>Email <a href="mailto:hello@day14.us">hello@day14.us</a> and we will:</p>
      <ul style={{ paddingLeft: 24 }}>
        <li>Send you everything we have about you within 7 days.</li>
        <li>Delete everything we have about you within 7 days (except where we're legally required to keep it — invoices, etc.).</li>
        <li>Correct anything that's wrong.</li>
      </ul>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Cookies</h2>
      <p>We use one cookie: a session cookie for the admin dashboard. No tracking cookies, no third-party cookies, no consent banner because there's nothing to consent to.</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Changes</h2>
      <p>If we change this policy in a material way, we'll email everyone who has a Day14 account before it takes effect.</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Contact</h2>
      <p>Jack at <a href="mailto:hello@day14.us">hello@day14.us</a>. Day14 is a one-operator studio in Southwest Florida.</p>
    </main>
    <SiteFooter />
    </>
  );
}
