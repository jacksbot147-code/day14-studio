import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { CalInline } from "@/components/cal-inline";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Book a call — Day14",
  description:
    "Pick a 15-minute intro call. No prep needed — bring your business and a rough idea of what you want shipped.",
};

// The Cal link is the path after cal.com/ — derived from the canonical
// bookingUrl so there's one source of truth.
const CAL_LINK = SITE.bookingUrl.replace(/^https?:\/\/(app\.)?cal\.com\//, "");

/**
 * /book — the Cal.com booking page. Re-themed onto the cinematic shell
 * (block 9/10) so the chrome matches every other route. The embedded scheduler
 * lives in <CalInline> (client) and is unchanged.
 */
export default function BookPage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main className="cin-detail">
        <header className="cin-detail-hero">
          <Reveal as="div" className="cin-kicker">
            15-minute intro call
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-detail-h1">
            Let&rsquo;s scope your build.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-detail-lede">
            No prep needed. Bring your business and a rough idea of what you want
            shipped — we&rsquo;ll figure out the right tier and timeline live.
            Prefer email? <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </Reveal>
        </header>

        <section className="cin-detail-block">
          <CalInline calLink={CAL_LINK} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
