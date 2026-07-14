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
`has_table_privilege` — ver §8.2 para o dump completo. Estado
observado no ambiente gerenciado atual:

- Migration `20260714001218_*.sql` foi aplicada e contém assertions
  fail-closed que garantem o contrato canônico no momento da
  transação. **O ambiente gerenciado, entretanto, reprovisiona
  automaticamente o role `sandbox_exec`** após a aplicação: no
  snapshot atual `sandbox_exec` volta a possuir `EXECUTE` nas duas
  RPCs e `SELECT` + `INSERT` em `public.tenant_members`. Isso NÃO é
  ACL de aplicação nem de cliente (roles usadas em produção continuam
  restringidas), e está registrado como risco residual em §11.
- `resolve_commercial_seat_decision(uuid,uuid,text,integer)` e
  `mutate_tenant_membership(uuid,uuid,text,text,uuid,text)`: owner
  `postgres` + `service_role` retêm `EXECUTE`; `anon`, `authenticated`
  e `PUBLIC` continuam sem privilégio. O runtime produtivo continua
  atendido exclusivamente por `service_role`.
- `tenant_members`: `authenticated = SELECT` somente; `anon` /
  `PUBLIC` sem grant; `service_role` administrativo. Policies
  `tm_select` / `tm_write` continuam escopadas ao role
  `authenticated`.

## 7. Catálogos e contratos

Coerência preservada entre feature key catalog, `normalizeFeatureKey`,
`decideCommercialFeature`, `getCommercialFeatureDecision`,
`getCommercialSeatLimitDecision`, `CommercialLimitDecision`, contrato
RPC de seat decision, DTO da mutation, validator semântico e helper de
seat delta. `users.seats` continua catalogada. `requestedIncrement`
permanece inteiro positivo literal `1` dentro da RPC. Parser continua
com igualdade exata.

**Catálogo `commercial_entitlement_definitions.users.seats` validado
read-only pelo harness canônico.** Preflight lê `key`, `value_type`,
`is_active`, `name`, `unit`, `description` e falha fail-closed se o
registro estiver ausente, inativo ou com `value_type` divergente do
contrato — o harness NÃO cria, corrige, ativa, renomeia nem altera
qualquer atributo do registro. O snapshot é lido antes e depois da
execução; a comparação byte-a-byte é reportada como
`catalog unchanged: yes`.

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
| **SQL/TS parity (canonical)**     | `run-commercial-sql-parity-specs.ts`                     | integration  | **17 decision / 6 rejection / 1 structural — all passed** |

### 8.1 SQL/TypeScript parity runner — canonical integration gate

Arquitetura final do harness (todas as regras da execução atual são
observáveis no arquivo `commercial-seat-sql-parity.spec.ts`):

- Cliente admin criado com `createClient(SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false,
  autoRefreshToken: false } })`. Sem `psql`, sem `PGHOST`, sem
  `sandbox_exec`.
- **Toda a orquestração ocorre dentro de um `try/finally` global.**
  Setup, cenários, rejection e assertion estrutural ficam no `try`;
  o `finally` executa `runCleanupFailClosed()` mesmo que qualquer
  etapa lance. Erro fatal é registrado como `fatalError` e o runner
  encerra com exit 1.
- Fixtures sintéticas por execução com UUIDs próprios: auth users via
  `admin.auth.admin.createUser`, `user_roles`, `tenants`,
  `commercial_plans`, `commercial_plan_entitlements`,
  `tenant_subscriptions`, `tenant_entitlements`, `tenant_members` e
  `tenant_billing_provider_mappings` inseridos via
  `admin.from(...).insert(...)`. **Nenhuma tabela global de catálogo
  é alterada.**
- Um único super-admin sintético por run recebe `super_admin` em
  `public.user_roles`; nenhum ID fixo permanece no arquivo. O
  cenário 17 gera dois UUIDs por execução via
  `[crypto.randomUUID(), crypto.randomUUID()].sort()`.
- **Grupo 1 — decision parity (17 cenários).** Cada cenário compara
  integralmente SQL DTO × TS DTO × expected DTO sobre o contrato
  canônico completo: `tenantId`, `featureKey`, `allowed`, `reason`,
  `source`, `limit`, `used`, `requestedIncrement`, `remaining`.
  Todos exigem `deepEqual(SQL, TS) && deepEqual(SQL, expected) &&
  deepEqual(TS, expected)`.
- **Grupo 2 — rejection contract (6 cenários).** Chamadas reais à
  RPC via service_role com entradas que devem levantar. Cada caso
  valida ausência de DTO de sucesso, prefixo canônico da mensagem
  (`Invalid requestedIncrement`, `Invalid tenant origin`,
  `Actor not found`, `Super admin requires impersonation origin`,
  `Tenant not found`) e SQLSTATE (`22023`). Nenhum erro genérico é
  aceito como aprovação; as mensagens são extraídas literalmente do
  `RAISE EXCEPTION` da RPC nas migrations Accepted.
- **Grupo 3 — structural ordering assertion (1 verificação).** Lê a
  última definição `CREATE OR REPLACE FUNCTION
  public.resolve_commercial_seat_decision` presente nas migrations
  versionadas, extrai o corpo pelo delimitador `$…$`, normaliza
  whitespace e valida via regex canônica que a seleção de
  subscription contém `CASE status WHEN 'active' THEN 0 …
  started_at DESC NULLS LAST, id ASC LIMIT 1`. Falha se a função
  não for encontrada ou se a ordenação não coincidir. **Esta
  assertion NÃO é contabilizada como cenário RPC** e é a única
  evidência canônica do tie-break `id ASC` neste runner (o DTO da
  RPC não expõe qual subscription foi escolhida).
