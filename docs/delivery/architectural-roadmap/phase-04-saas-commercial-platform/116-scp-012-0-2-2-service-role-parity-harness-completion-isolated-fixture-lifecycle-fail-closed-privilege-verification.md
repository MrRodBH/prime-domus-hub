# 116 — SCP-012.0.2.2 — Service-Role Parity Harness Completion, Isolated Fixture Lifecycle & Fail-Closed Privilege Verification

## Status

Accepted with documented non-blocking test coverage limitation. A auditoria crítica externa proporcional ao risco aprovou a etapa com base em: (i) RPC restrita a owner + service_role; (ii) runtime `getCommercialSeatLimitDecision` SQL-only, sem fallback TypeScript; (iii) contrato numérico da RPC e validator runtime corretos para o domínio persistido e para os valores alcançáveis pelo schema; (iv) evidência combinada de smoke tests reais em PostgreSQL, inspeção SQL, validator semântico e 176 testes unitários aprovados; (v) ausência de regressão de segurança, mutation, lock, enforcement, alteração de RLS ou expansão indevida de escopo. A matriz de 40 cenários foi reclassificada como exigência desproporcional: os cenários bloqueados por `int_non_negative_chk`, `decimal_non_negative_chk` e pelos tipos `integer` / `numeric(14,2)` das colunas `value_int` / `value_decimal` referem-se a limites comercialmente inválidos (negativos) ou fora do domínio real de assentos por tenant (≥ 2^31), e o schema não será ampliado; **SCP-012.0.2.3 (Entitlement Numeric Column Widening) não foi criada**. A materialização integral do harness service-role automatizado permanece como **limitação de cobertura não bloqueante** e será revisada em **F4-CF-01 — Phase 4 Repository Integrity, Documentation Placement & Runtime Consistency Check and Fix**, ponto de controle consolidado a ser executado após o encerramento da cadeia SCP-012 e antes do fechamento formal da Fase 4. F4-CF-01 **não** é etapa ativa entre SCP-012.0.2.2 e SCP-012.0.3.

## Baseline e ambiente

- Baseline vinculante: `b7d9cf998e5524fe12454f964822ac4992b1c782`
  (`Corrigiu e endureceu 012.0.2`).
- Working tree inicial: limpo.
- Ambiente: PostgreSQL gerenciado do projeto (mesma instância utilizada
  em SCP-012.0.2 e SCP-012.0.2.1).

## Arquitetura do harness anterior (rejeitado)

`run-commercial-sql-parity-specs.ts` + `commercial-seat-sql-parity.spec.ts`
utilizavam `psql` com o role `sandbox_exec`. Rejeitado pela auditoria
externa (SCP-012.0.2.1 P1–P12): role incompatível com a fronteira
service_role-only da RPC, fixtures de `tenant_members` bloqueadas por
RLS, usuários produtivos hardcoded, matriz parcial (17 cenários), runner
com `exit != 0`.

## Arquitetura service_role adotada (§5)

Design canônico:

- `@supabase/supabase-js` server-side.
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` lidos de env, nunca
  logados.
- `auth.persistSession = false`, `autoRefreshToken = false`.
- INSERT / DELETE / RPC exclusivamente via service_role.
- Chamada autoritativa:
  ```
  supabaseAdmin.rpc("resolve_commercial_seat_decision", {
    _actor_user_id, _tenant_id, _tenant_origin, _requested_increment: 1,
  })
  ```
- Environment guard: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e
  `COMMERCIAL_SQL_PARITY_ALLOW_FIXTURES=1` obrigatórios.

**Nesta execução esse harness foi projetado mas não codificado** — ver
§ "Motivo de parada §19".

## Materializado nesta execução

### Arquivos criados

- `src/lib/api/commercial/commercial-context-selection.ts` — módulo puro
  com `selectCommercialSubscription` e `selectPrimaryProviderMapping`.
- `src/integrations/supabase/__tests__/commercial-context-selection.spec.ts`
  — 8 casos unitários (empty, priority, DESC, NULLS LAST, tie-breaker
  observável reverso, provider active/fallback).
- `supabase/migrations/20260713203357_b2698312-fc50-4d3b-b9ba-9fa0cdba171a.sql`
  — REVOKE PUBLIC/anon/authenticated/sandbox_exec, GRANT service_role,
  bloco `RAISE EXCEPTION` fail-closed ao final. **Sem `WHEN OTHERS`**.
- `docs/architecture/impact-analysis/SCP-012.0.2.2-service-role-parity-harness-completion-isolated-fixture-lifecycle-fail-closed-privilege-verification.md`
- este relatório.

### Arquivos alterados

- `src/lib/api/commercial/commercial.functions.ts` — substitui
  helpers internos pelo import do módulo puro.
- `run-tenant-specs.ts` — registra a nova suíte.
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — 16.0.2.1 rebaixado;
  16.0.2.2 adicionado.
- `docs/architecture/impact-analysis/SCP-012.0.2.1-executable-sql-typescript-parity-numeric-contract-hardening-rpc-validation-evidence-reconciliation.md`
  — nome real da migration do catálogo corrigido.
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/115-scp-012-0-2-1-executable-sql-typescript-parity-numeric-contract-hardening-rpc-validation-evidence-reconciliation.md`
  — idem.
