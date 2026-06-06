import Link from "next/link";
import { brandTheme as t, lessons, instruments, faqs, whyMe, contact } from "./theme";

/**
 * Angela Currier · Naples Music Lessons — single-page Spark tier site.
 * In-home piano/guitar/voice/drums/strings lessons for kids and teens.
 *
 * Built 2026-06-05 · awaiting real headshot, phone, email, testimonials.
 * Voice = Angela's (first-person "I", not "we").
 */

const businessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: t.brandName,
  description:
    "In-home music lessons for kids and teens across Naples, Bonita Springs, Marco Island, and Estero — piano, guitar, voice, drums, strings, and theory. Taught by Angela Currier.",
  url: "https://day14.us/brands/angela-music",
  slogan: t.tagline,
  priceRange: "$$",
  areaServed: [
    { "@type": "City", name: "Naples" },
    { "@type": "City", name: "Bonita Springs" },
    { "@type": "City", name: "Marco Island" },
    { "@type": "City", name: "Estero" },
  ],
  founder: { "@type": "Person", name: "Angela Currier" },
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

      {/* Sticky top bar — phone number is always visible */}
      <header
        className="sticky top-0 z-50 backdrop-blur"
        style={{ backgroundColor: `${t.colors.bg}ee`, borderBottom: `1px solid ${t.colors.muted}22` }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
          <div
            className="text-[15px] font-bold tracking-tight sm:text-[17px]"
            style={{ fontFamily: t.fonts.heading, color: t.colors.primary }}
          >
            {t.brandName}
          </div>
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
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24 lg:py-32">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div
              className="mb-5 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ backgroundColor: `${t.colors.primary}15`, color: t.colors.primary }}
            >
              In-home · Kids & teens · {t.serviceArea.split(" · ")[0]}
            </div>
            <h1
              className="text-[44px] leading-[1.02] font-bold tracking-tight sm:text-[60px] lg:text-[72px]"
              style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
            >
              Music lessons
              <br />
              <span style={{ color: t.colors.primary }}>that come to you.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[17px] leading-[1.55] sm:text-[19px]" style={{ color: t.colors.muted }}>
              I&rsquo;m Angela. I teach piano, guitar, voice, drums, and strings to kids and teens across Naples, Bonita Springs, Marco Island, and Estero &mdash; in your home, on your schedule. Transparent pricing, real progress every week.
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
              First lessons start at $55. Most families respond by text.
            </p>
          </div>

          {/* Hero image slot — replace with Angela's headshot once delivered */}
          <div className="relative">
            <div
              className="aspect-[4/5] w-full overflow-hidden rounded-3xl"
              style={{ background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})` }}
            >
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <div className="text-[72px]">🎹🎸🎤</div>
                  <p className="mt-4 px-6 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/90">
                    Photo of Angela — coming soon
                  </p>
                </div>
              </div>
            </div>
            <div
              className="absolute -bottom-4 -right-4 rounded-2xl bg-white p-4 shadow-xl sm:-bottom-6 sm:-right-6"
              style={{ boxShadow: `0 20px 50px -10px ${t.colors.primary}44` }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.colors.muted }}>
                Booking now
              </p>
              <p className="mt-1 text-[15px] font-semibold" style={{ color: t.colors.text }}>
                Fall &rsquo;26 slots open
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* INSTRUMENTS */}
      <section className="border-t" style={{ borderColor: `${t.colors.muted}15` }}>
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="mb-12 max-w-2xl">
            <div
              className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: t.colors.primary }}
            >
              What I teach
            </div>
            <h2
              className="text-[36px] leading-[1.05] font-bold tracking-tight sm:text-[48px]"
              style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
            >
              Every instrument under one teacher.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6]" style={{ color: t.colors.muted }}>
              If a sibling wants to switch instruments or add a second one, you don&rsquo;t need to search for a new teacher.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {instruments.map((i) => (
              <div
                key={i.name}
                className="rounded-2xl p-6 transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: t.colors.surface, border: `1px solid ${t.colors.muted}15` }}
              >
                <div className="text-[40px]">{i.emoji}</div>
                <h3
                  className="mt-4 text-[20px] font-bold"
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
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        className="border-t"
        style={{ borderColor: `${t.colors.muted}15`, backgroundColor: t.colors.surface }}
      >
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="mb-12 max-w-2xl">
            <div
              className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: t.colors.primary }}
            >
              Lesson pricing
            </div>
            <h2
              className="text-[36px] leading-[1.05] font-bold tracking-tight sm:text-[48px]"
              style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
            >
              Three lengths. One flat rate per lesson.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6]" style={{ color: t.colors.muted }}>
              In-home travel is included. No hidden fees, no commitment contracts, no annual minimums. Pay per lesson or month-by-month.
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
                    backgroundColor: t.colors.bg,
                    border: popular ? `2px solid ${t.colors.primary}` : `1px solid ${t.colors.muted}15`,
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
                    className="mt-3 text-[48px] font-bold leading-none tracking-tight"
                    style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
                  >
                    {l.price}
                    <span className="ml-1 text-[14px] font-normal" style={{ color: t.colors.muted }}>
                      / lesson
                    </span>
                  </p>
                  <p className="mt-5 text-[14px] leading-[1.55]" style={{ color: t.colors.muted }}>
                    {l.blurb}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section
        id="about"
        className="border-t"
        style={{ borderColor: `${t.colors.muted}15` }}
      >
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <div
                className="aspect-square w-full overflow-hidden rounded-3xl"
                style={{ background: `linear-gradient(135deg, ${t.colors.secondary}, ${t.colors.accent})` }}
              >
                <div className="flex h-full items-center justify-center">
                  <p className="px-6 text-center text-[13px] font-semibold uppercase tracking-[0.18em] text-white/90">
                    Professional headshot — Angela will send
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div
                className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: t.colors.primary }}
              >
                Meet your teacher
              </div>
              <h2
                className="text-[36px] leading-[1.05] font-bold tracking-tight sm:text-[44px]"
                style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
              >
                Hi, I&rsquo;m Angela.
              </h2>
              <p className="mt-5 text-[16px] leading-[1.65]" style={{ color: t.colors.muted }}>
                <em>Bio coming &mdash; Angela is writing it now.</em>
              </p>
              <p className="mt-5 text-[16px] leading-[1.65]" style={{ color: t.colors.muted }}>
                <em>Placeholder while we wait:</em> I&rsquo;ve spent years teaching music to kids and teens in Southwest Florida. Every student I work with is different &mdash; some want to be the next Taylor Swift, some just want to play their favorite song at a family dinner, some want to ace their school band audition. My job is to find what makes them want to keep playing, then make sure they actually do.
              </p>

              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {whyMe.map((w) => (
                  <div key={w.title}>
                    <h3
                      className="text-[16px] font-bold"
                      style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
                    >
                      {w.title}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-[1.55]" style={{ color: t.colors.muted }}>
                      {w.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOOK CTA */}
      <section
        id="book"
        className="border-t"
        style={{ borderColor: `${t.colors.muted}15`, backgroundColor: t.colors.surface }}
      >
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <div
            className="mb-5 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ backgroundColor: `${t.colors.accent}22`, color: t.colors.accent }}
          >
            Booking fall 2026 slots
          </div>
          <h2
            className="text-[40px] leading-[1.05] font-bold tracking-tight sm:text-[56px]"
            style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
          >
            Let&rsquo;s find a time.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.6]" style={{ color: t.colors.muted }}>
            Tap the phone button to call or text. I reply same day. We&rsquo;ll talk about your child, what they want to learn, and find a weekly slot that fits.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href={contact.phoneHref}
              className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[16px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: t.colors.accent }}
            >
              📞 Call or text {contact.phone}
            </a>
            <a
              href={contact.emailHref}
              className="inline-flex items-center gap-2 rounded-full border-2 px-7 py-4 text-[16px] font-semibold transition-colors"
              style={{ borderColor: t.colors.primary, color: t.colors.primary }}
            >
              ✉️ Email Angela
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t" style={{ borderColor: `${t.colors.muted}15` }}>
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="mb-12">
            <div
              className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: t.colors.primary }}
            >
              Frequently asked
            </div>
            <h2
              className="text-[36px] leading-[1.05] font-bold tracking-tight sm:text-[44px]"
              style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
            >
              Questions parents ask.
            </h2>
          </div>
          <div className="space-y-6">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="rounded-xl p-5 transition-colors"
                style={{ backgroundColor: t.colors.surface, border: `1px solid ${t.colors.muted}15` }}
              >
                <summary
                  className="cursor-pointer list-none text-[16px] font-semibold"
                  style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
                >
                  {f.q}
                </summary>
                <p className="mt-3 text-[14px] leading-[1.6]" style={{ color: t.colors.muted }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="border-t"
        style={{ borderColor: `${t.colors.muted}15`, backgroundColor: t.colors.bg }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-center text-[12px] sm:flex-row sm:px-8 sm:text-left" style={{ color: t.colors.muted }}>
          <div>
            <span style={{ color: t.colors.text, fontWeight: 600 }}>{t.brandName}</span> · {t.serviceArea}
          </div>
          <div className="flex items-center gap-4">
            <a href={contact.phoneHref} className="hover:underline">{contact.phone}</a>
            <span>·</span>
            <Link href="/" className="hover:underline">
              Built by Day14
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
