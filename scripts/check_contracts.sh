#!/bin/bash
set -e

echo "════════════════════════════════════════"
echo "  VERIFICAÇÃO DE CONTRATOS — tensor-aurora"
echo "════════════════════════════════════════"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "▶ Contratos Backend (Python standalone)..."
cd "$PROJECT_ROOT"
python scripts/check_contracts.py 2>&1
BACKEND_STATUS=$?

echo ""
echo "▶ Contratos Frontend (vitest)..."
cd "$PROJECT_ROOT/web"
npx vitest run src/__tests__/contracts/ 2>&1
FRONTEND_STATUS=$?

echo ""
echo "════════════════════════════════════════"
if [ $BACKEND_STATUS -eq 0 ] && [ $FRONTEND_STATUS -eq 0 ]; then
  echo "  ✅ TODOS OS CONTRATOS ÍNTEGROS"
else
  echo "  ❌ CONTRATO(S) QUEBRADO(S) — ver output acima"
  echo "  Referência: ARCHITECTURE_RULES.md → Contratos Imutáveis"
  exit 1
fi
echo "════════════════════════════════════════"
