# SCP-011 — Commercial Seat Limit Server Runtime

## Status

Accepted

## Objetivo

Materializar o runtime server-side, read-only e determinístico do limite
comercial de assentos (`users.seats`), emitindo o DTO canônico
`CommercialLimitDecision` planejado na cadeia SCP-010 → SCP-010.5.4.

Esta etapa **não** implementa mutations, reservas atômicas, provider
integration, checkout, webhook, customer portal, enforcement, migrations,
RLS policies, grants ou UI.

## Escopo executado

Foi implementado somente:

- helper puro `decideCommercialSeatLimit` + tipos + validadores
  (`src/lib/api/commercial/limit-decision.ts`);
- extração server-only do limite a partir do `TenantEntitlementSnapshot`
  já produzido pelo resolver comercial autoritativo (SCP-004);
- leitura server-only do uso (`COUNT` em `public.tenant_members` com
  `membership_status IN ('active','invited')`) dentro do handler da
  server function pública;
- server function pública `getCommercialSeatLimitDecision` em
  `src/lib/api/commercial/commercial.functions.ts`;
- refatoração mínima de `getCommercialFeatureDecision` para reutilizar
  um `loadTenantCommercialContext` compartilhado (evita dual-path);
- suíte determinística `commercial-seat-limit.spec.ts` (34 specs);
- registro da suíte no `run-tenant-specs.ts`.

## Escopo NÃO executado (confirmações negativas)

- nenhuma migration criada, alterada ou removida;
- nenhum schema, RLS policy, GRANT ou role introduzido;
- nenhuma mutation em `tenant_members` (insert/update/upsert/delete)
  criada — verificado por `rg`;
- nenhum lock, advisory lock, trigger, RPC transacional ou constraint
  agregada implementado;
- nenhum provider (Stripe/Hotmart/Kiwify), webhook, checkout ou
  customer portal implementado;
- nenhum novo role (`billing_admin`, `commercial_admin`,
  `canManageTenantBilling`) introduzido;
- nenhum frontend, hook client-side, feature-gate client-side ou UI
  tocado;
- SCP-012 não foi iniciada.

## Contrato público

### Server function

```ts
// src/lib/api/commercial/commercial.functions.ts
export const getCommercialSeatLimitDecision = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => ({
    requestedIncrement: normalizeSeatIncrement(
      (data as { requestedIncrement?: unknown } | undefined)?.requestedIncrement,
    ),
  }))
  .handler(async ({ context, data }): Promise<CommercialLimitDecision> => { … })
```

Input aceito (fixado server-side):

```ts
type CommercialSeatLimitInput = {
  requestedIncrement?: number; // undefined → 1; único valor aceito além de undefined é 1
};
```

O client **nunca** informa `tenantId`, `featureKey`, `used`, `limit`,
`remaining`, `source`, billing status ou membership count. A
`featureKey` é fixada em `SEAT_FEATURE_KEY = "users.seats"`.

### DTO canônico

```ts
type CommercialLimitDecisionReason =
  | "entitled"
  | "not_entitled"
  | "limit_reached"
  | "billing_unknown"
  | "billing_attention_required"
  | "billing_blocked"
  | "not_evaluated";

type CommercialLimitDecisionSource = "tenant" | "plan" | "default" | "none";

interface CommercialLimitDecision {
  tenantId: string;
  featureKey: string;               // sempre "users.seats"
  allowed: boolean;
  reason: CommercialLimitDecisionReason;
  source: CommercialLimitDecisionSource;
  limit: number | null;
  used: number | null;              // COUNT(active + invited)
  requestedIncrement: number;       // sempre 1 nesta etapa
  remaining: number | null;         // saldo ANTES da futura operação
}
```

## Fluxo completo da decisão

1. `requireTenant` (compõe `requireSupabaseAuth`) resolve `tenantId`
   exclusivamente server-side. Super Admin sem impersonação é rejeitado
   antes do DTO; Super Admin impersonando prossegue **sem bypass**.
2. `normalizeSeatIncrement` valida `requestedIncrement`.
   `undefined → 1`; `1 → 1`; qualquer outro valor (0, ≥2, negativo,
   fracionário, NaN, ±Infinity, string, null, fora de MAX_SAFE_INTEGER)
   é rejeitado com `Error("Invalid requestedIncrement")` antes do DTO.
3. `loadTenantCommercialContext(admin, tenantId)` (helper compartilhado)
   consulta `tenant_subscriptions`, `tenant_entitlements`,
   `commercial_plan_entitlements`, `tenant_billing_provider_mappings` e
   `billing_events`, e chama os derivadores puros `deriveEntitlementSnapshot`
   e `deriveBillingHealth` do SCP-004.
4. `decideCommercialFeature({tenantId, featureKey: "users.seats",
   snapshot, billing})` produz o `CommercialFeatureDecision`.
5. Se `featureDecision.allowed === false`, o handler **não** lê
   `tenant_members` e chama `decideCommercialSeatLimit` que propaga
   `reason` / `source` do commercial decision e zera limit/used/remaining.
6. Se `featureDecision.allowed === true`, o handler chama
   `extractSeatLimit(snapshot)` (pura, mesmo snapshot) e, em seguida,
   executa a leitura server-only:
   ```sql
   SELECT COUNT(*)
     FROM public.tenant_members
    WHERE tenant_id = :tenantId
      AND membership_status IN ('active','invited');
   ```
   (`.select("*", { count: "exact", head: true })` no supabase-js).
