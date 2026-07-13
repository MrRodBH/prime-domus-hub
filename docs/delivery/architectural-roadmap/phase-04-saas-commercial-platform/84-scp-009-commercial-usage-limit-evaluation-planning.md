# SCP-009 — Commercial Usage Limit Evaluation Planning

## Status

Accepted

## Acceptance Note

SCP-009 is accepted together with SCP-009.1 and SCP-009.2.

The accepted scope is architectural planning only.

SCP-009 defines the future governance model for numeric commercial usage limits, including:

- numeric entitlement semantics;
- distinction between boolean features and numeric limits;
- future `CommercialLimitDecision` DTO;
- future server-side usage sources;
- reserved behavior for `limit_reached`;
- hard gates SCP9-G1 through SCP9-G10.

SCP-009 does not implement runtime code, usage counters, limit enforcement, `limit_reached` emission, billing real, provider integration, webhook, checkout, customer portal, billing_admin, commercial_admin, canManageTenantBilling, tenant_members changes, permissive RLS, grants, seeds, mutations, direct client reads, or SCP-010.

## 1. Objetivo

Planejar a avaliação futura de limites comerciais numéricos no RM Prime
SaaS / RM Prime OS antes de qualquer implementação runtime de
enforcement. Esta etapa é exclusivamente documental / governança.

## 2. Contexto

Sequência atual da Fase 4:

1. IA-006 — SaaS Commercial Platform Impact Analysis — Accepted.
2. ADR-005 — Commercial Domain — Accepted.
3. ADR-006 — Billing Provider Abstraction — Accepted.
4. F4.0 — Role Reconciliation / Membership Role Audit — Accepted.
5. SCP-001 — Commercial Domain Model — Accepted.
6. SCP-002 — Billing Provider Abstraction Materialization — Accepted.
7. SCP-003 — Commercial Read Models / Server-Side Access Planning — Accepted.
8. SCP-004 — Commercial Server Read Functions — Accepted.
9. SCP-005 — Commercial Entitlement Runtime Boundary Planning — Accepted.
10. SCP-006 — Commercial Feature Gate Server Runtime — Accepted.
11. SCP-007 — Commercial Feature Key Catalog Planning — Accepted.
12. SCP-008 — Commercial Feature Key Catalog Materialization & Server Validation — Accepted.
13. SCP-009 — Commercial Usage Limit Evaluation Planning — etapa atual.

Runtime atual preservado e não alterado por esta etapa:
`getCommercialFeatureDecision`, `decideCommercialFeature`,
`normalizeFeatureKey`, `feature-catalog.ts`, `evaluateFeatureCatalogGate`.

## 3. Escopo

Planejamento arquitetural para:

- semântica de entitlements numéricos;
- diferença entre feature booleana e limite numérico;
- comportamento futuro de `limit_reached`;
- fontes server-side de leitura de uso por domínio;
- DTO futuro para decisão de limite;
- relação entre catálogo, entitlement snapshot e usage snapshot;
- regras de segurança para cálculo server-side;
- hard gates para futura implementação;
- critérios de aceitação para SCP-010 ou etapa posterior.

## 4. Fora de escopo

A SCP-009 **não** pode: implementar código runtime; alterar
`getCommercialFeatureDecision`; alterar `decideCommercialFeature`;
alterar `normalizeFeatureKey`; alterar `feature-catalog.ts`; criar
migration; criar tabela; criar RLS policy; criar grant; criar seed;
criar UI; criar hook client-side; implementar contador de uso;
implementar enforcement de limite; emitir `limit_reached` em runtime;
implementar billing real; implementar cobrança; implementar
upgrade/downgrade/cancelamento; implementar provider integration;
integrar Stripe, Hotmart ou Kiwify; implementar webhook; implementar
checkout; implementar customer portal; criar `billing_admin`; criar
`commercial_admin`; criar `canManageTenantBilling`; alterar
`tenant_members`; abrir RLS permissiva; permitir direct client read
de tabelas comerciais/billing; executar mutation comercial; alterar
membership authorization; permitir Super Admin bypassar entitlement;
iniciar SCP-010.

## 5. Problema arquitetural

- A SCP-008 introduziu chaves catalogadas com `valueType: "number"`,
  mas o runtime atual ainda não calcula uso nem compara limites.
- Enquanto a SCP-009 / SCP-010 não forem aprovadas e auditadas,
  entitlements numéricos **não devem** ser usados como enforcement
  comercial definitivo.
- O `reason` `"limit_reached"` permanece reservado e **não deve** ser
  emitido por runtime até que exista decisão arquitetural e
  implementação auditada.

## 6. Diferença entre feature booleana e limite numérico

### Feature booleana

Exemplos: `crm.pipeline`, `cms.blog`, `site.custom_domain`,
`integrations.analytics`.

Semântica:

- `allowed = true/false`
- `reason ∈ { entitled | not_entitled | billing_attention_required |
  billing_blocked | billing_unknown | not_evaluated }`

### Limite numérico

Exemplos: `users.seats`, `storage.media_limit`.

Semântica futura:

- `limit` = número contratado/autorizado
- `used` = uso atual
- `requestedIncrement` = incremento solicitado
- `remaining = limit - used`
- `allowed = used + requestedIncrement <= limit`
- `reason ∈ { entitled | limit_reached | not_entitled |
  billing_attention_required | billing_blocked | billing_unknown |
  not_evaluated }`

## 7. Catálogo de limites planejados

