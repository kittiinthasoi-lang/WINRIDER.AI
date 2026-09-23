# WINRIDER.AI External Release Gates

Updated: 2026-09-23

These items cannot be truthfully marked as verified by repository changes alone.

## 1. Authenticated ride E2E

Use GitHub Actions workflow **Production-like E2E Verification** with the protected `production-like` environment.

Required secrets:
- `E2E_PASSENGER_TOKEN`
- `E2E_PASSENGER_UID`
- `E2E_DRIVER_TOKEN`
- `E2E_DRIVER_UID`
- `E2E_COMPLETION_PROOF_URL`
- optional `E2E_DECLINE_RIDE_ID`

The workflow must complete successfully against the intended HTTPS staging environment.

## 2. Concurrent mutation load test

Configure:
- `LOAD_SCENARIO_JSON` with independent prepared ride fixtures
- `LOAD_DRIVER_TOKEN`
- `LOAD_PASSENGER_TOKEN`

Run the same workflow with **run_load=true**. Record request count, failures, p50, p95 and p99.

## 3. Real payment provider

Deployment secrets/config:
- `PAYMENT_PROVIDER_WEBHOOK_SECRET`
- `PAYMENT_PROVIDER_REFUND_URL`
- `PAYMENT_PROVIDER_API_TOKEN`
- `PAYMENT_PROVIDER_ALLOWED_HOST`

Verification must include a real low-value confirmed top-up, duplicate webhook replay, partial refund, failed-refund recovery, and reconciliation against the provider/bank settlement report. A slip image alone must never credit the wallet.

## 4. Edge rate limiting / WAF

The repository now has both per-instance and distributed Firestore application limits. Production still needs platform-level edge protection on public mutation routes through the actual hosting provider (for example its firewall/WAF/API-gateway controls).

## 5. Independent security review

Run an independent review/penetration test covering IDOR, privilege escalation, Firebase token abuse, replay/idempotency, webhook authentication, rate-limit bypass, upload abuse and payment/refund logic. Internal engineering notes live in `docs/SECURITY_REVIEW.md`; they are not a substitute for an independent review.

## 6. Device and outage QA

Verify on supported real devices/browsers:
- mobile background/screen-off GPS behavior
- reconnect/resume after network loss
- authentication recovery
- Maps/Routes outage UX
- no-GPS/no-network SOS fallback
- desktop and mobile browser smoke tests

## 7. Operations / recovery / privacy

Before launch:
- perform a backup + restore drill and record recovery time/results
- enable production monitoring and alerts
- review privacy notice, consent, data-retention/deletion policy, and incident retention
- confirm deployment environment provides required Firebase configuration (including `VITE_FIREBASE_API_KEY`) without committing private service credentials to Git; public maps/navigation require no Maps API key

The system should not be labelled production-ready until these gates have evidence attached to the release.
