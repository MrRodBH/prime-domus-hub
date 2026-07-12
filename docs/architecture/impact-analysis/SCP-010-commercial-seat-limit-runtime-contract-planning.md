# SCP-010 — Commercial Seat Limit Runtime Contract & Read Model Planning

## Status

Ready for External Audit

## 1. Escopo

Planejar o contrato server-authoritative da decisão de limite
numérico de assentos (`users.seats`) que a SCP-011 materializará
como runtime read-only. Etapa exclusivamente documental — sem
runtime, migration, schema, RLS, grant ou mutation. Não implementa
enforcement (reservado à SCP-012). Este documento é consolidado e
substitui integralmente as versões anteriores, incorporando as
correções da SCP-010.1 e da SCP-010.2.

## 2. Evidências autoritativas

Inspecionadas diretamente no repositório:

- `public.tenant_members` — colunas: `tenant_id uuid NOT NULL`,
  `user_id uuid NOT NULL`, `tenant_role tenant_role NOT NULL
  DEFAULT 'viewer'`, `membership_status membership_status NOT NULL
  DEFAULT 'active'`, `is_owner`, `is_default`, `joined_at`,
  `invited_at`, `accepted_at`, `suspended_at`, `revoked_at`,
  `updated_at`. PK `(tenant_id, user_id)`. RLS habilitado (writes
  restritos a `is_super_admin()`).
- Enum `public.membership_status` = `active | invited | suspended |
  revoked`.
- Enum `public.tenant_role` = `owner | admin | manager | broker |
  captador | secretaria | viewer`.
- `public.tenant_entitlements` — colunas de valor tipadas; coluna
  numérica `value_int integer >= 0`; check `single_value_chk`;
  UNIQUE `(tenant_id, entitlement_key)`; coluna persistida
  `source text NOT NULL DEFAULT 'plan'` com CHECK
  `source IN ('plan','override','system')`
  (migration `20260708223211_*`).
- `public.commercial_plan_entitlements` — mesma família de valor;
  UNIQUE `(plan_id, entitlement_key)`.
- `public.commercial_entitlement_definitions` — `value_type ∈
  {boolean, integer, decimal, text}`; PK `key`.
- `public.tenant_subscriptions` — `status ∈ {trialing, active,
  past_due, suspended, canceled, internal, demo}`; UNIQUE parcial
  garante no máximo uma subscription vigente por tenant nos status
  operacionais.
- Feature catalog: `users.seats` presente em
  `src/lib/api/commercial/feature-catalog.ts` com
  `valueType: "number"`, `status: "active"`.
- Runtime comercial já aceito:
  `src/lib/api/commercial/feature-gate.ts` define
  `CommercialFeatureDecisionReason = "entitled" | "not_entitled" |
  "limit_reached" | "billing_unknown" |
  "billing_attention_required" | "billing_blocked" |
  "not_evaluated"` e `CommercialFeatureDecisionSource = "tenant" |
  "plan" | "default" | "none"`.
  `src/lib/api/commercial/commercial.functions.ts` expõe
  `getCommercialFeatureDecision` como server function autoritativa;
  `read-models.ts` fornece `getTenantCommercialSummary`,
  `getTenantEntitlementSnapshot`, `getTenantBillingHealth`.

## 3. Invariantes

- Server-authoritative: toda avaliação corre em `createServerFn`
  server-only; nenhum cálculo é confiável a partir do cliente.
- Tenant scope: precedido por `requireTenant`; impersonação é
  respeitada pelos boundaries existentes.
- Autoridade comercial anterior ao cálculo: nenhuma leitura de
  `tenant_members` ou de limite ocorre antes de
  `getCommercialFeatureDecision` retornar `allowed=true`.
- DTO fechado: emissão restrita ao contrato §8; nenhum valor novo
  de `reason` ou `source` é introduzido.
- Determinismo: cada estado observável possui uma única decisão
  válida (matriz §15).
- Sem enforcement: SCP-010/011 são read-only. Enforcement atômico
  em mutations é escopo exclusivo da SCP-012.

## 4. Domínio de membership

