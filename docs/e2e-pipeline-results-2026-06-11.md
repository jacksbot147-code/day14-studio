# E2E pipeline test results — 2026-06-11

Run: 2026-06-11T00:09:59.104Z
Server: `http://localhost:3000`
Test slug: `e2e-test-1781136596953`
Test email: `e2e-1781136596953@day14.us`

## Summary
- Total checks: 7
- ✓ Passed: 6
- ✗ Failed: 1
- Status: 🔴 FAILURES

## preflight
- ✗ server reachable — status 404

## stripe
- ✓ webhook responded — status 400

## intake
- ✓ webhook responded — status 401

## cal
- ✓ webhook responded — status 401

## resend
- ✓ webhook responded — status 404

## verify
- ✓ work-register entries appended — before 64 → after 65
- ✓ telegram outbox cards queued — before 15 → after 15

## Notes
- If the server didn't respond, run `npm run dev` first.
- 401/403 responses on Stripe = signature mismatch (set STRIPE_WEBHOOK_SECRET in .env.local).
- 500s indicate webhook handler errors — check server console.
- Synthetic data uses slug `e2e-test-1781136596953` — delete after test if real Supabase rows were created.