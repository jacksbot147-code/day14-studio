"use client";

/**
 * ProfessionalHero — the take-over. Clear, calm, expensive-looking.
 *
 * Design principle: anyone (including a non-technical buyer like a tutor or
 * a local-business owner) should be able to answer "what does Day14 do?"
 * in under 5 seconds from landing. Every decision below serves that.
 *
 *   - Plain-English headline. No jargon ("productized build studio",
 *     "multi-tenant OS"). The headline literally says "we build websites
 *     and apps."
 *   - One sentence of substance below. Names the buyers, names the speed,
 *     names the floor price.
 *   - Two CTAs: one primary action, one quiet alternative.
 *   - No typing animation gating the message. Light fade-up on scroll only.
 *   - A small "live" eyebrow pill carries the booking-capacity signal
 *     without becoming a competing visual.
 *   - Generous whitespace. Cream paper. Apple-product-page feel.
 *
 * The terminal aesthetic (FullTerminalHero) was rejected as confusing for
 * non-technical buyers. The terminal personality lives on through:
 *   - StatusLine (vim-style bottom strip)
 *   - PathCrumbs above each section
 *   - CmdKPalette floating pill
 *   - Mono chrome details throughout
 * All of which read as quiet personality without blocking comprehension.
 */

import { motion, useReducedMotion } from "framer-motion";

export function ProfessionalHero() {
  const reduce = useReducedMotion();

  return (
    <section
      className="grain relative isolate overflow-hidden border-b border-warm-gray-100"
      style={{ background: "var(--paper-cream, #fafaf7)" }}
    >
      <div className="container-page relative z-10 pt-28 pb-28 sm:pt-36 sm:pb-36 lg:pt-44 lg:pb-44">
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow — small, live, sets capacity expectation */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-warm-gray-200 bg-white px-3.5 py-1.5"
            style={{
              boxShadow: "0 1px 2px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            <motion.span
              animate={reduce ? undefined : { scale: [1, 1.45, 1], opacity: [1, 0.6, 1] }}
              transition={
                reduce ? undefined : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
              }
              className="inline-block"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#ef6c33",
                boxShadow: "0 0 8px rgba(239,108,51,0.6)",
              }}
            />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-warm-gray-500">
              Day14 · now booking July
            </span>
          </motion.div>

          {/* Headline — the plain-English pitch. The ONLY thing a buyer
              needs to read to know what Day14 does. */}
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-[2.875rem] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[64px] lg:text-[88px] xl:text-[104px]"
          >
            We build websites and apps
            <br />
            in{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg, #ef6c33 0%, #ff8a4c 50%, #ef6c33 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              days
            </span>
            , not months.
          </motion.h1>

          {/* Sub-paragraph — one sentence, names the buyers + price floor */}
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-9 max-w-2xl text-[18px] leading-[1.55] text-warm-gray-500 sm:mt-11 sm:text-[21px] lg:text-[22px] lg:leading-[1.5]"
          >
            Day14 is a small studio that builds custom sites and apps for
            local businesses, founders, and small teams. Shipped fast.
            Operated forever on the platform we built ourselves.{" "}
            <span className="font-semibold text-ink">From $1,500.</span>
          </motion.p>

          {/* CTAs — one primary, one quiet alternative */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mt-11 flex flex-wrap items-center justify-center gap-3 sm:mt-12"
          >
            <a
              href="#book"
              className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-semibold text-white transition-all duration-150 ease-out"
              style={{
                background: "linear-gradient(180deg, #ff8a4c 0%, #ef6c33 100%)",
                boxShadow:
                  "0 10px 28px -8px rgba(239,108,51,0.55), inset 0 1px 0 rgba(255,255,255,0.30)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 14px 32px -8px rgba(239,108,51,0.65), inset 0 1px 0 rgba(255,255,255,0.30)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 10px 28px -8px rgba(239,108,51,0.55), inset 0 1px 0 rgba(255,255,255,0.30)";
              }}
            >
              Book a 20-min scope call
              <span aria-hidden style={{ marginLeft: 2 }}>
                →
              </span>
            </a>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-full border border-warm-gray-200 bg-white px-6 py-3.5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-ink/30"
            >
              See pricing
            </a>
          </motion.div>

          {/* Quiet trust line below the CTAs */}
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.42 }}
            className="mt-7 font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-400"
          >
            Fixed price · No SOWs · Six brands of ours run on it
          </motion.div>
        </div>
      </div>
    </section>
  );
}
