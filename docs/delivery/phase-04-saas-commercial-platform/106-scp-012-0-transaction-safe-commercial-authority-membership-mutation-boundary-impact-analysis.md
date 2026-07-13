# 106 — SCP-012.0 — Transaction-Safe Commercial Authority & Membership Mutation Boundary Impact Analysis

## Status

Ready for External Audit

## 1. Escopo executado

Análise arquitetural dos dois pré-requisitos que bloqueiam a SCP-012:

1. autoridade comercial executável dentro de uma transação Postgres;
2. boundary server-side de mutations de membership.

Etapa exclusivamente documental. Nenhuma alteração em `src/**`,
`supabase/migrations/**`, RLS, grants, schema, testes, migrations,
triggers, locks, enforcement, providers, webhooks, checkout ou frontend.

## 2. Arquivos inspecionados

- `src/lib/api/commercial/feature-catalog.ts`
- `src/lib/api/commercial/feature-gate.ts`
- `src/lib/api/commercial/read-models.ts`
- `src/lib/api/commercial/limit-decision.ts`
- `src/lib/api/commercial/seat-limit-runtime.ts`
- `src/lib/api/commercial/seat-usage-reader.ts`
- `src/lib/api/commercial/commercial.functions.ts`
- `src/integrations/supabase/tenant-repository.ts`
- `src/integrations/supabase/tenant-middleware.ts`
- `src/integrations/supabase/membership-types.ts`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/20260701204508_...sql`
  (DDL inicial de `tenant_members`, grants, RLS)
- `supabase/migrations/20260708125042_...sql`
  (enums `tenant_role` / `membership_status`, colunas, índices,
  trigger `updated_at`)
- migrations `20260707134301`, `20260707143029`, `20260708132329`,
  `20260708132624`, `20260708132711`, `20260708142907`,
  `20260708145027` (funções auxiliares consumindo `tenant_members`)

## 3. Comandos executados

```
rg -n 'tenant_members' src/ supabase/
rg -n '\.(insert|update|upsert|delete)\(' src/
rg -n '\.rpc\(' src/ supabase/
rg -n 'membership_status' src/ supabase/
rg -ni 'invite|invitation' src/
rg -n 'service_role|serviceRole|createClient' src/
```

## 4. Inventário de mutations

- Nenhuma mutation runtime de `public.tenant_members` (direta, via RPC,
  via repository, ou via qualquer abstração).
- Todas as referências runtime são SELECT (ver §3 do documento de
  impacto).
- Nenhum fluxo de invitation / aceite / suspensão / revogação /
  reativação server-side existe.
- Único INSERT em `tenant_members` está em migration de seed
  (`20260701204508_...sql` linhas 135–139), não é runtime.

## 5. DDL real, policies e grants

DDL, enums, índices, trigger, grants e RLS estão registrados
integralmente em §4 do documento de impacto:

- `GRANT SELECT ON public.tenant_members TO authenticated;`
- `GRANT ALL    ON public.tenant_members TO service_role;`
- sem GRANT para `anon`;
- policies `tm_select` e `tm_write` são **PERMISSIVE** (default);
- `tm_write` (`FOR ALL TO authenticated USING/WITH CHECK
  is_super_admin()`) é neutralizada na prática pela ausência de GRANT
  `INSERT/UPDATE/DELETE` a `authenticated` — usuários autenticados não
  conseguem mutar por SQL direto;
- `service_role` bypassa RLS por definição.

## 6. Arquitetura atual da autoridade comercial

Autoridade comercial é **exclusivamente TypeScript**, server-side,
read-only, sob `requireTenant`, com loader único
`loadTenantCommercialContext`. Não participa de nenhuma transação
Postgres. Detalhes em §5 do documento de impacto.

## 7. Alternativas analisadas

- **A — SQL como autoridade canônica** (resolver `SECURITY DEFINER`).
- **B — Snapshot autoritativo materializado** (tabela de estado
  comercial).
- **C — Conexão Postgres transacional server-side** (bypass PostgREST).

Análise comparativa (consistência, dual resolver, complexidade,
compatibilidade, segurança, testabilidade, rollback, operabilidade) em
§6 do documento de impacto.

## 8. Decisão recomendada

**Estratégia A — SQL/Postgres como autoridade comercial canônica
única**, exposta somente por primitive RPC server-side restrita.
PostgREST/RPC permanece como superfície de chamada. A transação da
mutation ocorre integralmente dentro da função Postgres invocada como
RPC única.

- não existe conexão Postgres direta controlada pelo TypeScript;
- não existe pool adicional;
- não existe transaction callback multi-statement na aplicação;
- Estratégia C (conexão Postgres direta / transaction callback
  multi-statement em TypeScript) foi analisada mas **não** é
  selecionada;
- Estratégia B (snapshot materializado) foi rejeitada por staleness e
  dual authority por construção.

Inconsistências levantadas pela auditoria externa da SCP-012.0 foram
integralmente corrigidas na SCP-012.0.1 (contrato canônico,
`billing_attention_required` como short-circuit, estratégia A pura,
sequenciamento atômico, roadmap deduplicado) e reforçadas pela
SCP-012.0.1.1 (reescrita determinística das seções e evidence lock).

Detalhes normativos na SCP-012.0.1 e SCP-012.0.1.1.

## 9. Sequenciamento proposto

1. SCP-012.0 — Impact Analysis.
2. SCP-012.0.1 — Canonical Decision Contract, Atomic Cutover
   Sequencing & Roadmap Cleanup.
3. SCP-012.0.1.1 — Deterministic Full-Section Rewrite, Evidence Lock
   & Git Readiness.
4. SCP-012.0.2 — Transaction-Safe Commercial Authority Materialization
   & Atomic Runtime Cutover (materialização + suíte de paridade +
   delegação + remoção/desativação do caminho TS independente, tudo
   num único conjunto auditável).
5. SCP-012.0.3 — Membership Mutation Boundary Planning &
   Materialization.
6. SCP-012 — Atomic Enforcement Integration.

Sem período persistido de dual authority em produção.

## 10. Arquivos criados

- `docs/architecture/impact-analysis/SCP-012.0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md`
- `docs/delivery/phase-04-saas-commercial-platform/106-scp-012-0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md`

## 11. Arquivos alterados

- `docs/architecture/ROADMAP_ARCHITECTURAL.md` (bloco 16/16.0/16.0.1
  consolidado pela SCP-012.0.1).

## 12. Bloco final do roadmap aplicado

```
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — Blocked: architectural prerequisites required.
16.0 SCP-012.0 — Transaction-Safe Commercial Authority & Membership Mutation Boundary Impact Analysis — Ready for External Audit.
16.0.1 SCP-012.0.1 — Canonical Decision Contract, Atomic Cutover Sequencing & Roadmap Cleanup — Ready for External Audit.
16.0.1.1 SCP-012.0.1.1 — Deterministic Full-Section Rewrite, Evidence Lock & Git Readiness — Ready for External Audit.
```

As antigas linhas `Transaction-Safe Commercial Resolver
Materialization` e `transaction-safe commercial authority unavailable`
foram substituídas integralmente.

## 13. Escopo alterado

Apenas `docs/**`:

```
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/impact-analysis/SCP-012.0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md
docs/delivery/phase-04-saas-commercial-platform/106-scp-012-0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md
```

Nenhum arquivo fora de `docs/**` foi alterado.

## 14. Hard Gates (registrados)

- nenhuma implementação antes da aprovação da SCP-012.0;
- nenhum resolver SQL criado;
- nenhuma mutation criada;
- nenhum enforcement criado;
- nenhuma mudança em RLS/grants;
- nenhuma autoridade duplicada planejada;
- SCP-012 permanece bloqueada.

## 15. Confirmações negativas

- nenhum código de produção alterado;
- nenhum teste alterado;
- nenhuma migration criada;
- nenhum schema alterado;
- nenhuma RLS policy alterada;
- nenhum grant criado;
- nenhuma mutation criada;
- nenhum trigger criado;
- nenhum lock criado;
- nenhum enforcement implementado;
- nenhum provider integrado;
- nenhum frontend alterado.