- **Cleanup fail-closed (`runCleanupFailClosed`).** Ordem
  referencial preservada; nenhum `.catch(() => {})`. Ao final,
  verificação residual explícita por
  `tenant_billing_provider_mappings`, `tenant_members`,
  `tenant_entitlements`, `tenant_subscriptions`, `tenants`,
  `commercial_plan_entitlements`, `commercial_plans`,
  **`user_roles`** (novo nesta execução) e `auth.users`. Para
  `auth.users`, preserva o classificador canônico
  `AuthApiError { status: 404, code: 'user_not_found' }`; qualquer
  outro erro, resposta vazia ou linha residual falha o cleanup.

### 8.1.1 Cenário 17 — correção do falso positivo

O nome anterior (“subscription tie: same status/started_at → id ASC
wins”) sugeria que o cenário provava, no runtime, que a subscription
de `id` menor era escolhida. Isso era **falso positivo**: com duas
subscriptions `canceled` e mesmo `started_at`, o DTO final é o
mesmo (`billing_blocked`) independentemente de qual subscription
tenha sido escolhida — o cenário nunca observou a identidade da
subscription selecionada.

Correções aplicadas nesta execução:

1. UUIDs dinâmicos por run —
   `const [idA, idB] = [uuid(), uuid()].sort();` — em vez dos IDs
   fixos anteriores.
2. Renomeado para
   `17. duplicate canceled subscriptions with equal started_at →
   canonical billing_blocked decision`. O cenário passa a validar
   somente:
   - estabilidade da decisão sob múltiplos registros históricos;
   - ausência de erro com duplicidade;
   - paridade SQL × TS × expected.
3. A prova canônica do tie-break `id ASC` migra para a assertion
   estrutural (§8.1, grupo 3), que lê a definição real da função
   nas migrations. Nenhuma afirmação de “id ASC winner observável
   no DTO” permanece no arquivo.

### 8.1.2 Cenário 16 — cobertura numérica

A coluna `tenant_entitlements.value_decimal` é `numeric(14, 2)`. O
teto real de armazenamento é `999.999.999.999`, valor efetivamente
executado no cenário 16 — bem acima do limite `int4` (`2^31 - 1`),
o que exercita a aritmética `bigint` end-to-end na RPC. Isso **não
equivale** a executar `MAX_SAFE_INTEGER` (9.007.199.254.740.991) no
banco: esse limite lógico da RPC continua coberto exclusivamente por
`commercial-seat-rpc-contract.spec.ts` e
`commercial-seat-limit.spec.ts` no plano unitário. Nenhum arquivo
não autorizado foi alterado para ampliar essa cobertura.

### 8.1.3 Fail-closed lifecycle observável

O harness aceita a flag exclusivamente de teste
`COMMERCIAL_PARITY_INJECT_FAILURE_AFTER_SETUP=1`. Quando ativa,
lança um erro sintético imediatamente após o primeiro
`setupFixture()` do primeiro cenário. Regras:

- flag ausente na execução normal;
- não é lida por nenhum caminho de produção;
- execução normal e execução injetada são reportadas separadamente;
- execução injetada **deve** encerrar com exit ≠ 0, fixture
  parcial **deve** ser removida e o residual verification **deve**
  reportar zero linhas em todas as tabelas.

Resultado observado nesta execução:

```
Normal   : decision 17/17, rejection 6/6, structural 1/1,
           cleanup errors 0, fatal no,  catalog unchanged yes, exit 0
Injected : decision 0/0,   rejection 0/0, structural 0/0,
           cleanup errors 0, fatal yes, catalog unchanged yes, exit 1
```

### 8.2 Independent ACL evidence (snapshot atual)

Dump direto do catálogo, sem inferência a partir de runner algum:

```
proname                              | grantee       | privilege
resolve_commercial_seat_decision (4) | postgres      | EXECUTE   (owner)
resolve_commercial_seat_decision (4) | service_role  | EXECUTE
resolve_commercial_seat_decision (4) | sandbox_exec  | EXECUTE   (auto-reprovisionado — §11)
mutate_tenant_membership (6)         | postgres      | EXECUTE   (owner)
mutate_tenant_membership (6)         | service_role  | EXECUTE
mutate_tenant_membership (6)         | sandbox_exec  | EXECUTE   (auto-reprovisionado — §11)
```

`tenant_members` grants (snapshot atual):

```
grantee       | privilege
authenticated | SELECT
sandbox_exec  | SELECT, INSERT                      -- auto-reprovisionado (§11)
service_role  | administrativo (INSERT/UPDATE/DELETE/SELECT/…)
anon          | (none)
PUBLIC        | (none)
```

`authenticated` continua **sem** `INSERT` / `UPDATE` / `DELETE` em
`tenant_members`; o runtime produtivo continua atendido apenas por
`service_role`. `anon` e `PUBLIC` continuam sem privilégio nas duas
RPCs. As assertions da migration `20260714001218_*.sql` seguem
válidas no momento da aplicação — o drift residual ocorre depois,
por reprovisionamento automático do ambiente gerenciado (§11).



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
