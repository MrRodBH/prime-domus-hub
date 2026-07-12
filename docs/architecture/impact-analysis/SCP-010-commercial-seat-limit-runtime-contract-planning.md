# SCP-010 — Commercial Seat Limit Runtime Contract & Read Model Planning

## Status

Ready for External Audit

## 1. Escopo

Etapa exclusivamente documental / planning. Congela o contrato
arquitetural necessário para uma futura avaliação server-side do limite
comercial `users.seats`. Não implementa runtime, contador, RPC, RLS,
grant, mutation, provider integration, webhook, checkout, customer
portal, billing_admin, commercial_admin ou canManageTenantBilling.

Limite tratado: **`users.seats` apenas**.

Limites explicitamente fora de escopo (contratos futuros próprios):
`storage.media_limit`, `crm.leads.limit`, `crm.pipeline.limit`,
`cms.posts.limit`, `ai.usage_limit`, integration limits, bandwidth
limits, API request limits.

## 2. Evidências do repositório

Inspeção direta (não baseada em relatórios prévios):

- Entidade de membership: `public.tenant_members`
  - Arquivo tipado: `src/integrations/supabase/types.ts` (linhas ~3184–3236).
  - Colunas: `tenant_id`, `user_id`, `tenant_role`, `membership_status`,
    `is_owner`, `is_default`, `joined_at`, `invited_at`, `accepted_at`,
    `suspended_at`, `revoked_at`, `updated_at`.
  - FK: `tenant_members_tenant_id_fkey → tenants(id)`.
- Enum `membership_status` (real, confirmado em `types.ts` linha 3621 e
  em `src/integrations/supabase/membership-types.ts`):
  `'active' | 'invited' | 'suspended' | 'revoked'`.
  - **Não existe** `'removed'`. A semântica de "removido do tenant"
    corresponde a `'revoked'`.
- Enum `tenant_role` (real, confirmado em `membership-types.ts`):
  `'owner' | 'admin' | 'manager' | 'broker' | 'captador' | 'secretaria' | 'viewer'`.
  - **Não existe** `'agent'` nem `'guest'` no domínio real.
- Constraint de unicidade em `tenant_members`: inspeção via
  `types.ts.Relationships` mostra apenas FK para `tenants`. Uma
  UNIQUE `(tenant_id, user_id)` **não é observável** a partir do bundle
  de tipos; deve ser verificada em migration antes de qualquer runtime.
  Registro como risco (§9).
- Repositório server-side: `src/integrations/supabase/tenant-repository.ts`
  (filtros por `membership_status = 'active'`).
- Resolução de tenant server-side: `src/integrations/supabase/tenant-middleware.ts`
  (`requireTenant`, `resolveTenantContext`).
- Header transporte: `src/integrations/supabase/tenant-attacher.ts`.
- Impersonação: `src/integrations/supabase/impersonation-state.ts`,
  `use-impersonation.ts`; Super Admin sem impersonação é rejeitado por
  `resolveTenantContext` (`Forbidden: no tenant membership`).
- Feature catalog: `src/lib/api/commercial/feature-catalog.ts`.
  - `users.seats` presente com `{ domain: "users", valueType: "number",
    status: "active" }`.
- Decisão comercial atual (boolean): `src/lib/api/commercial/feature-gate.ts`
  (`CommercialFeatureDecision`, `getCommercialFeatureDecision`,
  `decideCommercialFeature`).
- Read models comerciais: `src/lib/api/commercial/read-models.ts`.
- Tabelas comerciais existentes (evidência via schema):
  `commercial_plans`, `commercial_plan_entitlements`,
  `commercial_entitlement_definitions`, `tenant_entitlements`,
  `tenant_subscriptions`, `tenant_billing_provider_mappings`,
  `billing_events`, `billing_event_transitions`,
  `billing_provider_definitions`.
- Funções de mutation de membership dedicadas (create/invite/activate/
  suspend/reactivate/remove): **não encontradas como server functions
  isoladas** em `src/lib/api/`. As alterações em `tenant_members`
  ocorrem hoje via administração de banco / seeds. Registro como
  inventário incompleto para SCP-012 (§20).

## 3. Invariantes preservados

