/**
 * mailerlite.ts — minimal MailerLite Classic API v3 client.
 *
 * Env vars required:
 *   MAILERLITE_API_KEY            (from mailerlite.com → Integrations → API)
 *   MAILERLITE_DEFAULT_GROUP_ID   (group ID for the main newsletter list)
 *
 * Per-source/per-vertical groups can be passed as `groupId` arg.
 */

const API_BASE = "https://connect.mailerlite.com/api";

export interface SubscribeInput {
  email: string;
  groupId?: string;
  fields?: Record<string, string>; // first_name, last_name, etc.
  source?: string; // free-form for analytics
}

export interface SubscribeResult {
  ok: boolean;
  subscriber_id?: string;
  status?: "active" | "unconfirmed" | "unsubscribed" | "bounced" | "junk";
  error?: string;
  alreadyExists?: boolean;
}

export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) return { ok: false, error: "MAILERLITE_API_KEY not configured" };

  const groupId = input.groupId || process.env.MAILERLITE_DEFAULT_GROUP_ID;
  const body: Record<string, unknown> = {
    email: input.email,
    fields: input.fields || {},
  };
  if (groupId) body.groups = [groupId];
  if (input.source) body.fields = { ...(body.fields as object), source: input.source };

  const res = await fetch(`${API_BASE}/subscribers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 200 || res.status === 201) {
    const data = (await res.json()) as { data?: { id: string; status: string } };
    return {
      ok: true,
      subscriber_id: data.data?.id,
      status: data.data?.status as SubscribeResult["status"],
      alreadyExists: res.status === 200,
    };
  }

  let errText = "";
  try { errText = await res.text(); } catch {}
  return { ok: false, error: `MailerLite ${res.status}: ${errText.slice(0, 200)}` };
}
