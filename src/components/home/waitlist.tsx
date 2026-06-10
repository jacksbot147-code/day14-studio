import { SITE } from "@/lib/site";
import { DecryptText } from "@/components/landing/decrypt-text";
import { PathCrumb } from "@/components/landing/path-crumb";
import { WaitlistForm } from "@/components/WaitlistForm";

/* -------------------------------------------------------------------------- */
/* Waitlist                                                                    */
/* -------------------------------------------------------------------------- */

export function Waitlist() {
  // PRIMARY CONVERSION — Book a 15-min intro call. The build-studio pitch closes
  // here. WaitlistForm component is kept (it's a working email-capture
  // endpoint) but reframed: drop your email + a one-line "what you want
  // built" and we come back with a 15-min intro call slot.
  const cardShadow =
    "0 24px 60px -20px rgba(239, 108, 51, 0.10), 0 8px 24px -8px rgba(15, 23, 42, 0.06)";

  return (
    <section
      id="book"
      className="bg-paper-cream py-32 sm:py-40"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center">
            <PathCrumb path="book" />
          </div>
          <div className="eyebrow mb-6 justify-center text-ember-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-ember-500 mr-2 align-middle" />
            <DecryptText text="Now booking · July" durationMs={500} triggerOnView />
          </div>
          <h2 className="text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[56px] lg:text-[64px]">
            <DecryptText text="Tell me what you want built." durationMs={750} startAt={250} triggerOnView />
          </h2>
          <p className="mt-7 text-[17px] leading-[1.6] text-warm-gray-500 sm:text-[18px]">
            15-minute intro call — free, no pressure. I come back with a fixed quote in 48 hours and a shipped build in 14 days. Three slots open for July.
          </p>
        </div>

        <div
          className="mx-auto mt-12 max-w-md rounded-[24px] bg-paper-cream p-8"
          style={{ boxShadow: cardShadow }}
        >
          <div className="text-center">
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ember-600">
              Day14 · intro call request
            </div>
            <h3 className="mt-2 text-[22px] font-extrabold tracking-[-0.025em] text-ink">
              Drop your email below.
            </h3>
            <p className="mt-2 text-[15px] leading-[1.55] text-warm-gray-500">
              I&rsquo;ll reply within 24 hours with a Cal link to book a 15-min intro call.
            </p>
          </div>
          <div className="mt-6">
            <WaitlistForm />
          </div>
          <p className="mt-4 text-center font-mono text-[11px] tracking-[0.04em] text-warm-gray-400">
            No drip. No upsell. Just one operator picking up the phone.
          </p>
        </div>

        <p className="mx-auto mt-10 max-w-md text-center text-[13px] text-warm-gray-400">
          Or email{" "}
          <a
            href={`mailto:${SITE.email}?subject=Day14%20intro%20call`}
            className="font-semibold text-warm-gray-500 underline decoration-warm-gray-200 underline-offset-4 transition-colors duration-150 hover:text-ink hover:decoration-ember-500"
          >
            {SITE.email}
          </a>
        </p>
      </div>
    </section>
  );
}
