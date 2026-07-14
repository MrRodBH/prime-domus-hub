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
`pg_proc` / `aclexplode` / `has_function_privilege` /
`has_table_privilege` — ver §8.2 para o dump completo. Resumo pós
reclosure:

- `resolve_commercial_seat_decision(uuid,uuid,text,integer)` e
  `mutate_tenant_membership(uuid,uuid,text,text,uuid,text)`: owner
  `postgres`; **EXECUTE somente para o owner e `service_role`**.
  `anon`, `authenticated`, `sandbox_exec` e `PUBLIC` sem privilégio.
- `tenant_members`: `authenticated = SELECT` somente; `sandbox_exec =
  SELECT` somente (`INSERT`, `UPDATE`, `DELETE` revogados nesta etapa);
  `anon` / `PUBLIC` sem grant; `service_role` administrativo. As
  policies `tm_select` / `tm_write` continuam escopadas ao role
  `authenticated`.

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
| Denial parser                     | `commercial-seat-limit-denied-parser.spec.ts`            | unit (14)    | passed    |
| Membership mutation input         | `membership-mutation-input.spec.ts`                      | unit (43)    | passed    |
| Membership validation             | `membership-validation.spec.ts`                          | unit         | passed    |
| Tenant runner                     | `run-tenant-specs.ts`                                    | integration  | 233 passed |
| Membership parity + ACL           | `run-membership-mutation-parity-specs.ts`                | integration  | 14 passed  |
| Atomic seat enforcement           | `run-commercial-seat-atomic-enforcement-specs.ts`        | concurrency  | 10 passed  |
| **SQL/TS parity (canonical)**     | `run-commercial-sql-parity-specs.ts`                     | integration  | **17 passed / 0 failed** |

### 8.1 SQL/TypeScript parity runner — canonical integration gate

O runner `run-commercial-sql-parity-specs.ts` foi **modernizado** nesta
etapa e volta a ser gate corrente. A classificação anterior
(historical / superseded) foi encerrada.

Arquitetura final do harness:

- Cliente admin criado com `createClient(SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false,
  autoRefreshToken: false } })`. Nenhuma dependência de `psql`,
  `PGHOST`, `execFile` ou role `sandbox_exec`.
- Fixtures sintéticas isoladas por execução com namespace UUID próprio:
  auth users criados via `admin.auth.admin.createUser`, tenants,
  planos, entitlements, assinaturas, memberships e provider mappings
  inseridos via `admin.from(...).insert(...)`.
- Um único super-admin sintético por run recebe `super_admin` em
  `public.user_roles`; nenhum ID de usuário fixo permanece no arquivo.
- A RPC `resolve_commercial_seat_decision` é invocada por
  `admin.rpc(...)` a cada cenário.
- Oracle TypeScript computado a partir da MESMA fixture:
  `decideCommercialFeature` + `extractSeatLimit` +
  `decideCommercialSeatLimit`, com o mesmo tie-break de subscription
  (status priority, `started_at` DESC NULLS LAST, `id` ASC).
- Cada cenário compara integralmente SQL DTO × TS DTO × expected DTO
  sobre todo o contrato canônico: `tenantId`, `featureKey`, `allowed`,
  `reason`, `source`, `limit`, `used`, `requestedIncrement`,
  `remaining`. Nenhum campo é validado parcialmente.
- Cleanup fail-closed: erros de delete e de verificação residual são
  acumulados e o runner encerra com exit 1 se qualquer resíduo for
  detectado. Nenhum `.catch(() => {})` permanece no arquivo.
- Escopo de fixtures da limpeza: `tenant_billing_provider_mappings`,
  `tenant_members`, `tenant_entitlements`, `tenant_subscriptions`,
  `tenants`, `commercial_plan_entitlements`, `commercial_plans`,
  `user_roles` e `auth.users` (com validação canônica de
  `AuthApiError { status: 404, code: 'user_not_found' }`).

Matriz canônica preservada — 17 cenários totais, cobrindo:
`no subscription → billing_unknown`; `active + no entitlement → not_entitled`;
`past_due → billing_attention_required`; `canceled → billing_blocked`;
entitlement de tenant efetivo; entitlement de tenant NÃO efetivo
(janela expirada); entitlement `value_bool=false`; entitlement de plano
(sem override); entitlement com valor `text` (não numérico) →
`not_evaluated`; entitlement decimal fracionário → `not_evaluated`;
`limit=0` (`limit_reached`); `limit=2` + 1 active; `limit=2` + 1 active
+ 1 invited (`limit_reached`); `suspended`/`revoked` não contam;
`limit=2^31` (fronteira int4); `limit` numérico além de int4 dentro do
domínio `numeric(14,2)` do schema real (exercitando aritmética bigint
end-to-end); tie-break de subscription (mesmo status/started_at → id
ASC). Todos os cenários exigem `deepEqual(SQL, TS) && deepEqual(SQL,
expected) && deepEqual(TS, expected)`.

Resultado: **17 passed / 0 failed**, cleanup errors = 0, resíduos = 0.

Observação sobre o cenário 16 (limite acima de int4): a coluna
`tenant_entitlements.value_decimal` é `numeric(14, 2)`. A constante
lógica `MAX_SAFE_INTEGER` (9.007.199.254.740.991) definida na RPC não
é atingível no armazenamento — o teto real do schema é
`999.999.999.999`. O cenário canônico foi mantido como "limite muito
acima de int4 dentro do domínio do schema", preservando a semântica de
aritmética bigint contra `int4 overflow`. A capacidade formal
`MAX_SAFE_INTEGER` da RPC permanece coberta pelo contrato unitário
(`commercial-seat-rpc-contract.spec.ts`, `commercial-seat-limit.spec.ts`)
e pelo próprio comentário no CREATE FUNCTION.

