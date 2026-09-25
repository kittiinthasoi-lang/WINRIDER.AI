# WINRIDER.AI Firebase Runtime IAM

The production server uses Firebase Admin SDK. When deployed from AI Studio/Cloud Run without an explicit `FIREBASE_SERVICE_ACCOUNT` secret, it uses the platform's Application Default Credentials.

Current detected runtime principal:

```
ais-sandbox@ais-asia-east1-c6f576e0be1f4fb.iam.gserviceaccount.com
```

Target Firebase project:

```
decoded-robot-6lkcn
```

Target Firestore database:

```
ai-studio-winriderai-96f1b3b6-26ee-4fca-ba51-662b278eea8d
```

Target Storage bucket:

```
decoded-robot-6lkcn.firebasestorage.app
```

## Required least-privilege runtime access

- Firestore server operations: `roles/datastore.user` on project `decoded-robot-6lkcn`.
- Firebase Storage file operations: `roles/storage.objectAdmin` on bucket `decoded-robot-6lkcn.firebasestorage.app`.

Do not grant Owner/Editor merely to resolve these checks.

## Apply

Open Google Cloud Shell while signed in as a project Owner/IAM Admin and run:

```bash
bash scripts/grant-firebase-runtime-iam.sh
```

The script is idempotent and contains no private key or API secret.

After IAM propagation, redeploy/restart the running revision if necessary and re-run **Admin → System Health Telemetry**. Firestore, Dispatch Engine, and Order Flow Audit share the same Firestore dependency, so all three should recover once the Firestore runtime principal can access the database.
