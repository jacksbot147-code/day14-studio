import type { Metadata } from "next";

import { SITE } from "@/lib/site";
import { CinematicPage } from "@/components/cinematic/CinematicPage";
import { Reveal } from "@/components/cinematic/Reveal";

/**
 * /privacy — Privacy Policy, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 8/10 of the rebuild — legal + info).
 * Uses the shared <CinematicPage> shell (CanvasField backdrop + fixed Nav +
 * SiteFooter) with a hero, then renders the policy as clean long-form `.cin-prose`
 * for legible legal reading. Content is preserved verbatim from the prior
 * surface; only the skin changes. No prices appear here, so `check:prices` is
 * trivially clean.
 */

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Day14 handles your data. Short version: we collect the minimum, we don’t sell it, you can delete it.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "May 19, 2026";

export default function PrivacyPage() {
  return (
    <CinematicPage
      hero={{
        eyebrow: "Privacy",
        title: "The minimum, never sold, yours to delete.",
        lede: "We collect only the data needed to do your work, we never sell email addresses or customer data, and we delete everything within 7 days of you asking.",
      }}
    >
      <Reveal as="div" className="cin-prose">
        <p className="cin-prose-kicker">Last updated {UPDATED}</p>

        <h2>The short version</h2>
        <p>
          We collect the minimum data needed to do work for you. We never sell
          email addresses or customer data. We can delete everything we have
          about you within 7 days of you asking.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>If you book an intro call:</strong> name, email, company, and
            whatever you write in the form.
          </li>
          <li>
            <strong>If you subscribe to the newsletter:</strong> just your email
            + (optionally) a first name.
          </li>
          <li>
            <strong>If you become a customer:</strong> the business info needed
            to build your project (services, pricing, brand assets, customer
            list if migrated).
          </li>
          <li>
            <strong>If you message the AI chatbot:</strong> the conversation,
            stored for up to 90 days to improve the model. No personal data is
            shared with third-party LLMs beyond what you type.
          </li>
          <li>
            <strong>Visit data:</strong> anonymized page views via Vercel
            Analytics. No individual tracking, no third-party cookies.
          </li>
        </ul>

        <h2>Who we share with</h2>
        <p>Service providers we actually use, named, so you can audit them:</p>
        <ul>
          <li>
            <strong>Vercel</strong> — hosting
          </li>
          <li>
            <strong>Supabase</strong> — database (Postgres)
          </li>
          <li>
            <strong>Stripe</strong> — payments
          </li>
          <li>
            <strong>Resend</strong> — transactional email
          </li>
          <li>
            <strong>MailerLite</strong> — newsletter
          </li>
          <li>
            <strong>Cal.com</strong> — booking
          </li>
          <li>
            <strong>Anthropic / Google</strong> — LLM inference for the chatbot
          </li>
        </ul>
        <p>We never sell or rent data. We don&rsquo;t use it for ad targeting.</p>

        <h2>Your rights</h2>
        <p>
          Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> and we will:
        </p>
        <ul>
          <li>Send you everything we have about you within 7 days.</li>
          <li>
            Delete everything we have about you within 7 days (except where
            we&rsquo;re legally required to keep it — invoices, etc.).
          </li>
          <li>Correct anything that&rsquo;s wrong.</li>
        </ul>

        <h2>Cookies</h2>
        <p>
          We use one cookie: a session cookie for the admin dashboard. No
          tracking cookies, no third-party cookies, no consent banner because
          there&rsquo;s nothing to consent to.
        </p>

        <h2>Changes</h2>
        <p>
          If we change this policy in a material way, we&rsquo;ll email everyone
          who has a Day14 account before it takes effect.
        </p>

        <h2>Contact</h2>
        <p>
          Jack at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Day14 is a
          one-operator studio in Southwest Florida.
        </p>
      </Reveal>
    </CinematicPage>
  );
}
