import { cn } from "@/lib/cn";
import { DecryptText } from "@/components/landing/decrypt-text";
import { PathCrumb } from "@/components/landing/path-crumb";

/* -------------------------------------------------------------------------- */
/* How it works — 3 steps                                                      */
/* -------------------------------------------------------------------------- */

const OS_STEPS = [
  {
    n: "01",
    title: "Scope",
    body:
      "15-minute call. I pin down what you actually need (not what a typical agency would scope). Fixed quote in 48 hours.",
    shipped:
      "What I ship: a Loom of the intro call, the fixed quote, and a Day 1 kickoff.",
  },
  {
    n: "02",
    title: "Build",
    body:
      "I design and build on Day14 OS — the same stack that runs my six businesses. You get a daily Loom update so you see progress without having to ask.",
    shipped:
      "What I ship: a private staging URL by Day 3, daily Looms, a code review by Day 7.",
  },
  {
    n: "03",
    title: "Launch + Live",
    body:
      "Site or app ships in 5–28 days depending on tier. Hosted on Day14 OS forever. Scheduled agents handle the boring stuff (deploys, content drafts, briefings) so it runs without you.",
    shipped:
      "What I ship: live site at your domain + 6 months of Day14 OS hosting + agents handling the ops.",
  },
];

export function HowItWorks() {
  // Apple-style staircase: each step takes a full row, copy on one side,
  // an italic "what we ship" quote on the other. A massive ghost numeral
  // sits behind the row as background art, in warm-gray-100 — present but
  // not loud. Buyer-facing rewrite: the TerminalSnippet operator commands
  // have been replaced with plain-language deliverables (what the buyer
  // gets at each step).

  return (
    <section id="how" className="bg-paper-cream py-32 sm:py-40">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <PathCrumb path="how-it-works" />
          </div>
          <div className="eyebrow mb-6 justify-center text-ember-600">
            <DecryptText text="How it works" durationMs={500} triggerOnView />
          </div>
          <h2 className="text-[56px] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[72px] lg:text-[80px]">
            <DecryptText
              text="Three primitives. Everything else is a consequence."
              durationMs={950}
              startAt={250}
              triggerOnView
            />
          </h2>
        </div>

        <div className="mt-24 flex flex-col gap-24 sm:gap-32">
          {OS_STEPS.map((s, i) => {
            // Alternate which side the copy sits on. Step 1 + 3: copy left,
            // shipped-quote right. Step 2: shipped-quote left, copy right.
            const reverse = i % 2 === 1;
            return (
              <div key={s.n} className="relative">
                {/* Ghost numeral — 200-280px warm-gray-100, sits behind the
                    step content as scroll-cinema background art. Positioned
                    on the same side as the copy column for visual rhyme. */}
                <div
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute -top-12 select-none font-extrabold leading-none tracking-[-0.06em] text-warm-gray-100",
                    "text-[200px] sm:text-[240px] lg:text-[280px]",
                    reverse ? "right-0 sm:-right-6" : "left-0 sm:-left-6",
                  )}
                >
                  {s.n}
                </div>

                <div
                  className={cn(
                    "relative z-10 grid items-center gap-10 lg:grid-cols-2 lg:gap-16",
                    reverse && "lg:[&>*:first-child]:order-2",
                  )}
                >
                  <div>
                    <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ember-600 tnum">
                      Step {s.n}
                    </div>
                    <h3 className="mt-5 text-[48px] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[56px] lg:text-[64px]">
                      {s.title}
                    </h3>
                    <p className="mt-6 max-w-xl text-[18px] leading-[1.6] text-warm-gray-500">
                      {s.body}
                    </p>
                  </div>
                  <div>
                    <p className="max-w-md text-[15px] italic leading-[1.55] text-warm-gray-500">
                      {s.shipped}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
