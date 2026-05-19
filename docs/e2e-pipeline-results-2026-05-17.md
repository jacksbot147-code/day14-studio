# E2E pipeline test results — 2026-05-17

Run: 2026-05-17T15:00:48.939Z
Server: `http://localhost:3000`
Test slug: `e2e-test-1779030047894`
Test email: `e2e-1779030047894@day14.us`

## Summary
- Total checks: 7
- ✓ Passed: 1
- ✗ Failed: 6
- Status: 🔴 FAILURES

## preflight
- ✗ server reachable — fetch failed

## stripe
- ✗ webhook responded — fetch failed

## intake
- ✗ webhook responded — fetch failed

## cal
- ✗ webhook responded — fetch failed

## resend
- ✗ webhook responded — fetch failed

## verify
- ✗ work-register entries appended — before 0 → after 0
- ✓ telegram outbox cards queued — before 0 → after 0

## Notes
- If the server didn't respond, run `npm run dev` first.
- 401/403 responses on Stripe = signature mismatch (set STRIPE_WEBHOOK_SECRET in .env.local).
- 500s indicate webhook handler errors — check server console.
- Synthetic data uses slug `e2e-test-1779030047894` — delete after test if real Supabase rows were created.