#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  npm install
fi

if pgrep -af "tsx server.ts" >/dev/null 2>&1; then
  echo "[WINRIDER.AI] dev server already running"
  exit 0
fi

nohup npm run dev >/tmp/winrider-dev.log 2>&1 &
echo "[WINRIDER.AI] dev server starting on port 3000"
