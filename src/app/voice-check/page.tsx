import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VoiceChecker } from "./voice-checker";

/**
 * /voice-check — paste any marketing copy, get banned-word flagging,
 * voice score (1-10), and suggested replacements. Tastes like the OS.
 *
 * The page shell is server-rendered; the interactive checker lives in
 * ./voice-checker.tsx (client). Client-side only, no backend — the
 * banned-word list mirrors docs/VOICE.md. Becomes the visible artifact
 * of the Day14 voice methodology — a working sample of what the $5k
 * Voice engagement produces, in 30s.
 */

export default function VoiceCheckPage() {
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

        <VoiceChecker />

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