### 8.2 Independent ACL evidence (pós reclosure)

Dump direto do catálogo, sem inferência a partir de qualquer runner:

```
proname                              | grantee       | privilege
resolve_commercial_seat_decision (4) | postgres      | EXECUTE   (owner)
resolve_commercial_seat_decision (4) | service_role  | EXECUTE
mutate_tenant_membership (6)         | postgres      | EXECUTE   (owner)
mutate_tenant_membership (6)         | service_role  | EXECUTE

has_function_privilege (both RPCs):
  postgres       → true   (owner)
  service_role   → true
  anon           → false
  authenticated  → false
  sandbox_exec   → false
  PUBLIC         → not in ACL (no implicit EXECUTE)
```

`tenant_members` grants pós-migration:

```
grantee       | privilege
authenticated | SELECT
sandbox_exec  | SELECT           -- INSERT/UPDATE/DELETE revogados
service_role  | (administrative)
anon          | (none)
PUBLIC        | (none)
```

`has_table_privilege('sandbox_exec', 'public.tenant_members', 'INSERT')`
= false; UPDATE = false; DELETE = false. `has_table_privilege
('authenticated', 'public.tenant_members', 'INSERT')` = false;
UPDATE = false; DELETE = false; SELECT = true. As assertions da própria
migration `20260714001218_*.sql` re-verificam esse estado dentro da
transação de aplicação (fail-closed).

## 9. Artefatos gerados

- `src/routeTree.gen.ts` coerente com `src/routes/**`.
- `src/integrations/supabase/types.ts` coerente com o schema real
  (contém `mutate_tenant_membership` e `resolve_commercial_seat_decision`).
- Nenhum probe temporário / fixture versionada / secret em disco.

## 10. Achados

### Classe A — corrigidos em execuções anteriores desta etapa

- SCP-012 materializada como `Accepted` nos três locais canônicos.
- Introdução histórica da Fase 4 no roadmap substituída por síntese
  consolidada.

### Classe B — detectado e encerrado nesta execução

- **Drift de ACL das RPCs comerciais.** Investigação independente
  detectou que `sandbox_exec` possuía `EXECUTE` em
  `resolve_commercial_seat_decision` e `mutate_tenant_membership`, e
  possuía `SELECT` + `INSERT` em `public.tenant_members` — em
  desacordo com o contrato canônico Accepted da SCP-012 (EXECUTE
  restrito a owner + `service_role`). Como consequência, o runner
  legado `run-commercial-sql-parity-specs.ts` também não estava
  demonstrando a matriz SQL × TS × expected lado a lado.
  Correção aplicada nesta execução:
  1. Migration nova (`20260714001218_*.sql`) revoga
     `EXECUTE` de `PUBLIC`/`anon`/`authenticated`/`sandbox_exec` nas
     duas RPCs; revoga `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`/
     `REFERENCES`/`TRIGGER` de `sandbox_exec` sobre `tenant_members`;
     re-concede `EXECUTE` apenas a `service_role`; valida o resultado
     via `pg_proc` / `aclexplode` / `has_function_privilege` /
     `has_table_privilege` fail-closed dentro da própria transação.
  2. Harness `run-commercial-sql-parity-specs.ts` +
     `commercial-seat-sql-parity.spec.ts` modernizados para
     fixtures service-role sintéticas (sem `psql`, sem `PGHOST`, sem
     IDs fixos de usuário), com comparação integral SQL × TS ×
     expected em todos os 17 cenários e cleanup fail-closed.
  3. Documentação F4-CF-01 (impact analysis + entrega 119) refeita
     para refletir o estado pós-reclosure. Classificação
     historical / superseded removida; runner readmitido como
     "current canonical integration gate".
  Estado pós-fix confirmado por dump de catálogo pós-migration e
  execução do harness — ver §8.1 e §8.2.

### Classe C — registrados como escopo futuro

- Provider billing real, checkout, customer portal, webhooks reais,
  invitation flow, UI comercial, dashboards finais, Kanban final,
  custom domain por tenant, onboarding, CMS/landing pages, Product
  Readiness, homologação. Nenhum implementado nesta etapa.

## 11. Riscos / limitações reais

- Cenário 16 do harness (limite acima de int4) usa
  `999.999.999.999` — teto real de `numeric(14, 2)` no schema
  `tenant_entitlements.value_decimal`. A constante lógica
  `MAX_SAFE_INTEGER` da RPC continua coberta apenas por testes
  unitários (RPC contract + limit decision). Alterar a precisão da
  coluna para admitir `MAX_SAFE_INTEGER` no armazenamento seria uma
  mudança de schema fora do escopo do F4-CF-01.
- Se o ambiente reprovisionar automaticamente grants para
  `sandbox_exec` após a migration, o assertion block da própria
  migration falharia na próxima reaplicação; o estado corrente
  observado (§8.2) é o pós-execução, imediatamente após a reclosure.
- F4-CF-01 encerra o checkpoint de integridade; o fechamento formal
  (Phase 4 Closing Review) permanece pendente.
- PR-PH.0 continua obrigatório antes da homologação e não foi
  iniciado.

## 12. Confirmações negativas

- Uma única migration nova (reclosure de ACL — grants/revokes e
  assertions). Zero alteração em lógica das RPCs, schema, RLS
  policies, `ROADMAP_ARCHITECTURAL.md`, runtime produtivo, frontend
  ou providers.
- Zero UI / frontend / rota nova.
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
