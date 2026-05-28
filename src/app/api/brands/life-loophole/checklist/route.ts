/**
 * Life Loophole — lead-magnet checklist endpoint.
 *
 * The "Send me the checklist" form on /brands/life-loophole POSTs here with
 * an email. We:
 *   1. Land the lead in the per-tenant inbox so /admin/inbox sees it (the
 *      gap this route closes — previously the form had no server-side
 *      destination at all).
 *   2. Best-effort newsletter signup via MailerLite, tagged with the
 *      brand source so the checklist drip can pick it up.
 *
 * Always responds 200 with a small JSON payload so the client can show
 * "you are on the list" regardless of downstream success. Failures are
 * logged but do not surface to the visitor.
 */

import { NextRequest, NextResponse } from "next/server";
import { subscribe } from "@/lib/mailerlite";
import { writeBrandInbox } from "@/lib/brand-inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TENANT = "life-loophole";

interface ChecklistBody {
  email?: string;
}

export async function POST(req: NextRequest) {
  let email = "";
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = (await req.json().catch(() => ({}))) as ChecklistBody;
      email = (body.email || "").trim();
    } else {
      const form = await req.formData();
      email = String(form.get("email") || "").trim();
    }
  } catch {
    // Fall through with empty email — handled below.
  }

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "invalid email" },
      { status: 400 },
    );
  }

  // Land in the inbox first — that is the source of truth for /admin/inbox.
  const inboxResult = await writeBrandInbox({
    tenant: TENANT,
    kind: "checklist",
    payload: { email, source: "life-loophole-checklist" },
  });
  if (!inboxResult.ok) {
    console.log(
      `[life-loophole-checklist] inbox write failed: ${inboxResult.error || "unknown"}`,
    );
  }

  // Best-effort drip handoff. Never blocks the user response.
  const result = await subscribe({
    email,
    source: `brand:${TENANT}:checklist`,
  });
  if (!result.ok) {
    console.log(`[life-loophole-checklist] mailerlite failed`);
  }

  return NextResponse.json(
    { ok: true, inbox: inboxResult.ok, subscribed: result.ok },
    { status: 200 },
  );
}
