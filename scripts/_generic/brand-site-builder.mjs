#!/usr/bin/env node
/**
 * brand-site-builder.mjs <tenant-slug>
 *
 * Generates a FULL multi-page Next.js site for a tenant under
 *   studio/src/app/brands/<slug>/
 *
 * Routes produced:
 *   /brands/<slug>/                  — home (hero, featured products, latest blog, newsletter capture)
 *   /brands/<slug>/products          — products grid
 *   /brands/<slug>/products/[id]     — product detail page
 *   /brands/<slug>/blog              — blog index
 *   /brands/<slug>/blog/[slug]       — blog post page
 *   /brands/<slug>/about             — about + voice manifesto
 *   /brands/<slug>/contact           — contact + brand info
 *
 * Plus:
 *   - tailwind-style colors injected from brand-identity.json
 *   - meta tags, OpenGraph, Twitter cards per page
 *   - SEO sitemap.xml served from /brands/<slug>/sitemap.xml/route.ts
 *   - JSON-LD product schema for SEO
 *
 * Existing pages get overwritten — back up first if you've hand-edited.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  tenantSlug, loadEnv, loadTenant, audit, queueTelegram, BIZ,
} from "./_lib.mjs";
import { stripSlop } from "../lib/skills/stop-slop.mjs";

const STUDIO_SRC = path.join(process.env.HOME, "Documents/studio/src");
const BRAND_MANIFEST = path.join(process.env.HOME, "Documents/studio/public/data/brand-sites.json");

function pascal(slug) {
  return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
}

/** Register the brand in public/data/brand-sites.json so it shows on /brands. */
async function updateBrandManifest(slug, display, tagline) {
  let manifest = { schema_version: 1, sites: [] };
  if (existsSync(BRAND_MANIFEST)) {
    try { manifest = JSON.parse(await fs.readFile(BRAND_MANIFEST, "utf8")); } catch { /* reset */ }
  }
  if (!Array.isArray(manifest.sites)) manifest.sites = [];
  const entry = { slug, display_name: display, tagline, built_at: new Date().toISOString() };
  const idx = manifest.sites.findIndex((s) => s.slug === slug);
  if (idx >= 0) manifest.sites[idx] = { ...manifest.sites[idx], ...entry };
  else manifest.sites.push(entry);
  await fs.mkdir(path.dirname(BRAND_MANIFEST), { recursive: true });
  await fs.writeFile(BRAND_MANIFEST, JSON.stringify(manifest, null, 2));
}

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
  return filePath;
}

function colorVars(identity) {
  if (!identity?.color_palette) return { primary: "#2F2A33", secondary: "#7A6F8F", accent: "#D4C5A9" };
  const palette = identity.color_palette;
  return {
    primary: palette.find((c) => c.role === "primary")?.hex || palette[0]?.hex || "#2F2A33",
    secondary: palette.find((c) => c.role === "secondary")?.hex || palette[1]?.hex || "#7A6F8F",
    accent: palette.find((c) => c.role === "accent")?.hex || palette[2]?.hex || "#D4C5A9",
  };
}

function fontVars(identity) {
  return {
    heading: identity?.typography?.heading?.google_font || "Inter",
    body: identity?.typography?.body?.google_font || "Inter",
  };
}