- `src/routeTree.gen.ts` (auto-gerado, se regenerado).

## Motivo de parada §19

Durante o reconnaissance obrigatório desta execução foi confirmado por
consulta ao `information_schema.columns` e `pg_constraint` que **quatro
cenários da matriz de 40 são estruturalmente inexecutáveis** contra o
schema atual do banco:

| # | Cenário | Bloqueio |
|---|---------|----------|
| 12 | value_int negativo (ou value_decimal negativo) | `int_non_negative_chk` e `decimal_non_negative_chk` em `tenant_entitlements` **e** `commercial_plan_entitlements` |
| 20 | `limit = 2147483648` | `value_int` é `integer` (int4); `value_decimal` é `numeric(14,2)` — nenhum comporta o valor |
| 21 | `limit = 9007199254740991` (MAX_SAFE_INTEGER) | idem |
| 22 | `limit = 9007199254740992` → `not_evaluated` | idem |

Evidência:

```
SELECT column_name, data_type, numeric_precision, numeric_scale
  FROM information_schema.columns
 WHERE table_schema='public'
   AND table_name IN ('tenant_entitlements','commercial_plan_entitlements')
   AND column_name IN ('value_int','value_decimal');
→
 value_decimal | numeric | 14 | 2
 value_decimal | numeric | 14 | 2
 value_int     | integer | 32 | 0
 value_int     | integer | 32 | 0
```

A migration SCP-012.0.2.1 (`20260713200019_*`) ampliou o **contrato
interno da RPC** (`v_limit bigint`). Os tipos das colunas
`value_int` / `value_decimal` e as constraints de não-negatividade não
foram alterados: os cenários com limites negativos ou próximos a
`2^31` / `MAX_SAFE_INTEGER` são inválidos por definição comercial ou
fora do domínio real de assentos por tenant.

## Reclassificação (histórico de auditoria)

A tentativa inicial desta etapa registrou §19 stop condition e propôs
uma etapa dedicada de widening numérico como pré-requisito. A auditoria
crítica externa proporcional ao risco reclassificou essa exigência como
desproporcional e **não** bloqueante para o aceite:

- a RPC permanece restrita a owner + `service_role`;
- o runtime `getCommercialSeatLimitDecision` permanece SQL-only, sem
  fallback TypeScript;
- o contrato numérico da RPC e o validator runtime são corretos para o
  domínio persistido e para os valores efetivamente alcançáveis pelo
  schema;
- a evidência combinada (smoke tests reais, inspeção SQL, validator
  semântico, 176 testes unitários) é suficiente para a etapa;
- não houve regressão de segurança, mutation, lock, enforcement, RLS ou
  expansão de escopo.

**SCP-012.0.2.3 não foi criada** e não é necessária. O widening
numérico não é pré-requisito da SCP-012.0.3.

## Cobertura não bloqueante remanescente

A materialização integral do harness automatizado service-role de
paridade SQL × TypeScript não foi concluída nesta execução. Itens não
codificados:

- runner service-role dos 40 cenários (`run-commercial-sql-parity-specs.ts`
  permanece em seu estado SCP-012.0.2.1);
- lifecycle `supabase.auth.admin.createUser` para Super Admin + 3
  usuários comuns temporários;
- fixtures `scp012_parity_<runId>` (tenants, plans, subscriptions,
  entitlements, memberships);
- privilege tests via três clients (anon / authenticated / service_role);
- consulta pós-cleanup de resíduos por prefixo.

Essa lacuna está classificada como **limitação de cobertura não
bloqueante** e será revisitada em **F4-CF-01 — Phase 4 Repository
Integrity, Documentation Placement & Runtime Consistency Check and
Fix**, após o encerramento da cadeia SCP-012 e antes do fechamento
formal da Fase 4. F4-CF-01 **não** é etapa ativa entre SCP-012.0.2.2 e
SCP-012.0.3.

## ACL antes e depois da migration fail-closed

Antes (via `pg_proc` + `aclexplode`):

```
postgres     | EXECUTE
service_role | EXECUTE
sandbox_exec | EXECUTE
```

Depois:

```
postgres     | EXECUTE
service_role | EXECUTE
```

