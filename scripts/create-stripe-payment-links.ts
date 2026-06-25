/**
 * create-stripe-payment-links.ts — one-shot Stripe Payment Link creator.
 *
 * Creates a one-time "build" Payment Link for each payable service tier
 * (Spark / Local / Portal — Platform is quote-only) using the amounts straight
 * from src/lib/pricing.ts, then prints the env lines to paste into .env.local.
 *
 * WHY A SCRIPT (not done by the agent): per the Day14 prime directives, Stripe
 * is never called with live keys from agent code — the operator runs this. It
 * only CREATES checkout objects (products / prices / payment links); it never
 * moves money, and everything it makes can be archived from the Stripe
 * dashboard. Uses the Stripe REST API via fetch (no SDK dependency).
 *
 * RUN (from ~/Documents/studio, with the secret key loaded):
 *   set -a && source .env.local && set +a && npx tsx scripts/create-stripe-payment-links.ts
 *
 * A test key (sk_test_…) creates test-mode links; a live key (sk_live_…) creates
 * live ones. Then add the printed lines to .env.local and rebuild.
 *
 * NOTE: this creates the one-time BUILD payment link per tier (the entry
 * purchase). Recurring monthly billing is a follow-up (a recurring price +
 * subscription), intentionally not bundled here.
 */

import { SERVICE_TIERS } from "../src/lib/pricing";

const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY) {
  console.error(
    "✗ STRIPE_SECRET_KEY not found in the environment.\n" +
      "  Run: set -a && source .env.local && set +a && npx tsx scripts/create-stripe-payment-links.ts",
  );
  process.exit(1);
}

const mode = KEY.startsWith("sk_live_") ? "LIVE" : "test";

async function stripe(
  path: string,
  params: Record<string, string>,
): Promise<{ id: string; url?: string }> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  const json = (await res.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.id) {
    throw new Error(`${path}: ${json.error?.message ?? `HTTP ${res.status}`}`);
  }
  return json as { id: string; url?: string };
}

async function main() {
  const payable = SERVICE_TIERS.filter(
    (t) => t.setup !== null && t.paymentLinkEnv,
  );
  console.log(
    `\nStripe mode: ${mode}\nCreating ${payable.length} one-time build payment links...\n`,
  );

  const envLines: string[] = [];
  for (const t of payable) {
    const product = await stripe("products", {
      name: `Day14 ${t.name} — build`,
      description: t.tagline,
    });
    const price = await stripe("prices", {
      product: product.id,
      currency: "usd",
      unit_amount: String((t.setup as number) * 100),
    });
    const link = await stripe("payment_links", {
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": "1",
    });
    if (!link.url) throw new Error(`${t.name}: payment link has no url`);
    console.log(`✓ ${t.name.padEnd(7)} $${t.setup}  →  ${link.url}`);
    envLines.push(`${t.paymentLinkEnv}=${link.url}`);
  }

  console.log(`\nAdd these to .env.local, then rebuild + redeploy:\n`);
  console.log(envLines.join("\n"));
  console.log("");
}

main().catch((e: unknown) => {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});
