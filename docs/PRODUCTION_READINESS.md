# WINRIDER.AI Production Readiness — Phases 1–10

Updated: 2026-09-21

This checklist is the release gate for real-world operation. “Implemented” means the repository contains the supporting code; “verified” requires a successful production-like test run.

## Phase 1 — Core Ride
- [x] Authenticated order creation
- [x] Server-side active-order protection
- [x] Server-side live route validation before creating a ride
- [x] Explicit ride state machine
- [x] Transactional driver acceptance
- [x] Offer timeout and re-dispatch
- [x] Driver eligibility/service checks
- [x] Driver GPS authorization and validation
- [ ] Automated end-to-end tests for every state transition
- [ ] Idempotency key on every ride mutation
- [ ] Production load test with concurrent accept/decline/cancel

## Phase 2 — Money
- [x] Integer-satang fee engine
- [x] Double-entry wallet tests
- [x] Server-controlled wallet/ledger Firestore rules
- [ ] Single authoritative server fare calculation used by order creation and settlement
- [ ] Real payment-provider verification/webhooks
- [ ] Refund/partial-refund flows
- [ ] Settlement reconciliation job
- [ ] Financial idempotency tests

## Phase 3 — XP / Quest
- [ ] Server-authoritative quest event ingestion
- [ ] Atomic event counters
- [ ] Daily/weekly/lifetime period keys
- [ ] Idempotent event IDs
- [ ] Server-authoritative quest claiming/rewards
- [ ] Anti-tamper validation of role, metric, reward and requirement
- [ ] Fresh registration starts Level 1 / XP 0 without resetting existing users

## Phase 4 — Persistence
- [x] Knight vehicle/active vehicle/suit persistence
- [ ] Full persistence audit for Citizen
- [ ] Full persistence audit for Knight
- [ ] Full persistence audit for Merchant
- [ ] Full persistence audit for Partner
- [ ] Street Market listing persistence audit
- [ ] Re-login/reinstall recovery tests

## Phase 5 — GPS / Navigation
- [x] Live driver heartbeat
- [x] Stale-driver cutoff for dispatch
- [x] Authenticated driver GPS ingestion
- [x] Passenger live driver location endpoint
- [ ] Background/screen-off behavior test on supported mobile platforms
- [ ] Reconnect/resume test
- [ ] GPS jump/outlier handling
- [ ] Navigation provider outage UX

## Phase 6 — Safety
- [x] Emergency nearby places
- [x] SOS UI
- [x] Authenticated backend APIs
- [ ] Persistent SOS incident lifecycle
- [ ] Emergency acknowledgement workflow
- [ ] Incident audit trail and retention policy
- [ ] No-GPS/no-network emergency fallback UX

## Phase 7 — Commerce
- [ ] Customer-facing Merchant profile complete
- [ ] Owner/back-office Merchant profile complete
- [ ] Customer-facing Partner profile complete
- [ ] Owner/back-office Partner profile complete
- [ ] WIN Shop directory consistency
- [ ] WIN Street Market publish/unpublish persistence
- [ ] Order/stock/promotion lifecycle tests

## Phase 8 — Security
- [x] Firebase Auth required on sensitive APIs
- [x] Firestore deny-by-default rules
- [x] Server-controlled rides/wallet/ledger
- [x] Webhook HTTPS + host allowlist
- [x] API rate limiting
- [ ] Distributed rate limiting at the edge
- [ ] Security review for IDOR/privilege escalation
- [ ] Secret scanning in CI
- [ ] Dependency vulnerability scan
- [ ] Production Firebase Rules emulator tests

## Phase 9 — Admin / Operations
- [ ] Mobile-responsive Admin Command Center
- [ ] Active rides monitoring
- [ ] Dispatch intervention tools
- [ ] Payment/reconciliation queue
- [ ] SOS incident queue
- [ ] Merchant/Partner moderation
- [ ] Audit log search
- [ ] Operational health dashboard
- [ ] Role-based admin action tests

## Phase 10 — Release / QA
- [ ] TypeScript lint passes
- [ ] Production build passes
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Mobile browser smoke test
- [ ] Desktop smoke test
- [ ] Authentication recovery test
- [ ] Network-offline/reconnect test
- [ ] Maps/Routes outage test
- [ ] Payment outage test
- [ ] Backup/restore drill
- [ ] Monitoring + alerting enabled
- [ ] Privacy notice/consent and retention reviewed
- [ ] Thailand transport/payment/legal requirements reviewed with qualified counsel/authorities

## Release rule

Do not label the system “production-ready” merely because the UI works. The release gate is all critical-path tests passing in a production-like environment, with monitoring, rollback, data recovery, security controls, payment verification, and applicable legal requirements in place.