Confirmado contra o banco (F3.6) e a tipagem publicada em
`src/integrations/supabase/membership-types.ts`. Domínios legados
`removed`, `agent`, `guest`, `membership_role` **não existem** e
não podem ser reintroduzidos em qualquer plano subsequente.

## 5. Unidade e contagem de assentos

Unidade contada = linha de `public.tenant_members`. A PK
`(tenant_id, user_id)` garante unicidade total; `COUNT(*)` sobre o
predicado é suficiente e determinístico — `COUNT(DISTINCT user_id)`
é proibido.

| `membership_status` | Consome assento? | Justificativa | Timestamp de transição |
| --- | --- | --- | --- |
| `active` | sim | membership operacional. | `accepted_at`, `joined_at` |
| `invited` | sim (reserva) | linha ocupa slot `(tenant, user)`. | `invited_at` |
| `suspended` | não | não operacional; libera slot lógico. | `suspended_at` |
| `revoked` | não | equivalente semântico de removido. | `revoked_at` |

## 6. Roles

Todos os `tenant_role` reais consomem assento quando o status é
counted; o role não altera contagem. Nenhuma equivalência com
`agent`/`guest` é admitida.

## 7. Convites

`tenant_members.user_id` é `NOT NULL`. Não existe tabela separada
de invitations. Convite pendente = linha com
`membership_status='invited'` e `user_id` vinculado a `auth.users`.
Duplicidade impedida pela PK.

## 8. DTO canônico

Preservado integralmente da SCP-009. Nenhum valor adicionado,
renomeado ou removido.

```
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

Qualquer valor de `reason` ou `source` fora dos enums acima é
proibido como membro do DTO. Valores persistidos no banco poderão
existir, mas serão mapeados para o contrato acima (§11).

## 9. Relação com `CommercialFeatureDecision`

Ordem canônica obrigatória:

```
requireTenant
  → membership authorization aplicável
  → normalizeFeatureKey
  → evaluateFeatureCatalogGate
  → getCommercialFeatureDecision
  → somente se allowed=true e reason="entitled":
      resolver limite numérico
      ler uso server-side
      emitir CommercialLimitDecision
