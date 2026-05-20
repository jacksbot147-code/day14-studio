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
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "80px 32px",
          fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          color: "#2F2A33",
          lineHeight: 1.6,
        }}
      >
        <h1 style={{ fontSize: 44, letterSpacing: "-0.02em", marginBottom: 16 }}>Brands</h1>
        <p style={{ fontSize: 18, color: "#7A6F8F", marginBottom: 48, lineHeight: 1.55, maxWidth: 640 }}>
          Every business below was launched, designed, and is run day-to-day by the Day14 OS &mdash;
          brand identity, storefront, content, and customer ops, all on autopilot.
        </p>
        {sites.length === 0 ? (
          <p style={{ color: "#7A6F8F" }}>No brand sites published yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 20,
            }}
          >
            {sites.map((s) => (
              <Link
                key={s.slug}
                href={`/brands/${s.slug}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <article
                  style={{
                    border: "1px solid #E5DFD3",
                    borderRadius: 14,
                    padding: 28,
                    height: "100%",
                    background: "#fff",
                  }}
                >
                  <h2 style={{ fontSize: 22, letterSpacing: "-0.01em", marginBottom: 8 }}>
                    {s.display_name}
                  </h2>
                  <p style={{ color: "#7A6F8F", fontSize: 15, margin: 0 }}>{s.tagline}</p>
                  <div style={{ marginTop: 18, fontSize: 14, fontWeight: 600 }}>Visit site &rarr;</div>
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
