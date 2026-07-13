# 98 — SCP-011 — Commercial Seat Limit Server Runtime

## Status

Ready for External Audit

## Síntese

Implementado o runtime server-side, read-only e determinístico do
limite comercial `users.seats`, materializando o DTO
`CommercialLimitDecision` planejado na cadeia SCP-010 → SCP-010.5.4.

## Arquivos criados

- `src/lib/api/commercial/limit-decision.ts`
- `src/integrations/supabase/__tests__/commercial-seat-limit.spec.ts`
- `docs/architecture/impact-analysis/SCP-011-commercial-seat-limit-server-runtime.md`
- `docs/delivery/phase-04-saas-commercial-platform/98-scp-011-commercial-seat-limit-server-runtime.md`

## Arquivos alterados

- `src/lib/api/commercial/commercial.functions.ts` — adicionadas as
  importações da nova camada, extraído `loadTenantCommercialContext`
  compartilhado (reutilizado por `getCommercialFeatureDecision` e pela
  nova função) e adicionada a server function
  `getCommercialSeatLimitDecision`.
- `run-tenant-specs.ts` — registrada a nova suíte
  `commercial-seat-limit`.
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — 14.5.4 marcado como
  `Accepted`; 15. SCP-011 marcado como `Ready for External Audit`;
  16. SCP-012 registrada como próxima etapa futura, não iniciada.
- `docs/architecture/impact-analysis/SCP-010.5.4-final-accepted-status-closure-scp-011-authorization.md`
  — status atualizado para `Accepted`.

## Verificações

```
bunx tsgo --noEmit                 → exit 0
bunx tsx ./run-tenant-specs.ts     → 115 passed, 0 failed
```

Suítes:

| Suíte                          | Passed |
| ------------------------------ | ------ |
| tenant-selection-state         | 8      |
| tenant-attacher                | 7      |
| tenant-selection-cardinality   | 7      |
| tenant-gate                    | 12     |
| membership-validation          | 10     |
| commercial-read-models         | 9      |
| commercial-feature-gate        | 15     |
| commercial-feature-catalog     | 13     |
| commercial-seat-limit (novo)   | 34     |
| **TOTAL**                      | **115**|

`rg` de segurança:

- `rg -n 'tenant_members' src/` → apenas leituras.
- `rg -n 'from\(.tenant_members.\).*\.(insert|update|upsert|delete)' src/`
  → **zero ocorrências**.
- `rg -n 'getCommercialSeatLimitDecision|CommercialLimitDecision|decideCommercialSeatLimit' src/`
  → limitado a `limit-decision.ts`, `commercial.functions.ts` e à nova spec.
- `rg -n 'limit_reached' src/` → apenas contrato de enum e specs.

## git diff --name-only (esperado)

```
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/impact-analysis/SCP-010.5.4-final-accepted-status-closure-scp-011-authorization.md
docs/architecture/impact-analysis/SCP-011-commercial-seat-limit-server-runtime.md
docs/delivery/phase-04-saas-commercial-platform/98-scp-011-commercial-seat-limit-server-runtime.md
run-tenant-specs.ts
src/integrations/supabase/__tests__/commercial-seat-limit.spec.ts
src/lib/api/commercial/commercial.functions.ts
src/lib/api/commercial/limit-decision.ts
```

## Confirmações negativas

- nenhum código de produção fora do módulo commercial alterado;
- nenhuma migration criada ou alterada;
- nenhum schema alterado;
- nenhuma RLS policy criada ou alterada;
- nenhum grant criado ou alterado;
- nenhuma mutation em `tenant_members` (insert/update/upsert/delete)
  criada;
- nenhum trigger, advisory lock, RPC transacional ou constraint
  agregada criada;
- nenhum provider integration, webhook, checkout, customer portal
  implementado;
- nenhum novo role (`billing_admin`, `commercial_admin`,
  `canManageTenantBilling`) introduzido;
- nenhum frontend, hook client-side ou feature-gate client-side
  alterado;
- SCP-012 não iniciada.

## Bloco final do roadmap

```
14.5.4 SCP-010.5.4 — Final Accepted Status Closure & SCP-011 Authorization — Accepted.
15. SCP-011 — Commercial Seat Limit Server Runtime — Ready for External Audit.
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — próxima etapa futura planejada; não iniciada.
```
