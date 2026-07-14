# F4-CF-01 — Phase 4 Repository Integrity, Documentation Placement & Runtime Consistency Check and Fix

**Status:** Accepted
**Depends on:** SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — Accepted (external audit).
**Blocks:** None — Phase 4 Closing Review is authorized as the next checkpoint.

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

## 6. ACL / RLS — application authority vs managed operational role

The SCP-012 canonical contract is expressed in two distinct planes and
this section separates them explicitly. Verification independent of
any runner was executed via direct catalog inspection (`pg_roles`,
`pg_auth_members`, `pg_proc`, `aclexplode`, `has_function_privilege`,
`has_table_privilege`) — see §8.2 for the raw dump.

### 6.1 Application trust boundary (in-scope)

- `resolve_commercial_seat_decision(uuid,uuid,text,integer)` and
  `mutate_tenant_membership(uuid,uuid,text,text,uuid,text)`:
  `EXECUTE` accessible to the application is restricted to the function
  owner (`postgres`) and `service_role`. `anon`, `authenticated`,
  `PUBLIC` and the `authenticator` JWT role have **no** `EXECUTE`
  (`has_function_privilege = false`). The application runtime reaches
  these RPCs exclusively through `service_role` from `supabaseAdmin`
  inside server-only modules.
- `public.tenant_members`: `authenticated` retains only `SELECT`;
  `anon` / `PUBLIC` have no grant; `service_role` administrative.
  Policies `tm_select` / `tm_write` remain scoped to `authenticated`.
- No application principal (`anon`, `authenticated`, `authenticator`,
  `service_role`) is a member of any role able to `SET ROLE
  sandbox_exec` — confirmed by `pg_has_role(..., 'sandbox_exec',
  'MEMBER') = false` for each.

### 6.2 Managed operational trust boundary (out-of-scope for the application)

- `sandbox_exec` is a **platform-managed operational role**: `login=t`,
  `superuser=f`, `createrole=f`, `createdb=f`, `replication=f`,
  `bypassrls=t`, `inherit=t`. Its only grantors of `MEMBER` are
  `postgres` and `supabase_admin`; no application role can assume it.
- The managed environment automatically reprovisions `EXECUTE` on both
  RPCs and `SELECT` + `INSERT` on `tenant_members` for `sandbox_exec`
  after each migration. The `20260714001218_*.sql` reclosure remains
  applied and its in-transaction assertions continue to hold at
  application time; the reprovisioning happens outside the transaction.
- Repository evidence of scope: `rg -n "sandbox_exec" src/` returns a
  single occurrence, and it is a comment in the parity spec that
  explicitly states the harness does **not** use `sandbox_exec`
  (`no psql, no PGHOST, no sandbox_exec role`). Zero application-code
  references, zero secret, zero configuration binding, zero JWT
  mapping, zero frontend path.

**Formal conclusion.** `sandbox_exec` sits in the operational trust
boundary of the managed platform and is outside the application trust
boundary defined in `docs/architecture/security/SECURITY_ARCHITECTURE.md`.
Its residual privileges on the two RPCs and on `tenant_members` do not
grant additional authority to any application principal. This is
documented as a managed exception, not as an application-plane drift,
and Classe B remains closed at the application plane (§10).

## 7. Catálogos e contratos

Coerência preservada entre feature key catalog, `normalizeFeatureKey`,
`decideCommercialFeature`, `getCommercialFeatureDecision`,
`getCommercialSeatLimitDecision`, `CommercialLimitDecision`, contrato
RPC de seat decision, DTO da mutation, validator semântico e helper de
seat delta. `users.seats` continua catalogada. `requestedIncrement`
permanece inteiro positivo literal `1` dentro da RPC. Parser continua
com igualdade exata.