Architecture First; client never authority; server-side authority only;
sem heuristic fallback; sem dual-path; sem tenant default; `x-tenant-id`
é transporte, não autorização; `tenantId` sempre via `requireTenant`;
seleção normal ≠ impersonação; Super Admin sem impersonação não acessa
recursos tenant-scoped; membership authorization e commercial
authorization permanecem independentes; sem direct client reads de
tabelas comerciais/uso; sem RLS permissiva; sem grants para end users;
sem bypass por Super Admin; sem provider call, billing real, checkout,
webhook ou mutation comercial.

## 4. Contrato de contagem de assentos (decisão)

Status **counted** (consomem 1 assento):

- `active`
- `invited`

Status **not counted**:

- `suspended`
- `revoked` (equivalente semântico de "removed" no domínio real)

Justificativa: `active` é uso efetivo; `invited` reserva a vaga e
impede convites acima do limite; `suspended` libera a vaga enquanto
suspenso; `revoked` não pertence ao conjunto operacional.

## 5. Contrato de roles

Todos os `tenant_role` reais consomem assento quando o
`membership_status` está em status counted:

`owner`, `admin`, `manager`, `broker`, `captador`, `secretaria`,
`viewer` — todos contam.

Nenhum role é gratuito por definição. Nenhuma role administrativa nova
é introduzida (sem `billing_admin`, `commercial_admin`,
`canManageTenantBilling`).

## 6. Unidade contada e deduplicação

Unidade contada: **linha de `tenant_members`** cujo
`membership_status ∈ {active, invited}`, agrupada por `(tenant_id,
user_id)`. Convites sem `user_id` não são representáveis no schema
atual — `user_id` é NOT NULL em `tenant_members` — portanto convites
pendentes só existem após vinculação a um `auth.users.id`.

Risco bloqueante registrado: **não há evidência observável de
constraint UNIQUE `(tenant_id, user_id)`** no bundle de tipos.
SCP-011 deverá confirmar em migration real antes de qualquer runtime;
caso ausente, a contagem deve ser feita sobre `COUNT(DISTINCT
user_id)` restrito aos status counted, e SCP-012 deverá considerar a
constraint como pré-requisito de enforcement atômico.

Nenhuma migration corretiva é aplicada nesta etapa.

## 7. Fonte autoritativa do limite

Precedência declarada (a ser confirmada em SCP-011 contra o schema
real de `tenant_entitlements` e `commercial_plan_entitlements`):

1. `tenant_entitlements` (override por tenant, feature key
   `users.seats`).
2. `commercial_plan_entitlements` do plano vigente em
   `tenant_subscriptions` (feature key `users.seats`).
3. `none`.

Não existe fallback heurístico. Não existe valor default implícito.
Ausência de registro **não** significa ilimitado.

## 8. Semântica do limite

- `limit` deve ser inteiro não negativo.
- `limit = 0` → zero assentos permitidos.
- `limit = null` → não representa ilimitado.
- `limit` ausente → não representa ilimitado.
- Valor negativo, fracionário, não numérico, `NaN`, `Infinity` ou fora
  do intervalo seguro (`Number.MAX_SAFE_INTEGER`) é inválido.
- Conceito de "unlimited" só existe se representado explicitamente em
  contrato aceito. Nesta etapa **não** é definido; SCP-011 deverá
  documentar formalmente se/como será representado.
- Proibido usar números mágicos (`-1`, `999999`, `0`) como sentinela
  de unlimited.

## 9. Fonte autoritativa de uso

`used` é calculado exclusivamente server-side. Client **nunca** envia
`used`, `currentSeats`, `membershipCount`, `tenantId` autoritativo,
`limit` ou `remaining`. Client pode futuramente enviar apenas
`requestedIncrement` (§10).

## 10. `requestedIncrement`

- Inteiro estrito, `> 0`, finito, dentro do intervalo seguro.
- Rejeita `NaN`, `Infinity`, negativo, zero, fracionário, overflow.
- Default recomendado `= 1`, aplicado apenas no boundary server-side.
- Operações em lote **não** são suportadas nesta iteração; SCP-012
  pode ampliar o contrato posteriormente sem quebra retroativa.

## 11. `CommercialLimitDecision` (contrato preservado da SCP-009)

