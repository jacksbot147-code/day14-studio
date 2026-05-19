import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return NextResponse.json({ ok: false, error: "ADMIN_PASSWORD not configured" }, { status: 503 });

  const form = await req.formData();
  const submitted = String(form.get("password") || "");
  const next = String(form.get("next") || "/admin");

  if (submitted !== password) {
    return NextResponse.redirect(new URL(`/admin/login?error=1&next=${encodeURIComponent(next)}`, req.url), 303);
  }

  const sessionToken = await sha256Hex(password + ":day14-admin");
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set("admin-session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url), 303);
  res.cookies.delete("admin-session");
  return res;
}
