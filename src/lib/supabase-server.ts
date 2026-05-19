/**
 * Server-side Supabase client (service-role key).
 *
 * Use this in webhook handlers + route handlers that need to bypass RLS.
 * NEVER import this into a Client Component or any file rendered in the browser.
 *
 * The service-role key has full admin access — it's in NEXT_PRIVATE_ env only.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  cached = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: { schema: "public" },
  });

  return cached;
}
