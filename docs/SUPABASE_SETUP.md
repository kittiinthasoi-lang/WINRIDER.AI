# Supabase connection preparation

This change prepares configuration only. Current login, registration, Firestore access,
Storage and Functions still depend on Firebase authentication. Setting these values does
NOT migrate authentication or existing users.

## Deployment environment

- VITE_SUPABASE_URL: project URL from Supabase Connect.
- VITE_SUPABASE_PUBLISHABLE_KEY: browser publishable key (sb_publishable_...).
- SUPABASE_URL: same project URL, for server-side profile synchronization.
- SUPABASE_SECRET_KEY: server-only secret for privileged database synchronization.
- Legacy VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY remain supported.

Store secrets in the hosting provider secret settings, never GitHub source or browser
variables. Rebuild frontend after changing VITE_ variables. Configuration status does
not prove schema, RLS, network access or Auth setup are valid.

## Required before switching login

1. Identify Supabase project, production/staging app URL and hosting provider.
2. Configure Site URL and explicit allowed redirect URLs in Supabase Authentication.
3. Configure desired email/Google providers and email delivery in that project.
4. Choose a verified identity mapping/migration for existing Firebase users. Do not map
   accounts by unverified email or change existing wallet ownership IDs.
5. Update frontend authentication AND server token validation together. Validate Supabase
   access tokens using auth.getUser(token) or verified claims, never decoded JWT alone.
6. Plan Firebase Firestore/Storage/Functions access: these still expect Firebase identities.
   Supabase sessions alone cannot authorize those services.
7. Audit RLS and server-owned role/admin/status fields before applying any SQL.
8. Test signup, confirmation, sign-in, sign-out, refresh, callbacks, account approval,
   all roles and existing wallet/order access in staging before deployment.

Pending: actual project credentials and domain; migration implementation; hosted testing.
