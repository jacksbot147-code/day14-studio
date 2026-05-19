import { fetchTenantProducts, fetchBlogPosts } from "@/lib/brand-data";

export const dynamic = "force-dynamic";

const BASE = "https://day14.us";

export async function GET() {
  const products = await fetchTenantProducts("hot-flash-co");
  const posts = await fetchBlogPosts("hot-flash-co");
  const urls = [
    `${BASE}/brands/hot-flash-co/`,
    `${BASE}/brands/hot-flash-co/products`,
    `${BASE}/brands/hot-flash-co/blog`,
    `${BASE}/brands/hot-flash-co/about`,
    `${BASE}/brands/hot-flash-co/contact`,
    ...products.map((p: any) => `${BASE}/brands/hot-flash-co/products/${p.id}`),
    ...posts.map((p: any) => `${BASE}/brands/hot-flash-co/blog/${p.slug}`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
