/**
 * Trusted client IP for rate limiting / throttling.
 *
 * SECURITY: never use the LEFTMOST `x-forwarded-for` hop — that value is
 * attacker-controlled (a client can send any `X-Forwarded-For`, and Vercel
 * APPENDS the real IP after it). Prefer `x-real-ip` (Vercel sets it to the true
 * client), and if only XFF is present use the LAST hop (the one the platform
 * added). Falls back to "anon" so a missing header can't crash a limiter.
 */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const real = req.headers.get("x-real-ip");
  if (real && real.trim()) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1]!;
  }
  return "anon";
}
