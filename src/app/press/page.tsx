import type { Metadata } from "next";
import Link from "next/link";

import { SITE } from "@/lib/site";
import { SERVICE_TIERS } from "@/lib/pricing";
import { CinematicPage } from "@/components/cinematic/CinematicPage";
import { Reveal } from "@/components/cinematic/Reveal";

/**
 * /press — press kit, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 8/10 of the rebuild — legal + info).
 * Light-touch: the shared <CinematicPage> shell + `.cin-prose` long-form. Content
 * preserved from the prior surface.
 *
 * PRICING INTEGRITY: the public price range is derived live from src/lib/pricing.ts
 * (Spark setup floor → Platform setup floor) — never hard-coded — so `check:prices`
 * stays clean.
 */

// Public price range, derived from pricing.ts (Spark floor → Platform floor).
const PLATFORM_FLOOR = Number(
  SERVICE_TIERS.find((t) => t.slug === "platform")!.setupLabel.replace(/[^0-9]/g, ""),
);
const MIN_SETUP = Math.min(
  ...SERVICE_TIERS.map((t) => t.setup).filter((n): n is number => n !== null),
);
const PRICE_RANGE = `$${MIN_SETUP.toLocaleString()}–$${PLATFORM_FLOOR.toLocaleString()}+`;

export const metadata: Metadata = {
  title: "Press kit",
  description:
    "Press kit for Day14: a one-operator AI-leveraged build studio. Logos, founder bio, recent shipped projects, contact for press inquiries.",
  alternates: { canonical: "/press" },
};

const STATS = [
  { stat: "1", label: "Operator" },
  { stat: "20+", label: "AI agents in production" },
  { stat: "14 days", label: "Average ship time" },
  { stat: PRICE_RANGE, label: "Fixed-price builds" },
  { stat: "Florida", label: "Headquarters" },
  { stat: "2026", label: "Founded" },
];

const PROJECTS = [
  {
    href: "/case-studies/splash-jacks-pools",
    label: "Splash Jacks Pools",
    desc: "Service-business platform, full Stripe billing, AI chatbot, operator admin app. Live.",
  },
  {
    href: "/case-studies/casamore",
    label: "Casamoré Events",
    desc: "Brand-heavy events site, 18 pages, 19 blog essays, full visual identity. Live.",
  },
  {
    href: "/case-studies/buildbridge",
    label: "Buildbridge",
    desc: "Two-sided marketplace with Stripe milestone escrow, native iOS/Android wrappers. Preview.",
  },
  {
    href: "/case-studies/hot-flash-co",
    label: "Hot Flash Co",
    desc: "Autonomous POD store, internal stress-test of the agent stack. Live.",
  },
];

export default function PressPage() {
  return (
    <CinematicPage
      hero={{
        eyebrow: "Press kit",
        title: "A one-operator studio shipping real platforms in 14 days.",
        lede: "Day14 is based in Southwest Florida and uses AI agents as the work force.",
      }}
    >
      <Reveal as="div" className="cin-prose">
        <h2>One-liner</h2>
        <blockquote>
          A one-operator build studio shipping real business platforms in 14
          days, productized at {PRICE_RANGE}, using its own AI agent stack to do
          it.
        </blockquote>

        <h2>Why it matters</h2>
        <p>
          The agency model is broken: project managers, designers, frontend,
          backend, QA, account managers, 6-month timelines, $50k minimums. Day14
          ships the same output with one operator and a fleet of AI agents, in
          two weeks, at a fixed price, with the customer owning the code.
        </p>
        <p>
          Day14 runs its own businesses on the same stack as proof: a
          perimenopause-humor POD store (Hot Flash Co), a service-business
          platform (Splash Jacks Pools), a marketplace (Buildbridge), and a
          brand-heavy events site (Casamoré).
        </p>

        <h2>Founder bio</h2>
        <blockquote>
          Jack Boppington is the founder and operator of Day14. Based in
          Southwest Florida, he is the only human on the team. Day14&rsquo;s
          twenty-plus AI agents handle the rest: sales drafts, customer success,
          financial reporting, content production, compliance review, devops.
          Before Day14 he ran service businesses directly. The playbook is now
          productized.
        </blockquote>

        <h2>The shape of Day14, today.</h2>
        <table>
          <tbody>
            {STATS.map((s) => (
              <tr key={s.label}>
                <th scope="row" style={{ whiteSpace: "nowrap" }}>
                  {s.stat}
                </th>
                <td>{s.label}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>What we&rsquo;ve shipped.</h2>
        <ul>
          {PROJECTS.map((p) => (
            <li key={p.href}>
              <Link href={p.href}>{p.label} →</Link> — {p.desc}
            </li>
          ))}
        </ul>

        <h2>Brand assets</h2>
        <p>
          Logo SVG, founder photo, and screenshots available on request. Email{" "}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with your outlet and
          we&rsquo;ll send a Dropbox link within a day.
        </p>

        <hr />

        <p className="cin-prose-kicker">Press contact</p>
        <h2>Jack Boppington, Founder</h2>
        <p>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
        <p>
          Generally available for podcast appearances, written interviews, and
          panel talks on AI-leveraged productized services. Replies within 24
          hours.
        </p>
      </Reveal>
    </CinematicPage>
  );
}
