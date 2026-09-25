#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-decoded-robot-6lkcn}"
RUNTIME_SA="${RUNTIME_SA:-ais-sandbox@ais-asia-east1-c6f576e0be1f4fb.iam.gserviceaccount.com}"
STORAGE_BUCKET="${STORAGE_BUCKET:-decoded-robot-6lkcn.firebasestorage.app}"

echo "WINRIDER.AI Firebase runtime IAM repair"
echo "Project:        ${PROJECT_ID}"
echo "Runtime SA:     ${RUNTIME_SA}"
echo "Storage bucket: ${STORAGE_BUCKET}"
echo

command -v gcloud >/dev/null 2>&1 || {
  echo "ERROR: gcloud CLI is required. Run this script from Google Cloud Shell."
  exit 1
}

gcloud config set project "${PROJECT_ID}" >/dev/null

echo "[1/3] Granting Firestore read/write runtime access..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}"   --member="serviceAccount:${RUNTIME_SA}"   --role="roles/datastore.user"   --condition=None   --quiet

echo "[2/3] Granting object access only on the WINRIDER Firebase Storage bucket..."
gcloud storage buckets add-iam-policy-binding "gs://${STORAGE_BUCKET}"   --member="serviceAccount:${RUNTIME_SA}"   --role="roles/storage.objectAdmin"   --quiet

echo "[3/3] Verifying effective IAM bindings..."
gcloud projects get-iam-policy "${PROJECT_ID}"   --flatten="bindings[].members"   --filter="bindings.members:serviceAccount:${RUNTIME_SA} AND bindings.role:roles/datastore.user"   --format="table(bindings.role,bindings.members)"

gcloud storage buckets get-iam-policy "gs://${STORAGE_BUCKET}"   --format=json | grep -F "${RUNTIME_SA}" >/dev/null || {
    echo "WARNING: Storage binding was not visible in the returned bucket policy yet."
  }

echo
echo "IAM repair applied."
echo "Redeploy/restart WINRIDER.AI if needed, then open Admin > System Health Telemetry and press Check again."
