/**
 * Signed, expiring admin session tokens.
 *
 * Replaces the old static `sha256Hex(ADMIN_PASSWORD + ":day14-admin")`
 * cookie (replayable forever, no expiry) with an HMAC-signed token that
 * carries its own issued-at + TTL and is verified in constant time.
 *
 * Token shape (cookie value):  `<issuedAtMs>|<ttlMs>|<sigHex>`
 *   sig = HMAC-SHA256(ADMIN_SESSION_SECRET, "<issuedAtMs>|<ttlMs>")
 *
 * Uses the Web Crypto API only (crypto.subtle), so the exact same code
 * runs in BOTH the Edge middleware and the Node API route with no
 * runtime split.
 *
 * Backward-safe: callers fall back to the legacy static scheme when
 * ADMIN_SESSION_SECRET is unset (see legacyToken), so nothing breaks
 * before Jack sets the new env var.
 */

const ENCODER = new TextEncoder();

export const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, ENCODER.encode(message));
  return toHex(sig);
}

/** Constant-time string comparison — no early-exit on first mismatch. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Mint a signed session token valid for `ttlMs` from `now`. */
export async function signSession(
  secret: string,
  ttlMs: number = DEFAULT_TTL_MS,
  now: number = Date.now(),
): Promise<string> {
  const payload = `${now}|${ttlMs}`;
  const sig = await hmacHex(secret, payload);
  return `${payload}|${sig}`;
}

/**
 * Verify a signed session token: signature must match (constant-time)
 * AND the token must not be expired. Returns false for any malformed,
 * tampered, or stale token.
 */
export async function verifySession(
  secret: string,
  token: string | undefined | null,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split("|");
  if (parts.length !== 3) return false;
  const [issuedAtStr, ttlStr, sig] = parts;
  if (!issuedAtStr || !ttlStr || !sig) return false;
  const issuedAt = Number(issuedAtStr);
  const ttlMs = Number(ttlStr);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(ttlMs) || ttlMs <= 0) {
    return false;
  }
  const expected = await hmacHex(secret, `${issuedAtStr}|${ttlStr}`);
  if (!timingSafeEqual(sig, expected)) return false;
  if (now >= issuedAt + ttlMs) return false; // expired
  return true;
}

/**
 * Legacy static token — the pre-hardening scheme. Used only as a
 * fallback when ADMIN_SESSION_SECRET is unset, so existing localhost
 * usage keeps working before Jack rotates in the new secret.
 */
export async function legacyToken(password: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    ENCODER.encode(password + ":day14-admin"),
  );
  return toHex(buf);
}
