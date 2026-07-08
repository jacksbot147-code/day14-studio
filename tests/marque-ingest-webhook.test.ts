/**
 * Tests for the Marque ingest webhook — src/app/api/webhooks/marque/route.ts
 * (task 4/10 of the Marque → Day14 migration).
 *
 * Focus (per task spec): secret-reject + payload-parse. No live DB is touched —
 * Supabase env is left unset so the handler exercises its graceful no-op-log
 * path, and HOME is swapped to a temp dir so both the createWebhookHandler
 * idempotency store and the best-effort inbox write stay inside the sandbox.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const SECRET = "test-ingest-secret";
const SIGNATURE_HEADER = "x-day14-signature";

let TMP_HOME: string;

async function freshPost() {
  vi.resetModules();
  const mod = await import("../src/app/api/webhooks/marque/route");
  return mod.POST as (req: Request) => Promise<Response>;
}

function sign(body: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function makeRequest(record: unknown, opts: { sig?: string | null } = {}): Request {
  const body = typeof record === "string" ? record : JSON.stringify(record);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-day14-brand": "marque",
  };
  const sig = opts.sig === undefined ? sign(body) : opts.sig;
  if (sig !== null) headers[SIGNATURE_HEADER] = sig;
  return new Request("http://localhost/api/webhooks/marque", {
    method: "POST",
    headers,
    body,
  });
}

const leadRecord = {
  brand: "marque",
  source: "marque-app",
  kind: "waitlist",
  external_id: "marque:waitlist:test@example.com",
  email: "test@example.com",
};

beforeEach(async () => {
  TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "marque-ingest-"));
  process.env.HOME = TMP_HOME;
  process.env.DAY14_INGEST_SECRET = SECRET;
  // Leave Supabase unset so the DB write is a graceful no-op (no live keys).
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

afterEach(async () => {
  await fs.rm(TMP_HOME, { recursive: true, force: true });
  delete process.env.DAY14_INGEST_SECRET;
});

describe("marque ingest webhook — secret rejection", () => {
  test("bad signature → 401", async () => {
    const POST = await freshPost();
    const res = await POST(makeRequest(leadRecord, { sig: "deadbeef" }));
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Invalid signature");
  });

  test("missing signature header → 401", async () => {
    const POST = await freshPost();
    const res = await POST(makeRequest(leadRecord, { sig: null }));
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Missing signature");
  });

  test("secret unset on receiver → 401 (fail-safe), even with a plausible sig", async () => {
    delete process.env.DAY14_INGEST_SECRET;
    const POST = await freshPost();
    const res = await POST(makeRequest(leadRecord));
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Ingest not configured");
  });

  test("signature computed under the wrong secret → 401", async () => {
    const POST = await freshPost();
    const body = JSON.stringify(leadRecord);
    const res = await POST(
      new Request("http://localhost/api/webhooks/marque", {
        method: "POST",
        headers: { [SIGNATURE_HEADER]: sign(body, "not-the-secret") },
        body,
      })
    );
    expect(res.status).toBe(401);
  });
});

describe("marque ingest webhook — payload parse & routing", () => {
  test("valid signed lead → 200, no-op DB (Supabase unset), inbox 'subscribe' written", async () => {
    const POST = await freshPost();
    const res = await POST(makeRequest(leadRecord));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      received: true,
      brand: "marque",
      kind: "waitlist",
      persisted: { leads: false, events: false },
      inbox: true,
    });

    // Inbox drop landed under the temp HOME as a *-subscribe.json file.
    const inboxDir = path.join(TMP_HOME, "Documents/businesses/marque/inbox");
    const files = await fs.readdir(inboxDir);
    const subscribe = files.find((f) => f.endsWith("-subscribe.json"));
    expect(subscribe).toBeTruthy();
    const rec = JSON.parse(await fs.readFile(path.join(inboxDir, subscribe!), "utf8"));
    expect(rec.tenant).toBe("marque");
    expect(rec.kind).toBe("subscribe");
    expect(rec.payload).toMatchObject({ email: "test@example.com", lead_kind: "waitlist" });
  });

  test("marque-intake → routed to inbox 'contact' (event kind, no email required)", async () => {
    const POST = await freshPost();
    const intake = {
      brand: "marque",
      source: "marque-app",
      kind: "marque-intake",
      external_id: "marque:intake:abc123",
      payload: { marque_intake_id: "abc123", name: "Everdew", url: "https://everdew.example" },
    };
    const res = await POST(makeRequest(intake));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: true, kind: "marque-intake", inbox: true });

    const inboxDir = path.join(TMP_HOME, "Documents/businesses/marque/inbox");
    const files = await fs.readdir(inboxDir);
    expect(files.some((f) => f.endsWith("-contact.json"))).toBe(true);
  });

  test("marque-ad-scored → event kind, no inbox drop", async () => {
    const POST = await freshPost();
    const scored = {
      brand: "marque",
      source: "marque-app",
      kind: "marque-ad-scored",
      external_id: "marque:ad-scored:job-9",
      payload: { intake_id: "abc123", overall: 82 },
    };
    const res = await POST(makeRequest(scored));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ kind: "marque-ad-scored", inbox: false });
  });

  test("invalid JSON body → 400", async () => {
    const POST = await freshPost();
    const res = await POST(makeRequest("{not json", { sig: sign("{not json") }));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid JSON body");
  });

  test("missing required field (external_id) → 400 (zod)", async () => {
    const POST = await freshPost();
    const bad = { brand: "marque", kind: "waitlist", email: "x@example.com" };
    const res = await POST(makeRequest(bad));
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Invalid marque payload");
  });

  test("lead kind without email → 400", async () => {
    const POST = await freshPost();
    const noEmail = {
      brand: "marque",
      kind: "waitlist",
      external_id: "marque:waitlist:noemail",
    };
    const res = await POST(makeRequest(noEmail));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Lead record missing email");
  });
});
