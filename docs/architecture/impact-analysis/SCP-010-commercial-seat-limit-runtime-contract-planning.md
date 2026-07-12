# SCP-010 — Commercial Seat Limit Runtime Contract & Read Model Planning

## Status

Ready for External Audit (consolidado pela SCP-010.1).

## 1. Escopo

Planejar o contrato server-authoritative do limite de assentos
(`users.seats`) que a SCP-011 implementará como read-only, e listar os
read models auxiliares. Etapa exclusivamente documental — sem runtime,
migration, RLS, grant ou mutation.

## 2. Evidências do repositório (autoritativas)

Inspeção direta via `psql \d` e migrations:

- `public.tenant_members` — colunas reais:
  `tenant_id uuid NOT NULL`, `user_id uuid NOT NULL`,
  `tenant_role tenant_role NOT NULL DEFAULT 'viewer'`,
  `membership_status membership_status NOT NULL DEFAULT 'active'`,
  `is_owner`, `is_default`, `joined_at`, `invited_at`, `accepted_at`,
  `suspended_at`, `revoked_at`, `updated_at`.
  - PRIMARY KEY `(tenant_id, user_id)` → protege duplicidade
    `(tenant, user)` de forma total (sem predicado parcial).
  - Índices: `tenant_members_active_lookup_idx (user_id, tenant_id,
    membership_status)`, `tenant_members_tenant_idx`,
    `tenant_members_user_idx`.
  - FKs: `tenant_id → public.tenants ON DELETE CASCADE`;
    `user_id → auth.users ON DELETE CASCADE`.
  - RLS habilitado. Policies: `tm_select` (super_admin OR próprio
    user OR `user_belongs_to_tenant`); `tm_write` restrita a
    `is_super_admin()`.
  - Migration base: `20260701204508_...` (CREATE TABLE + PK);
    `20260708125042_...` (adiciona colunas `tenant_role`,
    `membership_status` e timestamps de transição + índices).
- Enum `public.membership_status` = `active | invited | suspended |
  revoked` (não existe `removed`).
- Enum `public.tenant_role` = `owner | admin | manager | broker |
  captador | secretaria | viewer` (não existe `agent` nem `guest`).
- `public.tenant_entitlements` — coluna numérica é `value_int integer`
  (`>= 0`); check `single_value_chk` restringe exatamente uma coluna
  de valor por linha; `source ∈ {plan, override, system}`; UNIQUE
  `(tenant_id, entitlement_key)`.
- `public.commercial_plan_entitlements` — mesma família de colunas
  tipadas; UNIQUE `(plan_id, entitlement_key)`.
- `public.commercial_entitlement_definitions` — `value_type ∈
  {boolean, integer, decimal, text}`; PK `key`.
- `public.tenant_subscriptions` — `status ∈ {trialing, active,
  past_due, suspended, canceled, internal, demo}`; UNIQUE parcial
  `tenant_subscriptions_one_current_per_tenant_idx (tenant_id)
  WHERE status ∈ {trialing, active, past_due, suspended, internal,
  demo}` → garante no máximo uma subscription "vigente" por tenant.
- Feature catalog: `users.seats` presente em
  `src/lib/api/commercial/feature-catalog.ts` como
  `valueType: "number"`, `status: "active"`.

Reconciliação F3.6 versus repositório: os domínios de
`membership_status` e `tenant_role` publicados em
`src/integrations/supabase/membership-types.ts` correspondem
exatamente aos enums do banco. Nenhuma divergência documental
identificada.

## 3. Contrato de contagem (final)

Unidade contada: **linha de `tenant_members`**. Como a tabela tem
PK `(tenant_id, user_id)`, cada `(tenant, user)` é único por
construção — linha e identidade coincidem. Não é necessário
`COUNT(DISTINCT user_id)` como mitigação; `COUNT(*)` sobre o
predicado é suficiente e determinístico.

| Status real | Consome assento? | Justificativa | Timestamp de transição |
| --- | --- | --- | --- |
| `active` | sim | membership operacional (F3.2/F3.6). | `accepted_at`, `joined_at` |
| `invited` | sim (reserva) | linha já existe com `user_id` NOT NULL; ocupa slot único `(tenant, user)`. | `invited_at` |
| `suspended` | não | não é operacional; libera o slot lógico de uso. | `suspended_at` |
| `revoked` | não | equivalente semântico de removido; libera o slot. | `revoked_at` |

