import Link from "next/link";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { VoiceChecker } from "./voice-checker";

/**
 * /voice-check — paste any marketing copy, get banned-word flagging,
 * voice score (1-10), and suggested replacements. Tastes like the OS.
 *
 * Re-themed onto the cinematic shell (block 9/10) so the chrome matches every
 * other route. The interactive checker lives in ./voice-checker.tsx (client),
 * runs entirely in the browser, and is unchanged here.
 */

export default function VoiceCheckPage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main className="cin-detail">
        <header className="cin-detail-hero">
          <Reveal as="div" className="cin-kicker">
            Voice checker
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-detail-h1">
            Paste your copy. I&rsquo;ll tell you where it sounds like every other
            agency.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-detail-lede">
            A live sample of the Day14 voice methodology. Runs entirely in your
            browser &mdash; nothing leaves the page. The full $5,000 engagement
            produces your own VOICE.md plus a voice-pass on every page; this is
            the 30-second taste of what that feels like.
          </Reveal>
        </header>

        <section className="cin-detail-block">
          <VoiceChecker />
        </section>

        <section className="cin-detail-block">
          <Reveal as="div" className="cin-kicker">
            How this works
          </Reveal>
          <Reveal as="p" delayStep={1} className="cin-detail-body">
            Everything runs in your browser. Your copy never leaves the page. The
            word list comes from{" "}
            <Link href="/capabilities">docs/VOICE.md</Link> &mdash; the canonical
            voice doc Day14 checks every piece of customer-facing copy against.
            The score is a rough proxy (violation density per 100 words); the real
            measure is the &ldquo;would Jack say this out loud at 9 PM over
            coffee&rdquo; test. If you&rsquo;d be embarrassed by a word in it, cut
            that word.
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
