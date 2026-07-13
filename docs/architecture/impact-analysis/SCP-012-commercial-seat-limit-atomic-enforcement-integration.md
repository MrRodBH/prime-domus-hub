# SCP-012 — Commercial Seat Limit Atomic Enforcement Integration

## Status

Blocked — Architectural Prerequisite Required

## 1. Resultado do Preflight

Execução do preflight arquitetural obrigatório (§3) concluída com
decisão determinística de **Cenário B (§4.2)**: a resolução comercial
autoritativa existe **exclusivamente em runtime TypeScript** e **não é
capaz de participar da mesma transação Postgres** da mutation. A
implementação da enforcement atômica **não pode prosseguir** sem uma
prerequisite arquitetural dedicada.

Nenhum runtime, schema, RLS, grant, RPC, migration, mutation, teste ou
frontend foi alterado. SCP-011 permanece integralmente read-only e
Accepted. Esta etapa é exclusivamente documental.

## 2. Inventário de mutations de membership

Comando executado:

```
rg -n 'from\(.tenant_members.\).*\.(insert|update|upsert|delete)' src/
```

Resultado: **zero ocorrências**.

Referências a `tenant_members` no runtime (`src/`) são exclusivamente
de **leitura** — resolução de tenant, cardinalidade, gate, reader de
seat usage — e nunca de escrita. As únicas escritas em `tenant_members`
no repositório inteiro estão em migrations históricas
(`supabase/migrations/*.sql`), correspondendo a criação da tabela,
backfill inicial e seed de owner default.

Consequência: **não existe fluxo de mutation de membership em runtime
hoje** — nem `insert`, nem `update` de status, nem `upsert`, nem
`delete`, nem tabela de invitations separada, nem aceite de convite,
nem reativação, nem suspensão, nem revogação server-side. Portanto,
não há sítio de mutação ao qual conectar enforcement, e a criação
simultânea de (a) fluxo de mutation e (b) enforcement atômico
excederia amplamente o escopo desta etapa, além de esbarrar no bloqueio
arquitetural descrito abaixo.

## 3. Schema real confirmado

`public.tenant_members` (migrations `20260701204508` + `20260708125042`):

- PK: `(tenant_id, user_id)` (composta).
- FKs: `tenant_id → public.tenants(id)`; `user_id → auth.users(id)`.
- Colunas relevantes: `membership_status membership_status NOT NULL
  DEFAULT 'active'`, `tenant_role tenant_role NOT NULL`, `is_owner`,
  `is_default`, `invited_at`, `created_at`, `updated_at`.
- Enums: `membership_status = ('active','invited','suspended','revoked')`;
  `tenant_role = ('owner','admin','manager','broker','captador',
  'secretaria','viewer')`.
- Trigger: `tg_tenant_members_set_updated_at` (`BEFORE UPDATE`).
- Índices: `tenant_members_tenant_idx (tenant_id)`,
  `tenant_members_active_lookup_idx (user_id, tenant_id,
  membership_status)`, `tenant_members_user_idx (user_id)`.
- RLS: `tm_select` (authenticated), `tm_write` (authenticated) — ambas
  atualmente permissivas para membros do próprio tenant; sem policy
  específica de enforcement comercial.
- Grants: `SELECT` para `authenticated`; `ALL` para `service_role`.
- `public.tenants` disponível como linha autoritativa por tenant
  (candidata natural a `SELECT ... FOR UPDATE`).

Nenhuma coluna `version` / optimistic concurrency existe em
`tenant_members`; qualquer contagem consistente por tenant depende de
lock explícito (row-lock em `tenants` ou `pg_advisory_xact_lock`).

## 4. Autoridade comercial — inspeção

Módulos inspecionados:

- `src/lib/api/commercial/feature-catalog.ts`
- `src/lib/api/commercial/feature-gate.ts`
- `src/lib/api/commercial/read-models.ts`
- `src/lib/api/commercial/limit-decision.ts`
- `src/lib/api/commercial/seat-limit-runtime.ts`
- `src/lib/api/commercial/seat-usage-reader.ts`
- `src/lib/api/commercial/commercial.functions.ts`

Constatações:

- **Toda** a precedência comercial (tenant entitlement > plan
  entitlement > default), o catalog gate, o mapeamento de billing
  health, os motivos da feature decision e a extração do limite
  `users.seats` residem exclusivamente em **TypeScript**, executando no
  processo do server function TanStack (Worker/Node), não em Postgres.
