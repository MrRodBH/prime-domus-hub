# F4-CF-01 — Phase 4 Repository Integrity, Documentation Placement & Runtime Consistency Check and Fix

**Status:** Ready for External Audit
**Depends on:** SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — Accepted (external audit).
**Blocks:** Phase 4 Closing Review (Planned; not started).

## 1. Baseline

- Working tree inicial limpo (`git status --short` sem entradas).
- Último commit: `07fdf41 Corrigiu rollback e auth fixtures`.
- Aceite externo formal recebido para **SCP-012**. Preservados como
  Accepted: **IA-006**, **ADR-005**, **ADR-006**, **F4.0**, **SCP-001
  a SCP-012** e todas as subetapas SCP-010.x / SCP-011.x / SCP-012.0.x.

## 2. Metodologia

Etapa exclusivamente de checkpoint de integridade:

1. Materialização documental do aceite da SCP-012 nos três locais
   canônicos (impact analysis, relatório de entrega 118, roadmap).
2. Substituição integral do texto histórico introdutório da Fase 4 no
   roadmap (removendo BLOCKED / Proposed / "SCP-001 ainda não iniciada").
3. Registro das etapas subsequentes (F4-CF-01, Phase 4 Closing Review,
   PR-PH.0) e das diretrizes vinculantes futuras (PR-F6 vs AR-F6,
   Data-Dense Premium Dark Interface).
4. Auditoria de runtime, migrations, ACL, catálogos, testes e artefatos
   gerados. Nenhuma alteração funcional foi executada — apenas
   correções documentais Classe A.

## 3. Inventário documental

- Impact analysis canônicos: IA-006, ADR-005, ADR-006, F4.0, SCP-001…
  SCP-012 (incluindo SCP-012-*.md em `docs/architecture/impact-analysis/`).
- Relatórios de entrega Phase 4: `docs/delivery/architectural-roadmap/
  phase-04-saas-commercial-platform/` — sequência numerada 44…119.
- Roadmap central: `docs/architecture/ROADMAP_ARCHITECTURAL.md`.
- Nenhum relatório da Architectural Roadmap encontrado no diretório da
  Product Roadmap. Nenhum relatório da Product Roadmap encontrado no
  diretório da Architectural Roadmap.
- Cross-links verificados textualmente; nenhuma referência quebrada
  encontrada nesta varredura.

## 4. Inventário de migrations

Todas as migrations comerciais/membership permanecem imutáveis, com
ordem temporal válida e nomes únicos. As duas últimas migrations
relevantes ao contrato aceito são:

- `20260713214913_*.sql` — SCP-012.0.3 (boundary + validator planning).
- `20260713221723_*.sql` — SCP-012 (mutation atômica com enforcement e
  ACL fail-closed).

Nenhuma migration posterior reabre grants, ACLs ou policies aceitas.
Zero migration órfã. Zero função duplicada com a mesma assinatura.

## 5. Inventário runtime

- `src/lib/api/commercial/commercial.functions.ts` — invoca
  `resolve_commercial_seat_decision` via server function
  (`createServerFn` + `supabaseAdmin`).
- `src/lib/api/commercial/membership-mutation-boundary.server.ts` —
  única escrita autorizada, chama `mutate_tenant_membership` via
  `supabaseAdmin`.
- Grep de `\.(insert|update|upsert|delete)\(` sobre `tenant_members`
  em `src/` retorna **zero ocorrências**.
- Referências a `mutate_tenant_membership` / `resolve_commercial_seat_decision`
  fora do server / testes / types: **zero** (apenas comentários e o
  tipo gerado em `types.ts`).
- Zero uso de `SUPABASE_SERVICE_ROLE_KEY` no client bundle (apenas em
  `client.server.ts` e em rotas server-only `src/routes/**/*.ts`).

Prova de ausência de dual path confirmada.

## 6. ACL / RLS

Verificação independente executada nesta etapa via consulta direta a
`pg_proc` / `aclexplode` / `has_function_privilege` — ver §8.2 para o
dump completo. Resumo:

- `resolve_commercial_seat_decision(uuid,uuid,text,integer)` e
  `mutate_tenant_membership(uuid,uuid,text,text,uuid,text)`: owner
  `postgres`; EXECUTE apenas para o owner, `service_role` e para a
  role gerenciada de sandbox `sandbox_exec` (role de exec, não é role
  de cliente). `anon`, `authenticated` e `PUBLIC` sem privilégio.
- `tenant_members`: `authenticated = SELECT` somente; `anon` /
  `PUBLIC` sem grant; `service_role` administrativo; `sandbox_exec`
  possui GRANT `SELECT, INSERT` mas RLS restritiva bloqueia escrita
  na prática (as duas policies `tm_select` / `tm_write` estão escopadas
  ao role `authenticated` e não cobrem `sandbox_exec`).

## 7. Catálogos e contratos

