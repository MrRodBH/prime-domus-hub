# 119 — F4-CF-01 — Phase 4 Repository Integrity, Documentation Placement & Runtime Consistency Check and Fix

**Status:** Ready for External Audit
**Phase:** 04 — SaaS Commercial Platform
**Depends on:** SCP-012 — Accepted.
**Blocks:** Phase 4 Closing Review — Planned; not started.

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

## Verificações executadas

- `bunx tsc --noEmit -p tsconfig.json` → exit 0.
- `bunx tsx ./run-tenant-specs.ts` → 233 passed / 0 failed.
- `bunx tsx ./run-membership-mutation-parity-specs.ts` → 14 passed / 0 failed.
- `bunx tsx ./run-commercial-seat-atomic-enforcement-specs.ts` → 10 passed / 0 failed.
- `bunx tsx ./run-commercial-sql-parity-specs.ts` → **17 passed / 0 failed**
  (canonical integration gate — RLS-safe, service-role fixtures, SQL DTO
  vs TypeScript oracle vs expected DTO deep-equal across the full field
  set for every scenario). Zero cleanup errors; zero residuals.
- Migration `20260714001218_*.sql` — ACL reclosure:
  `resolve_commercial_seat_decision(uuid,uuid,text,integer)` and
  `mutate_tenant_membership(uuid,uuid,text,text,uuid,text)` now expose
  EXECUTE only to owner (`postgres`) and `service_role`. `sandbox_exec`
  loses EXECUTE on both RPCs and loses INSERT/UPDATE/DELETE on
  `public.tenant_members` (retains SELECT). `authenticated` remains
  SELECT-only on `tenant_members`; `anon`/`PUBLIC` remain empty. All
  transitions verified inside the migration via `pg_proc` / `aclexplode`
  / `has_function_privilege` / `has_table_privilege` fail-closed
  assertions.
- ACL das RPCs `resolve_commercial_seat_decision` e
  `mutate_tenant_membership` verificada de forma independente via
  `pg_proc` / `aclexplode` / `has_function_privilege` (ver §8.2 do
  impact analysis): `anon`, `authenticated`, `PUBLIC` sem EXECUTE;
  EXECUTE apenas para owner (`postgres`), `service_role` e a role
  gerenciada de sandbox `sandbox_exec` (role de exec, não é role de
  cliente).
- Grep de escritas diretas em `tenant_members` no runtime TypeScript:
  zero ocorrências. Grep de referências a
  `mutate_tenant_membership` / `resolve_commercial_seat_decision` fora
  do boundary/server/tests/types: zero ocorrências.
- ACL e RLS previamente verificadas em SCP-012 permanecem inalteradas.

## Ausências declaradas

- Zero migration, zero mudança de runtime, zero mudança de RLS/grants.
- Zero UI, zero frontend, zero rota nova, zero componente novo.
- Zero implementação de provider billing, checkout, customer portal,
  webhook público real, invitation flow, dashboard final, Kanban final,
  custom domain, onboarding ou CMS.
- Zero início da PR-PH.0. Zero abertura do Phase 4 Closing Review.
- Zero renumeração retroativa do Product Roadmap. Zero alteração no
  Architectural Roadmap · Fase 6 (Plugin Marketplace Evolution).

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
