/**
 * agent-deck/types — the tenant-scoped domain contract for the Agent Command Deck.
 *
 * This is the stable interface every surface speaks: Jack's god-view, a Platform
 * customer's scoped view, the read API, and the write path. Storage lives behind
 * DeckRepository (file-backed today, Supabase later) so the contract never moves.
 *
 * Tenant model:
 *   tenant === null  → the god-view ("admin of admins"): every agent, all taps.
 *   tenant === slug  → one business's scoped view: only that tenant's data.
 */

export type AgentKind = "daemon" | "employee";
export type AgentStatus = "healthy" | "down" | "stale" | "unknown";
export type TapKind = "todo" | "tap";
export type Priority = "critical" | "high" | "medium" | "low";
export type Posture = "nominal" | "attention";

export interface AgentRow {
  name: string;
  kind: AgentKind;
  status: AgentStatus;
  /** Minutes since last sign of life (heartbeat / log mtime); null = no telemetry. */
  ageMin: number | null;
  /** Most recent action attributed to this agent, if any. */
  lastAction?: string;
  lastActionTs?: string;
  /** Owning tenant when the agent is tenant-specific (e.g. a vertical agent). */
  tenant?: string;
}

export interface TapItem {
  id: string;
  kind: TapKind;
  title: string;
  detail?: string;
  priority: Priority;
  tenant?: string;
  /** P1/P2/P3 for outbox taps. */
  urgency?: string;
}

export interface PriorityItem {
  tier?: string;
  label: string;
  action?: string;
}

export interface ActivityItem {
  ts?: string;
  actor?: string;
  action?: string;
  tenant?: string;
  error?: boolean;
}

export interface DriftRow {
  tenant: string;
  score: string;
  drift: string;
}

export interface DeckSummary {
  daemonsHealthy: number;
  daemonsTotal: number;
  tapsAwaiting: number;
  employeesStale: number;
  employeesTotal: number;
}

export interface DeckState {
  /** null = god-view across all tenants; otherwise the scoped tenant slug. */
  tenant: string | null;
  generatedAt: string | null;
  posture: Posture;
  agents: AgentRow[];
  taps: TapItem[];
  priorities: PriorityItem[];
  activity: ActivityItem[];
  drift: DriftRow[];
  summary: DeckSummary;
  newestBriefFile: string | null;
}

export interface TapResult {
  ok: boolean;
  message: string;
  /** Suggested HTTP status (403 not-authorized, 400 invalid, 404 missing, 500 save-fail). */
  code?: number;
}

/** Per-tenant white-label identity for the deck (name + accent color). */
export interface TenantBrand {
  name: string;
  accent: string;
}

/**
 * The storage boundary. A file-backed adapter implements this today; a Supabase
 * adapter implements the same shape when customers need hosted isolation —
 * nothing above this interface changes.
 */
export interface DeckRepository {
  /** Read the deck state for a tenant (null = god-view). */
  getState(tenant: string | null): Promise<DeckState>;
  /**
   * Resolve a tap. `tenant` scopes authority: a customer (non-null tenant) may
   * only resolve taps that belong to their tenant; the god-view (null) may
   * resolve anything. Every call is audit-logged by the adapter.
   */
  resolveTap(
    tenant: string | null,
    kind: TapKind,
    id: string,
    decision: "approve" | "deny",
  ): Promise<TapResult>;
}

export const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function normalizePriority(p: string | undefined): Priority {
  const v = (p || "").toLowerCase();
  if (v === "critical") return "critical";
  if (v === "high" || v === "urgent") return "high";
  if (v === "low") return "low";
  return "medium";
}
