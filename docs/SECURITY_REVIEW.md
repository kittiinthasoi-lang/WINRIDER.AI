# WINRIDER.AI Security Review Baseline

Updated: 2026-09-23

## Authorization invariants

- Ride creation and mutation are server-authoritative; Firestore clients cannot create/update/delete `rides/*`.
- GPS history is backend-ingested only.
- Wallet, ledger, top-up references, idempotency records and audit logs are not client writable.
- User self-service profile updates cannot change role/status/admin/level/XP/financial privilege fields.
- Knight self-service updates cannot change KYC, level, active ride, dispatch counters or owner-managed flags.
- Admin Operations mutations require a verified Firebase ID token with Super Admin authorization and emit audit records.

## IDOR checks

Every ride mutation must bind the authenticated UID to the passenger, assigned driver, currently offered driver, or Super Admin role. Resource IDs alone never grant access.

## Privilege escalation checks

Authorization decisions use Firebase verified ID-token claims plus server-side resource ownership. Client document fields must not be trusted as admin authorization.

## External review gate

This document is an internal engineering baseline, not an independent penetration-test attestation. Before production launch, run an external review covering IDOR, privilege escalation, token replay, webhook authentication, rate-limit bypass, Firestore Rules emulator tests, and abuse cases.