`removed` **não existe** no banco. A SCP-010 anterior tratava
`revoked` como sinônimo de "removed" — mantido como convenção
documental apenas.

## 4. Contrato de roles

Todos os roles reais consomem assento quando o status é counted; o
role não altera contagem.

| Role real | Consome quando counted? | Evidência |
| --- | --- | --- |
| `owner` | sim | enum `tenant_role`. |
| `admin` | sim | enum `tenant_role`. |
| `manager` | sim | enum `tenant_role`. |
| `broker` | sim | enum `tenant_role`. |
| `captador` | sim | enum `tenant_role`. |
| `secretaria` | sim | enum `tenant_role`. |
| `viewer` | sim | enum `tenant_role`. |

Equivalências `broker=agent`, `viewer=guest`, `tenant_role=membership_role`
são **rejeitadas**: não existem `agent`/`guest` no enum e não existe
coluna `membership_role`.

## 5. Convites

- `tenant_members.user_id` é `NOT NULL`: **não existe convite
  somente por e-mail** nesta tabela.
- Não existe tabela separada de invitations no repositório atual.
- Convite pendente = linha com `membership_status='invited'` e
  `user_id` já vinculado a `auth.users` (o convidado precisa ter
  identidade Supabase pré-criada).
- Duplicidade de convites é impedida pela PK `(tenant_id, user_id)`.

## 6. Fonte autoritativa do limite (precedência final)

Chave: `users.seats` (definida em
`commercial_entitlement_definitions` com `value_type='integer'`).
Coluna de leitura: `value_int`.

Ordem determinística:

1. **Override do tenant** — linha em `tenant_entitlements` com
   `entitlement_key='users.seats'`, `effective_from <= now()` e
   (`effective_until IS NULL` OR `effective_until > now()`). UNIQUE
   `(tenant_id, entitlement_key)` garante cardinalidade única.
2. **Plano vigente** — join `tenant_subscriptions` (status ∈
   {trialing, active, past_due, internal, demo}; `suspended` e
   `canceled` **não** são elegíveis) → `commercial_plan_entitlements`
   `(plan_id, 'users.seats')`. UNIQUE parcial
   `tenant_subscriptions_one_current_per_tenant_idx` garante no
   máximo uma subscription vigente por tenant; UNIQUE
   `(plan_id, entitlement_key)` garante uma linha por plano.
3. **Sem fonte válida** → decisão `not_evaluated` (ver §8). Nenhum
   fallback heurístico, `ORDER BY` de desempate ou tenant default.

Tratamento de conflitos e patologias:

- Cardinalidade > 1 em qualquer nível (violação de UNIQUE) → decisão
  determinística `not_evaluated`; não escolher `LIMIT 1`.
- Entitlement expirado (`effective_until <= now()`) → ignorado.
- Subscription `canceled`/`suspended` → não elegível; cai para o
  próximo nível.
- Registro presente com `value_int IS NULL` → tratado em §7.

## 7. Semântica de ausência e unlimited

A SCP-011 **não suportará unlimited**. Nenhuma representação
explícita de "ilimitado" existe no schema (`-1`, sentinelas grandes,
`NULL`, ausência — todos proibidos).

| Situação | `allowed` | `reason` |
| --- | --- | --- |
| `value_int` finito `>= 0` em fonte válida | avaliação normal | `within_limit` / `limit_reached` |
| `value_int IS NULL` na fonte encontrada | `false` | `not_evaluated` |
| Registro ausente em todos os níveis | `false` | `not_evaluated` |
| Valor inválido / cardinalidade > 1 | `false` | `not_evaluated` |
| `value_int = 0` | limite finito de zero — comportamento normal | `limit_reached` quando `used + Δ > 0` |

## 8. Matriz determinística de decisão

| Estado comprovado | `allowed` | `reason` | `source` | `limit` |
| --- | --- | --- | --- | --- |
| Subscription vigente + override tenant válido | avalia `used + Δ ≤ limit` | `within_limit` / `limit_reached` | `tenant_entitlement` | `value_int` |
| Subscription vigente + entitlement de plano válido | avalia `used + Δ ≤ limit` | `within_limit` / `limit_reached` | `plan_entitlement` | `value_int` |
| Sem subscription (nenhuma linha) | `false` | `not_evaluated` | `none` | `null` |
| Subscription em `canceled`/`suspended` sem override | `false` | `not_evaluated` | `none` | `null` |
| Entitlement ausente em todos os níveis | `false` | `not_evaluated` | `none` | `null` |
| Cardinalidade inválida (violação UNIQUE detectada) | `false` | `not_evaluated` | `none` | `null` |

