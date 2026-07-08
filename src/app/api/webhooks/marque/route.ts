/**
 * Marque ingest webhook — day14.us/api/webhooks/marque
 *
 * Receives lead / intake records mirrored from the Marque product app
 * (~/Claude/Projects/AdForge) and routes them into the Day14 data layer:
 * the shared brand-tagged Supabase `leads` table (migration 003), the
 * append-only `events` log, and the per-tenant `_shared` inbox that feeds
 * /admin/inbox. This is task 4/10 of the Marque → Day14 migration
 * (see AdForge/MIGRATE-TO-DAY14-2026-07-07.md + MIGRATION-DESIGN.md §3–5).
 *
 * CONTRACT (must match the Marque-side forwarder, AdForge
 * src/server/day14-ingest.ts, task 3):
 *   - AUTH: header `x-day14-signature` = HMAC-SHA256 hex of the exact raw
 *     JSON body, keyed by DAY14_INGEST_SECRET. Missing secret OR bad/absent
 *     signature ⇒ 401 (fail-safe: an unconfigured receiver rejects, never
 *     silently accepts).
 *   - BODY: a Day14IngestRecord — { brand, source, kind, external_id,
 *     email?, tier?, payload?, created_at? }. `external_id` (e.g.
 *     `marque:{kind}:{email}`) is the idempotency key.
 *
 * PERSISTENCE (design §3):
 *   - Lead kinds (waitlist | popup-* | checkout_intent | …) → `leads` row,
 *     upserted `on conflict (brand, external_id) do nothing`, + inbox
 *     `subscribe` drop.
 *   - `marque-intake` → `events` row (kind='marque-intake') + inbox
 *     `contact` drop.
 *   - `marque-ad-scored` → `events` row only (throughput signal, no inbox).
 *
 * SAFETY: Supabase writes are ENV-GATED. When NEXT_PUBLIC_SUPABASE_URL /
 * SUPABASE_SERVICE_ROLE_KEY are unset (e.g. this agent run, a preview with
 * no DB), the DB write is a graceful no-op-log — the route never crashes and
 * never touches a live DB with real keys. The inbox write is best-effort and
 * never throws. Idempotency is enforced twice: the createWebhookHandler
 * file-backed store (on external_id) short-circuits duplicates before this
 * handler runs, and the upsert `do nothing` is belt-and-braces at the DB.
 */

import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createWebhookHandler } from "@/lib/webhook-handler";
import { writeBrandInbox, type BrandInboxKind } from "@/lib/brand-inbox";
import { logSkillInvocation, logError } from "@/lib/work-register";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The header the Marque forwarder signs the body under (task 3). */
const SIGNATURE_HEADER = "x-day14-signature";

/** Event kinds that land in `events` (not the `leads` pool). */
const EVENT_KINDS = new Set(["marque-intake", "marque-ad-scored"]);

/**
 * Incoming record shape. Loose but structurally validated — `kind` is free
 * text (mirrors leads.kind / events.kind) so new lead types need no code
 * change. `email` is optional here; the handler requires it for lead kinds
 * (leads.email is NOT NULL) but not for event kinds.
 */
const ingestSchema = z.object({
  brand: z.string().min(1),
  source: z.string().min(1).optional(),
  kind: z.string().min(1),
  external_id: z.string().min(1),
  email: z.string().optional(),
  tier: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().optional(),
});

type IngestRecord = z.infer<typeof ingestSchema>;

