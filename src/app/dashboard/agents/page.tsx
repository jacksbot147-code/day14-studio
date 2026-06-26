/**
 * /dashboard/agents — the Agent Command Deck, god-view (admin of admins).
 *
 * Thin: pulls the full-fleet DeckState (tenant = null) from the tenant-scoped
 * service and hands it to the shared <DeckView>. A customer's scoped view
 * (/app/[tenant]/agents) renders the exact same component with getDeck(slug).
 */

import { getDeck } from "@/lib/agent-deck";
import { DeckView } from "./deck-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AgentDeckPage() {
  const state = await getDeck(null);
  return (
    <DeckView
      state={state}
      scopeLabel="all tenants"
      endpoint="/api/dashboard/agents/approve"
      backHref="/dashboard"
      backLabel="Empire"
    />
  );
}
