/**
 * webhook-handler — shared factory for the /api/webhooks/* routes.
 *
 * Each route supplies:
 *   - source   : name for logging / idempotency namespacing
 *   - verify   : signature verification (preserved exactly per route)
 *   - parse    : raw body → candidate payload object
 *   - schema   : zod schema the payload must satisfy (loose by design —
 *                schemas validate shape, they don't change behavior for
 *                payloads the old hand-rolled routes accepted)
 *   - eventId  : derive a stable per-source event id (defaults to a
 *                sha256 of the raw body)
 *   - handle   : the route's existing business logic, unchanged
 *
 * The factory adds file-backed idempotency: processed event ids are
 * persisted to ~/Documents/businesses/_shared/poller/webhook-processed-ids.jsonl
 * (last 5000 kept). Duplicate deliveries short-circuit with a 200
 * { received: true, duplicate: true } before any business logic runs.
 * Ids are only recorded after the handler returns a 2xx, so failed
 * deliveries stay retryable — behavior for first-delivery events is
 * unchanged.
 */

import { z } from "zod";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import { logError } from "./work-register";

// ---- verify / parse step results ----
// Steps either succeed with a value or short-circuit with the exact
// Response the legacy route would have returned (status codes and
// bodies are preserved verbatim by each route's callbacks).

export type VerifyResult<V> = { ok: true; context: V } | { ok: false; response: Response };
export type ParseResult = { ok: true; payload: unknown } | { ok: false; response: Response };

export interface WebhookHandlerOptions<
  S extends z.ZodType,
  V,
  Req extends Request = Request,
> {
  source: string;
  verify: (req: Req, body: string) => Promise<VerifyResult<V>> | VerifyResult<V>;
  parse: (req: Req, body: string, verified: V) => Promise<ParseResult> | ParseResult;
  schema: S;
  /** Derive the idempotency id. Defaults to sha256(raw body). */
  eventId?: (payload: z.infer<S>, verified: V, body: string) => string;
  handle: (ctx: {
    req: Req;
    body: string;
    payload: z.infer<S>;
    verified: V;
    eventId: string;
  }) => Promise<Response>;
}

// ============================================================
// Idempotency store (file-backed, last MAX_PROCESSED_IDS kept)
// ============================================================

const MAX_PROCESSED_IDS = 5000;

interface ProcessedStore {
  filePath: string;
  ids: Set<string>;
  order: string[]; // insertion order, for compaction
}

let store: ProcessedStore | null = null;

function processedIdsPath(): string {
  // Computed at call time so tests can point HOME at a tmp dir.
  return path.join(
    homedir(),
    "Documents/businesses/_shared/poller/webhook-processed-ids.jsonl"
  );
}

async function getStore(): Promise<ProcessedStore> {
  const filePath = processedIdsPath();
  if (store && store.filePath === filePath) return store;

  const ids = new Set<string>();
  const order: string[] = [];
  try {
    const text = await fs.readFile(filePath, "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line) as { key?: string };
        if (rec.key && !ids.has(rec.key)) {
          ids.add(rec.key);
          order.push(rec.key);
        }
      } catch {
        // skip malformed line
      }
    }
  } catch {
    // no file yet — empty store
  }
  store = { filePath, ids, order };
  return store;
}

async function isDuplicate(source: string, eventId: string): Promise<boolean> {
  const s = await getStore();
  return s.ids.has(`${source}:${eventId}`);
}

async function markProcessed(source: string, eventId: string): Promise<void> {
  const s = await getStore();
  const key = `${source}:${eventId}`;
  if (s.ids.has(key)) return;
  s.ids.add(key);
  s.order.push(key);

  try {
    await fs.mkdir(path.dirname(s.filePath), { recursive: true });
    if (s.order.length > MAX_PROCESSED_IDS) {
      // Compact: keep the newest MAX_PROCESSED_IDS entries
      s.order = s.order.slice(-MAX_PROCESSED_IDS);
      s.ids = new Set(s.order);
      const lines = s.order
        .map((k) => JSON.stringify({ key: k }))
        .join("\n");
      await fs.writeFile(s.filePath, lines + "\n", "utf8");
    } else {
      await fs.appendFile(
        s.filePath,
        JSON.stringify({ key, ts: new Date().toISOString() }) + "\n",
        "utf8"
      );
    }
  } catch (err) {
    // Persistence failure must not fail the webhook — Supabase-level
    // idempotency in each handler still covers duplicates.
    await logError("webhook-handler", err, `webhook-${source}`, "failed to persist processed id");
  }
}

function sha256(body: string): string {
  return crypto.createHash("sha256").update(body).digest("hex");
}

// ============================================================
// Factory
// ============================================================

export function createWebhookHandler<
  S extends z.ZodType,
  V,
  Req extends Request = Request,
>(options: WebhookHandlerOptions<S, V, Req>): (req: Req) => Promise<Response> {
  const { source, verify, parse, schema, handle } = options;

  return async function webhookHandler(req: Req): Promise<Response> {
    // 1. Raw body (needed for signature verification)
    const body = await req.text();

    // 2. Signature verification — preserved exactly per route
    const verified = await verify(req, body);
    if (!verified.ok) return verified.response;

    // 3. Parse raw body into a candidate payload
    const parsed = await parse(req, body, verified.context);
    if (!parsed.ok) return parsed.response;

    // 4. Validate with zod
    const validation = schema.safeParse(parsed.payload);
    if (!validation.success) {
      const issues = validation.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      await logError(
        "webhook-handler",
        `invalid ${source} payload: ${issues}`,
        `webhook-${source}`
      );
      return new Response(`Invalid ${source} payload: ${issues}`, { status: 400 });
    }
    const payload = validation.data as z.infer<S>;

    // 5. Idempotency — skip duplicates with a 200
    const eventId = options.eventId
      ? options.eventId(payload, verified.context, body)
      : sha256(body);
    if (await isDuplicate(source, eventId)) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "content-type": "application/json" },
      });
    }

    // 6. Run the route's business logic (unchanged)
    let response: Response;
    try {
      response = await handle({ req, body, payload, verified: verified.context, eventId });
    } catch (err) {
      // Log, then rethrow — control flow (Next.js 500) is unchanged
      await logError(`webhook-${source}`, err, `webhook-${source}`, "handler threw");
      throw err;
    }

    // 7. Only mark processed on success so failures stay retryable
    if (response.status >= 200 && response.status < 300) {
      await markProcessed(source, eventId);
    }
    return response;
  };
}
