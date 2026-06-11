# E2E pipeline test results — 2026-06-10

Run: 2026-06-10T03:26:44.731Z
Server: `http://localhost:3000`
Test slug: `e2e-test-1781061999622`
Test email: `e2e-1781061999622@day14.us`

## Summary
- Total checks: 7
- ✓ Passed: 4
- ✗ Failed: 3
- Status: 🔴 FAILURES

## preflight
- ✗ server reachable — status 404

## stripe
- ✗ webhook responded — status 500

## intake
- ✓ webhook responded — status 401

## cal
- ✓ webhook responded — status 401

## resend
- ✓ webhook responded — status 404

## verify
- ✗ work-register entries appended — before 38 → after 38
- ✓ telegram outbox cards queued — before 8 → after 8

## Notes
- If the server didn't respond, run `npm run dev` first.
- 401/403 responses on Stripe = signature mismatch (set STRIPE_WEBHOOK_SECRET in .env.local).
- 500s indicate webhook handler errors — check server console.
- Synthetic data uses slug `e2e-test-1781061999622` — delete after test if real Supabase rows were created.