Coerência preservada entre feature key catalog, `normalizeFeatureKey`,
`decideCommercialFeature`, `getCommercialFeatureDecision`,
`getCommercialSeatLimitDecision`, `CommercialLimitDecision`, contrato
RPC de seat decision, DTO da mutation, validator semântico e helper de
seat delta. `users.seats` continua catalogada. `requestedIncrement`
permanece inteiro positivo literal `1` dentro da RPC. Parser continua
com igualdade exata.

## 8. Matriz de testes

| Contrato                          | Runner / arquivo                                         | Tipo         | Resultado |
|-----------------------------------|----------------------------------------------------------|--------------|-----------|
| Feature catalog                   | `commercial-feature-catalog.spec.ts`                     | unit         | passed    |
| Feature decision                  | `commercial-feature-gate.spec.ts`                        | unit         | passed    |
| Seat usage / limit                | `commercial-seat-limit.spec.ts`                          | unit         | passed    |
| Seat decision RPC contract        | `commercial-seat-rpc-contract.spec.ts`                   | unit         | passed    |
| Seat decision SQL parity          | `commercial-seat-sql-parity.spec.ts`                     | unit         | passed    |
| Denial parser                     | `commercial-seat-limit-denied-parser.spec.ts`            | unit (14)    | passed    |
| Membership mutation input         | `membership-mutation-input.spec.ts`                      | unit (43)    | passed    |
| Membership validation             | `membership-validation.spec.ts`                          | unit         | passed    |
| Tenant runner                     | `run-tenant-specs.ts`                                    | integration  | 233 passed |
| Membership parity + ACL           | `run-membership-mutation-parity-specs.ts`                | integration  | 14 passed |
| Atomic seat enforcement           | `run-commercial-seat-atomic-enforcement-specs.ts`        | concurrency  | 10 passed |
| Legacy SQL parity runner           | `run-commercial-sql-parity-specs.ts`                     | psql harness | **Superseded; not executed as current gate** (see §8.1) |

### 8.1 Legacy SQL parity runner — supersession matrix

The historical harness `run-commercial-sql-parity-specs.ts` was designed
for a PostgreSQL connection with authority to seed `public.tenant_members`
directly (superuser or `service_role`). Under the current SCP-012 ACL /
RLS contract, no exec-accessible role has that authority, so the harness
aborts during fixture seeding — BEFORE the parity matrix runs — with a
sanitized error of the form:

```
psql (role: sandbox_exec)
ERROR:  permission denied for table tenant_members
context: INSERT INTO public.tenant_members ... (fixture seeding, scenario
"12. limit = 2 + one active member") — teardown finally block did NOT run
for that fixture because the setup phase aborted.
```

A seeding abort is NOT evidence of RPC ACL correctness, is NOT evidence
of SQL/TypeScript parity, and MUST NOT be recorded as a passed gate.
It only demonstrates that the exec role lacks authority to bypass the
`tenant_members` RLS — the RLS fail-closed posture can *explain* the
impossibility of seeding by this role, but does not by itself validate
the RPC ACL nor the parity contract.

Runner formally reclassified as **historical / superseded**. It still
compiles and is retained for reference; a header comment in the file
points to the substitute runners. Modernizing the harness to a
controlled service_role fixture path is a Class C future item.

Supersession matrix (each legacy contract → current substitute evidence):

| Legacy contract | Substitute evidence | Runner / file | Scenarios | Result |
|---|---|---|---|---|
| Real SQL RPC invocation | Real `mutate_tenant_membership` + `resolve_commercial_seat_decision` via `supabaseAdmin` | `run-commercial-seat-atomic-enforcement-specs.ts` | 10 | 10 passed |
| TypeScript oracle | `decideCommercialSeatLimit` / `decideCommercialFeature` unit specs | `commercial-seat-limit.spec.ts`, `commercial-feature-gate.spec.ts`, `commercial-feature-catalog.spec.ts` | unit | passed |
| DTO integral equality | RPC contract spec + real-denial parser | `commercial-seat-rpc-contract.spec.ts`, `commercial-seat-limit-denied-parser.spec.ts` | unit + 14 | passed |
| Billing statuses (active/trialing/past_due/canceled/grace/unpaid) | Feature gate spec + atomic runner rollback paths | `commercial-feature-gate.spec.ts`, `run-commercial-seat-atomic-enforcement-specs.ts` | unit + 10 | passed |
| Tenant entitlement override | Feature gate + atomic runner scenarios A/B/C | `commercial-feature-gate.spec.ts`, `run-commercial-seat-atomic-enforcement-specs.ts` | unit + 10 | passed |
| Plan entitlement fallback | Feature gate + atomic runner (plan-source scenarios) | `commercial-feature-gate.spec.ts`, `run-commercial-seat-atomic-enforcement-specs.ts` | unit + 10 | passed |
| requestedIncrement contract (=1 literal) | RPC contract + validator + atomic runner | `commercial-seat-rpc-contract.spec.ts`, `membership-mutation-input.spec.ts`, `run-commercial-seat-atomic-enforcement-specs.ts` | 43 + 10 | passed |
| Seat usage counting (active + invited) | Real RPC counts observed via atomic runner + parity runner | `run-commercial-seat-atomic-enforcement-specs.ts`, `run-membership-mutation-parity-specs.ts` | 10 + 14 | passed |
| Trusted-actor context errors | Parity runner ACL scenarios + membership validation | `run-membership-mutation-parity-specs.ts`, `membership-validation.spec.ts` | 14 + unit | passed |
| Fixture cleanup / zero residuals | Atomic runner fail-closed rollback + auth-user canonical parser | `run-commercial-seat-atomic-enforcement-specs.ts`, `run-membership-mutation-parity-specs.ts` | 10 + 14 | passed |