- **Não existe** função SQL, view materializada, RPC transacional ou
  primitive server-side que reproduza — ou permita reutilizar — essa
  autoridade dentro de uma transação Postgres.
- O client Supabase utilizado (`@supabase/supabase-js`) opera via
  PostgREST HTTP sem transação callback multi-statement; não há
  conexão Postgres direta preservando uma transação através das
  chamadas do resolver TypeScript.
- Não existe primitive de lock por tenant no runtime atual.

## 5. Análise de viabilidade — Cenário B (§4.2)

Para satisfazer o critério de conclusão (§27), a **decisão comercial**
e a **mutation** devem ocorrer **atomicamente na mesma transação**, com
lock determinístico do tenant, recontagem de assentos consumidores e
comparação `used + delta ≤ limit` **dentro** da transação.

Isso exige que a resolução comercial canônica seja executável **dentro
do banco**. Hoje ela não é. As duas alternativas hipotéticas colidem
com proibições explícitas da própria SCP-012:

1. **Reimplementar o resolver em SQL** (função SECURITY DEFINER que
   replique entitlement precedence, catalog gate, billing health,
   limit extraction) — **proibido por §5**: cria um segundo resolver
   comercial que pode divergir da autoridade TypeScript aprovada na
   cadeia SCP-011.
2. **Passar `limit`/`used`/`source`/`decision` como argumento à RPC**
   — **proibido por §9**: transforma o cliente/servidor de aplicação
   em fonte de confiança de decisão comercial e viola o boundary
   estrito consolidado na SCP-011.1.

Enforcement **parcialmente** atômico (advisory lock TS + resolver TS +
mutation isolada), enforcement apenas em memória, ou enforcement no
frontend também são **proibidos** (§4.2, §11, §26). Não há caminho
válido para a implementação nesta etapa.

## 6. Prerequisite proposta

**SCP-012.0 — Transaction-Safe Commercial Resolver Materialization**

Escopo mínimo (a ser detalhado quando a etapa for autorizada):

- Materializar em SQL, sob forma canônica única, a resolução
  autoritativa de `CommercialLimitDecision` para `users.seats`,
  consumindo apenas as tabelas comerciais já existentes
  (`tenant_subscriptions`, `tenant_entitlements`, `commercial_plans`,
  `commercial_plan_entitlements`, `commercial_entitlement_definitions`,
  `billing_events`/derivados de billing health).
- Provar equivalência semântica formal entre o resolver SQL e o
  resolver TypeScript aprovado (mesmos inputs → mesmos
  `allowed`/`reason`/`source`/`limit`), fazendo a autoridade TS passar
  a **delegar** ao resolver SQL — mantendo **um único** resolver
  semântico (§5).
- Expor a primitive ao runtime via `SECURITY DEFINER`, `search_path`
  fixo, identificadores qualificados, sem SQL dinâmico, com
  `REVOKE ALL FROM PUBLIC, anon, authenticated` e `GRANT EXECUTE` só
  a `service_role`.
- Não introduzir enforcement de mutation (segue como SCP-012 após a
  aprovação da prerequisite).

Somente após SCP-012.0 estar `Accepted` a SCP-012 poderá ser
retomada e satisfazer §11 (lock + releitura + resolver + mutation na
mesma transação) sem violar §5.

## 7. Confirmações negativas

Nenhuma alteração em `src/**`, `supabase/**` (migrations, schema,
tabelas, colunas, enums, constraints, índices, triggers, RPCs, RLS
policies, grants), testes, `run-tenant-specs.ts`, providers, webhooks,
checkout, customer portal, frontend, roles comerciais, ou
`storage.media_limit`. Nenhum segundo resolver comercial criado.
Nenhuma mutation em `tenant_members`. Nenhum bypass de Super Admin.
Nenhum boundary server-side novo. Nenhum enforcement em memória.
Nenhum teste de concorrência declarado. Runtime read-only da SCP-011
integralmente preservado. SCP-012 permanece **Blocked**; SCP-012.0
permanece **não iniciada**.

## 8. Bloco final do roadmap

```
15.3.2 SCP-011.3.2 — Accepted Status Finalization & SCP-012 Authorization — Accepted.
15.3.3 SCP-011.3.3 — Exact Status Token Cleanup & Final Gate Closure — Accepted.
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — Blocked: transaction-safe commercial authority unavailable.
16.0 SCP-012.0 — Transaction-Safe Commercial Resolver Materialization — prerequisite futura planejada; não iniciada.
```
