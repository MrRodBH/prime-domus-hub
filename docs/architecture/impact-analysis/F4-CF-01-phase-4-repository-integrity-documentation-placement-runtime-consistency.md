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

Verificação prévia (SCP-012) permanece válida, sem alterações nesta
etapa:

- `mutate_tenant_membership` e `resolve_commercial_seat_decision`:
  EXECUTE apenas para function owner + `service_role`; PUBLIC, anon,
  authenticated e sandbox_exec sem privilégio.
- `tenant_members`: `authenticated` = `SELECT` somente; anon e PUBLIC
  sem privilégio; `service_role` administrativo; RLS restritiva.

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
| Legacy SQL parity probe           | `run-commercial-sql-parity-specs.ts`                     | psql probe   | não executa no sandbox (ver §11) |

## 9. Artefatos gerados

- `src/routeTree.gen.ts` coerente com `src/routes/**`.
- `src/integrations/supabase/types.ts` coerente com o schema real
  (contém `mutate_tenant_membership` e `resolve_commercial_seat_decision`).
- Nenhum probe temporário / fixture versionada / secret em disco.

## 10. Achados

### Classe A — corrigidos nesta etapa

- SCP-012 exibia `Ready for External Audit` no impact analysis, no
  relatório de entrega 118 e no roadmap → materializado como
  `Accepted` nos três locais canônicos.
- Campo `Blocks` do impact analysis SCP-012 atualizado para refletir
  F4-CF-01 como próximo checkpoint autorizado.
- Introdução histórica da Fase 4 no roadmap descrevia `BLOCKED`,
  IA-006 aguardando aprovação e SCP-001..SCP-010 como PROPOSED — bloco
  substituído integralmente por síntese consolidada coerente com o
  estado real.
- Roadmap agora registra: `17. F4-CF-01 — Ready for External Audit`,
  `18. Phase 4 Closing Review — Planned; not started`,
  `PR-PH.0 — Planned; not started`, distinção formal `PR-F6` vs
  `AR-F6` e diretriz futura "Data-Dense Premium Dark Interface".

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
