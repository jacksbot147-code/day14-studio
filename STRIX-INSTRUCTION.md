# Strix rules of engagement — Day14 studio

You are pentesting a Next.js app **owned by the operator** (authorized). White-box, source-aware.
Goal: find and validate real vulnerabilities with PoCs, prioritize by impact, propose fixes.

## Scope
- IN: this repository's code (src/app/api/*, src/app/admin/*, src/middleware.ts, src/lib/*).
- OUT / DO NOT: do not call third-party production APIs (Supabase, Stripe, Cal, LLM providers) with real
  keys; do not send emails/messages; no destructive tests on live data or production `_shared`/Supabase;
  redact any secret you find (report file+line, not the value).

## Highest-priority focus
1. **Admin authentication** — `src/app/api/admin/auth/route.ts`, `src/app/admin/login/page.tsx`,
   `src/middleware.ts`. This gates the whole `/admin` empire (leads, finance, tenants). Test: password
   compare timing/brute-force, session cookie flags (httpOnly, Secure, SameSite), session fixation,
   middleware auth-bypass (path tricks, matcher gaps), and whether any `/admin/*` or `/api/admin/*`
   route is reachable unauthenticated.
2. **Webhook signature verification** — `src/app/api/webhooks/{marque,stripe,cal,inbound,intake}/route.ts`.
   Each ingests external data. Verify EACH validates its signature/secret (marque = HMAC over raw body
   via DAY14_INGEST_SECRET; stripe = Stripe sig; others). Test: unsigned/forged payloads, replay,
   body-mutation-after-verify, and whether a bad sig can still write to Supabase / trigger dispatch().
3. **Supabase / service_role exposure** — anywhere the service_role key is used server-side: confirm it
   NEVER reaches a client bundle or client component, RLS is deny-by-default (leads/customers/events),
   and no route lets a client read cross-tenant rows.
4. **Injection & untrusted parsing** — `api/realty/upload-csv` (CSV injection / formula injection / DoS),
   `api/chat` + `api/jarvis` + `api/brands/life-loophole/advisor*` (LLM prompt injection, SSRF/tool
   abuse, unbounded cost), `api/intake` + `api/preview-lead` + `api/subscribe` + `api/brands/[slug]/*`
   (input validation, spam, injection).
5. **Access control / IDOR** — `api/admin/approvals`, `api/agents/state`, `[tenant]/agents/approve`,
   `api/dashboard/agents/approve`, `api/brands/[slug]/*`. Can one tenant act on another's data? Can an
   unauthenticated/low-priv caller approve agent actions or read another brand's leads?
6. **File/asset routes** — `api/preview-asset`, `api/realty/upload-csv` uploads: path traversal,
   content-type confusion, arbitrary read/write.

## Deliverable
Validated findings with PoC + repro + severity, grouped by the areas above, with a concrete fix each.
Be honest about false-positive-prone items and anything untestable without live third-party creds.
Do NOT modify or commit code — findings + fix recommendations only (the operator's agent applies fixes).
