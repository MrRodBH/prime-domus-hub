# SCP-006 — Commercial Feature Gate Server Runtime

## Status

Accepted

## Acceptance Note

SCP-006 is accepted.

The accepted runtime scope is limited to the server-side commercial feature decision boundary:

- `getCommercialFeatureDecision`;
- `decideCommercialFeature`;
- `normalizeFeatureKey`;
- sanitized `CommercialFeatureDecision` DTO;
- deterministic allow/deny/reason/source response.

SCP-006 does not implement billing real, provider integration, webhook, checkout, customer portal, billing_admin, commercial_admin, canManageTenantBilling, tenant_members changes, permissive RLS, grants, commercial mutation, direct client reads, or SCP-007.

## 1. Objetivo

Implementar o primeiro runtime server-side determinístico de feature
gate comercial do RM Prime SaaS / RM Prime OS, com base na SCP-005 —
Commercial Entitlement Runtime Boundary Planning. A etapa transforma
os read models comerciais da SCP-004 em uma decisão sanitizada de
disponibilidade de feature.

## 2. Escopo

- Nova função server-side `getCommercialFeatureDecision`.
- Novo helper puro `decideCommercialFeature` + normalizador
  `normalizeFeatureKey` em `src/lib/api/commercial/feature-gate.ts`.
- Novo DTO `CommercialFeatureDecision` com `reason` e `source` como
  enums fechados.
- Testes determinísticos cobrindo todos os caminhos de decisão,
  validação de entrada e garantias de sanitização.
- Atualização do roadmap para refletir SCP-006 como
  `Implemented / Ready for External Audit` e SCP-007 como próxima etapa.

## 3. Fora de escopo

A SCP-006 não implementa e não introduz nenhuma das superfícies
abaixo:

- billing real;
- cobrança, upgrade, downgrade, cancelamento de plano;
- checkout;
- customer portal;
- webhook;
- integração real com Stripe, Hotmart ou Kiwify;
- provider adapter real;
- `billing_admin`;
- `commercial_admin`;
- `canManageTenantBilling`;
- alteração em `tenant_members`;
- RLS permissiva ou grant para usuários finais;
- UI administrativa comercial;
- mutation comercial;
- entitlement como substituto de membership authorization;
- Super Admin bypassar entitlement.

## 4. Função server-side criada

`getCommercialFeatureDecision` — `createServerFn({ method: "POST" })`,
composta com `requireTenant` (que compõe `requireSupabaseAuth`).

Contrato de entrada validado por `.inputValidator()`:

```
type CommercialFeatureDecisionInput = {
  featureKey: string;
};
```

Regras de validação:

- `featureKey` obrigatório;
- `featureKey` deve ser string;
- `featureKey` não vazia (após trim);
- `featureKey` normalizada para lowercase;
- charset restrito a `[a-z0-9_.:-]{1,120}`;
- entrada inválida lança erro controlado;
- `tenantId` NUNCA é aceito do client — resolvido server-side por
  `requireTenant`. `x-tenant-id` permanece transporte, não autoridade.

## 5. DTO final

```
export type CommercialFeatureDecisionReason =
  | "entitled"
  | "not_entitled"
  | "limit_reached"
  | "billing_unknown"
  | "billing_attention_required"
  | "billing_blocked"
  | "not_evaluated";

export type CommercialFeatureDecisionSource =
  | "tenant"
  | "plan"
  | "default"
  | "none";

export interface CommercialFeatureDecision {
  tenantId: string;
  featureKey: string;
  allowed: boolean;
  reason: CommercialFeatureDecisionReason;
  source: CommercialFeatureDecisionSource;
}
```

Garantias:

- `allowed` é boolean determinístico.
- `reason` é enum fechado.
- `source` é enum fechado.
- Nenhum campo financeiro cru é retornado.
- Nenhum provider ID é retornado.
- Nenhum payload, hash, idempotency key ou mensagem interna de erro é
  retornado.
- Nenhuma subscription raw é retornada.
- Nenhum entitlement raw é retornado.

## 6. Lógica determinística de decisão

Precedência auditável (top-down, sem heurística, sem fallback):

1. `billing.status === "blocked"` → `allowed=false`,
   `reason="billing_blocked"`, `source` derivado do item quando existe,
   `"none"` caso contrário.
2. `billing.status === "attention_required"` → `allowed=false`,
   `reason="billing_attention_required"`, `source` idem.
3. Entitlement encontrado e efetivo → `allowed=true`,
   `reason="entitled"`, `source=item.source`. Se `value === false` de
   forma explícita, a feature é negada como `not_entitled`.
4. Entitlement encontrado mas não efetivo → `allowed=false`,
   `reason="not_entitled"`, `source=item.source`.
5. Entitlement inexistente e `billing.status === "unknown"` →
   `allowed=false`, `reason="billing_unknown"`, `source="none"`.
6. Caso contrário → `allowed=false`, `reason="not_entitled"`,
   `source="none"`.

`limit_reached` e `not_evaluated` são reservados no enum para
extensões futuras; não são emitidos pela lógica atual.

## 7. Relação com SCP-004

- A SCP-006 reutiliza os helpers puros `deriveEntitlementSnapshot` e
  `deriveBillingHealth` de `src/lib/api/commercial/read-models.ts`.
- Nenhum novo formato de DTO comercial é criado.
- As leituras server-side seguem exatamente as mesmas colunas
  whitelisted da SCP-004 — nenhum campo adicional (provider refs,
  payload, hash, idempotency, error_*) passa a ser lido.
