# WINRIDER.AI Production Readiness — Phases 1–10

Updated: 2026-09-23

This checklist is the release gate for real-world operation.

- `[x]` means the repository contains the control and, where applicable, CI has verified it.
- `[ ]` means production-like or external verification is still required.
- A test harness is not counted as passed until it has a successful run against the intended environment.

Latest fully verified repository gate before this documentation-only update:
- Commit: `90d3a7dfd9ad5316eddac62235464e6ab6d833bd`
- CI: success
- Production Gate run: `35811632578` — success
- Verified steps: TypeScript, unit tests, integration tests, production build, dependency audit, secret scan, Cloud Functions build.

## Phase 1 — Core Ride
- [x] Authenticated order creation
- [x] Server-side active-order protection
- [x] Server-side live route validation before creating a ride
- [x] Explicit ride state machine
- [x] Transactional driver acceptance
- [x] Offer timeout and re-dispatch
- [x] Driver eligibility/service checks
- [x] Driver GPS authorization and validation
- [ ] Automated end-to-end tests for every state transition — authenticated harness exists at `scripts/e2e-ride.mjs` and `.github/workflows/production-like-e2e.yml`; successful production-like run still required
- [x] Idempotent order creation (order ID replay returns the existing passenger order)
- [ ] Idempotency key on every remaining ride mutation
- [ ] Production load test with concurrent accept/decline/cancel — authenticated concurrency harness exists at `scripts/load-test.mjs`; successful production-like run still required

## Phase 2 — Money
- [x] Integer-satang fee engine
- [x] Double-entry wallet tests
- [x] Server-controlled wallet/ledger Firestore rules
- [x] Single authoritative server fare calculation used by order creation
- [x] Settlement consumes the authoritative server `fareQuote` first and rejects a stored-fare mismatch
- [ ] Real payment-provider production verification — signed HMAC webhook implementation exists, but real provider credentials and a successful provider transaction are still required
- [x] Refund/partial-refund flow implemented with balance locking and provider-confirmed finalization
- [x] Daily internal settlement reconciliation job writes `reconciliation_reports`
- [ ] Financial idempotency integration tests against Firestore/payment-provider events

## Phase 3 — XP / Quest
- [x] Server-authoritative quest event ingestion
- [x] Atomic event counters
- [x] Daily/weekly/lifetime period keys
- [x] Idempotent event IDs
- [x] Server-authoritative quest claiming/rewards
- [x] Anti-tamper validation uses server definitions and authenticated user role/metric/requirement/reward
- [x] Fresh registration starts Level 1 / XP 0 without resetting existing users

## Phase 4 — Persistence
- [x] Knight vehicle/active vehicle/suit persistence
- [ ] Full persistence audit for Citizen
- [ ] Full persistence audit for Knight
- [ ] Full persistence audit for Merchant
- [ ] Full persistence audit for Partner
- [ ] Street Market listing persistence audit
- [ ] Re-login/reinstall recovery tests
- [x] Owner-scoped `account_preferences` Firestore rule added; privileged identity fields remain protected

## Phase 5 — GPS / Navigation
- [x] Live driver heartbeat
- [x] Stale-driver cutoff for dispatch
- [x] Authenticated driver GPS ingestion
- [x] Passenger live driver location endpoint
- [ ] Background/screen-off behavior test on supported mobile platforms
- [ ] Reconnect/resume test
- [x] GPS jump/outlier and out-of-order sample rejection
- [ ] Navigation provider outage UX production-like test

## Phase 6 — Safety
- [x] Emergency nearby places
- [x] SOS UI
- [x] Authenticated backend APIs
- [x] Persistent SOS incident lifecycle
- [x] Emergency acknowledgement workflow
- [x] Incident audit trail
- [ ] No-GPS/no-network emergency fallback UX production-like test

## Phase 7 — Commerce
- [ ] Customer-facing Merchant profile completion audit
- [ ] Owner/back-office Merchant profile completion audit
- [ ] Customer-facing Partner profile completion audit
- [ ] Owner/back-office Partner profile completion audit
- [ ] WIN Shop directory consistency audit
- [ ] WIN Street Market publish/unpublish persistence audit
- [ ] Order/stock/promotion lifecycle tests

## Phase 8 — Security
- [x] Firebase Auth required on sensitive APIs
- [x] Firestore deny-by-default rules
- [x] Ride writes are server-authoritative; direct client ride mutation fallback removed
- [x] Wallet/ledger/top-up/audit writes are server-controlled
- [x] Self-service profile writes cannot elevate role/status/admin/level/XP/financial privilege fields
- [x] Webhook HTTPS + host allowlist
- [x] API rate limiting
- [ ] Distributed rate limiting at the edge — requires deployment-platform configuration
- [ ] Independent security review for IDOR/privilege escalation — internal engineering baseline and hardening are in `docs/SECURITY_REVIEW.md`; independent review still required
- [x] Secret scanning in CI
- [x] Dependency vulnerability scan
- [ ] Production Firebase Rules emulator tests

## Phase 9 — Admin / Operations
- [x] Authenticated operations overview API for Admin Command Center
- [x] Mobile-responsive Admin Command Center navigation/layout
- [x] Active rides monitoring
- [x] Dispatch intervention tools (re-dispatch/cancel with Super Admin authorization + audit)
- [x] Payment/top-up queue plus reconciliation reporting
- [x] SOS incident queue with acknowledge/resolve + audit
- [x] Merchant/Partner moderation through role/status filters and suspend/unsuspend controls
- [x] Audit log search + action filtering
- [x] Operational health endpoint + authenticated operations overview API
- [ ] Role-based admin action integration tests

## Phase 10 — Release / QA
- [x] TypeScript lint passes — Production Gate `35811632578`
- [x] Production build passes — Production Gate `35811632578`
- [x] Unit tests pass — Production Gate `35811632578`
- [x] Integration tests pass — Production Gate `35811632578`
- [ ] Mobile browser smoke test
- [ ] Desktop smoke test
- [ ] Authentication recovery test
- [ ] Network-offline/reconnect test
- [ ] Maps/Routes outage test
- [ ] Payment outage test against configured provider
- [ ] Backup/restore drill
- [ ] Monitoring + alerting enabled in production infrastructure
- [ ] Privacy notice/consent and retention reviewed
- [x] Project owner has confirmed applicable legal requirements are handled; independent legal verification is outside repository CI

## Repository governance
- [x] Repository license policy is explicit: proprietary `LICENSE` plus `package.json: "license": "UNLICENSED"`
- [x] Firebase/GCP API key removed from tracked fallback configuration; deployment must provide `VITE_FIREBASE_API_KEY` via environment

## Release rule

Do not label the system “production-ready” merely because the UI or repository CI works. Release requires every unchecked production-critical item above to be verified in a production-like environment, including real payment-provider verification, authenticated ride E2E/load tests, edge rate limiting, independent security review, recovery drills, device/browser tests, and monitoring/alerting.