`not_entitled` e `billing_unknown` são **removidos** como reasons
distintos — todos os estados sem avaliação viável convergem para
`not_evaluated`, reutilizando a semântica já aceita em SCP-004/005/006.
Se auditoria futura exigir distinção contratual, revisar o DTO
formalmente antes da SCP-011.

## 9. Contrato de `requestedIncrement`

Contrato único para a primeira implementação (SCP-011):

- Ausente → default server-side `= 1`.
- Igual a `1` → válido.
- Zero, negativo, fracionário, `NaN`, `Infinity`, overflow → **input
  rejeitado no boundary** antes de emitir `CommercialLimitDecision`
  (não usar `not_evaluated` para mascarar erro estrutural).
- Maior que `1` → input rejeitado enquanto operações em lote
  estiverem fora de escopo.

Consequência: `used + 1 ≤ limit` é a única condição avaliada.

## 10. Read models planejados (somente definição, não implementação)

- `getSeatUsage(tenantId): number` — `COUNT(*) FROM tenant_members
  WHERE tenant_id = $1 AND membership_status IN ('active','invited')`.
- `getSeatLimitSource(tenantId): { source, limit }` — implementa §6.
- `getCommercialSeatLimitDecision(tenantId, { requestedIncrement = 1 }):
  CommercialLimitDecision` — combina os dois anteriores conforme §8.

Nenhum destes existe em runtime ainda; SCP-011 é quem materializa.

## 11. Mutation boundaries (inventário completo)

Busca em todo o repositório por escritas em `tenant_members`:

| Operação | Arquivo | Boundary atual | Aumenta uso? | Enforcement futuro? |
| --- | --- | --- | --- | --- |
| SELECT (leituras) | `src/lib/api/tenant-selection.functions.ts`, `src/lib/api/super.functions.ts`, `src/integrations/supabase/tenant-repository.ts` | server | não | n/a |

**Nenhuma mutation aplicacional** (INSERT/UPDATE/UPSERT/DELETE) em
`tenant_members` foi localizada em `src/**`, incluindo hooks,
repositórios, seeds, admin screens e edge functions. As policies
RLS já limitam writes a `is_super_admin()`; alterações de membership
hoje só ocorrem por caminho SQL/admin, sem boundary aplicacional
que consuma assento.

Consequência arquitetural: a SCP-011 será **apenas runtime de
avaliação read-only** — não haverá consumidor operacional imediato
para enforcement até que uma etapa futura crie ou migre mutations
para dentro de um boundary tipado. A SCP-012 deverá distinguir
formalmente entre (a) criar novos boundaries, (b) migrar writes SQL
existentes para boundaries aplicacionais e (c) integrar enforcement
em boundaries já criados.

## 12. Concorrência (TOCTOU)

Avaliação read-only não é enforcement. `used` é lido fora da
transação da mutation; entre leitura e commit outra mutation pode
consumir o assento. Resolução deliberadamente adiada para SCP-012
(função SQL transacional, RPC com advisory lock, ou constraint
agregada — decisão sob auditoria).

## 13. Hard Gates revalidados

- Nenhum runtime de decisão será implementado antes de auditoria
  externa da SCP-010.1.
- SCP-011 não pode ser iniciada enquanto o inventário de mutations
  não for revisitado no seu próprio escopo.
- SCP-012 não pode ser iniciada antes de SCP-011.

## 14. Sequência arquitetural

SCP-010 (contrato) → SCP-010.1 (verificação/determinismo) →
auditoria externa → SCP-011 (runtime read-only) → SCP-012
(enforcement atômico em mutations).

## 15. Confirmações negativas

Nenhuma migration, tabela, coluna, enum, constraint, índice, RLS
policy, grant, seed, mutation, RPC, trigger, edge function,
frontend, provider, webhook ou checkout foi criado/alterado nesta
etapa. `getCommercialFeatureDecision`, `decideCommercialFeature`,
`normalizeFeatureKey`, `feature-catalog.ts` inalterados.
`storage.media_limit` fora de escopo. SCP-011 e SCP-012 não
iniciadas.