**Catalog `commercial_entitlement_definitions.users.seats` validated
read-only by the canonical harness.** The preflight reads the
selected canonical fields (`key`, `value_type`, `is_active`, `name`,
`unit`, `description`) and fails fail-closed if the row is absent,
inactive or has a divergent `value_type` — the harness never creates,
repairs, activates, renames or otherwise mutates any attribute of the
row. Snapshots are captured before and after the run; the comparison
is reported as `catalog unchanged: yes` on the selected canonical
fields (not a physical byte-for-byte row-level comparison).

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
  RPC via `service_role` com entradas que devem levantar. Contrato
  strict / fail-closed: (a) `data` deve ser `null` (nenhum payload
  de sucesso híbrido); (b) `error` deve existir; (c) `error.code`
  deve **exatamente** igualar o SQLSTATE esperado — código ausente
  reprova; (d) `error.message` é validada por igualdade exata ou
  prefixo canônico (`startsWith`) declarado explicitamente pelo
  cenário, nunca por substring em posição arbitrária. Todos os seis
  cenários exigem SQLSTATE `22023` e prefixo canônico extraído
  literalmente do `RAISE EXCEPTION` da RPC nas migrations Accepted
  (`Invalid requestedIncrement`, `Invalid tenant origin`, `Actor not
  found`, `Super admin requires impersonation origin`,
  `Tenant not found`).
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

### 8.2 Independent role and ACL evidence (current snapshot)

Direct catalog dump — no runner inference.

`sandbox_exec` role attributes (`pg_roles`):

```
rolname       | login | super | createrole | createdb | replication | bypassrls | inherit
sandbox_exec  |   t   |   f   |     f      |    f     |      f      |     t     |    t
```

`sandbox_exec` membership graph (`pg_auth_members` + `pg_has_role`):

```
role membership  : sandbox_exec ⇐ member: postgres (admin_option = t)
pg_has_role sandbox_exec MEMBER:
  anon           = false
  authenticated  = false
  authenticator  = false
  service_role   = false
  supabase_admin = true    -- platform admin, not application principal
  postgres       = true    -- owner, not application principal
```

RPC ACL:

```
proname                              | grantee       | privilege
resolve_commercial_seat_decision (4) | postgres      | EXECUTE   (owner)
resolve_commercial_seat_decision (4) | service_role  | EXECUTE
resolve_commercial_seat_decision (4) | sandbox_exec  | EXECUTE   (managed operational role — §6.2)
mutate_tenant_membership (6)         | postgres      | EXECUTE   (owner)
mutate_tenant_membership (6)         | service_role  | EXECUTE
mutate_tenant_membership (6)         | sandbox_exec  | EXECUTE   (managed operational role — §6.2)
```

`tenant_members` grants:

```
grantee       | privilege
authenticated | SELECT
sandbox_exec  | SELECT, INSERT                      -- managed operational role (§6.2)
service_role  | administrative (INSERT/UPDATE/DELETE/SELECT/…)
anon          | (none)
PUBLIC        | (none)
```

`has_function_privilege(...,'EXECUTE')`:

```
role           | resolve_exec | mutate_exec
anon           |    false     |    false
authenticated  |    false     |    false
authenticator  |    false     |    false
service_role   |    true      |    true
sandbox_exec   |    true      |    true    -- managed operational role (§6.2)
postgres       |    true      |    true    -- owner
```

`authenticated` remains **without** `INSERT` / `UPDATE` / `DELETE` on
`tenant_members`; the production runtime is served exclusively by
`service_role`. `anon` and `PUBLIC` remain without privilege on both
RPCs. `sandbox_exec` is not assumable by any application principal
(§6.2). The migration `20260714001218_*.sql` assertions remain valid
at application time — the residual `sandbox_exec` grants are
reprovisioned automatically by the managed environment and are
classified as an operational-trust-boundary exception, not an
application-plane drift.



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

### Classe B — encerrada (application plane)

- **Contrato de ACL das RPCs comerciais no plano de aplicação:**
  fechado. `anon`, `authenticated`, `authenticator`, `service_role`
  e principals derivados do JWT do produto não possuem `EXECUTE`
  em `resolve_commercial_seat_decision` nem em
  `mutate_tenant_membership`, e não podem `SET ROLE sandbox_exec`
  (`pg_has_role = false` para cada um). `tenant_members` continua
  restrito a `SELECT` para `authenticated`. Fixado pela migration
  `20260714001218_*.sql` com assertions fail-closed em transação e
  reconfirmado pelo dump independente §8.2.