```

### 9.1 Feature decision negativa

Quando `getCommercialFeatureDecision` retorna `allowed=false`, o
limite quantitativo **não** consulta `tenant_members`, não conta
uso, não resolve limite numérico, não substitui `reason`, não
substitui `source`, não reinterpreta billing e não colapsa tudo
para `not_evaluated`. A `CommercialLimitDecision` propaga
diretamente:

```
{
  tenantId: featureDecision.tenantId,
  featureKey: featureDecision.featureKey,
  allowed: false,
  reason: featureDecision.reason,   // not_entitled | billing_unknown
                                    // | billing_attention_required
                                    // | billing_blocked | not_evaluated
  source: featureDecision.source,   // tenant | plan | default | none
  limit: null,
  used: null,
  requestedIncrement: 1,
  remaining: null,
}
```

### 9.2 Feature decision positiva

Somente quando `allowed=true` e `reason="entitled"` a avaliação
numérica prossegue.

## 10. Fonte canônica do limite

Resolução única, sem dual-path. A SCP-011 **não** implementará um
segundo resolver comercial paralelo ao `getCommercialFeatureDecision`.
Estratégia arquitetural adotada:

**Alternativa A — reutilização.** A SCP-011 deverá extrair o valor
numérico do read model comercial já autoritativo
(`getTenantEntitlementSnapshot` / `getCommercialFeatureDecision`),
consumindo o mesmo resolver que já aplica precedência tenant → plan
→ default → none. A SCP-011 não replicará queries a
`tenant_entitlements` / `commercial_plan_entitlements` com regras
próprias. Se, durante a SCP-011, essa extração exigir refatoração,
a extração de um resolver compartilhado server-only (Alternativa B)
será proposta como pré-requisito antes de qualquer runtime novo.

Chave: `users.seats`; coluna de leitura persistida: `value_int`.

## 11. Mapeamento de `source`

O DTO aceita apenas `tenant | plan | default | none`. O valor
persistido em `tenant_entitlements.source` (`plan | override |
system`) e a origem da resolução são mapeados assim:

| Origem resolvida server-side | `source` no DTO |
| --- | --- |
| Linha efetiva em `tenant_entitlements` com `source='override'` | `tenant` |
| Linha efetiva em `tenant_entitlements` com `source='plan'` (herdada) | `plan` |
| Entitlement resolvido via `tenant_subscriptions` → `commercial_plan_entitlements` | `plan` |
| Linha efetiva em `tenant_entitlements` com `source='system'` ou default explícito | `default` |
| Ausência de fonte válida / resolução inválida | `none` |

Nenhuma linha de `tenant_entitlements` é assumida override apenas
pela existência: o valor persistido da coluna `source` é
autoritativo.

## 12. Semântica de billing

A SCP-010 **não redefine** isoladamente o comportamento dos status
`trialing | active | past_due | suspended | canceled | internal |
demo`. A `CommercialLimitDecision` propaga a razão comercial já
emitida pelo runtime aceito (`getCommercialFeatureDecision` /
`decideCommercialFeature` / `getTenantBillingHealth`). Nenhuma das
seguintes reinterpretações é permitida nesta camada:

- `past_due` → avaliação normal automática;
- `suspended` → `not_evaluated` automático;
- `canceled` → `not_evaluated` automático;
- ausência de subscription → `not_evaluated` automático.

Cada estado segue o contrato já aceito do feature gate. Divergência
observada entre documentação e runtime é bloqueio: a SCP-011 não
inicia até que a divergência seja registrada e resolvida.

## 13. Semântica de ausência e unlimited

- `unlimited` **não é suportado** pela SCP-011. Nenhuma
  representação explícita existe (`-1`, sentinelas, `NULL`,
  ausência — todos proibidos como "ilimitado").
- `limit = 0` é limite finito válido.
- Ausência, `NULL` ou valor inválido não significam ilimitado.
- Quando a feature decision for positiva mas o valor numérico não
  puder ser resolvido de modo determinístico:

```
allowed = false
reason = "not_evaluated"
source = "none"
limit = null
used = null
remaining = null
requestedIncrement = 1
```

`limit_reached` só é emitido com limite finito e uso autoritativos
comprovados.

## 14. `requestedIncrement`

Contrato único da primeira implementação:

- Ausente → default server-side `= 1`.
- Igual a `1` → válido.
- Zero, negativo, fracionário, `NaN`, `Infinity`, overflow, maior
  que `1` → **input rejeitado no boundary** antes de emitir
  `CommercialLimitDecision`.

Consequência: `used + 1 ≤ limit` é a única condição avaliada.
Operações em lote permanecem fora de escopo.

## 15. Matriz determinística

| Cenário | `allowed` | `reason` | `source` | `limit` | `used` | `remaining` |
| --- | --- | --- | --- | --- | --- | --- |
| feature gate não catalogada | `false` | `not_evaluated` | `none` | `null` | `null` | `null` |
| feature não entitled | `false` | `not_entitled` | conforme feature decision | `null` | `null` | `null` |
| billing desconhecido | `false` | `billing_unknown` | conforme feature decision | `null` | `null` | `null` |
| billing exige atenção | `false` | `billing_attention_required` | conforme feature decision | `null` | `null` | `null` |
| billing bloqueado | `false` | `billing_blocked` | conforme feature decision | `null` | `null` | `null` |
| feature allowed e limite ausente | `false` | `not_evaluated` | `none` | `null` | `null` | `null` |
| feature allowed e limite inválido | `false` | `not_evaluated` | `none` | `null` | `null` | `null` |
| feature allowed e used indisponível | `false` | `not_evaluated` | fonte resolvida (`tenant`\|`plan`\|`default`) | valor ou `null` | `null` | `null` |
| feature allowed e `used + 1 ≤ limit` | `true` | `entitled` | `tenant`\|`plan`\|`default` | valor | valor | valor |
| feature allowed e `used + 1 > limit` | `false` | `limit_reached` | `tenant`\|`plan`\|`default` | valor | valor | `0` |
| Super Admin sem impersonação | erro anterior ao DTO | não aplicável | não aplicável | não aplicável | não aplicável | não aplicável |
| Super Admin impersonando tenant | avaliação normal | conforme contrato | conforme contrato | conforme contrato | conforme contrato | conforme contrato |

Nas linhas de propagação, `conforme feature decision` significa
literalmente o valor emitido por `getCommercialFeatureDecision` no
mesmo request, sem reinterpretação.

## 16. Read models planejados

Somente definição — nenhum é implementado nesta etapa.

- `getSeatUsage(tenantId): number` — server-only;
  `COUNT(*) FROM tenant_members WHERE tenant_id = $1 AND
  membership_status IN ('active','invited')`.
- Extração do limite numérico a partir do read model comercial
  autoritativo (§10), sem query independente.
- `getCommercialSeatLimitDecision(tenantId,
  { requestedIncrement = 1 }): CommercialLimitDecision` —
  combinação read-only conforme §9, §15.

## 17. `requireTenant` e impersonação

Toda server function que consumir a decisão utilizará
`requireTenant`; a precedência de impersonação já implementada
(`impersonation-state.ts`, `tenant-attacher.ts`) é preservada. Super
Admin sem tenant impersonado não emite `CommercialLimitDecision` —
o erro precede o DTO.

## 18. RLS, grants e direct reads

Nenhuma nova policy, grant ou tabela. Leituras planejadas seguem
policies existentes (`tenant_members`, `tenant_entitlements`,
`commercial_plan_entitlements`, `tenant_subscriptions`) via
server-only clients já usados pelo runtime comercial aceito.

## 19. Mutation inventory

Busca em `src/**` por escritas em `tenant_members` (INSERT / UPDATE
/ UPSERT / DELETE / RPC): **nenhuma mutation aplicacional** foi
localizada. Os arquivos que citam a tabela executam apenas SELECT
(`tenant-selection.functions.ts`, `super.functions.ts`,
`tenant-repository.ts`). Consequência: a SCP-011 será exclusivamente
runtime de avaliação read-only. A SCP-012 tratará (a) criação de
novos boundaries, (b) migração de writes SQL/admin para boundaries
aplicacionais e (c) enforcement atômico.

## 20. TOCTOU e separação SCP-011/SCP-012

Avaliação read-only não é enforcement: `used` é lido fora da
transação de qualquer mutation futura. Resolução (função SQL
transacional, RPC com advisory lock, ou constraint agregada) é
escopo exclusivo da SCP-012, sob auditoria própria.

## 21. Plano de testes (planejamento apenas)

A SCP-011 deverá cobrir:

- Propagação da feature decision negativa (todos os `reason`
  possíveis) sem leitura de `tenant_members`.
- `entitled` com `used + 1 ≤ limit`.
- `limit_reached` com `used + 1 > limit` e `remaining = 0`.
- `not_evaluated` para limite ausente/inválido/`used` indisponível.
- Rejeição de `requestedIncrement` inválido antes do DTO.
- Impersonação: Super Admin sem tenant erra antes do DTO; com
  tenant impersonado avalia normalmente.

Nenhum teste novo é executado nesta etapa (documental).

## 22. Hard Gates

- SCP-011 não inicia sem auditoria externa aprovando SCP-010 +
  SCP-010.1 + SCP-010.2.
- SCP-012 não inicia sem SCP-011 aceita.
- Nenhuma etapa 010.x pode ser marcada `Accepted` sem auditoria.

## 23. Sequência arquitetural

SCP-010 (contrato) → SCP-010.1 (verificação/determinismo) →
SCP-010.2 (alinhamento de DTO e consolidação) → auditoria externa →
SCP-011 (runtime read-only) → SCP-012 (enforcement atômico em
mutations).

## 24. Restrições absolutas

Nenhum código de produção, migration, tabela, coluna, enum,
constraint, índice, RPC, SQL function, trigger, RLS policy, grant,
mutation, frontend, provider, checkout, webhook, billing real ou
enforcement foi criado ou alterado. `limit_reached` não é emitido
em runtime. `storage.media_limit` fora de escopo.
`getCommercialFeatureDecision`, `decideCommercialFeature`,
`normalizeFeatureKey`, `feature-catalog.ts`, `feature-gate.ts`,
`read-models.ts`, `commercial.functions.ts` inalterados. SCP-011 e
SCP-012 não iniciadas.