```ts
type CommercialLimitDecision = {
  tenantId: string;
  featureKey: string;
  allowed: boolean;
  reason:
    | "entitled"
    | "not_entitled"
    | "limit_reached"
    | "billing_unknown"
    | "billing_attention_required"
    | "billing_blocked"
    | "not_evaluated";
  source: "tenant" | "plan" | "default" | "none";
  limit: number | null;
  used: number | null;
  requestedIncrement: number;
  remaining: number | null;
};
```

Semântica para `users.seats`:

- `allowed = true` **somente** quando `limit` finito válido, `used`
  server-side auditado, `requestedIncrement` validado, e
  `used + requestedIncrement <= limit`.
- `allowed = false` com `reason = "limit_reached"` **somente** quando
  todas as condições acima são verdadeiras exceto a última.
- `remaining = limit != null && used != null ? Math.max(limit - used, 0) : null`.
  Nunca calculado no client.
- Se `limit` ou `used` não são conhecidos com segurança, `reason`
  **não pode** ser `limit_reached`; usar `not_evaluated`,
  `billing_unknown`, `billing_attention_required`, `billing_blocked`
  ou `not_entitled` conforme a fonte real.

## 12. Relação com `CommercialFeatureDecision`

`CommercialFeatureDecision` responde entitlement booleano.
`CommercialLimitDecision` responde caber-no-limite quantitativo.
Uma não substitui a outra.

Ordem futura de avaliação (SCP-011):

1. `requireTenant`
2. Membership authorization aplicável
3. Normalização + validação de feature key (SCP-006)
4. Catalog gate (SCP-008)
5. `getCommercialFeatureDecision` (SCP-006)
6. Resolução do `limit` (§7)
7. Leitura server-side de `used` (§13)
8. Validação de `requestedIncrement` (§10)
9. Emissão de `CommercialLimitDecision`

## 13. Read models planejados (não implementados)

```ts
type CommercialSeatUsageReadModel = {
  tenantId: string;
  used: number;
  countedStatuses: readonly MembershipStatus[]; // ["active","invited"]
};

type CommercialSeatLimitReadModel = {
  tenantId: string;
  featureKey: "users.seats";
  limit: number | null;
  source: "tenant" | "plan" | "default" | "none";
};
```

Responsabilidade: leitura pura, server-side, sem fallback. Inputs:
`tenantId` derivado de `requireTenant`. Outputs: shape acima. Fonte:
`tenant_members` (uso); `tenant_entitlements` + plano vigente via
`tenant_subscriptions` + `commercial_plan_entitlements` (limite).
Erros possíveis: tenant não encontrado, ausência de assinatura,
ausência de entitlement — cada um propaga `reason` explícito,
nunca fallback silencioso.

## 14. Membership authorization ≠ disponibilidade de assento

Existir assento disponível **não** autoriza convidar, ativar,
reativar, alterar ou administrar memberships. Autorização de
administração continua governada pelas regras de membership
existentes (F3.x). Nenhuma permissão comercial nova é criada nesta
etapa. `users.seats` **não** é autorização administrativa.

## 15. `requireTenant` e impersonação

- `tenantId` sempre via `requireTenant`
  (`src/integrations/supabase/tenant-middleware.ts`).
- `x-tenant-id` é transporte (via `tenant-attacher.ts`).
- Super Admin sem impersonação **não** avalia limite tenant-scoped
  (rejeitado por `resolveTenantContext`).
- Super Admin impersonando é submetido ao mesmo limite — sem bypass.
- Seleção normal (`tenant-selection-state.ts`) permanece separada de
  impersonação (`impersonation-state.ts`).

## 16. Avaliação ≠ enforcement (TOCTOU)

Função read-only retornando `allowed = true` **não** garante que a
mutation subsequente permanecerá dentro do limite. Duas requisições
concorrentes podem ler `used = limit - 1`, ambas obter `allowed = true`
e ambas materializar seat → total excede `limit`.

Risco: **TOCTOU / race condition**. Endereçado em SCP-012 via uma das
estratégias abaixo (a ser escolhida sob auditoria):

- função SQL transacional;
- RPC com lock apropriado (advisory lock por tenant);
- constraint agregada (ex.: exclusion / trigger validando COUNT);
- revalidação dentro da mesma transação da mutation.

Nenhuma técnica é escolhida definitivamente nesta etapa.

## 17. Mutation boundaries (inventário parcial)

