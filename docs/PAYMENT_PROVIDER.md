# Payment Provider Integration Contract

WINRIDER.AI never credits a wallet from a client-declared amount or from a slip image alone.

## Confirmed top-up

The configured payment provider (or a tightly controlled adapter service) calls
`POST /api/webhooks/payment-provider` with a JSON event:

- `type=PAYMENT_CONFIRMED`
- unique `eventId`
- provider `transactionId`
- WINRIDER `submissionId`
- authenticated account `userId`
- integer `amountSatang`

The provider signs the stable-canonical JSON body with HMAC-SHA256 using
`PAYMENT_PROVIDER_WEBHOOK_SECRET` and sends
`X-WINRIDER-Payment-Signature: sha256=<hex>`.

The server checks signature, submission ownership, exact amount, provider
transaction reuse and event idempotency before writing the wallet and balanced
ledger entry in one Firestore transaction.

## Refund

Super Admin creates a refund through `POST /api/admin/payments/refund`. The
requested amount is locked before dispatch. If `PAYMENT_PROVIDER_REFUND_URL`
is configured, the server sends the request only to the exact HTTPS hostname in
`PAYMENT_PROVIDER_ALLOWED_HOST`. Final wallet/ledger mutation occurs only
after a signed `REFUND_CONFIRMED` provider event. `REFUND_FAILED` unlocks
the reserved amount.

## Production verification

Code support does not prove a payment provider is live. Production readiness
requires real provider credentials, a successful low-value top-up, duplicate
webhook replay test, partial refund test, failed-refund test and reconciliation
against the provider dashboard/bank settlement.
