# Replit startup and Firebase verification

WINRIDER.AI can run its Express/Vite preview on Replit, but Firebase-backed data
requires Firebase Admin credentials on the server.

## Required Replit Secrets

Set these in **Replit → Secrets**. Never paste a service-account value into
source code, GitHub, logs, issues, or chat.

- `FIREBASE_SERVICE_ACCOUNT` — the complete Firebase service-account JSON object
  for the configured project. Paste the JSON as one secret value.
- `FIREBASE_PROJECT_ID` — must match `firebase-applet-config.json`.
- `FIRESTORE_DATABASE_ID` — named Firestore database used by WINRIDER.AI.
- `FIREBASE_STORAGE_BUCKET` — Storage bucket used by the same project.
- `ADMIN_OWNER_EMAIL` — owner account email used for Super Admin promotion after
  a normal authenticated sign-in.

The server also supports the split `FIREBASE_CLIENT_EMAIL` +
`FIREBASE_PRIVATE_KEY` form, but `FIREBASE_SERVICE_ACCOUNT` is preferred on
Replit because it keeps the credential together and avoids partial-key mistakes.

Do not include surrounding shell quotes around the JSON. The server tolerates a
single quoted wrapper and escaped newlines, but the recommended value is the raw
complete JSON object copied into the Replit Secret editor.

## Start

```bash
npm install
npm run dev
```

The preview/liveness endpoint is:

```text
GET /api/health
```

A successful liveness response only proves that the web server is running. It
does not prove Firebase access.

## Verify Firebase read access

Use:

```text
GET /api/health/firebase
```

This endpoint performs read-only checks:

1. Reads `_connection_test/ping` from the configured Firestore database. The
   document does not need to exist; the read itself must succeed.
2. Reads metadata for the configured Firebase Storage bucket.

Expected HTTP status when ready: `200`.

Expected response state:

```json
{
  "status": "ready",
  "ready": true,
  "credentialConfigured": true,
  "checks": {
    "firestore": { "ok": true },
    "storage": { "ok": true }
  }
}
```

The response never returns the service-account JSON, private key, or access
tokens.

If the endpoint returns `503`, replace the Replit Secret with the complete
service-account JSON for the project named in `firebase-applet-config.json`,
restart the Repl, and check the endpoint again.

## Verify sign-in

The unauthenticated temporary Super Admin entry is permanently disabled.

Open the preview and use the normal email/password form. Test with an existing
authorized account. A successful sign-in proves that the WIN Auth store can read
the Firebase-backed account/session data.

For the owner account, Super Admin elevation happens only after the account has
successfully authenticated through the normal login flow.

## Security checks

The legacy compatibility endpoint:

```text
POST /api/auth/temporary-admin-entry
```

must return HTTP `404` with `TEMP_ADMIN_DISABLED`.

Never add a bypass token or password to the repository to make preview access
easier. If Firebase is unavailable, fix the deployment credential instead.