/** True only when the service-role Supabase client can be constructed. */
function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export const POST = createWebhookHandler<typeof ingestSchema, { brand: string }, NextRequest>({
  source: "marque",

  // HMAC-SHA256 hex of the raw body under DAY14_INGEST_SECRET (fail-safe 401).
  verify: (req, body) => {
    const secret = process.env.DAY14_INGEST_SECRET;
    if (!secret) {
      // No secret configured ⇒ reject. An ingest receiver that can't
      // authenticate must never accept writes.
      return { ok: false, response: new Response("Ingest not configured", { status: 401 }) };
    }
    const sig = req.headers.get(SIGNATURE_HEADER);
    if (!sig) {
      return { ok: false, response: new Response("Missing signature", { status: 401 }) };
    }
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (!safeEqual(sig, expected)) {
      return { ok: false, response: new Response("Invalid signature", { status: 401 }) };
    }
    const brand = (req.headers.get("x-day14-brand") ?? "").trim() || "marque";
    return { ok: true, context: { brand } };
  },

  parse: (_req, body) => {
    try {
      return { ok: true, payload: JSON.parse(body) };
    } catch {
      return { ok: false, response: new Response("Invalid JSON body", { status: 400 }) };
    }
  },

  schema: ingestSchema,

  // Idempotency key — the record's external_id (namespaced by source="marque"
  // inside the factory), so a retried forward or re-run backfill never dupes.
  eventId: (payload) => payload.external_id,

  handle: async ({ payload }) => {
    const rec: IngestRecord = payload;
    const isEvent = EVENT_KINDS.has(rec.kind);

    // Lead rows require an email (leads.email is NOT NULL). Reject early,
    // before any write, regardless of DB config.
    if (!isEvent && !rec.email) {
      return new Response("Lead record missing email", { status: 400 });
    }

    const source = rec.source ?? "marque-app";
    const persisted = { leads: false, events: false };

    // ── 1. Supabase (env-gated; graceful no-op when unset) ──────────────────
    if (supabaseConfigured()) {
      try {
        const sb = supabaseAdmin();
        if (isEvent) {
          await sb.from("events").insert({
            customer_id: null,
            agent: "marque",
            kind: rec.kind,
            payload: {
              brand: rec.brand,
              source,
              external_id: rec.external_id,
              ...(rec.email ? { email: rec.email } : {}),
              ...(rec.payload ?? {}),
            },
            ...(rec.created_at ? { created_at: rec.created_at } : {}),
          });
          persisted.events = true;
        } else {
          await sb.from("leads").upsert(
            {
              brand: rec.brand,
              email: rec.email,
              kind: rec.kind,
              tier: rec.tier ?? null,
              source,
              external_id: rec.external_id,
              payload: rec.payload ?? {},
              ...(rec.created_at ? { created_at: rec.created_at } : {}),
            },
            { onConflict: "brand,external_id", ignoreDuplicates: true }
          );
          persisted.leads = true;
        }
      } catch (err) {
        // A DB failure must not 500 the ingest — the Marque forwarder is
        // fire-and-forget and the backfill script reconciles gaps. Log + carry
        // on to the inbox write (the admin-visible signal).
        await logError("marque-ingest", err, `marque-ingest:${rec.kind}`, "supabase write failed");
      }
    } else {
      console.log(
        `[marque-ingest] Supabase unconfigured — skipping DB write for ${rec.kind} (${rec.external_id})`
      );
    }

    // ── 2. Per-tenant inbox (best-effort; feeds /admin/inbox) ───────────────
    // Lead kinds → 'subscribe'; marque-intake → 'contact'; ad-scored → none.
    const inboxKind: BrandInboxKind | null = isEvent
      ? rec.kind === "marque-intake"
        ? "contact"
        : null
      : "subscribe";

    let inbox = false;
    if (inboxKind) {
      const result = await writeBrandInbox({
        tenant: rec.brand,
        kind: inboxKind,
        payload: {
          source,
          external_id: rec.external_id,
          ...(rec.email ? { email: rec.email } : {}),
          ...(isEvent ? { intake_kind: rec.kind } : { lead_kind: rec.kind }),
          ...(rec.tier ? { tier: rec.tier } : {}),
          ...(rec.payload ?? {}),
        },
      });
      inbox = result.ok;
      if (!result.ok) {
        console.log(
          `[marque-ingest] inbox write failed for ${rec.external_id}: ${result.error ?? "unknown"}`
        );
      }
    }

    await logSkillInvocation("marque-ingest", `marque-ingest:${rec.kind}`);

    return Response.json({
      received: true,
      brand: rec.brand,
      kind: rec.kind,
      persisted,
      inbox,
    });
  },
});

// ============================================================
// Constant-time signature compare (matches intake route's helper)
// ============================================================

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