- **Contrato strict de rejeição do harness canônico:** fechado.
  Os seis cenários de rejeição agora exigem SQLSTATE `22023`
  **obrigatório** (código ausente reprova), mensagem por igualdade
  exata ou prefixo canônico declarado, `data === null` e `error`
  presente. Nenhum caminho permissivo remanescente.
- **Exceção operacional gerenciada (`sandbox_exec`):** formalizada
  em §6.2 como parte do trust boundary operacional da plataforma,
  fora do trust boundary da aplicação. Evidência: role não é
  assumível por nenhum principal de aplicação, zero uso em
  `src/`, comportamento reproduzido pelo ambiente gerenciado após
  cada migration.

### Classe C — registrados como escopo futuro

- Provider billing real, checkout, customer portal, webhooks reais,
  invitation flow, UI comercial, dashboards finais, Kanban final,
  custom domain por tenant, onboarding, CMS/landing pages, Product
  Readiness, homologação. Nenhum implementado nesta etapa.
- Remoção definitiva do reprovisionamento automático de
  `sandbox_exec` pelo ambiente gerenciado — depende de coordenação
  com o gerenciamento da plataforma; sem impacto no trust boundary
  da aplicação.

## 11. Riscos / limitações reais remanescentes

- **Dependência da segurança operacional da plataforma gerenciada.**
  A exceção operacional formalizada em §6.2 confia que o ambiente
  gerenciado mantém `sandbox_exec` como role operacional não
  assumível por principals de aplicação. Qualquer alteração dessa
  postura pela plataforma reabriria a análise; monitoramento cabe
  ao owner da plataforma, não ao repositório do produto.
- **Cobertura numérica `MAX_SAFE_INTEGER` no plano de banco.**
  Cenário 16 do harness usa `999.999.999.999` (teto real de
  `numeric(14, 2)` no schema `tenant_entitlements.value_decimal`).
  A constante lógica `MAX_SAFE_INTEGER` da RPC continua coberta apenas
  por testes unitários (`commercial-seat-rpc-contract.spec.ts`,
  `commercial-seat-limit.spec.ts`). Sem alteração de schema nesta
  etapa.
- **Phase 4 Closing Review** é o próximo checkpoint autorizado; a
  Fase 4 permanece **não encerrada formalmente** até a auditoria
  externa do Closing Review.
- **PR-PH.0** continua obrigatório antes da homologação e não foi
  iniciado.

## 12. Confirmações negativas

- Zero nova migration. Zero alteração em `supabase/migrations/**`.
- Zero alteração em `runtime` produtivo (`src/lib/api/commercial/**`,
  RPCs, schema, RLS, grants, frontend, providers).
- Zero UI / frontend / rota nova / componente novo.
- Zero implementação de billing provider, checkout, customer portal
  ou webhook real.
- Zero início da PR-PH.0.
- Zero mutação do catálogo `commercial_entitlement_definitions` —
  registro `users.seats` idêntico antes e depois (fields canônicos
  selecionados).
- Zero uso de `sandbox_exec` em código de aplicação
  (`rg -n "sandbox_exec" src/` retorna apenas um comentário na
  spec do harness).

## 13. Gate final

- F4-CF-01 → **Accepted** (aceite externo materializado nos três
  locais canônicos).
- Phase 4 Closing Review → **Ready for External Audit** (novo
  artefato: `PHASE-4-CLOSING-REVIEW-*.md` + relatório 120).
- PR-PH.0 → **Planned; not started**.
- Harness canônico: 17 decision + 6 rejection (SQLSTATE + prefix
  strict) + 1 structural = todos passed; zero cleanup errors;
  catálogo comercial inalterado; execução injetada demonstra
  fail-closed lifecycle (exit 1, zero resíduos).

