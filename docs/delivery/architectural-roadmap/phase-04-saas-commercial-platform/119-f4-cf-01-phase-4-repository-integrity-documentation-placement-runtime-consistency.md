# 119 — F4-CF-01 — Phase 4 Repository Integrity, Documentation Placement & Runtime Consistency Check and Fix

**Status:** Accepted
**Phase:** 04 — SaaS Commercial Platform
**Depends on:** SCP-012 — Accepted.
**Blocks:** None — Phase 4 Closing Review is the next authorized checkpoint.

Cross-reference: [`docs/architecture/impact-analysis/F4-CF-01-phase-4-repository-integrity-documentation-placement-runtime-consistency.md`](../../../architecture/impact-analysis/F4-CF-01-phase-4-repository-integrity-documentation-placement-runtime-consistency.md).

## Escopo materializado (Classe A somente)

- **Materialização Accepted da SCP-012** nos três locais canônicos:
  impact analysis SCP-012, relatório de entrega 118 e
  `ROADMAP_ARCHITECTURAL.md` (entrada `16.`).
- **Campo `Blocks`** do impact analysis SCP-012 atualizado para
  `None — F4-CF-01 is authorized as the next checkpoint and has not started.`
- **Substituição integral** do texto histórico da Fase 4 no roadmap
  (remoção de `BLOCKED`, `IA-006 aguardando aprovação`, `SCP-001 ainda
  não iniciada`, `SCP-001..SCP-010 PROPOSED`). Nenhum segundo texto
  foi mantido em paralelo.
- **Registro do F4-CF-01** como entrada `17.` do roadmap
  (`Ready for External Audit`).
- **Registro do Phase 4 Closing Review** como entrada `18.`
  (`Planned; not started`).
- **Registro do PR-PH.0** (Pre-Homologation Product Readiness Impact
  Analysis) como `Planned; not started`.
- **Formalização PR-F6 vs AR-F6** com abreviações canônicas e regra de
  namespace distinto; sem renumeração retroativa.
- **Registro da diretriz futura** "RM Prime SaaS — Data-Dense Premium
  Dark Interface" vinculada a Tenant Dashboard Finalization, CRM/Kanban
  Finalization e Product UX/UI Final Consistency Review; sem
  implementação de tema, dashboard ou Kanban nesta etapa.

## Verificações executadas nesta execução

- `bunx tsc --noEmit -p tsconfig.json` → exit 0.
- `bunx tsx ./run-tenant-specs.ts` → 233 passed / 0 failed.
- `bunx tsx ./run-membership-mutation-parity-specs.ts` → 14 passed / 0 failed.
- `bunx tsx ./run-commercial-seat-atomic-enforcement-specs.ts` → 10 passed / 0 failed.
- `bunx tsx ./run-commercial-sql-parity-specs.ts` (**canonical
  integration gate**) → **decision: 17/17, rejection: 6/6,
  structural: 1/1**, cleanup errors 0, fatal no, catalog unchanged
  yes, exit 0.
- `COMMERCIAL_PARITY_INJECT_FAILURE_AFTER_SETUP=1 bunx tsx
  ./run-commercial-sql-parity-specs.ts` → fatal yes, cleanup errors
  0, catalog unchanged yes, **exit 1**. Demonstra fail-closed
  lifecycle: fixtures parciais são removidas mesmo com erro
  sintético injetado após o primeiro `setupFixture()`.
- Snapshot read-only do catálogo `commercial_entitlement_definitions.
  users.seats` idêntico antes e depois da execução:
  `{key: users.seats, value_type: integer, is_active: true,
  name: Seat limit, unit: seats, description: Seat limit}`.
- Consultas pós-run confirmam zero tenants de fixture, zero plans
  de fixture e zero linhas residuais nas tabelas escopadas pelo
  harness.
- ACL das RPCs consultada diretamente via `pg_proc` / `aclexplode` /
  `has_function_privilege`: owner (`postgres`) + `service_role`
  retêm `EXECUTE`; `anon`, `authenticated`, `authenticator` e
  `PUBLIC` continuam sem privilégio. `sandbox_exec` é role
  operacional gerenciada pela plataforma e formalizada em §6.2 do
  impact analysis como **fora do trust boundary da aplicação**
  (não assumível por `anon`/`authenticated`/`authenticator`/
  `service_role`; `pg_has_role` = false para todos; zero uso em
  `src/`).

## Escopo materializado nesta execução

