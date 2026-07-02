#!/usr/bin/env bash
# Orquestrador da suíte QA — executa todos os smoke tests dos ciclos concluídos.
set -u
export QA_ARTIFACTS="${QA_ARTIFACTS:-/tmp/qa/$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$QA_ARTIFACTS"
echo "→ Artefatos em: $QA_ARTIFACTS"

FAIL=0
run() {
  local name="$1" script="$2"
  echo -e "\n=== $name ==="
  if python3 "$script"; then :; else FAIL=$((FAIL+1)); fi
}

run "auth"        tests/auth/test_auth_public.py
run "website"     tests/website/test_public_pages.py
run "super-admin" tests/super-admin/test_super_smoke.py

echo -e "\n=========================================="
if [ "$FAIL" -eq 0 ]; then
  echo "✅ Todos os scripts terminaram sem exceção. Revise report.json de cada suíte."
else
  echo "⚠️  $FAIL script(s) terminaram com erro. Veja $QA_ARTIFACTS."
fi
exit "$FAIL"
