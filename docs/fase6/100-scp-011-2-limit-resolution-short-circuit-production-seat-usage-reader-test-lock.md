# Relatório de execução — SCP-011.2

**Status:** Ready for External Audit
**Escopo:** runtime hardening (read-only) + test lock.

## 1. Ações executadas

1. Criado `src/lib/api/commercial/seat-usage-reader.ts` com
   `readCommercialSeatUsage` e a interface `CommercialSeatUsageClient`.
2. `src/lib/api/commercial/seat-limit-runtime.ts`: short-circuit
   introduzido após `extractSeatLimit(snapshot)` — se `limit === null`
   ou não passar em `isValidCommercialInteger`, retorna `not_evaluated /
   none` sem chamar `readSeatUsage`. `limit=0` é preservado.
3. `src/lib/api/commercial/commercial.functions.ts`: query inline
   removida. Handler agora usa `getAdmin` (lazy compartilhado) e delega
   a leitura a `readCommercialSeatUsage`.
4. `src/integrations/supabase/__tests__/commercial-seat-limit.spec.ts`:
   removido `readUsed` local; specs importam `readCommercialSeatUsage`;
   adicionados testes §8 (short-circuit) e §9 (reader real).
5. `docs/architecture/ROADMAP_ARCHITECTURAL.md`: entrada `15.2
   SCP-011.2 — Ready for External Audit` acrescentada.
6. Documento de impacto criado em `docs/architecture/impact-analysis/`.

## 2. Verificações executadas

- `bunx tsgo --noEmit` → **exit 0**.
- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` → **exit 0**.

### Contagem de testes

| Suíte | Testes |
|---|---|
| tenant-selection-state | 8 |
| tenant-attacher | 7 |
| tenant-selection-cardinality | 7 |
| tenant-gate | 12 |
| membership-validation | 10 |
| commercial-read-models | 9 |
| commercial-feature-gate | 15 |
| commercial-feature-catalog | 13 |
| **commercial-seat-limit** | **55** (era 45 — +10 nesta etapa) |
| **TOTAL** | **136 passed / 0 failed** (era 126) |

## 3. Verificações estruturais

- `rg -n 'readCommercialSeatUsage|readSeatUsage|tenant_members' src/lib/api/commercial/ src/integrations/supabase/__tests__/commercial-seat-limit.spec.ts`
  confirma implementação única em `seat-usage-reader.ts` e uso pelo
  runtime e pelos testes.
- `rg -n 'from\(.tenant_members.\).*\.(insert|update|upsert|delete)' src/`
  retorna **zero** ocorrências.
- Nenhum helper `readUsed` paralelo remanesce na suíte.

## 4. Confirmações negativas

Nenhuma migration criada ou alterada. Nenhum schema alterado. Nenhuma
RLS policy alterada. Nenhum grant criado. Nenhuma mutation criada.
Nenhum trigger criado. Nenhum lock criado. Nenhuma reserva criada.
Nenhum enforcement implementado. Nenhum provider integrado. Nenhum
frontend alterado. SCP-012 não iniciada.

## 5. Roadmap final

```
15.   SCP-011  — Ready for External Audit
15.1  SCP-011.1 — Ready for External Audit
15.2  SCP-011.2 — Ready for External Audit
16.   SCP-012  — próxima etapa futura planejada; não iniciada.
```