Buscas por server functions dedicadas a create/invite/activate/
suspend/reactivate/remove em `tenant_members` **não localizaram**
handlers isolados em `src/lib/api/`. Operações que hoje aumentam o
consumo ocorrem via administração/seeds diretos e via triggers
(`tg_tenants_seed_defaults`, etc. — não relacionados a assentos).

Classificação:

| Operação | Aumenta uso? | Local |
|---|---|---|
| Inserção direta `active` | Sim | não encontrada como server fn |
| Inserção `invited` | Sim | não encontrada como server fn |
| Aceite (`invited → active`) | Não (mudança dentro de counted) | não encontrada |
| Ativação (`suspended → active`) | Sim | não encontrada |
| Reativação (`revoked → active`) | Sim | não encontrada |
| Suspensão (`active → suspended`) | Reduz | não encontrada |
| Revoke (`* → revoked`) | Reduz (ou 0) | não encontrada |
| Importação em lote | Sim (potencial) | não encontrada |
| Seed administrativo | Sim | migrations |

SCP-011 deverá reinventariar contra o schema real; SCP-012 deverá
introduzir os boundaries de mutação com enforcement atômico.
Nenhuma mutation é modificada nesta etapa.

## 18. Matriz de transições

| Anterior | Posterior | Δ uso |
|---|---|---|
| inexistente | invited | +1 |
| inexistente | active | +1 |
| invited | active | 0 |
| invited | suspended | -1 |
| invited | revoked | -1 |
| active | suspended | -1 |
| active | revoked | -1 |
| suspended | active | +1 |
| suspended | invited | +1 |
| suspended | revoked | 0 |
| revoked | active | +1 |
| revoked | invited | +1 |
| X | X (mesmo) | 0 (retry idempotente) |

Considera aceite simultâneo, reativação concorrente, remoção já
concluída — todos exigem enforcement atômico (SCP-012).

## 19. RLS, grants e acesso a dados — proibições

Esta etapa **não**: cria RLS policy permissiva; abre SELECT para end
users em tabelas comerciais; concede grants comerciais a
`authenticated`/`anon`; permite direct client reads de
`tenant_members` para contagem comercial, `tenant_entitlements`,
`commercial_plan_entitlements` ou `tenant_subscriptions`; expõe
contadores comerciais via Supabase client.

A leitura futura deve ocorrer por server function server-authoritative.
Credenciais atuais (`supabaseAdmin` / `requireSupabaseAuth`)
permanecem intactas — SCP-011 documentará qual boundary usar.

## 20. Feature catalog

`users.seats` já registrado em `COMMERCIAL_FEATURE_CATALOG`
(`src/lib/api/commercial/feature-catalog.ts`) com
`{ domain: "users", valueType: "number", status: "active" }`.

O catálogo já distingue `valueType: "number"` de `"boolean"` — não é
necessária evolução para SCP-011. Não são criadas keys alternativas
(`users.max_seats`, `users.seat_limit`, `membership.seats`,
`tenant.users`).

## 21. Casos de decisão obrigatórios

| Cenário | `allowed` | `reason` | Observação |
|---|---|---|---|
| feature não catalogada | false | `not_evaluated` | catalog gate SCP-008 |
| `users.seats` não entitled | false | `not_entitled` | via SCP-006 |
| billing desconhecido | false | `billing_unknown` | |
| billing exige atenção | false | `billing_attention_required` | |
| billing bloqueado | false | `billing_blocked` | |
| limite ausente | false | `not_evaluated` | não é ilimitado |
| limite inválido | false | `not_evaluated` | rejeitado |
| limite zero | false | `limit_reached` | `used=0`, `remaining=0` |
| used = 0, limit finito | true | `entitled` | |
| used < limit | true | `entitled` | |
| used = limit | false | `limit_reached` | |
| used > limit (estado inconsistente) | false | `limit_reached` | `remaining=0` |
| `requestedIncrement = 1` normal | true | `entitled` | se cabe |
| `requestedIncrement > 1` cabe | true | `entitled` | |
| `requestedIncrement` inválido | false | `not_evaluated` | |
| leitura de uso indisponível | false | `not_evaluated` | não `limit_reached` |
| tenant sem assinatura | false | `not_entitled` ou `billing_unknown` | conforme fonte |
| tenant com override | usa override | source=`tenant` | |
| tenant usando limite do plano | usa plano | source=`plan` | |
| Super Admin sem impersonação | rejeitado antes | — | `requireTenant` bloqueia |
| Super Admin impersonando | avaliação normal | conforme regras | sem bypass |
| Usuário sem tenant válido | rejeitado antes | — | `requireTenant` bloqueia |