7. O valor bruto passa por `validateSeatUsedCount` (rejeita
   null/undefined/negativo/fracionário/não-finito/>MAX_SAFE_INTEGER).
8. `decideCommercialSeatLimit` computa a decisão final.

## Reutilização do resolver comercial (§12 — sem dual-path)

- `getCommercialFeatureDecision` e `getCommercialSeatLimitDecision`
  compartilham `loadTenantCommercialContext`, garantindo uma única
  ordem de precedência `tenant_entitlements → tenant_subscriptions
  → commercial_plan_entitlements`.
- O valor numérico `users.seats` é extraído do **mesmo**
  `TenantEntitlementSnapshot` — não há um segundo resolver.
- Nenhum comportamento de `getCommercialFeatureDecision` mudou: a
  suíte `commercial-feature-gate` (15/15) continua passando.

## Mapeamento de `source`

O DTO expõe somente `tenant | plan | default | none`. A extração usa
diretamente o campo `source` de `EntitlementSnapshotItem`, já sanitizado
pelo SCP-004 (`tenant | plan | default`). Ausência, entitlement
não efetivo, ou valor não-inteiro válido colapsam para `none`. Nenhum
outro valor (`override`, `system`, `tenant_entitlement`,
`plan_entitlement`, `unknown`) é emitido.

## Matriz de resultados

| Cenário                                                | allowed | reason                        | source            | limit | used | remaining |
| ------------------------------------------------------ | ------- | ----------------------------- | ----------------- | ----- | ---- | --------- |
| entitled, used < limit                                 | true    | entitled                      | tenant/plan/default | n   | u    | max(n-u,0)|
| entitled, used = limit                                 | false   | limit_reached                 | tenant/plan/default | n   | u    | 0         |
| entitled, used > limit                                 | false   | limit_reached                 | tenant/plan/default | n   | u    | 0         |
| entitled, limit = 0, used = 0                          | false   | limit_reached                 | tenant/plan/default | 0   | 0    | 0         |
| feature not_entitled                                   | false   | not_entitled                  | (do feature)      | null  | null | null      |
| billing_unknown / attention_required / blocked         | false   | (propagado)                   | (do feature)      | null  | null | null      |
| not_evaluated (catalog gate / etc)                     | false   | not_evaluated                 | (do feature)      | null  | null | null      |
| feature entitled, limit ausente/inválido               | false   | not_evaluated                 | none              | null  | null | null      |
| feature entitled, limit ok, used indisponível          | false   | not_evaluated                 | tenant/plan/default | n   | null | null      |

## Exemplos reais de retorno

```jsonc
// entitled
{
  "tenantId": "…-uuid", "featureKey": "users.seats",
  "allowed": true, "reason": "entitled", "source": "plan",
  "limit": 5, "used": 2, "requestedIncrement": 1, "remaining": 3
}

// limit_reached
{
  "tenantId": "…-uuid", "featureKey": "users.seats",
  "allowed": false, "reason": "limit_reached", "source": "tenant",
  "limit": 5, "used": 5, "requestedIncrement": 1, "remaining": 0
}

// not_entitled (propagado da feature decision)
{
  "tenantId": "…-uuid", "featureKey": "users.seats",
  "allowed": false, "reason": "not_entitled", "source": "plan",
  "limit": null, "used": null, "requestedIncrement": 1, "remaining": null
}

// billing_unknown
{
  "tenantId": "…-uuid", "featureKey": "users.seats",
  "allowed": false, "reason": "billing_unknown", "source": "none",
  "limit": null, "used": null, "requestedIncrement": 1, "remaining": null
}

// billing_attention_required
{
  "tenantId": "…-uuid", "featureKey": "users.seats",
  "allowed": false, "reason": "billing_attention_required", "source": "plan",
  "limit": null, "used": null, "requestedIncrement": 1, "remaining": null
}

// billing_blocked
{
  "tenantId": "…-uuid", "featureKey": "users.seats",
  "allowed": false, "reason": "billing_blocked", "source": "plan",
  "limit": null, "used": null, "requestedIncrement": 1, "remaining": null
}

// not_evaluated (feature positive, limit ausente)
{
  "tenantId": "…-uuid", "featureKey": "users.seats",
  "allowed": false, "reason": "not_evaluated", "source": "none",
  "limit": null, "used": null, "requestedIncrement": 1, "remaining": null
}
```

## Verificações executadas

- `bunx tsgo --noEmit` → exit 0.
- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` →
  115 passed, 0 failed (todas as 9 suítes).
- `rg -n 'tenant_members' src/` → apenas leituras (repositório e nova
  leitura de COUNT).
- `rg -n 'from\(.tenant_members.\).*\.(insert|update|upsert|delete)' src/`
  → zero ocorrências.
- `rg -n 'getCommercialSeatLimitDecision|CommercialLimitDecision|decideCommercialSeatLimit' src/`
  → aparece apenas em `limit-decision.ts`, `commercial.functions.ts`
  e na nova spec.

## Bloco final do roadmap

```
14.5.4 SCP-010.5.4 — Final Accepted Status Closure & SCP-011 Authorization — Accepted.
15. SCP-011 — Commercial Seat Limit Server Runtime — Ready for External Audit.
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — próxima etapa futura planejada; não iniciada.
```

Não iniciar SCP-012 até a aprovação externa da SCP-011.
