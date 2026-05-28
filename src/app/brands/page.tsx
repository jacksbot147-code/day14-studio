import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Brands — Day14",
  description:
    "Businesses built and run on the Day14 OS. Each brand is launched, designed, and operated day-to-day by AI agents.",
  openGraph: {
    title: "Day14 Brands",
    description: "Businesses built and run on the Day14 OS.",
  },
};

export const dynamic = "force-dynamic";

interface BrandSite {
  slug: string;
  display_name: string;
  tagline: string;
  built_at?: string;
}

async function loadBrandSites(): Promise<BrandSite[]> {
  try {
    const f = path.join(process.cwd(), "public/data/brand-sites.json");
    const data = JSON.parse(await fs.readFile(f, "utf8")) as { sites?: BrandSite[] };
    return data.sites || [];
  } catch {
    return [];
  }
}

export default async function BrandsIndex() {
  const sites = await loadBrandSites();
  return (
    <>
      <SiteHeader />
      <main className="container-page py-20 sm:py-28">
        <section className="mb-16 max-w-3xl">
          <span className="eyebrow eyebrow-rule mb-4">Brands</span>
          <h1 className="mb-5">
            Every business below is{" "}
            <span className="marker">launched, designed, and run</span> by the Day14 OS.
          </h1>
          <p className="text-lg leading-relaxed text-ink-500 sm:text-xl">
            Brand identity, storefront, content, customer ops. All on autopilot.
          </p>
        </section>

        {sites.length === 0 ? (
          <div className="border border-dashed border-ink-200 bg-paper-50 px-6 py-16 text-center">
            <p className="text-sm text-ink-500">
              No brand sites published yet. New brands appear here as they ship.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px overflow-hidden border border-ink-100 bg-ink-100 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((s) => (
              <Link
                key={s.slug}
                href={`/brands/${s.slug}`}
                className="group block bg-paper p-6 transition-colors duration-150 hover:bg-paper-100"
              >
                <article className="relative">
                  <span className="absolute left-0 top-0 h-px w-0 bg-ember-500 transition-[width] duration-200 ease-out group-hover:w-full" />
                  <h2 className="mb-2 text-xl font-bold leading-snug tracking-tighter">
                    {s.display_name}
                  </h2>
                  <p className="mb-6 text-sm leading-relaxed text-ink-500">{s.tagline}</p>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ember-600">
                    Visit site
                    <span className="transition-transform duration-150 group-hover:translate-x-0.5">
                      →
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
