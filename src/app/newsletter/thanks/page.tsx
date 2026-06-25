import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";

export const metadata = { title: "Subscribed — Day14", robots: { index: false } };

/**
 * /newsletter/thanks — subscribe confirmation. Re-themed onto the cinematic
 * shell (block 9/10) so the chrome matches every other route.
 */
export default function ThanksPage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main className="cin-detail">
        <header className="cin-detail-hero">
          <Reveal as="div" className="cin-kicker">
            ✉️ Almost there
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-detail-h1">
            Check your inbox
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-detail-lede">
            Confirmation email&rsquo;s on its way. Click the link to lock it in.
            First issue lands next Tuesday.
          </Reveal>
          <Reveal as="div" delayStep={3} className="cin-hcta cin-detail-cta">
            <a href="/" className="cin-btn cin-btn-solid">
              ← Back to Day14
            </a>
          </Reveal>
        </header>
      </main>

      <SiteFooter />
    </div>
  );
}