async function gen(slug, ctx) {
  const identity = ctx.identity;
  const display = ctx.display_name;
  const niche = ctx.niche;
  // stripSlop pass on the only free-text field that ends up in user-facing
  // copy across every generated brand-site page (hero, OG, meta description).
  // display + niche are typically proper-noun-ish and left as-is.
  // Recorded for the audit log so a tenant can see what was scrubbed.
  const rawTagline = identity?.positioning_statement || niche;
  const slopResult = stripSlop(rawTagline);
  const tagline = slopResult.cleaned;
  const slopRemovedCount = slopResult.removed.reduce((n, r) => n + r.count, 0);
  if (slopRemovedCount > 0) {
    console.log(`[brand-site-builder] ${slug}: stripSlop removed ${slopRemovedCount} phrases from tagline (${slopResult.removed.map((r) => r.phrase).join(", ")})`);
  }
  const colors = colorVars(identity);
  const fonts = fontVars(identity);
  const root = path.join(STUDIO_SRC, "app/brands", slug);
  const written = [];

  // Shared theme module
  written.push(await writeFile(
    path.join(root, "theme.ts"),
    `// Auto-generated brand theme for ${display}
export const brandTheme = {
  slug: "${slug}",
  displayName: "${display.replace(/"/g, '\\"')}",
  tagline: "${tagline.replace(/"/g, '\\"')}",
  niche: "${niche.replace(/"/g, '\\"')}",
  colors: {
    primary: "${colors.primary}",
    secondary: "${colors.secondary}",
    accent: "${colors.accent}",
    bg: "#FAF8F4",
    text: "#1f1c24",
    muted: "#666",
  },
  fonts: {
    heading: "'${fonts.heading}', system-ui, sans-serif",
    body: "'${fonts.body}', system-ui, sans-serif",
  },
};
`
  ));

  // Layout
  written.push(await writeFile(
    path.join(root, "layout.tsx"),
    `import { brandTheme as t } from "./theme";
import Link from "next/link";

export const metadata = {
  title: { default: "${display.replace(/"/g, '\\"')} — ${tagline.replace(/"/g, '\\"').slice(0, 80)}", template: "%s — ${display.replace(/"/g, '\\"')}" },
  description: "${tagline.replace(/"/g, '\\"').slice(0, 160)}",
  openGraph: {
    title: "${display.replace(/"/g, '\\"')}",
    description: "${tagline.replace(/"/g, '\\"').slice(0, 160)}",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: t.colors.bg, color: t.colors.text, fontFamily: t.fonts.body, minHeight: "100vh" }}>
      <link href={\`https://fonts.googleapis.com/css2?family=\${encodeURIComponent(t.fonts.heading.split("'")[1] || "Inter")}:wght@400;600;700&family=\${encodeURIComponent(t.fonts.body.split("'")[1] || "Inter")}:wght@400;500&display=swap\`} rel="stylesheet" />
      <nav style={{ borderBottom: \`1px solid \${t.colors.accent}\`, padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: t.fonts.heading }}>
        <Link href={\`/brands/${slug}\`} style={{ color: t.colors.primary, fontSize: 22, fontWeight: 700, textDecoration: "none", letterSpacing: "-0.02em" }}>${display.replace(/"/g, '\\"')}</Link>
        <div style={{ display: "flex", gap: 28, fontSize: 14 }}>
          <Link href={\`/brands/${slug}/products\`} style={{ color: t.colors.text, textDecoration: "none" }}>Shop</Link>
          <Link href={\`/brands/${slug}/blog\`} style={{ color: t.colors.text, textDecoration: "none" }}>Reading</Link>
          <Link href={\`/brands/${slug}/about\`} style={{ color: t.colors.text, textDecoration: "none" }}>About</Link>
          <Link href={\`/brands/${slug}/contact\`} style={{ color: t.colors.text, textDecoration: "none" }}>Contact</Link>
        </div>
      </nav>
      {children}
      <footer style={{ borderTop: \`1px solid \${t.colors.accent}\`, padding: "40px 32px", textAlign: "center", color: t.colors.muted, fontSize: 12, marginTop: 80 }}>
        <div>{t.displayName} · {t.tagline}</div>
        <div style={{ marginTop: 8 }}>Part of the Day14 family.</div>
      </footer>
    </div>
  );
}
`
  ));

  // Home page
  written.push(await writeFile(
    path.join(root, "page.tsx"),
    `import { brandTheme as t } from "./theme";
import Link from "next/link";
import { fetchTenantProducts, fetchLatestBlogPosts } from "@/lib/brand-data";

export default async function Page() {
  const products = await fetchTenantProducts("${slug}");
  const posts = await fetchLatestBlogPosts("${slug}", 3);
  const featured = products.slice(0, 3);

  return (
    <main>
      <section style={{ padding: "120px 32px 80px", textAlign: "center", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontFamily: t.fonts.heading, fontSize: 56, letterSpacing: "-0.03em", lineHeight: 1.05, color: t.colors.primary }}>${display.replace(/"/g, '\\"')}</h1>
        <p style={{ fontSize: 18, color: t.colors.secondary, marginTop: 16, maxWidth: 600, marginInline: "auto" }}>${tagline.replace(/"/g, '\\"')}</p>
        <Link href={\`/brands/${slug}/products\`} style={{ display: "inline-block", marginTop: 32, padding: "14px 28px", background: t.colors.primary, color: "white", borderRadius: 8, textDecoration: "none", fontSize: 15, fontWeight: 500 }}>Browse the shop →</Link>
      </section>

      {featured.length > 0 && (
        <section style={{ padding: "60px 32px", maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontFamily: t.fonts.heading, fontSize: 28, marginBottom: 24, letterSpacing: "-0.02em" }}>Featured</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {featured.map((p: any) => (
              <Link key={p.id} href={\`/brands/${slug}/products/\${p.id}\`} style={{ textDecoration: "none", color: "inherit" }}>
                <article style={{ background: "white", border: \`1px solid \${t.colors.accent}\`, borderRadius: 12, overflow: "hidden" }}>
                  {p.images?.[0]?.src && <img src={p.images[0].src} alt={p.title} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />}
                  <div style={{ padding: 20 }}>
                    <h3 style={{ fontSize: 15, fontFamily: t.fonts.heading, marginBottom: 8 }}>{p.title}</h3>
                    {p.minPrice != null && <div style={{ color: t.colors.secondary, fontSize: 14 }}>\${(p.minPrice / 100).toFixed(2)}</div>}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section style={{ padding: "60px 32px", maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ fontFamily: t.fonts.heading, fontSize: 28, marginBottom: 24, letterSpacing: "-0.02em" }}>From the blog</h2>
          {posts.map((post: any) => (
            <Link key={post.slug} href={\`/brands/${slug}/blog/\${post.slug}\`} style={{ display: "block", padding: "20px 0", borderBottom: \`1px solid \${t.colors.accent}\`, color: "inherit", textDecoration: "none" }}>
              <h3 style={{ fontFamily: t.fonts.heading, fontSize: 18, marginBottom: 4 }}>{post.title}</h3>
              <div style={{ color: t.colors.muted, fontSize: 13 }}>{post.date}</div>
            </Link>
          ))}
        </section>
      )}

      <section style={{ padding: "80px 32px", textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
        <h2 style={{ fontFamily: t.fonts.heading, fontSize: 24, marginBottom: 12, letterSpacing: "-0.02em" }}>Get the newsletter</h2>
        <p style={{ color: t.colors.secondary, marginBottom: 24 }}>One email a week. No filler.</p>
        <form action={\`/api/brands/${slug}/subscribe\`} method="POST" style={{ display: "flex", gap: 8, justifyContent: "center", maxWidth: 400, margin: "0 auto" }}>
          <input type="email" name="email" placeholder="you@email.com" required style={{ flex: 1, padding: "12px 14px", border: \`1px solid \${t.colors.accent}\`, borderRadius: 6, fontSize: 14 }} />
          <button type="submit" style={{ padding: "12px 20px", background: t.colors.primary, color: "white", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>Subscribe</button>
        </form>
      </section>
    </main>
  );
}
`
  ));

  // Products page
  written.push(await writeFile(
    path.join(root, "products/page.tsx"),
    `import { brandTheme as t } from "../theme";
import Link from "next/link";
import { fetchTenantProducts } from "@/lib/brand-data";

export const metadata = { title: "Shop" };

export default async function ProductsPage() {
  const products = await fetchTenantProducts("${slug}");
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", marginBottom: 8 }}>Shop</h1>
      <p style={{ color: t.colors.secondary, marginBottom: 40 }}>{products.length} products</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
        {products.map((p: any) => (
          <Link key={p.id} href={\`/brands/${slug}/products/\${p.id}\`} style={{ textDecoration: "none", color: "inherit" }}>
            <article style={{ background: "white", border: \`1px solid \${t.colors.accent}\`, borderRadius: 12, overflow: "hidden" }}>
              {p.images?.[0]?.src && <img src={p.images[0].src} alt={p.title} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />}
              <div style={{ padding: 16 }}>
                <h3 style={{ fontSize: 14, fontFamily: t.fonts.heading, marginBottom: 6 }}>{p.title}</h3>
                {p.minPrice != null && <div style={{ color: t.colors.secondary, fontSize: 13 }}>\${(p.minPrice / 100).toFixed(2)}</div>}
              </div>
            </article>
          </Link>
        ))}
      </div>
    </main>
  );
}
`
  ));

  // Product detail page
  written.push(await writeFile(
    path.join(root, "products/[id]/page.tsx"),
    `import { brandTheme as t } from "../../theme";
import { fetchProduct } from "@/lib/brand-data";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchProduct("${slug}", id);
  if (!p) return { title: "Not found" };
  return {
    title: p.title,
    description: (p.description || "").slice(0, 160),
    openGraph: {
      title: p.title,
      description: (p.description || "").slice(0, 160),
      images: p.images?.[0]?.src ? [p.images[0].src] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchProduct("${slug}", id);
  if (!p) notFound();
  const minPrice = p.minPrice ?? 0;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
      {p.images?.[0]?.src && <img src={p.images[0].src} alt={p.title} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 12, background: "white" }} />}
      <div>
        <h1 style={{ fontFamily: t.fonts.heading, fontSize: 32, letterSpacing: "-0.02em", marginBottom: 12 }}>{p.title}</h1>
        <div style={{ color: t.colors.secondary, fontSize: 20, marginBottom: 24 }}>\${(minPrice / 100).toFixed(2)}</div>
        <div style={{ whiteSpace: "pre-line", color: t.colors.text, lineHeight: 1.7, fontSize: 15 }}>{p.description}</div>
        <a href={\`https://printify.com/app/products/\${p.id}\`} style={{ display: "inline-block", marginTop: 32, padding: "14px 28px", background: t.colors.primary, color: "white", borderRadius: 8, textDecoration: "none", fontSize: 15, fontWeight: 500 }}>Buy on Printify →</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org/",
          "@type": "Product",
          name: p.title,
          description: p.description,
          image: p.images?.[0]?.src ? [p.images[0].src] : [],
          brand: { "@type": "Brand", name: t.displayName },
          offers: { "@type": "Offer", price: (minPrice / 100).toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock" },
        })}} />
      </div>
    </main>
  );
}
`
  ));

  // Blog index
  written.push(await writeFile(
    path.join(root, "blog/page.tsx"),
    `import { brandTheme as t } from "../theme";
import Link from "next/link";
import { fetchBlogPosts } from "@/lib/brand-data";

export const metadata = { title: "Reading" };

export default async function BlogPage() {
  const posts = await fetchBlogPosts("${slug}");
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "60px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", marginBottom: 8 }}>Reading</h1>
      <p style={{ color: t.colors.secondary, marginBottom: 40 }}>{posts.length} posts</p>
      <div>
        {posts.map((post: any) => (
          <Link key={post.slug} href={\`/brands/${slug}/blog/\${post.slug}\`} style={{ display: "block", padding: "24px 0", borderBottom: \`1px solid \${t.colors.accent}\`, textDecoration: "none", color: "inherit" }}>
            <h2 style={{ fontFamily: t.fonts.heading, fontSize: 22, marginBottom: 6 }}>{post.title}</h2>
            <p style={{ color: t.colors.secondary, fontSize: 14, marginBottom: 4 }}>{post.meta_description}</p>
            <div style={{ color: t.colors.muted, fontSize: 12 }}>{post.date} · {post.word_count} words</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
`
  ));

  // Blog post page
  written.push(await writeFile(
    path.join(root, "blog/[slug]/page.tsx"),
    `import { brandTheme as t } from "../../theme";
import { fetchBlogPost } from "@/lib/brand-data";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchBlogPost("${slug}", slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.meta_description,
    openGraph: { title: post.title, description: post.meta_description, type: "article" },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchBlogPost("${slug}", slug);
  if (!post) notFound();
  return (
    <article style={{ maxWidth: 720, margin: "0 auto", padding: "60px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 36, letterSpacing: "-0.02em", marginBottom: 8, lineHeight: 1.15 }}>{post.title}</h1>
      <div style={{ color: t.colors.muted, fontSize: 13, marginBottom: 40 }}>{post.date}</div>
      <div style={{ fontSize: 17, lineHeight: 1.7, color: t.colors.text }} dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
`
  ));

  // About page
  written.push(await writeFile(
    path.join(root, "about/page.tsx"),
    `import { brandTheme as t } from "../theme";
import { fetchTenantAbout } from "@/lib/brand-data";

export const metadata = { title: "About" };

export default async function AboutPage() {
  const about = await fetchTenantAbout("${slug}");
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", marginBottom: 24 }}>About ${display.replace(/"/g, '\\"')}</h1>
      <div style={{ fontSize: 17, lineHeight: 1.7, color: t.colors.text }} dangerouslySetInnerHTML={{ __html: about }} />
    </main>
  );
}
`
  ));

  // Contact page
  written.push(await writeFile(
    path.join(root, "contact/page.tsx"),
    `import { brandTheme as t } from "../theme";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "60px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", marginBottom: 24 }}>Get in touch</h1>
      <p style={{ color: t.colors.text, lineHeight: 1.7, marginBottom: 32 }}>For press, partnership, refunds, or general questions, drop us a line.</p>
      <form action={\`/api/brands/${slug}/contact\`} method="POST" style={{ display: "grid", gap: 12 }}>
        <input type="text" name="name" placeholder="Your name" required style={{ padding: "12px 14px", border: \`1px solid \${t.colors.accent}\`, borderRadius: 6, fontSize: 14 }} />
        <input type="email" name="email" placeholder="you@email.com" required style={{ padding: "12px 14px", border: \`1px solid \${t.colors.accent}\`, borderRadius: 6, fontSize: 14 }} />
        <textarea name="message" placeholder="Your message" required rows={6} style={{ padding: "12px 14px", border: \`1px solid \${t.colors.accent}\`, borderRadius: 6, fontSize: 14, resize: "vertical" }} />
        <button type="submit" style={{ padding: "14px 28px", background: t.colors.primary, color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: "pointer" }}>Send</button>
      </form>
    </main>
  );
}
`
  ));

  // Sitemap
  written.push(await writeFile(
    path.join(root, "sitemap.xml/route.ts"),
    `import { fetchTenantProducts, fetchBlogPosts } from "@/lib/brand-data";

export const dynamic = "force-dynamic";

const BASE = "https://day14.us";

export async function GET() {
  const products = await fetchTenantProducts("${slug}");
  const posts = await fetchBlogPosts("${slug}");
  const urls = [
    \`\${BASE}/brands/${slug}/\`,
    \`\${BASE}/brands/${slug}/products\`,
    \`\${BASE}/brands/${slug}/blog\`,
    \`\${BASE}/brands/${slug}/about\`,
    \`\${BASE}/brands/${slug}/contact\`,
    ...products.map((p: any) => \`\${BASE}/brands/${slug}/products/\${p.id}\`),
    ...posts.map((p: any) => \`\${BASE}/brands/${slug}/blog/\${p.slug}\`),
  ];
  const body = \`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
\${urls.map((u) => \`  <url><loc>\${u}</loc></url>\`).join("\\n")}
</urlset>\`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
`
  ));

  return written;
}

