# SCP-008 — Commercial Feature Key Catalog Materialization & Server Validation

## Status

Accepted

## Acceptance Note

SCP-008 is accepted together with SCP-008.1 and SCP-008.2.

The accepted runtime scope is limited to:

- server-authoritative commercial feature key catalog;
- pure feature catalog helpers;
- catalog integrity validation;
- server-side catalog validation inside `getCommercialFeatureDecision`;
- `not_evaluated` decision for syntactically valid but non-cataloged feature keys.

SCP-008 does not implement billing real, provider integration, webhook, checkout, customer portal, billing_admin, commercial_admin, canManageTenantBilling, tenant_members changes, permissive RLS, grants, seed, commercial mutation, direct client reads, or SCP-009.


## 1. Objetivo

Materializar o primeiro catálogo server-authoritative de `featureKey` comerciais e integrá-lo como gate determinístico dentro de `getCommercialFeatureDecision` (SCP-006). Chaves sintaticamente válidas mas não catalogadas passam a resolver como `not_evaluated` / `source: "none"` sem tocar snapshot, billing, provider ou executar mutação.

## 2. Escopo

- Catálogo estático server-side em `src/lib/api/commercial/feature-catalog.ts`.
- Tipos fechados: `CommercialFeatureDomain`, `CommercialFeatureValueType`, `CommercialFeatureStatus`, `CommercialFeatureCatalogItem`.
- Metadados mínimos por feature: `key`, `domain`, `valueType`, `description`, `status`.
- Helpers puros:
  - `getCommercialFeatureCatalogItem(featureKey)`
  - `isCommercialFeatureCataloged(featureKey)`
  - `assertCommercialFeatureCatalogIntegrity()`
  - `evaluateFeatureCatalogGate({ tenantId, featureKey })`
- Integração com `getCommercialFeatureDecision` (short-circuit antes de qualquer leitura em `tenant_subscriptions` / `tenant_entitlements` / `commercial_plan_entitlements` / `tenant_billing_provider_mappings` / `billing_events`).
- Testes determinísticos e roadmap atualizado.

## 3. Fora de escopo (preservado)

Nenhuma das seguintes superfícies foi criada ou alterada:

- migration, tabela, RLS policy, grant, seed;
- UI, hook client-side;
- billing real, upgrade/downgrade/cancelamento;
- provider integration (Stripe, Hotmart, Kiwify);
- webhook, checkout, customer portal;
- `billing_admin`, `commercial_admin`, `canManageTenantBilling`;
- alteração em `tenant_members`;
- RLS permissiva ou direct client read de tabelas comerciais/billing;
- mutation comercial;
- alteração em membership authorization;
- bypass de entitlement por Super Admin.

SCP-009 não foi iniciada.

## 4. Arquivo de catálogo criado

`src/lib/api/commercial/feature-catalog.ts` — módulo puro, dependency-free (importa apenas o tipo `CommercialFeatureDecision` de `feature-gate.ts`). Não usa supabase, filesystem, rede.

Catálogo inicial (15 keys) cobre domínios `crm`, `cms`, `site`, `ai`, `users`, `storage`, `integrations`. Nenhuma key usa namespace de provider, nem é tenant-specific ou plan-specific.

## 5. Helpers criados

| Helper | Comportamento |
|---|---|
| `getCommercialFeatureCatalogItem(key)` | Retorna `CommercialFeatureCatalogItem \| null`. |
| `isCommercialFeatureCataloged(key)` | Retorna `boolean`. |
| `assertCommercialFeatureCatalogIntegrity()` | Lança em qualquer violação das regras (ver §6). |
| `evaluateFeatureCatalogGate({ tenantId, featureKey })` | Retorna decisão `not_evaluated` para keys não catalogadas, `null` para catalogadas (segue fluxo SCP-006). |

## 6. Regras de integridade validadas

- Nenhuma key duplicada.
- Toda key em lowercase.
- Nenhuma key com espaço.
- Nenhuma key com caractere não-ASCII (acento/símbolo).
- Toda key compatível com o regex de `normalizeFeatureKey` (SCP-006).
- Nenhum namespace proibido: `stripe`, `hotmart`, `kiwify`.
- Nenhuma key contendo `webhook`, `checkout`, `customer_portal`, `customer-portal`.
- `status` restrito a `active | reserved | deprecated`.
- `domain` restrito ao enum fechado.
- `valueType` restrito a `boolean | number | text`.
- `description` não-vazia.

## 7. Integração com SCP-006

`getCommercialFeatureDecision` (em `src/lib/api/commercial/commercial.functions.ts`) executa, após `normalizeFeatureKey` e antes de qualquer leitura de DB:

```ts
const catalogGate = evaluateFeatureCatalogGate({ tenantId, featureKey });
if (catalogGate) return catalogGate;
```

Feature não catalogada retorna:

```json
{ "tenantId": "...", "featureKey": "...", "allowed": false, "reason": "not_evaluated", "source": "none" }
```

- Não lança erro para input sintaticamente válido mas não catalogado.
- Não consulta entitlement snapshot.
- Não executa mutation.
- Não chama provider.
- Não expõe catálogo ao client como autoridade (nada foi exportado ao browser bundle; helpers são consumidos apenas server-side pela função protegida).
- Não altera membership authorization (`requireTenant` continua intocado).

Features catalogadas seguem exatamente o `decideCommercialFeature` original da SCP-006 — precedência inalterada.

## 8. Relação com SCP-007

A SCP-007 definiu a governança conceitual (documento) das chaves comerciais. A SCP-008 é a primeira materialização executável dessa governança: transforma o catálogo em módulo server-side com integridade validada e integra-o ao runtime da SCP-006 sem violar nenhuma restrição da SCP-007.

## 9. Testes

Criado `src/integrations/supabase/__tests__/commercial-feature-catalog.spec.ts` cobrindo:

- integridade do catálogo;
- ausência de duplicatas;
- compatibilidade com `normalizeFeatureKey`;
- ausência de provider namespaces proibidos;
- ausência de termos runtime proibidos;
- ausência de keys tenant-specific / plan-specific;
- `isCommercialFeatureCataloged("crm.pipeline") === true`;
- key desconhecida retorna `false` e `null`;
- não catalogada → `not_evaluated` / `source: "none"`;
- catalogada segue decisão SCP-006 normal (`entitled` quando snapshot cobre);
- feature `reserved` não gera leak de provider/billing runtime;
- DTO sanitizado (5-field whitelist, sem `provider|payload|idempotency|raw|hash|customer|subscription`).

Registrada no runner `run-tenant-specs.ts` sem remover suítes anteriores.

## 10. Inspeções textuais

Executadas conforme §10 do briefing:

- 0 direct client reads das tabelas comerciais/billing em `src/`.
- 0 mutations (`.insert|.update|.upsert|.delete|.rpc`) em `src/lib/api/commercial/`.
- 0 implementação runtime de provider/billing real em `src/lib/api/commercial/` (ocorrências são apenas comentários de fora de escopo/governança).
- 0 ocorrências runtime de `billing_admin | commercial_admin | canManageTenantBilling`.
- Roadmap: SCP-007 aparece uma única vez como `Accepted`, SCP-008 aparece uma única vez como `Implemented / Ready for External Audit`, SCP-009 aparece apenas como próxima etapa futura, sem duplicidade de numeração.

## 11. Próximo passo recomendado

Aguardar auditoria externa da SCP-008. Iniciar SCP-009 apenas após aprovação arquitetural explícita. Não iniciar SCP-009.
