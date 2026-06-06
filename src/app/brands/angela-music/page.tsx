import Link from "next/link";
import {
  brandTheme as t,
  lessons,
  instruments,
  faqs,
  whyMe,
  firstMonth,
  serviceArea,
  objections,
  trustStats,
  contact,
} from "./theme";
import { IntakeForm } from "./intake-form";
import { StickyMobileBar } from "./sticky-mobile-bar";

/**
 * Angela Currier · Naples Music Lessons — Spark tier site.
 * Designed to be the highest-converting local tutoring site on the internet.
 *
 * Sections in order:
 *   1. Sticky header (phone always visible)
 *   2. Hero with editorial nameplate
 *   3. Trust strip
 *   4. Instruments
 *   5. First 30 days timeline (concrete progression)
 *   6. Pricing
 *   7. Why parents pick me (4 short reasons)
 *   8. Testimonials (empty-state until Angela sends quotes)
 *   9. About Angela
 *  10. Anti-objection
 *  11. Service area + neighborhoods
 *  12. Intake form (wired to /api/brands/angela-music/contact)
 *  13. FAQ
 *  14. Final book CTA
 *  15. Footer
 *  16. Sticky mobile bottom bar (call + book)
 *
 * Voice = Angela's first-person. Voice doc applied.
 */

const businessJsonLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "MusicGroup", "ProfessionalService"],
  name: t.brandName,
  alternateName: ["Angela Currier Music Lessons", "Naples In-Home Music Teacher"],
  description:
    "In-home piano, guitar, voice, drums, strings, and theory lessons for kids and teens across Naples, Bonita Springs, Marco Island, and Estero — taught by Angela Currier. Transparent pricing, no contracts, same-day reply.",
  url: "https://day14.us/brands/angela-music",
  slogan: t.tagline,
  priceRange: "$55 - $95 per lesson",
  areaServed: serviceArea.cities.map((c) => ({ "@type": "City", name: c })),
  founder: { "@type": "Person", name: "Angela Currier", jobTitle: "Music Teacher" },
  offers: lessons.map((l) => ({
    "@type": "Offer",
    name: `${l.duration} private music lesson`,
    price: l.price.replace("$", ""),
    priceCurrency: "USD",
    eligibleQuantity: { "@type": "QuantitativeValue", value: 1, unitText: "lesson" },
  })),
  knowsAbout: ["Piano lessons", "Guitar lessons", "Voice lessons", "Drum lessons", "Violin lessons", "Music theory"],
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
        style={{ backgroundColor: `${t.colors.bg}ee`, borderBottom: `1px solid ${t.colors.muted}22` }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
          <a
            href="#top"
            className="text-[15px] font-bold tracking-tight sm:text-[17px]"
            style={{ fontFamily: t.fonts.heading, color: t.colors.primary }}
          >
            {t.brandName}
          </a>
          <nav className="hidden items-center gap-7 text-[13px] font-medium md:flex" style={{ color: t.colors.muted }}>
            <a href="#first-month" className="transition-colors hover:text-[var(--ink,#1F1A2E)]">First month</a>
            <a href="#pricing" className="transition-colors hover:text-[var(--ink,#1F1A2E)]">Pricing</a>
            <a href="#about" className="transition-colors hover:text-[var(--ink,#1F1A2E)]">About</a>
            <a href="#faq" className="transition-colors hover:text-[var(--ink,#1F1A2E)]">FAQ</a>
          </nav>
          <a
            href={contact.phoneHref}
            className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 sm:text-[14px]"
            style={{ backgroundColor: t.colors.accent }}
          >
            📞 {contact.phone}
          </a>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24 lg:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ backgroundColor: `${t.colors.primary}15`, color: t.colors.primary }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.colors.accent }} />
              Booking · Fall 2026
            </div>
            <h1
              className="text-[44px] leading-[1.02] font-bold tracking-tight sm:text-[60px] lg:text-[80px]"
              style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
            >
              Music lessons
              <br />
              <span style={{ color: t.colors.primary }}>that come to you.</span>
            </h1>
            <p
              className="mt-7 max-w-xl text-[17px] leading-[1.55] sm:text-[19px]"
              style={{ color: t.colors.muted }}
            >
              I&rsquo;m Angela. I teach piano, guitar, voice, drums, and strings to kids and teens across Naples &mdash; in your home, on your schedule. Transparent pricing, no contracts, real progress every week.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={contact.phoneHref}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: t.colors.accent }}
              >
                📞 Call or text {contact.phone}
              </a>
              <a
                href="#book"
                className="inline-flex items-center gap-2 rounded-full border-2 px-6 py-3.5 text-[15px] font-semibold transition-colors"
                style={{ borderColor: t.colors.primary, color: t.colors.primary }}
              >
                Schedule a first lesson →
              </a>
            </div>
            <p className="mt-5 text-[13px]" style={{ color: t.colors.muted }}>
              First lessons start at $55 · I reply same day · Most families respond by text.
            </p>
          </div>

          {/* Editorial nameplate — fills until Angela sends headshot */}
          <div className="relative">
            <div
              className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl"
              style={{
                background: `linear-gradient(135deg, ${t.colors.primary} 0%, ${t.colors.secondary} 60%, ${t.colors.accent} 100%)`,
              }}
            >
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.25), transparent 55%)` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="text-[260px] leading-none opacity-20"
                  style={{ fontFamily: t.fonts.heading, color: "#FFFFFF" }}
                  aria-hidden
                >
                  ♪
                </div>
              </div>
              <div className="absolute bottom-7 left-7 right-7 text-white">
                <p
                  className="text-[32px] font-bold leading-[1.05] tracking-tight sm:text-[40px]"
                  style={{ fontFamily: t.fonts.heading }}
                >
                  Angela Currier
                </p>
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/80">
                  Naples · in-home music
                </p>
              </div>
            </div>
            <div
              className="absolute -bottom-4 -right-4 rounded-2xl bg-white p-4 shadow-xl sm:-bottom-6 sm:-right-6"
              style={{ boxShadow: `0 20px 50px -10px ${t.colors.primary}44` }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.colors.muted }}>
                3 weekly slots open
              </p>
              <p className="mt-1 text-[15px] font-semibold" style={{ color: t.colors.text }}>
                Fall &rsquo;26 cohort
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ backgroundColor: t.colors.softTint }} className="border-y" >
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="grid grid-cols-2 gap-y-7 sm:grid-cols-4 sm:gap-y-0">
            {trustStats.map((s) => (
              <div key={s.label} className="text-center">
                <p
                  className="text-[36px] font-bold leading-none tracking-tight sm:text-[44px]"
                  style={{ fontFamily: t.fonts.heading, color: t.colors.primary }}
                >
                  {s.value}
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: t.colors.muted }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSTRUMENTS */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mb-12 max-w-2xl">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.colors.primary }}>
            What I teach
          </div>
          <h2
            className="text-[36px] leading-[1.05] font-bold tracking-tight sm:text-[48px]"
            style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
          >
            Every instrument. One teacher.
          </h2>
          <p className="mt-5 text-[16px] leading-[1.6]" style={{ color: t.colors.muted }}>
            If a sibling wants to switch instruments or add a second one, you don&rsquo;t need to start a new teacher search.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {instruments.map((i) => (
            <div
              key={i.name}
              className="group rounded-2xl p-7 transition-all duration-200 hover:-translate-y-1"
              style={{
                backgroundColor: t.colors.surface,
                border: `1px solid ${t.colors.muted}15`,
                boxShadow: `0 1px 2px ${t.colors.primary}08`,
              }}
            >
              <div
                className="text-[48px] leading-none transition-transform group-hover:scale-110"
                style={{ fontFamily: t.fonts.heading, color: t.colors.primary }}
              >
                {i.symbol}
              </div>
              <h3
                className="mt-5 text-[22px] font-bold"
                style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
              >
                {i.name}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.55]" style={{ color: t.colors.muted }}>
                {i.blurb}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FIRST 30 DAYS — the conversion magnet */}
      <section id="first-month" style={{ backgroundColor: t.colors.surface }} className="border-y" >
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="mb-14 max-w-2xl">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.colors.primary }}>
              Your child&rsquo;s first 30 days
            </div>
            <h2
              className="text-[36px] leading-[1.05] font-bold tracking-tight sm:text-[48px]"
              style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
            >
              By the end of the month, they can play a song.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6]" style={{ color: t.colors.muted }}>
              Here&rsquo;s what the first four weeks actually look like. No mystery, no &ldquo;trust the process.&rdquo;
            </p>
          </div>
          <ol className="relative space-y-8 sm:space-y-10 sm:pl-8 sm:before:absolute sm:before:left-[7px] sm:before:top-3 sm:before:bottom-3 sm:before:w-px" style={{ borderColor: t.colors.primary }}>
            {firstMonth.map((m, idx) => (
              <li key={m.week} className="relative">
                <div className="hidden sm:block sm:absolute sm:-left-8 sm:top-1.5 sm:h-4 sm:w-4 sm:rounded-full sm:ring-4" style={{ backgroundColor: t.colors.primary, ['--tw-ring-color' as string]: t.colors.bg }} />
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
                  <p
                    className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.22em] sm:w-24"
                    style={{ color: t.colors.primary }}
                  >
                    {m.week}
                  </p>
                  <div className="flex-1">
                    <h3
                      className="text-[22px] font-bold leading-[1.15]"
                      style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
                    >
                      {m.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-[1.6]" style={{ color: t.colors.muted }}>
                      {m.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mb-12 max-w-2xl">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.colors.primary }}>
            Lesson pricing
          </div>
          <h2
            className="text-[36px] leading-[1.05] font-bold tracking-tight sm:text-[48px]"
            style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
          >
            Three lengths. One flat rate per lesson.
          </h2>
          <p className="mt-5 text-[16px] leading-[1.6]" style={{ color: t.colors.muted }}>
            In-home travel is included. No hidden fees, no commitment contracts, no annual minimums. Pay per lesson or month at a time. Sibling discount: 10% off the second child, 15% off the third.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {lessons.map((l, i) => {
            const popular = i === 1;
            return (
              <div
                key={l.duration}
                className="relative rounded-2xl p-7"
                style={{
                  backgroundColor: popular ? t.colors.surface : t.colors.bg,
                  border: popular ? `2px solid ${t.colors.primary}` : `1px solid ${t.colors.muted}15`,
                  boxShadow: popular ? `0 20px 40px -20px ${t.colors.primary}44` : "none",
                }}
              >
                {popular ? (
                  <span
                    className="absolute -top-3 right-5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
                    style={{ backgroundColor: t.colors.primary }}
                  >
                    Most popular
                  </span>
                ) : null}
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.colors.muted }}>
                  {l.duration}
                </p>
                <p
                  className="mt-3 text-[52px] font-bold leading-none tracking-tight"
                  style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
                >
                  {l.price}
                  <span className="ml-1 text-[14px] font-normal" style={{ color: t.colors.muted }}>
                    / lesson
                  </span>
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: t.colors.primary }}>
                  {l.bestFor}
                </p>
                <p className="mt-4 text-[14px] leading-[1.55]" style={{ color: t.colors.muted }}>
                  {l.blurb}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* WHY ME — 4 short blocks */}
      <section style={{ backgroundColor: t.colors.softTint }} className="border-y">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="mb-12 max-w-2xl">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.colors.primary }}>
              Why parents pick me
            </div>
            <h2
              className="text-[36px] leading-[1.05] font-bold tracking-tight sm:text-[48px]"
              style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
            >
              Four reasons, in order of how often I hear them.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {whyMe.map((w, idx) => (
              <div key={w.title} className="flex gap-5">
                <div
                  className="shrink-0 font-mono text-[14px] font-bold tabular-nums"
                  style={{ color: t.colors.primary }}
                >
                  0{idx + 1}.
                </div>
                <div>
                  <h3
                    className="text-[20px] font-bold leading-[1.15]"
                    style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
                  >
                    {w.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.6]" style={{ color: t.colors.muted }}>
                    {w.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.2fr]">
          {/* Editorial mark — replaces gradient with intentional design */}
          <div>
            <div
              className="relative aspect-square w-full overflow-hidden rounded-3xl"
              style={{ background: `linear-gradient(135deg, ${t.colors.secondary} 0%, ${t.colors.accent} 100%)` }}
            >
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: `radial-gradient(circle at 70% 30%, rgba(255,255,255,0.30), transparent 55%)` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="text-[180px] leading-none opacity-25"
                  style={{ fontFamily: t.fonts.heading, color: "#FFFFFF" }}
                  aria-hidden
                >
                  A.
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/80">Angela Currier</p>
                <p className="mt-1 text-[14px] font-semibold" style={{ fontFamily: t.fonts.heading }}>
                  Your teacher
                </p>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.colors.primary }}>
              Meet your teacher
            </div>
            <h2
              className="text-[36px] leading-[1.05] font-bold tracking-tight sm:text-[44px]"
              style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
            >
              Hi, I&rsquo;m Angela.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65]" style={{ color: t.colors.muted }}>
              I&rsquo;ve spent years teaching music to kids and teens across Southwest Florida. Every student is different &mdash; some want to be the next Taylor Swift, some just want to play their favorite song at a family dinner, some want to ace their school band audition.
            </p>
            <p className="mt-4 text-[16px] leading-[1.65]" style={{ color: t.colors.muted }}>
              My job is to figure out what makes a kid want to keep showing up. Then make sure they actually do.
            </p>
            <p className="mt-4 text-[16px] leading-[1.65]" style={{ color: t.colors.muted }}>
              I teach in your home so the lesson actually happens &mdash; no after-school traffic across town, no rushed handoffs, no excuses. The bar I hold myself to: every student plays a complete song their family recognizes by the end of month one.
            </p>
            <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: t.colors.primary }}>
              Currently teaching out of Naples · serving Bonita Springs, Marco Island, Estero
            </p>
          </div>
        </div>
      </section>

      {/* OBJECTIONS — the "but what about..." section */}
      <section style={{ backgroundColor: t.colors.surface }} className="border-y" >
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="mb-12 max-w-2xl">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.colors.primary }}>
              What you don&rsquo;t need to worry about
            </div>
            <h2
              className="text-[36px] leading-[1.05] font-bold tracking-tight sm:text-[48px]"
              style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
            >
              The real reasons parents hesitate.
            </h2>
          </div>
          <div className="grid gap-7 lg:grid-cols-2">
            {objections.map((o) => (
              <div
                key={o.title}
                className="rounded-2xl p-7"
                style={{ backgroundColor: t.colors.bg, border: `1px solid ${t.colors.muted}15` }}
              >
                <h3
                  className="text-[18px] font-bold leading-[1.2]"
                  style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
                >
                  {o.title}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.6]" style={{ color: t.colors.muted }}>
                  {o.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICE AREA */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.colors.primary }}>
              Where I teach
            </div>
            <h2
              className="text-[36px] leading-[1.05] font-bold tracking-tight sm:text-[44px]"
              style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
            >
              Naples and everywhere within an hour.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6]" style={{ color: t.colors.muted }}>
              In-home travel is included in the lesson price. If you&rsquo;re outside this circle, ask &mdash; I sometimes make exceptions for committed students.
            </p>
          </div>
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: t.colors.primary }}>
              Cities
            </p>
            <div className="mb-8 flex flex-wrap gap-2">
              {serviceArea.cities.map((c) => (
                <span
                  key={c}
                  className="rounded-full px-4 py-2 text-[14px] font-semibold"
                  style={{ backgroundColor: t.colors.primary, color: "#FFFFFF" }}
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: t.colors.primary }}>
              Neighborhoods I visit often
            </p>
            <div className="flex flex-wrap gap-2">
              {serviceArea.neighborhoods.map((n) => (
                <span
                  key={n}
                  className="rounded-full border px-3 py-1.5 text-[13px]"
                  style={{ borderColor: `${t.colors.primary}30`, color: t.colors.text }}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INTAKE FORM — wired to API */}
      <section
        id="book"
        style={{ backgroundColor: t.colors.softTint }}
        className="border-y"
      >
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="mb-10 text-center">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.colors.primary }}>
              Schedule a first lesson
            </div>
            <h2
              className="text-[40px] leading-[1.05] font-bold tracking-tight sm:text-[56px]"
              style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
            >
              Tell me about your child.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.6]" style={{ color: t.colors.muted }}>
              30 seconds. I reply same day with two or three slot options. If we don&rsquo;t find a fit, I&rsquo;ll point you toward another teacher I trust.
            </p>
          </div>
          <IntakeForm />
          <div className="mt-7 text-center">
            <p className="text-[13px]" style={{ color: t.colors.muted }}>
              Prefer to talk?{" "}
              <a
                href={contact.phoneHref}
                className="font-semibold underline-offset-4 hover:underline"
                style={{ color: t.colors.primary }}
              >
                Call or text {contact.phone}
              </a>
              {" "}or{" "}
              <a
                href={contact.emailHref}
                className="font-semibold underline-offset-4 hover:underline"
                style={{ color: t.colors.primary }}
              >
                email Angela
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mb-12">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.colors.primary }}>
            Frequently asked
          </div>
          <h2
            className="text-[36px] leading-[1.05] font-bold tracking-tight sm:text-[44px]"
            style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
          >
            Questions parents ask.
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl p-5 transition-colors open:shadow-sm"
              style={{ backgroundColor: t.colors.surface, border: `1px solid ${t.colors.muted}15` }}
            >
              <summary
                className="flex cursor-pointer list-none items-start justify-between gap-4 text-[16px] font-semibold"
                style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
              >
                <span>{f.q}</span>
                <span
                  className="shrink-0 text-[20px] transition-transform group-open:rotate-45"
                  style={{ color: t.colors.primary }}
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-[14px] leading-[1.65]" style={{ color: t.colors.muted }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: t.colors.text, color: t.colors.bg }}>
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <p
                className="text-[22px] font-bold leading-[1.05]"
                style={{ fontFamily: t.fonts.heading, color: "#FFFFFF" }}
              >
                {t.brandName}
              </p>
              <p className="mt-3 text-[14px] leading-[1.55]" style={{ color: `${t.colors.bg}aa` }}>
                In-home music lessons taught by Angela Currier. Kids and teens, all instruments, across Naples and Southwest Florida.
              </p>
            </div>
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: `${t.colors.bg}88` }}>
                Talk
              </p>
              <ul className="space-y-2 text-[14px]">
                <li>
                  <a href={contact.phoneHref} className="hover:underline" style={{ color: "#FFFFFF" }}>
                    📞 {contact.phone}
                  </a>
                </li>
                <li>
                  <a href={contact.sms} className="hover:underline" style={{ color: "#FFFFFF" }}>
                    💬 Text me
                  </a>
                </li>
                <li>
                  <a href={contact.emailHref} className="hover:underline" style={{ color: "#FFFFFF" }}>
                    ✉️ Email Angela
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: `${t.colors.bg}88` }}>
                Serving
              </p>
              <ul className="space-y-2 text-[14px]" style={{ color: `${t.colors.bg}cc` }}>
                {serviceArea.cities.map((c) => (
                  <li key={c}>{c}, FL</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-[12px] sm:flex-row" style={{ borderColor: `${t.colors.bg}22`, color: `${t.colors.bg}88` }}>
            <p>© {new Date().getFullYear()} {t.brandName}. All rights reserved.</p>
            <Link href="/" className="hover:underline">
              Built by Day14
            </Link>
          </div>
        </div>
      </footer>

      {/* STICKY MOBILE BOTTOM BAR */}
      <StickyMobileBar />
    </div>
  );
}
