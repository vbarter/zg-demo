#!/usr/bin/env bash
# Start Flask + Vite together. Ctrl-C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ZG_ROOT="${ZG_ROOT:-$ROOT/sample-kb}"
export FLASK_PORT="${FLASK_PORT:-5000}"
export ZG_EMBEDDING="${ZG_EMBEDDING:-local/potion-retrieval-32m}"

if ! python3 -c "import flask, flask_cors" 2>/dev/null; then
  echo "Install backend deps first:  pip install -r backend/requirements.txt" >&2
  exit 1
fi
if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  echo "Install frontend deps first:  cd frontend && npm install" >&2
  exit 1
fi

python3 "$ROOT/backend/app.py" &
BACKEND_PID=$!
cleanup() {
  kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "$ROOT/frontend"
npm run dev -- --host 127.0.0.1