`limit_reached` **nunca** é fallback genérico.

## 22. Plano de testes para SCP-011

### 22.1 Unitários puros

Validação de `requestedIncrement`; cálculo de `remaining`; comparação
`used + requestedIncrement`; `limit = 0`; limite finito; limite ausente;
valor inválido; overflow; feature não catalogada; propagação de
`reason` comercial; precedência de fontes; não emissão indevida de
`limit_reached`.

### 22.2 Leitura

Contagem apenas de `{active, invited}`; isolamento por tenant;
convites; suspensos; revogados; roles diferentes; duplicidade;
tenant sem memberships; tenant inexistente; falha de leitura.

### 22.3 Segurança

`tenantId` client-supplied é ignorado; `requireTenant` obrigatório;
Super Admin sem impersonação bloqueado; Super Admin impersonando sem
bypass; sem direct client read; sem grant permissivo; sem RLS
permissiva.

### 22.4 Concorrência (SCP-012)

Dois convites simultâneos para a última vaga; convite + ativação
simultâneos; duas reativações simultâneas; retry idempotente;
rollback; falha entre reserva e criação; transações concorrentes em
tenants distintos.

## 23. Hard Gates SCP-010

| ID | Regra | Risco evitado | Evidência | Responsável futuro |
|---|---|---|---|---|
| SCP10-G1 | Seat Usage Semantics Must Be Explicit | ambiguidade de contagem | §4/§18 | SCP-011 |
| SCP10-G2 | Counted Statuses Deterministic | drift silencioso | §4 | SCP-011 |
| SCP10-G3 | Client Must Never Supply Authoritative Seat Usage | forgery | §9 | SCP-011 |
| SCP10-G4 | Seat Limit Source Precedence Explicit | fallback silencioso | §7 | SCP-011 |
| SCP10-G5 | Missing Limit Must Not Imply Unlimited | overgrant | §8 | SCP-011 |
| SCP10-G6 | `limit_reached` Requires Authoritative Server-Side Usage | falso positivo | §11/§21 | SCP-011 |
| SCP10-G7 | Seat Availability Does Not Grant Membership Administration | privilege confusion | §14 | SCP-011 |
| SCP10-G8 | Super Admin Must Not Bypass Seat Limits | bypass | §15 | SCP-011 |
| SCP10-G9 | Read-Only Evaluation Is Not Atomic Enforcement | TOCTOU | §16 | SCP-012 |
| SCP10-G10 | Mutation Boundaries Inventoried Before Enforcement | enforcement lacuna | §17 | SCP-012 |
| SCP10-G11 | No Permissive RLS, End-User Grants Or Direct Client Reads | data exfil | §19 | SCP-011/012 |
| SCP10-G12 | Storage Limits Remain Outside SCP-010 | escopo | §1 | etapa futura própria |
| SCP10-G13 | Runtime Implementation Requires External Audit Approval | drift de governança | Status | Auditoria |

## 24. Sequência arquitetural

- SCP-010 — Commercial Seat Limit Runtime Contract & Read Model Planning (esta etapa)
- SCP-011 — Commercial Seat Limit Server Runtime (futura, planejada)
- SCP-012 — Commercial Seat Limit Atomic Enforcement Integration (futura, planejada)

SCP-011 e SCP-012 **não** estão em execução e **não** estão
Accepted.

## 25. Restrições absolutas — não implementado nesta etapa

`CommercialLimitDecision` runtime; `getCommercialLimitDecision`;
`getCommercialSeatLimitDecision`; `evaluateSeatLimit`; contador de
memberships; query operacional de uso; RPC; SQL function; migration;
trigger; lock; reserva de assento; mutation; enforcement;
`limit_reached` em produção; provider integration; Stripe; Hotmart;
Kiwify; checkout; webhook; customer portal; billing_admin;
commercial_admin; canManageTenantBilling; alteração de
`tenant_members`; alteração de membership roles; RLS policy; grant;
direct client read; interface administrativa; componente frontend;
feature gate client-side; `storage.media_limit`.