- As três funções aprovadas em SCP-004 permanecem inalteradas:
  `getTenantCommercialSummary`, `getTenantEntitlementSnapshot`,
  `getTenantBillingHealth`.

## 8. Relação com SCP-005

Preserva integralmente os hard gates:

- SCP5-G1 — Entitlement Decisions Are Server-Side Only.
- SCP5-G2 — Entitlements Do Not Replace Membership Authorization.
- SCP5-G3 — No Direct Client Reads From Commercial Tables.
- SCP5-G4 — No Billing Enforcement Without Explicit Governance
  (`billing_blocked` denega a feature, sem side effect).
- SCP5-G5 — No Commercial Admin Surface.
- SCP5-G6 — No Provider Runtime Integration.
- SCP5-G7 — Deterministic Allow/Deny Reasons Required.
- SCP5-G8 — auditoria da SCP-005 externa foi concluída antes desta
  implementação.

## 9. Relação com Membership Authorization

- `getCommercialFeatureDecision` compõe `requireTenant`, que compõe
  `requireSupabaseAuth`.
- Um usuário sem membership ativa nunca chega à camada comercial.
- Entitlement NUNCA substitui autorização de usuário.

## 10. Relação com Super Admin Impersonation

- Super Admin sem impersonação explícita não resolve tenant e não
  acessa a decisão.
- Super Admin impersonando um tenant recebe exatamente a mesma
  decisão que o tenant real receberia; não existe bypass comercial.

## 11. Garantias de sanitização

Verificadas por teste:

- DTO possui apenas as chaves `tenantId`, `featureKey`, `allowed`,
  `reason`, `source`.
- Regex de sanidade no JSON do DTO rejeita `provider`, `payload`,
  `idempotency`, `raw`, `subscription`, `customer`, `hash`,
  `error_message`.
- `reason` e `source` são checados contra o enum fechado.

## 12. Testes executados

Novo arquivo: `src/integrations/supabase/__tests__/commercial-feature-gate.spec.ts`,
registrado no runner unificado `run-tenant-specs.ts` sem remover specs
anteriores.

Cobertura:

- `featureKey` ausente / vazia / não-string / com caracteres inválidos;
- normalização com trim + lowercase;
- feature existente e efetiva → allow;
- feature existente e não efetiva → deny;
- feature inexistente → deny;
- billing `unknown` → `billing_unknown`;
- billing `attention_required` → precedência sobre entitled;
- billing `blocked` → precedência sobre entitled;
- `source` = `tenant`, `plan`, `default`, `none`;
- `value === false` explícito nega mesmo se effective;
- DTO sanitizado (whitelist de chaves + ausência de campos crus);
- `reason` e `source` sempre em enum fechado;
- membership authorization preservada (fn depende de `requireTenant`);
- Super Admin sem bypass comercial (o próprio `requireTenant`
  aplica a mesma resolução).

Resultado dos testes: reportado no chat de execução (runner
`run-tenant-specs.ts`).

## 13. Inspeções textuais

Comandos executados:

```bash
rg -n "supabase\.from\(['\"](commercial_plans|commercial_entitlement_definitions|commercial_plan_entitlements|tenant_subscriptions|tenant_entitlements|billing_provider_definitions|tenant_billing_provider_mappings|billing_events|billing_event_transitions)" src/
rg -n "\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(" src/lib/api/commercial/
rg -in "stripe|hotmart|kiwify|webhook|checkout|customer portal|provider_secret|idempotency|payload_hash|raw_payload" src/lib/api/commercial/
rg -n "billing_admin|commercial_admin|canManageTenantBilling" src/lib/api src/integrations/supabase
rg -n "SCP-005|SCP-006|SCP-007|Accepted|Implemented / Ready|próxima etapa" docs/architecture/ROADMAP_ARCHITECTURAL.md
```

Confirmações:

- 0 direct client reads de tabelas comerciais/billing.
- Leituras server-side de tabelas comerciais/billing restritas a
  `src/lib/api/commercial/commercial.functions.ts` (funções aprovadas
  em SCP-004 + `getCommercialFeatureDecision`).
- 0 mutations em `src/lib/api/commercial/` (nenhum `.insert(`,
  `.update(`, `.upsert(`, `.delete(`, `.rpc(`).
- 0 implementação runtime de provider/billing real; ocorrências dos
  termos `stripe|hotmart|kiwify|webhook|checkout|customer portal|
  provider_secret|idempotency|payload_hash|raw_payload` em
  `src/lib/api/commercial/` restritas a comentários de fora de escopo
  ou governança.
- 0 ocorrências runtime de `billing_admin`, `commercial_admin`,
  `canManageTenantBilling` em `src/lib/api` ou
  `src/integrations/supabase`.
- Roadmap: SCP-005 aparece uma única vez como `Accepted`, SCP-006 uma
  única vez como `Implemented / Ready for External Audit`, SCP-007
  apenas como próxima etapa futura.

## 14. Restrições preservadas

- Client nunca é autoridade.
- Server-side é autoridade única.
- Sem fallback heurístico, sem dual-path, sem tenant default.
- `x-tenant-id` permanece transporte, não autorização.
- Super Admin sem impersonação explícita não acessa recursos
  tenant-scoped.
- RLS multi-tenant preservada.
- Nenhum direct client read de tabelas comerciais/billing.
- Nenhuma mutation comercial.

## 15. Próximo passo recomendado

Submeter a SCP-006 a auditoria externa. Definir e planejar a SCP-007
apenas após aprovação arquitetural explícita. Não iniciar SCP-007.
