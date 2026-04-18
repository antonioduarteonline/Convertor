#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV="$ROOT/backend/.venv"

# Use Homebrew Python 3.13 explicitly
PYTHON="/opt/homebrew/opt/python@3.13/bin/python3"

echo "→ A configurar ambiente virtual do backend..."
if [ ! -d "$VENV" ]; then
  "$PYTHON" -m venv "$VENV"
fi

echo "→ A instalar dependências do backend..."
"$VENV/bin/pip" install -r "$ROOT/backend/requirements.txt" -q

echo "→ A instalar dependências do frontend..."
cd "$ROOT/frontend" && npm install --silent

echo ""
echo "✓ Backend  →  http://localhost:8000"
echo "✓ Frontend →  http://localhost:3000"
echo ""
echo "  Ctrl+C para parar tudo."
echo ""

trap 'kill $(jobs -p) 2>/dev/null' EXIT

"$VENV/bin/uvicorn" main:app --port 8000 --app-dir "$ROOT/backend" &
cd "$ROOT/frontend" && npm run dev &

wait
