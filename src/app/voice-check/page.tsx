"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * /voice-check — paste any marketing copy, get banned-word flagging,
 * voice score (1-10), and suggested replacements. Tastes like the OS.
 *
 * Client-side only. No backend. Banned-word list mirrors docs/VOICE.md.
 * Becomes the visible artifact of the Day14 voice methodology — a
 * working sample of what the $5k Voice engagement produces, in 30s.
 */

type Violation = {
  word: string;
  replacement: string;
  category: "jargon" | "agency" | "hype";
  positions: Array<{ start: number; end: number }>;
};

const BANNED: Array<{
  pattern: RegExp;
  word: string;
  replacement: string;
  category: Violation["category"];
}> = [
  // Day14 jargon → plain English
  { pattern: /\bscope call\b/gi, word: "scope call", replacement: "intro call (15 min, free)", category: "jargon" },
  { pattern: /\b(we|you) ship(ped|ping|s)?\b/gi, word: "ship", replacement: "launch / go live / deliver", category: "jargon" },
  { pattern: /\bops ladder\b/gi, word: "ops ladder", replacement: "service tiers", category: "jargon" },
  { pattern: /\btenant\b/gi, word: "tenant", replacement: "business", category: "jargon" },
  { pattern: /\bworktree\b/gi, word: "worktree", replacement: "codebase", category: "jargon" },
  { pattern: /\bmulti-tenant\b/gi, word: "multi-tenant", replacement: "one system, many businesses", category: "jargon" },
  // Agency tells
  { pattern: /\bsynergy\b/gi, word: "synergy", replacement: "(cut)", category: "agency" },
  { pattern: /\bleverage\b/gi, word: "leverage", replacement: "use", category: "agency" },
  { pattern: /\bbest-in-class\b/gi, word: "best-in-class", replacement: "(cut, or name the comparison)", category: "agency" },
  { pattern: /\bworld-class\b/gi, word: "world-class", replacement: "(cut)", category: "agency" },
  { pattern: /\bend-to-end\b/gi, word: "end-to-end", replacement: "(name the start and the end)", category: "agency" },
  { pattern: /\bturnkey\b/gi, word: "turnkey", replacement: "(say what's included)", category: "agency" },
  { pattern: /\bsolutions?\b/gi, word: "solutions", replacement: "(name the actual thing)", category: "agency" },
  { pattern: /\bempower(s|ing|ed)?\b/gi, word: "empower", replacement: "let / help / give you", category: "agency" },
  { pattern: /\bstreamline(s|d|ing)?\b/gi, word: "streamline", replacement: "simplify / cut steps", category: "agency" },
  { pattern: /\bbespoke\b/gi, word: "bespoke", replacement: "custom", category: "agency" },
  { pattern: /\bcurate(s|d|ing)?\b/gi, word: "curate", replacement: "pick / choose", category: "agency" },
  { pattern: /\bartisan(al)?\b/gi, word: "artisan", replacement: "(cut)", category: "agency" },
  { pattern: /\b(hop|jump) on a call\b/gi, word: "hop on a call", replacement: "talk", category: "agency" },
  // Hype
  { pattern: /\bseamless(ly)?\b/gi, word: "seamless", replacement: "(cut — describe what it actually does)", category: "hype" },
  { pattern: /\brevolutionary\b/gi, word: "revolutionary", replacement: "(cut)", category: "hype" },
  { pattern: /\bgame-?changing\b/gi, word: "game-changing", replacement: "(cut)", category: "hype" },
  { pattern: /\b10x\b/gi, word: "10x", replacement: "(name the actual multiple)", category: "hype" },
  { pattern: /\bunlock(s|ing|ed)?\b/gi, word: "unlock", replacement: "open up / give you access to", category: "hype" },
  { pattern: /\bsupercharge(s|d|ing)?\b/gi, word: "supercharge", replacement: "speed up", category: "hype" },
  { pattern: /\brobust\b/gi, word: "robust", replacement: "(describe the actual property)", category: "hype" },
  { pattern: /\bAI-native\b/gi, word: "AI-native", replacement: "(name the AI feature)", category: "hype" },
  { pattern: /\bparadigm shift\b/gi, word: "paradigm shift", replacement: "(cut)", category: "hype" },
  { pattern: /\bcutting-edge\b/gi, word: "cutting-edge", replacement: "(cut, or name the tech)", category: "hype" },
  { pattern: /\bnext-gen\b/gi, word: "next-gen", replacement: "(cut)", category: "hype" },
  { pattern: /\binnovative\b/gi, word: "innovative", replacement: "(name what's new)", category: "hype" },
  { pattern: /\bdisrupt(s|ed|ing|ive|ion)?\b/gi, word: "disrupt", replacement: "(name what changes)", category: "hype" },
];