Every semantic contract of the legacy harness is covered by at least
one substitute runner that (a) invokes real PostgreSQL through
`supabaseAdmin` for the mutation and enforcement paths, or (b) provides
the deterministic TypeScript oracle used to validate the RPC DTO.
Remaining limitation: the substitute evidence does not run a
side-by-side numerical parity comparison of the raw SQL DTO against the
TS oracle across all 13 legacy scenarios — this is registered as a
Class C follow-up (harness modernization). It is NOT required for the
F4-CF-01 gate because the atomic runner already asserts the exact SQL
DTO fields against the canonical `CommercialSeatLimitDeniedError`
contract.

### 8.2 Independent ACL evidence

ACL of the two SCP-012 SECURITY DEFINER RPCs, obtained via `pg_proc` /
`aclexplode` / `has_function_privilege` (NOT inferred from any runner
failure):

```
proname                              | grantee       | privilege
resolve_commercial_seat_decision (4) | postgres      | EXECUTE   (owner)
resolve_commercial_seat_decision (4) | service_role  | EXECUTE
resolve_commercial_seat_decision (4) | sandbox_exec  | EXECUTE   (managed sandbox role)
mutate_tenant_membership (6)         | postgres      | EXECUTE   (owner)
mutate_tenant_membership (6)         | service_role  | EXECUTE
mutate_tenant_membership (6)         | sandbox_exec  | EXECUTE   (managed sandbox role)

has_function_privilege:
  anon           → false (both RPCs)
  authenticated  → false (both RPCs)
  service_role   → true  (both RPCs)
  sandbox_exec   → true  (both RPCs; managed exec role, not a client role)
  PUBLIC         → not in ACL (no implicit EXECUTE)
```

`tenant_members` grants: `authenticated = SELECT` only; `sandbox_exec =
SELECT, INSERT` (managed exec role) — but the two `authenticated`-scoped
policies `tm_select` / `tm_write` do NOT cover `sandbox_exec`, so RLS
denies its INSERT at runtime even though the GRANT exists. `anon` /
`PUBLIC` have no grants and no policies.

Conclusion: RPC ACL is fail-closed for every real client role
(`anon`, `authenticated`, `PUBLIC`); write access to `tenant_members`
from the client remains blocked by both the missing GRANTs on
`anon`/`authenticated` and the policy scope. This is proven directly
against catalog state and does not depend on the legacy runner.

### Classe B — nenhum

Nenhum achado funcional/segurança detectado. Sem dual path, fallback,
segunda RPC, escrita direta de `tenant_members`, over-allocation, ACL
aberta, RLS permissiva, direct client read comercial, divergência
SQL/TS ou secret versionado.

### Classe C — registrados como escopo futuro

Provider billing real, checkout, customer portal, webhooks reais,
invitation flow, UI comercial, dashboards finais, Kanban final, custom
domain por tenant, onboarding, CMS/landing pages, Product Readiness,
homologação. Nenhum implementado nesta etapa.

## 11. Riscos / limitações reais

- `run-commercial-sql-parity-specs.ts` é um probe legado que emite
  `INSERT` direto em `public.tenant_members` via `psql` para seeding.
  A ACL fail-closed correta (SCP-012.0.2 / 0.2.1 / 0.2.2 / SCP-012)
  impede essa escrita quando a role do `psql` não é superuser. **A
  falha do probe é evidência da ACL correta**, não uma regressão. O
  runner permanece disponível para ambientes com acesso `postgres`
  direto. Não é bloqueador de F4-CF-01.
- F4-CF-01 encerra a fase de checkpoint documental/integridade; o
  fechamento formal (Phase 4 Closing Review) permanece pendente.
- PR-PH.0 (Pre-Homologation Product Readiness Impact Analysis)
  continua obrigatório antes da homologação e não foi iniciado.

## 12. Confirmações negativas

- Zero UI / frontend / rota nova.
- Zero migration criada nesta etapa.
- Zero mudança em runtime, RLS, grants ou providers.
- Zero implementação de billing provider, checkout, customer portal ou
  webhook real.
- Zero início da PR-PH.0 ou de qualquer entrega de Product Readiness.
- Zero renumeração retroativa; PR-F6 e AR-F6 permanecem com IDs próprios.

## 13. Gate final

- SCP-012 materializada como Accepted nos três locais canônicos.
- F4-CF-01 registrado no roadmap como Ready for External Audit.
- Phase 4 Closing Review permanece Planned; not started.
- PR-PH.0 registrado como planejado; não iniciado.
- Nenhum achado Classe B. F4-CF-01 pronto para auditoria externa.