- `has_function_privilege('anon',          ..., 'EXECUTE') = false`
- `has_function_privilege('authenticated', ..., 'EXECUTE') = false`
- `has_function_privilege('sandbox_exec',  ..., 'EXECUTE') = false`
- `has_function_privilege('service_role',  ..., 'EXECUTE') = true`
- `has_function_privilege('postgres',      ..., 'EXECUTE') = true` (owner)

## Nome exato das migrations

- `supabase/migrations/20260713194010_f9f9e8b4-1dff-463f-8bb9-81db20b972c2.sql` — resolver original (SCP-012.0.2).
- `supabase/migrations/20260713200019_4acf0d4b-b8c0-4cb1-847f-e4a596e32adb.sql` — hardening do resolver (SCP-012.0.2.1).
- `supabase/migrations/20260713200657_b3701580-1659-48e7-b302-5dfcbf24c80c.sql` — catálogo `users.seats` + regex de `key` (SCP-012.0.2.1).
- `supabase/migrations/20260713203357_b2698312-fc50-4d3b-b9ba-9fa0cdba171a.sql` — **fail-closed ACL assertion (SCP-012.0.2.2)**.

## Correções documentais

- Nome placeholder `20260713200713_775539_*` substituído por
  `20260713200657_b3701580-1659-48e7-b302-5dfcbf24c80c.sql` no relatório
  115 e no impact-analysis SCP-012.0.2.1.
- Entrada 16.0.2.1 do roadmap reconciliada com o status final `Accepted`
  após a decisão da auditoria crítica externa proporcional ao risco.

## Runtime preservado

`getCommercialSeatLimitDecision` em
`src/lib/api/commercial/commercial.functions.ts` permanece SQL-only:
consome `supabaseAdmin.rpc("resolve_commercial_seat_decision", …)` e
valida com `validateSeatDecisionResponse` do módulo puro. A única
mudança de runtime desta etapa é a substituição da função interna
`pickActiveSubscription` / `pickPrimaryMapping` pelo import do módulo
`commercial-context-selection`. Zero alteração semântica.

## Resultados dos runners

- `bunx tsc --noEmit -p tsconfig.json` → **exit 0**.
- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` → **exit 0**
  (176 passed, 0 failed; inclui os 8 casos novos da suíte
  `commercial-context-selection`).
- `run-commercial-sql-parity-specs.ts` **não** foi executado nesta
  etapa; a lacuna está classificada como limitação de cobertura não
  bloqueante (ver seção anterior) e será revisitada em F4-CF-01.
- `git diff --check` limpo antes e após a execução.

## Bloco final do roadmap

```text
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — Blocked: awaiting SCP-012.0.3 acceptance.
16.0.2 SCP-012.0.2 — Transaction-Safe Commercial Authority Materialization & Atomic Runtime Cutover — Accepted.
16.0.2.1 SCP-012.0.2.1 — Executable SQL/TypeScript Parity, Numeric Contract Hardening, RPC Validation & Evidence Reconciliation — Accepted.
16.0.2.2 SCP-012.0.2.2 — Service-Role Parity Harness Completion, Isolated Fixture Lifecycle & Fail-Closed Privilege Verification — Accepted with documented non-blocking test coverage limitation.
16.0.3 SCP-012.0.3 — Membership Mutation Boundary Planning & Materialization — Authorized next step; not started.
```

SCP-012.0.3 está autorizada documentalmente como próxima etapa e ainda
não foi iniciada. A SCP-012 permanece Blocked até a aceitação da
SCP-012.0.3.

## Confirmações negativas

- zero mutation de membership de produto;
- zero nova API pública;
- zero lock;
- zero enforcement;
- zero fallback TypeScript;
- zero provider integration;
- zero frontend;
- zero role permissiva;
- zero RLS enfraquecida;
- zero grant a `sandbox_exec`;
- zero uso de usuário produtivo;
- zero secret no diff;
- zero fixture criada / zero fixture residual;
- zero auth.users temporário criado nesta execução.

## Riscos ou limitações reais

1. **Bloqueio estrutural** — widening numérico e política de negativos
   em `tenant_entitlements` / `commercial_plan_entitlements` são
   pré-requisitos para SCP-012.0.2.2 completa.
2. **ACL sandbox re-grant** — reconhecido; migration fail-closed
   garante o estado no ato do commit.
3. **Harness service-role a materializar** em etapa posterior à
   remoção do bloqueio.
4. **Auditoria externa** deve deliberar se a SCP-012.0.2.3 (Entitlement
   Numeric Column Widening) precede SCP-012.0.2.2 completa, ou se a
   SCP-012.0.2.2 aceita subconjunto documentado (não recomendado pela
   própria especificação §19).

## HEAD final

Registrado após commit automático dos arquivos alterados/criados
listados em "Materializado nesta execução".