const PRONOUN_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(we|our|us)\b/gi, label: "we / our / us" },
];

const CATEGORY_LABELS = {
  jargon: { label: "Day14 jargon", color: "text-amber-600 bg-amber-50 border-amber-200" },
  agency: { label: "Agency-speak", color: "text-rose-600 bg-rose-50 border-rose-200" },
  hype: { label: "Hype words", color: "text-purple-600 bg-purple-50 border-purple-200" },
};

const SAMPLE = `We are a world-class digital agency that empowers brands to unlock their full potential through bespoke, AI-native solutions. Our team of best-in-class experts will hop on a call to scope your project and deliver a turnkey, end-to-end experience that revolutionizes your business and supercharges your conversion. We leverage cutting-edge methodology to streamline your workflow with a seamless, robust platform.`;

export default function VoiceCheckPage() {
  const [text, setText] = useState("");

  const analysis = useMemo(() => {
    if (!text.trim()) {
      return { violations: [], pronounMatches: 0, score: null as number | null, wordCount: 0 };
    }
    const violations: Violation[] = [];
    for (const rule of BANNED) {
      const positions: Array<{ start: number; end: number }> = [];
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        positions.push({ start: m.index, end: m.index + m[0].length });
        if (m.index === regex.lastIndex) regex.lastIndex++;
      }
      if (positions.length > 0) {
        violations.push({ word: rule.word, replacement: rule.replacement, category: rule.category, positions });
      }
    }
    let pronounMatches = 0;
    for (const pp of PRONOUN_PATTERNS) {
      const re = new RegExp(pp.pattern.source, pp.pattern.flags);
      pronounMatches += (text.match(re) || []).length;
    }
    const wordCount = text.trim().split(/\s+/).length;
    const totalViolations = violations.reduce((sum, v) => sum + v.positions.length, 0) + pronounMatches;
    // Score: 10 minus penalties per 100 words
    const violationDensity = wordCount > 0 ? (totalViolations / wordCount) * 100 : 0;
    const score = Math.max(1, Math.min(10, Math.round(10 - violationDensity * 1.5)));
    return { violations, pronounMatches, score, wordCount };
  }, [text]);

  const highlighted = useMemo(() => {
    if (!text.trim()) return null;
    const ranges: Array<{ start: number; end: number; category: Violation["category"] | "pronoun" }> = [];
    for (const v of analysis.violations) {
      for (const p of v.positions) {
        ranges.push({ start: p.start, end: p.end, category: v.category });
      }
    }
    for (const pp of PRONOUN_PATTERNS) {
      const re = new RegExp(pp.pattern.source, pp.pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        ranges.push({ start: m.index, end: m.index + m[0].length, category: "pronoun" });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
    ranges.sort((a, b) => a.start - b.start);
    // Deduplicate overlaps — keep the earlier range
    const merged: typeof ranges = [];
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (last && r.start < last.end) continue;
      merged.push(r);
    }
    const out: Array<{ text: string; highlight: string | null }> = [];
    let cursor = 0;
    for (const r of merged) {
      if (cursor < r.start) out.push({ text: text.slice(cursor, r.start), highlight: null });
      out.push({ text: text.slice(r.start, r.end), highlight: r.category });
      cursor = r.end;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor), highlight: null });
    return out;
  }, [text, analysis.violations]);

  return (
    <>
      <SiteHeader />
      <main className="container-page pt-14 pb-20 sm:pt-20">
        <div className="eyebrow mb-6">Voice checker</div>
        <h1 className="max-w-3xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
          Paste your copy.
          <br className="hidden sm:block" /> I&rsquo;ll tell you where it sounds like every other agency.
        </h1>
        <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
          A live sample of the Day14 voice methodology. Runs entirely in your browser &mdash; nothing leaves the page. The full $5,000 engagement produces your own VOICE.md plus a voice-pass on every page; this is the 30-second taste of what that feels like.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Input + highlighted preview */}
          <div className="space-y-6">
            <div>
              <label htmlFor="copy" className="mb-2 block font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-500">
                Your marketing copy
              </label>
              <textarea
                id="copy"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste any headline, hero paragraph, or pitch you've written..."
                rows={10}
                className="w-full rounded-2xl border border-warm-gray-200 bg-paper-cream p-5 text-[15px] leading-[1.6] text-ink shadow-inner focus:border-ember-500 focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between text-[12px] text-warm-gray-500">
                <span>{analysis.wordCount} words</span>
                <button
                  type="button"
                  onClick={() => setText(SAMPLE)}
                  className="font-mono uppercase tracking-[0.18em] text-ember-600 hover:text-ember-500"
                >
                  Load example
                </button>
              </div>
            </div>

            {highlighted ? (
              <div className="rounded-2xl border border-warm-gray-100 bg-white p-6">
                <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-500">
                  Highlighted
                </div>
                <p className="text-[15px] leading-[1.7] text-ink">
                  {highlighted.map((seg, i) =>
                    seg.highlight ? (
                      <mark
                        key={i}
                        className={
                          "rounded px-1 py-0.5 " +
                          (seg.highlight === "jargon"
                            ? "bg-amber-100 text-amber-800"
                            : seg.highlight === "agency"
                            ? "bg-rose-100 text-rose-800"
                            : seg.highlight === "hype"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-warm-gray-200 text-ink underline decoration-warm-gray-400")
                        }
                      >
                        {seg.text}
                      </mark>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    )
                  )}
                </p>
              </div>
            ) : null}
          </div>

          {/* Score + violations */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-warm-gray-100 bg-paper-cream p-7">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-500">
                Voice score
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-[64px] font-extrabold leading-none tracking-tightest text-ink tnum">
                  {analysis.score ?? "—"}
                </span>
                <span className="text-xl font-mono text-warm-gray-400">/ 10</span>
              </div>
              <p className="mt-3 text-[14px] leading-[1.55] text-ink-500">
                {analysis.score === null
                  ? "Paste copy to score."
                  : analysis.score >= 9
                  ? "Jack would say this out loud."
                  : analysis.score >= 7
                  ? "Close. A few small fixes."
                  : analysis.score >= 5
                  ? "This sounds like an agency wrote it."
                  : "This is what every other agency website sounds like. Start over."}
              </p>
              {analysis.pronounMatches > 0 ? (
                <div className="mt-4 rounded-lg border border-warm-gray-200 bg-white p-3 text-[13px]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-warm-gray-500">
                    Pronoun watch
                  </span>
                  <p className="mt-1 text-ink-500">
                    Found <strong className="text-ink">{analysis.pronounMatches}</strong> uses of <em>we / our / us</em>. Day14 voice says <strong>I</strong>. One person, one voice.
                  </p>
                </div>
              ) : null}
            </div>

            {analysis.violations.length > 0 ? (
              <div className="rounded-2xl border border-warm-gray-100 bg-white p-7">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-500">
                  Found ({analysis.violations.reduce((s, v) => s + v.positions.length, 0)})
                </div>
                <ul className="mt-4 space-y-3">
                  {analysis.violations.map((v) => (
                    <li key={v.word} className="rounded-lg border border-warm-gray-100 p-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <strong className="text-[15px] font-bold text-ink">{v.word}</strong>
                        <span
                          className={
                            "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] " +
                            CATEGORY_LABELS[v.category].color
                          }
                        >
                          {CATEGORY_LABELS[v.category].label} · {v.positions.length}×
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-500">
                        Say instead: <span className="text-ink">{v.replacement}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-2xl border-2 border-ember-500 bg-paper-cream p-7">
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ember-600">
                Want me to do this for your whole site?
              </div>
              <h3 className="mt-2 text-xl font-extrabold tracking-tightest text-ink">
                Day14 Voice — $5,000, 2 weeks.
              </h3>
              <p className="mt-3 text-[14px] leading-[1.55] text-ink-500">
                I read everything you&rsquo;ve published, watch how your customers talk back, and produce your VOICE.md. Then a voice-pass on every customer-facing page. Your team (or your agents) check copy against the doc forever.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/#book" className="btn-ember">
                  Book a 15-min intro call
                </Link>
                <Link href="/capabilities" className="btn-ghost">
                  See full scope
                </Link>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-20 rounded-2xl border border-warm-gray-100 bg-paper-cream p-7">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-500">
            How this works
          </div>
          <p className="mt-3 max-w-3xl text-[14px] leading-[1.6] text-ink-500">
            Everything runs in your browser. Your copy never leaves the page. The word list comes from <Link href="/capabilities" className="underline">docs/VOICE.md</Link> &mdash; the canonical voice doc Day14 checks every piece of customer-facing copy against. The score is a rough proxy (violation density per 100 words); the real measure is the &ldquo;would Jack say this out loud at 9 PM over coffee&rdquo; test. If you&rsquo;d be embarrassed by a word in it, cut that word.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
