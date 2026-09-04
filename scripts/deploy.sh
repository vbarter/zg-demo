#!/usr/bin/env bash
# Build frontend + start gunicorn on 0.0.0.0:${PORT:-8080}.
# Assumes this file lives in <repo>/scripts/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VENV="$ROOT/backend/.venv"
if [[ ! -d "$VENV" ]]; then
  python3 -m venv "$VENV"
fi
# shellcheck disable=SC1091
source "$VENV/bin/activate"
python -m pip install -r "$ROOT/backend/requirements.txt"

if [[ -f "$ROOT/frontend/package-lock.json" ]]; then
  (cd "$ROOT/frontend" && npm ci && npm run build)
else
  (cd "$ROOT/frontend" && npm install && npm run build)
fi

export ZG_DEMO_ENV="${ZG_DEMO_ENV:-production}"
export FLASK_ENV="${FLASK_ENV:-production}"
export FLASK_DEBUG="${FLASK_DEBUG:-0}"
export FLASK_HOST="${FLASK_HOST:-0.0.0.0}"
export PORT="${PORT:-8080}"
export ZG_ROOT="${ZG_ROOT:-$ROOT/sample-kb}"
export ZG_EMBEDDING="${ZG_EMBEDDING:-local/potion-retrieval-32m}"
export PYTHONPATH="$ROOT/backend${PYTHONPATH:+:$PYTHONPATH}"

echo
echo "zg-demo production → http://${FLASK_HOST}:${PORT}"
echo "  workspace=$ZG_ROOT  embedding=$ZG_EMBEDDING"
echo

exec gunicorn \
  --bind "${FLASK_HOST}:${PORT}" \
  --chdir "$ROOT/backend" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --timeout "${GUNICORN_TIMEOUT:-180}" \
  app:app