Alterações restritas aos quatro arquivos autorizados:

- `src/integrations/supabase/__tests__/commercial-seat-sql-parity.spec.ts`
  — refatoração canônica do harness:
  1. `commercial_entitlement_definitions` deixa de ser mutada; o
     upsert anterior foi removido e substituído por preflight
     read-only fail-closed (`validateCatalogPreconditions`).
  2. Toda a orquestração passa a rodar em `try/finally` global;
     `runCleanupFailClosed` é sempre executado.
  3. Verificação residual explícita inclui `user_roles`.
  4. Cenário 17 usa dois UUIDs dinâmicos por run e foi renomeado
     para descrever o que ele realmente prova
     (decisão canônica `billing_blocked` sob duplicidade), sem
     alegar tie-break `id ASC` observável no DTO.
  5. Nova assertion estrutural (`S1`) lê a definição canônica
     `CREATE OR REPLACE FUNCTION resolve_commercial_seat_decision`
     das migrations versionadas e valida a sequência de ordenação
     (`status priority`, `started_at DESC NULLS LAST`, `id ASC`).
     Contabilizada separadamente dos cenários RPC.
  6. Grupo dedicado de **rejection contract** (6 casos) exercita
     erros reais da RPC via `service_role` com validação
     **strict/fail-closed**: `data === null`, `error` presente,
     `error.code` exatamente `22023` (código ausente reprova) e
     `error.message` validada por igualdade exata ou prefixo
     canônico declarado (`startsWith`), nunca por substring em
     posição arbitrária. Cobre: `Invalid requestedIncrement`
     (incrementos 0 e 2), `Invalid tenant origin`, `Actor not
     found`, `Super admin requires impersonation origin` (com
     tenant real provisionado) e `Tenant not found`.
  7. Snapshot dos fields canônicos selecionados de `users.seats`
     capturado antes e depois; catálogo reportado como
     `catalog unchanged: yes` sobre os fields selecionados
     (não comparação byte-a-byte física da linha).
  8. Flag test-only
     `COMMERCIAL_PARITY_INJECT_FAILURE_AFTER_SETUP=1` demonstra o
     lifecycle fail-closed.
- `run-commercial-sql-parity-specs.ts` — runner raiz reporta os
  três grupos separadamente, imprime snapshots de catálogo, encerra
  com exit ≠ 0 em qualquer falha (fatal, cenário, cleanup, catálogo
  divergente) e sanitiza o log de erro inesperado.
- `docs/architecture/impact-analysis/F4-CF-01-…md` — §6/§7/§8/§11
  reescritos para refletir a arquitetura atual: catálogo
  read-only, cleanup em `try/finally` global, `user_roles` no
  residual verification, cenário 17 sem falsa evidência,
  contagens 17 + 6 + 1, drift residual de `sandbox_exec` como
  risco de ambiente.
- Este relatório — atualizado consistentemente.

## Ausências declaradas

- **Zero alteração em `supabase/migrations/**`.** Nenhuma migration
  nova foi criada; a reclosure permanece em
  `20260714001218_174dfdbe-2a4e-40ff-adbc-79068e369823.sql`.
- Zero alteração em `docs/architecture/ROADMAP_ARCHITECTURAL.md`.
- Zero alteração em runtime produtivo (`src/lib/api/commercial/**`,
  RPCs `resolve_commercial_seat_decision` /
  `mutate_tenant_membership`, RLS, grants, schema, frontend,
  providers, secrets).
- Zero UI, zero frontend, zero rota nova, zero componente novo.
- Zero implementação de provider billing, checkout, customer portal,
  webhook público real, invitation flow, dashboard final, Kanban
  final, custom domain, onboarding ou CMS.
- Zero início da PR-PH.0. Zero abertura do Phase 4 Closing Review.
- Zero mutação de `commercial_entitlement_definitions` (catálogo
  `users.seats` idêntico antes e depois).
- Zero renumeração retroativa do Product Roadmap.


## Bloco final do roadmap

```
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration —
Accepted.

17. F4-CF-01 — Phase 4 Repository Integrity, Documentation Placement
& Runtime Consistency Check and Fix —
Ready for External Audit.

18. Phase 4 Closing Review — Planned; not started.

PR-PH.0 — Pre-Homologation Product Readiness Impact Analysis —
Planned; not started.
```

A Fase 4 permanece **não encerrada formalmente** até a execução do
Phase 4 Closing Review. A homologação depende de PR-PH.0.
