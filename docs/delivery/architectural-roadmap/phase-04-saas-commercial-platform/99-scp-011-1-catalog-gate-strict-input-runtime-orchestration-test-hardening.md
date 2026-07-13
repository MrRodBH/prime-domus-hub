# 99 — SCP-011.1 — Catalog Gate, Strict Input Boundary & Runtime Orchestration Test Hardening

## Status

Ready for External Audit

## Síntese

Bloqueios auditados da SCP-011 corrigidos:

1. `getCommercialSeatLimitDecision` agora executa
   `evaluateFeatureCatalogGate` **antes** de qualquer `loadAdmin` /
   `loadTenantCommercialContext` / leitura de `tenant_members`.
2. Input público estrito: `normalizeCommercialSeatLimitInput` rejeita
   toda propriedade fora de `requestedIncrement` e rejeita
   `requestedIncrement !== 1`.
3. Orquestração real de produção extraída em
   `src/lib/api/commercial/seat-limit-runtime.ts`
   (`resolveCommercialSeatLimitDecision`), consumida pela server function
   E pelos testes — sem reader paralelo.
4. Evidência sobre `limit_reached` corrigida no documento de análise.

## Arquivos criados

- `src/lib/api/commercial/seat-limit-runtime.ts`
- `docs/architecture/impact-analysis/SCP-011.1-catalog-gate-strict-input-runtime-orchestration-test-hardening.md`
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/99-scp-011-1-catalog-gate-strict-input-runtime-orchestration-test-hardening.md`

## Arquivos alterados

- `src/lib/api/commercial/limit-decision.ts` — adicionado
  `normalizeCommercialSeatLimitInput` (input boundary estrito).
- `src/lib/api/commercial/commercial.functions.ts` — handler
  `getCommercialSeatLimitDecision` reescrito para delegar à orquestração
  compartilhada; imports enxutos.
- `src/integrations/supabase/__tests__/commercial-seat-limit.spec.ts` —
  +11 testes (orquestração + input estrito).
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — adicionada linha 15.1
  (SCP-011.1 — Ready for External Audit).

## Verificações

```
bunx tsgo --noEmit                        → exit 0 (TYPECHECK_EXIT=0)
bunx tsx ./run-tenant-specs.ts            → 126 passed / 0 failed (SPECS_EXIT=0)
```

| Suíte                          | Anterior | Novos | Passed |
| ------------------------------ | -------- | ----- | ------ |
| tenant-selection-state         | 8        | 0     | 8      |
| tenant-attacher                | 7        | 0     | 7      |
| tenant-selection-cardinality   | 7        | 0     | 7      |
| tenant-gate                    | 12       | 0     | 12     |
| membership-validation          | 10       | 0     | 10     |
| commercial-read-models         | 9        | 0     | 9      |
| commercial-feature-gate        | 15       | 0     | 15     |
| commercial-feature-catalog     | 13       | 0     | 13     |
| commercial-seat-limit          | 34       | +11   | 45     |
| **TOTAL**                      | **115**  | **+11** | **126** |

`rg` de segurança:

- `rg -n 'from\(.tenant_members.\).*\.(insert|update|upsert|delete)' src/`
  → **zero ocorrências**.
- `rg -n 'evaluateFeatureCatalogGate|getCommercialSeatLimitDecision' src/lib/api/commercial/`
  → apenas `feature-catalog.ts`, `commercial.functions.ts`,
  `seat-limit-runtime.ts`.
- `rg -n 'limit_reached' src/` → runtime puro
  (`limit-decision.ts:235`), enum e comentários em `feature-gate.ts`,
  e specs — resultado real registrado no documento de análise.

## git diff --name-only (esperado)

```
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/impact-analysis/SCP-011.1-catalog-gate-strict-input-runtime-orchestration-test-hardening.md
docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/99-scp-011-1-catalog-gate-strict-input-runtime-orchestration-test-hardening.md
src/integrations/supabase/__tests__/commercial-seat-limit.spec.ts
src/lib/api/commercial/commercial.functions.ts
src/lib/api/commercial/limit-decision.ts
src/lib/api/commercial/seat-limit-runtime.ts
```

## Confirmações negativas

- nenhum código fora do módulo commercial alterado;
- nenhuma migration, schema, tabela, coluna, enum, constraint, índice,
  RLS ou grant criado/alterado;
- nenhuma mutation em `tenant_members`;
- nenhum trigger, lock, RPC, reservation, enforcement;
- nenhum provider integration, webhook, checkout, customer portal;
- nenhum novo role ou frontend alterado;
- `storage.media_limit` intocado;
- SCP-011 **permanece** `Ready for External Audit` (não marcada Accepted);
- SCP-012 não iniciada.