| featureKey             | valueType | fonte de uso planejada (server-side) |
|------------------------|-----------|--------------------------------------|
| `users.seats`          | number    | contagem de memberships elegíveis    |
| `storage.media_limit`  | number    | soma/contagem de mídia por tenant    |
| `ai.*` quotas          | number    | contagem de eventos de uso de IA     |
| `integrations.*` limit | number    | contagem de integrações ativas       |

Nenhuma dessas fontes é implementada nesta etapa.

## 8. DTO futuro planejado (não implementar)

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

Regras documentais:

- `limit` não pode ser inferido no client.
- `used` não pode ser fornecido pelo client como autoridade.
- `requestedIncrement` pode ser input, mas deve ser validado
  server-side.
- `remaining` é derivado.
- `limit_reached` só pode ser emitido por função server-side auditada.
- `CommercialLimitDecision` não substitui `CommercialFeatureDecision`;
  complementa decisões para `valueType: "number"`.

## 9. Fontes futuras de uso (server-side)

```
users.seats          → contagem server-side de memberships elegíveis/ativos
storage.media_limit  → contagem ou soma server-side de mídia/storage por tenant
ai.* quotas          → contagem server-side de eventos de uso de IA (se materializada)
integrations.* limit → contagem server-side de integrações ativas (se materializada)
```

Regras:

- fontes de uso devem ser server-side;
- client nunca informa uso como autoridade;
- Super Admin sem impersonação não pode acessar uso tenant-scoped;
- impersonação não pode aumentar limite nem bypassar enforcement;
- membership authorization continua separada de entitlement / limit
  decision;
- leitura de uso não pode abrir RLS permissiva;
- não criar grants para usuário final.

## 10. Regras de cálculo

- Cálculo é sempre server-authoritative.
- `used` é obtido por consulta determinística server-side.
- `limit` vem de `entitlement snapshot` (tenant → plan → default).
- `allowed` é derivado apenas server-side.
- Nenhum atalho baseado em cache client é permitido.
- Nenhuma heurística ou fallback silencioso.

## 11. Relação com SCP-006 e SCP-008

- SCP-006 continua responsável pela decisão comercial booleana.
- SCP-008 continua responsável por validar se a `featureKey` é
  catalogada.
- SCP-009 não altera nenhuma função runtime.
- SCP-009 define como limites numéricos serão avaliados futuramente.
- Enquanto SCP-010 ou etapa equivalente não for implementada e
  auditada, `valueType: "number"` **não deve** ser usado como
  enforcement definitivo de limite.

## 12. Hard Gates SCP9

- **SCP9-G1** — Numeric Limits Require Server-Side Usage Source.
- **SCP9-G2** — Client Usage Is Never Authoritative.
- **SCP9-G3** — `limit_reached` Must Not Be Emitted Without Audited Runtime.
- **SCP9-G4** — Limit Decisions Do Not Replace Membership Authorization.
- **SCP9-G5** — Super Admin Does Not Bypass Usage Limits.
- **SCP9-G6** — No Direct Client Reads From Commercial Or Usage Tables.
- **SCP9-G7** — No Permissive RLS Or End-User Grants For Usage Evaluation.
- **SCP9-G8** — No Billing Provider Enforcement From Limit Planning Alone.
- **SCP9-G9** — Deterministic DTO Required Before Runtime Implementation.
- **SCP9-G10** — Audit Required Before Usage Limit Runtime.

## 13. Riscos

- boolean gate sendo usado incorretamente para limite numérico;
- client informando `used` / `remaining` como autoridade;
- limite numérico tratado como billing enforcement real;
- Super Admin usando contexto global para consultar uso tenant-scoped;
- contagem de usuários confundindo `membership_status` removed / suspended;
- storage size inferido de path ou metadata não confiável;
- `limit_reached` emitido antes de função auditada;
- RLS permissiva para facilitar contagem;
- provider / billing status sendo usado como cobrança real.

## 14. Critérios para futura implementação (SCP-010+)

- DTO `CommercialLimitDecision` estabilizado.
- Fontes de uso server-side auditadas por domínio.
- Função server-side dedicada por featureKey numérica.
- Cobertura de teste para `limit_reached`, `entitled` e casos de borda.
- Governança confirmando que membership authorization permanece
  separada.

## 15. Inspeções executadas

- `rg -n "CREATE TABLE|ALTER TABLE|CREATE POLICY|ALTER POLICY|DROP POLICY|GRANT|REVOKE|FORCE ROW LEVEL SECURITY|INSERT INTO|UPDATE |DELETE FROM|CREATE FUNCTION"` neste documento → ocorrências, se existirem, aparecem apenas em contexto de fora de escopo, proibição, risco ou inspeção.
- `rg -n "getCommercialFeatureDecision|decideCommercialFeature|normalizeFeatureKey|feature-catalog.ts|CommercialLimitDecision|limit_reached|users.seats|storage.media_limit"` neste documento → termos aparecem em contexto documental / planejamento apenas; nenhum runtime foi alterado.
- `rg -n "billing_admin|commercial_admin|canManageTenantBilling|tenant_members|stripe|hotmart|kiwify|webhook|checkout|customer portal"` neste documento → ocorrências aparecem apenas em contexto de fora de escopo, proibição, risco ou governança.
- Roadmap: SCP-008 aparece uma única vez como `Accepted`, SCP-009 aparece uma única vez como `Accepted`, SCP-010 aparece apenas como próxima etapa futura, sem duplicidade de numeração.

## 16. Próximo passo recomendado

Auditoria externa da SCP-009. Após aprovação, iniciar SCP-010 para
materializar server-side a avaliação de limites numéricos. **Não
iniciar SCP-010 nesta etapa.**
