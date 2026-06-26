/**
 * /app/[tenant]/agents — a Platform customer's scoped Command Deck.
 *
 * The exact same deck a customer would see in their own login: ONLY their
 * business's agents, taps, and activity — getDeck(tenant) through the same
 * service + DeckView as the god-view. The tenant comes from the route (server-
 * side), never the client. Today this is gated like the rest of /app (admin /
 * localhost) so Jack can preview any customer's lens; real per-customer auth
 * (each customer sees only their own slug) is the next phase.
 */

import { notFound } from "next/navigation";
import { getDeck, getTenantBrand, isKnownTenant } from "@/lib/agent-deck";
import { DeckView } from "@/app/dashboard/agents/deck-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TenantDeckPage({ params }: { params: { tenant: string } }) {
  const slug = params.tenant;
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug) || !(await isKnownTenant(slug))) notFound();
  const [state, brand] = await Promise.all([getDeck(slug), getTenantBrand(slug)]);
  return (
    <DeckView
      state={state}
      brand={brand}
      audience="owner"
      endpoint={`/api/app/${slug}/agents/approve`}
      backHref="/dashboard/agents"
      backLabel="God-view"
    />
  );
}
