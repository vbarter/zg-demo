#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

python3 -m pip install -r "$ROOT/backend/requirements.txt"
(cd "$ROOT/frontend" && npm install)

echo
echo "Ready. Either:"
echo "  1) $ROOT/scripts/dev.sh"
echo "  2) two terminals:"
echo "       python3 $ROOT/backend/app.py"
echo "       cd $ROOT/frontend && npm run dev"
echo
echo "Optional real zg:"
echo "  npm i -g @zvec/zvec-grep"
echo "  (cd $ROOT/sample-kb && zg index --embedding \${ZG_EMBEDDING:-local/potion-retrieval-32m})"
