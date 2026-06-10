/**
 * printify.ts — shared, request-deduped Printify accessors for the
 * hot-flash-co pages.
 *
 * The homepage, /products, and /products/[id] (page + generateMetadata)
 * all need the same Printify product list. React cache() dedupes those
 * calls within a single render pass; cross-request caching comes from
 * the underlying fetch() in src/lib/brand-data.ts, which uses
 * `next: { revalidate: 300 }` — a 5-minute data-cache window.
 *
 * Pages that use these helpers also export `revalidate = 300` so the
 * rendered HTML itself is ISR'd on the same window.
 */
import { cache } from "react";
import { fetchTenantProducts, fetchProduct } from "@/lib/brand-data";

export const getHotFlashProducts = cache(async () => {
  return await fetchTenantProducts("hot-flash-co");
});

export const getHotFlashProduct = cache(async (id: string) => {
  return await fetchProduct("hot-flash-co", id);
});
