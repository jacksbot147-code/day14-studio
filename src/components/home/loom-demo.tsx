import { DecryptText } from "@/components/landing/decrypt-text";

/* -------------------------------------------------------------------------- */
/* Loom demo embed                                                            */
/* -------------------------------------------------------------------------- */

// Placeholder Loom URL — Jack pastes the real one post-record.
// Empty string renders a styled "ready to embed" frame.
const LOOM_EMBED_URL = "";

export function LoomDemo() {
  // Apple-product-page moment: centered editorial column over the video
  // card. The card itself IS the frame — no browser chrome, no dotted
  // mockup. Long warm peach-tinted shadow, soft cream surface, big radius.
  const cardShadow =
    "0 24px 60px -20px rgba(239, 108, 51, 0.10), 0 8px 24px -8px rgba(15, 23, 42, 0.06)";

  return (
    <section
      id="loom"
      className="bg-paper-cream py-32 sm:py-40"
    >
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="eyebrow mb-6 justify-center text-ember-600">
            <DecryptText text="See it run · 4-min demo" durationMs={550} triggerOnView />
          </div>
          <h2 className="text-[56px] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[72px] lg:text-[80px]">
            <DecryptText text="Day14 in motion." durationMs={700} startAt={250} triggerOnView />
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-[1.55] text-warm-gray-500 sm:text-xl">
            A four-minute walkthrough of the admin app, the scheduled agents, and how a typical build ships and runs on Day14 OS. The shortest path to understanding what you&rsquo;d be hiring.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href="#book" className="btn-ember">
              Book a 15-min intro call →
            </a>
            <a href="#case-studies" className="btn-ghost">
              See three live builds ↓
            </a>
          </div>
        </div>

        <div
          className="relative mx-auto mt-20 aspect-video w-full max-w-5xl overflow-hidden rounded-3xl bg-warm-gray-50"
          style={{ boxShadow: cardShadow }}
        >
          {LOOM_EMBED_URL ? (
            <iframe
              src={LOOM_EMBED_URL}
              title="Day14 OS — 4-minute demo"
              loading="lazy"
              allow="fullscreen"
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-8 text-center">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember-600">
                  Recording this week
                </div>
                <p className="mx-auto mt-4 max-w-md text-[15px] leading-[1.55] text-warm-gray-500">
                  Demo video drops in a few days. In the meantime, the fastest way to see Day14 in action is a 15-minute intro call — free, no pressure.
                </p>
                <a
                  href="#book"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-ember-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-ember-600"
                >
                  Book a 15-min intro call &rarr;
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
