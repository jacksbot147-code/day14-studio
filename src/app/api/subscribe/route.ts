import { NextRequest, NextResponse } from "next/server";
import { subscribe } from "@/lib/mailerlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  let email = "";
  let source = "";
  let groupId: string | undefined;

  if (ct.includes("application/json")) {
    const body = (await req.json()) as { email?: string; source?: string; groupId?: string };
    email = body.email || "";
    source = body.source || "";
    groupId = body.groupId;
  } else {
    const form = await req.formData();
    email = String(form.get("email") || "");
    source = String(form.get("source") || "");
    const g = form.get("groupId");
    if (g) groupId = String(g);
  }

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }

  const result = await subscribe({ email, source, groupId });

  // If the request came from a form (no JSON), redirect to a thank-you page
  if (!ct.includes("application/json")) {
    const url = new URL(result.ok ? "/newsletter/thanks" : "/newsletter?error=1", req.url);
    return NextResponse.redirect(url, 303);
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
