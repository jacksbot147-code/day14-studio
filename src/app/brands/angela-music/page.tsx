import Link from "next/link";
import {
  brandTheme as t,
  lessons,
  instruments,
  faqs,
  serviceArea,
  contact,
} from "./theme";
import { IntakeForm } from "./intake-form";
import { StickyMobileBar } from "./sticky-mobile-bar";

/**
 * Angela Currier · Currier Music — Spark tier site.
 *
 * Six sections total. Built deliberately simple:
 *   1. Sticky header (phone + email always reachable)
 *   2. Hero (name, tagline, photo placeholder, contact CTA)
 *   3. About (real bio from call notes)
 *   4. What I teach (instruments + lesson lengths)
 *   5. Where + how it works (Berkshire, 20mi range, $15 travel, week-by-week)
 *   6. Get in touch (form + footer)
 *
 * Dropped from the earlier overengineered version: trust strip, first-month
 * timeline, why-parents-pick-me, fabricated testimonials, anti-objection
 * grid, neighborhood list, fake student counts. All of those were invented.
 *
 * Content rule: only what Angela confirmed on the call. Placeholders for
 * what's not yet sent (phone, email, photo, exact pricing) marked with
 * "TODO" so Jack can swap when she sends them.
 */

const businessJsonLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "MusicGroup", "ProfessionalService"],
  name: t.brandName,
  alternateName: ["Angela Currier Music Lessons", "Naples Music Teacher"],
  description:
    "Private music lessons in Naples, Florida — piano, guitar, voice, theory. Ages 3 to retired. Taught by Angela Currier (13 years certified). Berkshire-based, 20-mile service range across Southwest Florida.",
  url: "https://day14.us/brands/angela-music",
  slogan: t.tagline,
  areaServed: { "@type": "City", name: "Naples, FL" },
  founder: { "@type": "Person", name: "Angela Currier", jobTitle: "Music Teacher" },
  knowsAbout: ["Piano lessons", "Guitar lessons", "Voice lessons", "Music theory"],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function AngelaMusicPage() {
  return (
    <div
      style={{
        backgroundColor: t.colors.bg,
        color: t.colors.text,
        fontFamily: t.fonts.body,
        minHeight: "100vh",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* STICKY HEADER */}
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          backgroundColor: `${t.colors.bg}ee`,
          borderBottom: `1px solid ${t.colors.muted}22`,
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 sm:px-8">
          <a
            href="#top"
            className="text-base font-semibold tracking-tight"
            style={{ color: t.colors.primary, fontFamily: t.fonts.heading }}
          >
            {t.brandName}
          </a>
          <a
            href={contact.sms}
            className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: t.colors.primary,
              color: t.colors.bg,
            }}
          >
            Text Angela
          </a>
        </div>
      </header>

      {/* 1. HERO */}
      <section id="top" className="mx-auto max-w-5xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28">
        <div className="grid items-center gap-12 md:grid-cols-[1fr_320px] lg:grid-cols-[1.2fr_360px] lg:gap-16">
          <div>
            <div
              className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: t.colors.secondary }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: t.colors.primary }}
              />
              Naples · Southwest Florida
            </div>

            <h1
              className="text-[42px] font-bold leading-[1.05] tracking-tight sm:text-[56px] lg:text-[68px]"
              style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
            >
              {t.tagline}
            </h1>

            <p
              className="mt-7 max-w-xl text-lg leading-[1.6] sm:text-xl"
              style={{ color: t.colors.muted }}
            >
              I&rsquo;m Angela. I&rsquo;ve been teaching music for 13 years and giving private lessons for 16. Piano, guitar, voice, and most instruments &mdash; tailored to each student, week by week.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href={contact.sms}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition-colors"
                style={{
                  backgroundColor: t.colors.primary,
                  color: t.colors.bg,
                }}
              >
                Text me to start
              </a>
              <a
                href={contact.emailHref}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition-colors"
                style={{
                  border: `1.5px solid ${t.colors.primary}`,
                  color: t.colors.primary,
                }}
              >
                Or email me
              </a>
            </div>
          </div>

          {/* Photo placeholder — TODO: swap when Angela sends her bio photo */}
          <div
            className="aspect-[4/5] w-full rounded-2xl"
            style={{
              backgroundColor: t.colors.softTint,
              border: `1px solid ${t.colors.muted}22`,
              display: "grid",
              placeItems: "center",
              color: t.colors.muted,
              fontSize: 13,
              textAlign: "center",
              padding: 24,
            }}
          >
            Photo coming
          </div>
        </div>
      </section>

      {/* 2. ABOUT */}
      <section
        className="border-y py-20 sm:py-24"
        style={{
          backgroundColor: t.colors.softTint,
          borderColor: `${t.colors.muted}22`,
        }}
      >
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div
            className="mb-5 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: t.colors.secondary }}
          >
            About Angela
          </div>
          <h2
            className="text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl"
            style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
          >
            13 years certified. 16 years of private lessons. ~30 students at a time, on purpose.
          </h2>
          <div className="mt-6 space-y-4 text-base leading-[1.65] sm:text-lg" style={{ color: t.colors.muted }}>
            <p>
              I run Currier Music full time &mdash; private music lessons across Naples and the surrounding area. I&rsquo;m well-known locally for music coaching, and I also run Currier Personal Development Coaching alongside the music work.
            </p>
            <p>
              I keep my caseload small on purpose. Less is more &mdash; about 30 active students at a time means each one gets real attention, customized lessons, and a teacher who actually knows them. I tailor everything: instrument, pace, schedule, even payment options (cash or credit, whatever works).
            </p>
          </div>
        </div>
      </section>

      {/* 3. WHAT I TEACH */}
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-24">
        <div
          className="mb-5 text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: t.colors.secondary }}
        >
          What I teach
        </div>
        <h2
          className="max-w-2xl text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl"
          style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
        >
          Most instruments. Ages 3 to retired. Customized to each student.
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {instruments.map((inst) => (
            <div
              key={inst.name}
              className="rounded-xl p-5"
              style={{
                backgroundColor: t.colors.surface,
                border: `1px solid ${t.colors.muted}1f`,
              }}
            >
              <div
                className="text-lg font-bold"
                style={{ fontFamily: t.fonts.heading, color: t.colors.primary }}
              >
                {inst.name}
              </div>
              <div className="mt-2 text-sm leading-[1.5]" style={{ color: t.colors.muted }}>
                {inst.blurb}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <div
            className="mb-4 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: t.colors.secondary }}
          >
            Lesson lengths
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {lessons.map((l) => (
              <div
                key={l.duration}
                className="rounded-xl p-5"
                style={{
                  backgroundColor: t.colors.surface,
                  border: `1px solid ${t.colors.muted}1f`,
                }}
              >
                <div className="text-base font-semibold" style={{ color: t.colors.text }}>
                  {l.duration}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[0.10em]" style={{ color: t.colors.muted }}>
                  {l.bestFor}
                </div>
                <div className="mt-3 text-sm leading-[1.5]" style={{ color: t.colors.muted }}>
                  {l.blurb}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm" style={{ color: t.colors.muted }}>
            <span className="font-semibold" style={{ color: t.colors.text }}>Pricing varies by lesson length and instrument.</span> Text or email me for current rates &mdash; I quote everyone over the phone so we can match it to what you actually need.
          </p>
        </div>
      </section>

      {/* 4. WHERE + HOW IT WORKS */}
      <section
        className="border-y py-20 sm:py-24"
        style={{
          backgroundColor: t.colors.softTint,
          borderColor: `${t.colors.muted}22`,
        }}
      >
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <div
                className="mb-5 text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: t.colors.secondary }}
              >
                Where I teach
              </div>
              <h3
                className="text-2xl font-bold leading-[1.2] sm:text-3xl"
                style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
              >
                Berkshire home base. 20-mile range across Southwest Florida.
              </h3>
              <ul className="mt-6 space-y-3 text-base" style={{ color: t.colors.muted }}>
                <li className="flex gap-3">
                  <span style={{ color: t.colors.primary, fontWeight: 700 }}>·</span>
                  Home base: {serviceArea.homeBase}
                </li>
                <li className="flex gap-3">
                  <span style={{ color: t.colors.primary, fontWeight: 700 }}>·</span>
                  Standard range: {serviceArea.range} from Berkshire
                </li>
                <li className="flex gap-3">
                  <span style={{ color: t.colors.primary, fontWeight: 700 }}>·</span>
                  Travel fee: {serviceArea.travelFee} (negotiable for regulars further out)
                </li>
                <li className="flex gap-3">
                  <span style={{ color: t.colors.primary, fontWeight: 700 }}>·</span>
                  Serving: {serviceArea.servesBroadly}
                </li>
              </ul>
            </div>

            <div>
              <div
                className="mb-5 text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: t.colors.secondary }}
              >
                How it works
              </div>
              <h3
                className="text-2xl font-bold leading-[1.2] sm:text-3xl"
                style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
              >
                Week-by-week. Customized on the phone.
              </h3>
              <ul className="mt-6 space-y-3 text-base" style={{ color: t.colors.muted }}>
                <li className="flex gap-3">
                  <span style={{ color: t.colors.primary, fontWeight: 700 }}>1.</span>
                  Text or email to start &mdash; tell me the student&rsquo;s age and what they want to learn.
                </li>
                <li className="flex gap-3">
                  <span style={{ color: t.colors.primary, fontWeight: 700 }}>2.</span>
                  Quick phone call to tailor a lesson plan and pick a time that fits your week.
                </li>
                <li className="flex gap-3">
                  <span style={{ color: t.colors.primary, fontWeight: 700 }}>3.</span>
                  First lesson at your home (or mine, your call). Pay cash or credit &mdash; whichever is easier.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ — short, factual */}
      <section className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
        <div
          className="mb-5 text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: t.colors.secondary }}
        >
          Common questions
        </div>
        <h2
          className="text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl"
          style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
        >
          A few things parents (and adult students) usually ask.
        </h2>
        <div
          className="mt-10 divide-y"
          style={{ borderColor: `${t.colors.muted}22` }}
        >
          {faqs.map((f, i) => (
            <details key={i} className="group py-5">
              <summary className="flex cursor-pointer list-none items-baseline gap-4">
                <span
                  className="text-xs font-bold tracking-[0.18em]"
                  style={{ color: t.colors.primary, fontFamily: "monospace" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="flex-1 text-base font-semibold leading-snug sm:text-lg"
                  style={{ color: t.colors.text }}
                >
                  {f.q}
                </span>
                <span
                  aria-hidden="true"
                  className="transition-transform duration-150 group-open:rotate-45"
                  style={{ color: t.colors.muted }}
                >
                  +
                </span>
              </summary>
              <div
                className="ml-9 mt-3 text-base leading-[1.6]"
                style={{ color: t.colors.muted }}
              >
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* 6. GET IN TOUCH */}
      <section
        id="book"
        className="border-t py-20 sm:py-24"
        style={{
          backgroundColor: t.colors.primary,
          borderColor: `${t.colors.muted}22`,
        }}
      >
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <h2
            className="text-3xl font-bold leading-[1.15] sm:text-4xl"
            style={{ fontFamily: t.fonts.heading, color: t.colors.bg }}
          >
            Ready to start?
          </h2>
          <p
            className="mx-auto mt-5 max-w-lg text-base leading-[1.6] sm:text-lg"
            style={{ color: `${t.colors.bg}cc` }}
          >
            Fill out the short form below, or text me directly. I reply same day and we&rsquo;ll find a time that works for your family.
          </p>

          <div
            className="mx-auto mt-10 max-w-md rounded-2xl p-6 text-left sm:p-8"
            style={{
              backgroundColor: t.colors.bg,
              color: t.colors.text,
            }}
          >
            <IntakeForm />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" style={{ color: `${t.colors.bg}cc` }}>
            <a href={contact.sms} className="font-semibold underline-offset-4 hover:underline" style={{ color: t.colors.bg }}>
              Text: {contact.phone}
            </a>
            <span style={{ opacity: 0.4 }}>·</span>
            <a href={contact.emailHref} className="font-semibold underline-offset-4 hover:underline" style={{ color: t.colors.bg }}>
              {contact.email}
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="py-10"
        style={{
          backgroundColor: t.colors.bg,
          borderTop: `1px solid ${t.colors.muted}22`,
          color: t.colors.muted,
        }}
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 text-center text-xs sm:flex-row sm:px-8 sm:text-left">
          <div>
            <span className="font-semibold" style={{ color: t.colors.primary }}>{t.brandName}</span> · {t.serviceArea}
          </div>
          <div>© {new Date().getFullYear()} Angela Currier · All rights reserved.</div>
        </div>
      </footer>

      <StickyMobileBar />
    </div>
  );
}