async function ensureBrandDataLib() {
  const libPath = path.join(STUDIO_SRC, "lib/brand-data.ts");
  if (existsSync(libPath)) return libPath;
  const content = `/**
 * brand-data.ts — server-side data fetchers used by /brands/[slug]/* pages.
 * Pulls products from Printify, blog posts from filesystem, etc.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const PRINTIFY_API = "https://api.printify.com/v1";

interface PrintifyProduct {
  id: string;
  title: string;
  description?: string;
  visible?: boolean;
  images?: Array<{ src: string }>;
  variants?: Array<{ price: number; is_enabled: boolean }>;
  minPrice?: number | null;
}

async function fetchAllProducts(): Promise<PrintifyProduct[]> {
  const apiKey = process.env.PRINTIFY_API_KEY;
  if (!apiKey) return [];
  try {
    const sR = await fetch(\`\${PRINTIFY_API}/shops.json\`, {
      headers: { Authorization: \`Bearer \${apiKey}\` },
      next: { revalidate: 300 },
    });
    if (!sR.ok) return [];
    const shops = (await sR.json()) as Array<{ id: number }>;
    if (!shops.length) return [];
    const pR = await fetch(\`\${PRINTIFY_API}/shops/\${shops[0]!.id}/products.json?limit=100\`, {
      headers: { Authorization: \`Bearer \${apiKey}\` },
      next: { revalidate: 300 },
    });
    if (!pR.ok) return [];
    const data = (await pR.json()) as { data?: PrintifyProduct[] };
    return (data.data || []).filter((p) => p.visible !== false).map((p) => ({
      ...p,
      minPrice: (() => {
        const enabled = (p.variants || []).filter((v) => v.is_enabled);
        if (!enabled.length) return null;
        return Math.min(...enabled.map((v) => v.price));
      })(),
    }));
  } catch {
    return [];
  }
}

export async function fetchTenantProducts(_slug: string) {
  return await fetchAllProducts();
}

export async function fetchProduct(_slug: string, id: string) {
  const all = await fetchAllProducts();
  return all.find((p) => p.id === id) || null;
}

interface BlogPost { slug: string; title: string; date: string; meta_description: string; word_count: number; html: string; }

async function loadBlogDrafts(slug: string): Promise<BlogPost[]> {
  const dir = path.join(BIZ, slug, "blog-drafts");
  if (!existsSync(dir)) return [];
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
  const posts: BlogPost[] = [];
  for (const f of files) {
    try {
      const text = await fs.readFile(path.join(dir, f), "utf8");
      const fm = text.match(/^---([\\s\\S]+?)---/);
      if (!fm) continue;
      const meta: Record<string, string> = {};
      for (const line of fm[1]!.split("\\n")) {
        const m = line.match(/^(\\w+):\\s*"?(.+?)"?\\s*$/);
        if (m) meta[m[1]!] = m[2]!.replace(/^"|"$/g, "");
      }
      if (meta.status !== "live") continue; // only published posts
      const body = text.replace(/^---[\\s\\S]+?---/, "").trim();
      posts.push({
        slug: meta.slug || f.replace(/\\.md$/, ""),
        title: meta.title || "Untitled",
        date: meta.date || "",
        meta_description: meta.meta_description || "",
        word_count: parseInt(meta.word_count || "0", 10),
        html: body.replace(/\\n\\n/g, "</p><p>").replace(/^/, "<p>") + "</p>",
      });
    } catch {}
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchBlogPosts(slug: string) { return await loadBlogDrafts(slug); }
export async function fetchLatestBlogPosts(slug: string, n: number) { return (await loadBlogDrafts(slug)).slice(0, n); }
export async function fetchBlogPost(slug: string, postSlug: string) {
  const posts = await loadBlogDrafts(slug);
  return posts.find((p) => p.slug === postSlug) || null;
}

export async function fetchTenantAbout(slug: string): Promise<string> {
  const constPath = path.join(BIZ, slug, "CONSTITUTION.md");
  if (!existsSync(constPath)) return "<p>About info coming soon.</p>";
  const text = await fs.readFile(constPath, "utf8");
  const sec = text.match(/## What this business is\\s*\\n+([\\s\\S]+?)(\\n## |$)/);
  const body = (sec?.[1] || text.slice(0, 1500)).trim();
  return body.replace(/\\n\\n/g, "</p><p>").replace(/^/, "<p>") + "</p>";
}
`;
  await fs.mkdir(path.dirname(libPath), { recursive: true });
  await fs.writeFile(libPath, content);
  return libPath;
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);
  if (!ctx.constitution) throw new Error(`No CONSTITUTION.md for ${slug}`);

  console.log(`→ Building brand site for ${ctx.display_name}`);

  const libPath = await ensureBrandDataLib();
  console.log(`  ✓ brand-data lib at ${libPath}`);

  const written = await gen(slug, ctx);
  console.log(`  ✓ ${written.length} site files written`);

  // stripSlop the manifest tagline too, so /brands index also shows clean copy.
  const manifestTagline = stripSlop(ctx.identity?.positioning_statement || ctx.niche || "").cleaned;
  await updateBrandManifest(slug, ctx.display_name, manifestTagline);
  console.log(`  ✓ registered in the /brands directory`);

  await queueTelegram(env, slug,
    `🌐 *Brand site built — ${ctx.display_name}*\n\n${written.length} pages live:\n• home\n• products + product detail\n• blog + post pages\n• about + contact\n• sitemap.xml\n\nDeploy day14.us to see live: day14.us/brands/${slug}`
  );
  await audit(slug, { actor: "brand-site-builder", action: "site_generated", pages: written.length });
  console.log(`\n✓ ${written.length} files`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
