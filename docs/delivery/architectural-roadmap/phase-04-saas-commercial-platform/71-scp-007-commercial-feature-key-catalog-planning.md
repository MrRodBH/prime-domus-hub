# SCP-007 — Commercial Feature Key Catalog Planning

## Status

Accepted

## Acceptance Note

SCP-007 is accepted together with SCP-007.1.

The accepted scope is architectural planning only. SCP-007 defines the governance model for commercial `featureKey` cataloging and preserves the following constraints:

- no runtime catalog implementation;
- no migration;
- no table;
- no RLS policy;
- no grant;
- no seed;
- no UI;
- no client-side hook;
- no billing enforcement;
- no provider integration;
- no webhook;
- no checkout;
- no customer portal;
- no billing_admin;
- no commercial_admin;
- no canManageTenantBilling;
- no tenant_members change;
- no changes to getCommercialFeatureDecision;
- no changes to decideCommercialFeature;
- no changes to normalizeFeatureKey;
- no SCP-008 implementation.

## 1. Objetivo

Planejar a catalogação oficial dos `featureKey` comerciais suportados pelo RM Prime SaaS / RM Prime OS, definindo governança de nomenclatura, versionamento, categorização e critérios futuros de materialização, sem alterar o runtime implementado pela SCP-006.

## 2. Contexto

- SCP-004 entregou os read models comerciais server-side.
- SCP-005 delimitou a fronteira de runtime de entitlement.
- SCP-006 implementou `getCommercialFeatureDecision`, `decideCommercialFeature`, `normalizeFeatureKey` e o DTO `CommercialFeatureDecision`.
- Nenhum catálogo governado de `featureKey` existe hoje. O runtime aceita qualquer chave normalizada.

## 3. Problema arquitetural

Sem catálogo governado, existe risco de:

- divergência entre nomes de features;
- duplicação semântica (`crm.pipeline` vs `crm.pipelines`);
- entitlements órfãos;
- limites comerciais difíceis de auditar;
- planos usando chaves inconsistentes;
- UI exibindo recursos não governados;
- futuras integrações de billing mapeando recursos errados.

## 4. Escopo (documental)

Planejar:

- padrão oficial de nomenclatura de `featureKey`;
- categorias comerciais de features;
- diferença conceitual entre feature booleana e limite quantitativo;
- relação entre `featureKey`, `commercial_entitlement_definitions` e `tenant_entitlements`;
- governança de versionamento e depreciação;
- hard gates propostos para SCP-008;
- critérios para materialização futura de catálogo.

## 5. Fora de escopo

Esta SCP não pode:

- implementar catálogo runtime;
- criar migration, tabela, RLS policy, grant ou seed;
- alterar `commercial_entitlement_definitions`;
- criar UI, hook client-side ou mutation;
- alterar `getCommercialFeatureDecision`, `decideCommercialFeature` ou `normalizeFeatureKey`;
- implementar billing real, provider integration, webhook, checkout ou customer portal;
- criar `billing_admin`, `commercial_admin` ou `canManageTenantBilling`;
- alterar `tenant_members`;
- iniciar SCP-008.

## 6. Nomenclatura proposta de featureKey

Padrão conceitual:

```
<domain>.<capability>[.<variant>]
```

Exemplos conceituais (não são seed):

- `crm.pipeline`
- `crm.pipeline.advanced`
- `crm.leads.import`
- `crm.automation`
- `cms.blog`
- `cms.pages`
- `site.custom_domain`
- `site.white_label`
- `ai.lead_scoring`
- `ai.content_generation`
- `ai.chat_assistant`
- `users.seats`
- `storage.media_limit`
- `integrations.whatsapp`
- `integrations.analytics`

Regras conceituais:

- lowercase;
- ponto como separador;
- sem espaços, acentos ou caracteres especiais;
- sem nomes comerciais de planos (ex.: `pro`, `enterprise`);
- sem nomes de providers (ex.: `stripe`, `hotmart`, `kiwify`) — proibição explícita;
- sem chaves ligadas a tenant específico;
- sem chaves temporárias/experimentais no catálogo oficial;
- compatibilidade obrigatória com `normalizeFeatureKey` implementado na SCP-006.

## 7. Categorias comerciais sugeridas

- `crm.*` — CRM, pipeline, leads, automação;
- `cms.*` — conteúdo, blog, páginas;
- `site.*` — site institucional, domínio, white label;
- `ai.*` — recursos de IA;
- `users.*` — seats, membros;
- `storage.*` — limites de armazenamento;
- `integrations.*` — integrações externas.

## 8. Tipos de entitlement (conceitual)

- boolean feature (`crm.pipeline = true`);
- numeric limit (`users.seats = 5`, `storage.media_limit = 10240`);
- text/config value (reservado para uso futuro);
- default entitlement (do plano);
- tenant override (por tenant);
- plan entitlement (associado a um plano comercial).

Esta lista é conceitual e não deve ser materializada em seed nesta etapa.

## 9. Relação com SCP-006

- SCP-006 decide sobre `featureKey` já normalizada.
- SCP-007 planeja como essas chaves devem ser catalogadas e governadas.
- SCP-007 **não altera** `getCommercialFeatureDecision`.
- SCP-007 **não altera** `decideCommercialFeature`.
- SCP-007 **não altera** `normalizeFeatureKey`.
- SCP-007 **não altera** o DTO `CommercialFeatureDecision`.
- SCP-007 prepara a SCP-008, que poderá validar `featureKey` contra catálogo governado.

## 10. Relação com commercial_entitlement_definitions

- O catálogo governado será, no futuro, a fonte canônica dos `featureKey`.
- `commercial_entitlement_definitions` deverá referenciar chaves catalogadas.
- `tenant_entitlements` deverá manter apenas chaves catalogadas.
- Chaves não catalogadas devem ser tratadas como não disponíveis pelo runtime futuro (comportamento a ser especificado em SCP-008).
- Nenhuma alteração de esquema é feita aqui.

## 11. Riscos arquiteturais

- Materializar catálogo cedo demais congela nomenclatura antes da experiência real.
- Catálogo client-side authoritativo permitiria bypass de decisão comercial.
- Chaves específicas de provider (`stripe`, `hotmart`, `kiwify`) acoplam catálogo a billing real.
- Chaves específicas de tenant quebram governança global.
- Enforcement de billing baseado apenas em catálogo sem entitlement snapshot é incorreto.
- Renomear chave em produção sem alias de compatibilidade quebra tenants existentes.

## 12. Hard Gates propostos para SCP-008

- **SCP7-G1** — Feature Keys Must Be Cataloged Before Runtime Expansion.
- **SCP7-G2** — Feature Key Catalog Does Not Replace Entitlement Snapshot.
- **SCP7-G3** — No Client-Side Commercial Catalog Authority.
- **SCP7-G4** — No Provider-Specific Feature Keys (proibido `stripe`, `hotmart`, `kiwify`, webhook, checkout, customer portal como namespace).
- **SCP7-G5** — No Tenant-Specific Feature Keys.
- **SCP7-G6** — No Billing Enforcement From Catalog Alone.
- **SCP7-G7** — Backward Compatibility Required For Feature Key Changes.
- **SCP7-G8** — Audit Required Before Catalog Materialization.

## 13. Critérios para implementação futura (SCP-008+)

- Catálogo materializado deve ser server-authoritative.
- Catálogo deve respeitar `normalizeFeatureKey` da SCP-006.
- Catálogo não deve introduzir `billing_admin`, `commercial_admin` ou `canManageTenantBilling`.
- Catálogo não deve alterar `tenant_members`.
- Catálogo não deve abrir RLS permissiva nem grant a usuário final.
- Depreciação de chave exige alias/backward compatibility documentados.
- Nenhum enforcement de billing real, provider integration, webhook, checkout ou customer portal decorre desta catalogação.

## 14. Inspeções executadas

- `rg -n "SCP-006|SCP-007|SCP-008|Accepted|Implemented / Ready|próxima etapa" docs/architecture/ROADMAP_ARCHITECTURAL.md` — SCP-006 aparece uma única vez como `Accepted`, SCP-007 aparece uma única vez como `Implemented / Ready for External Audit`, SCP-008 aparece apenas como próxima etapa futura, sem duplicidade de numeração.
- `rg -n "CREATE POLICY|ALTER POLICY|DROP POLICY|GRANT|REVOKE|FORCE ROW LEVEL SECURITY|CREATE TABLE|ALTER TABLE|CREATE FUNCTION|INSERT INTO|UPDATE |DELETE FROM" docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/71-scp-007-commercial-feature-key-catalog-planning.md` — sem instruções operacionais SQL; qualquer ocorrência aparece apenas em contexto de proibição/governança.
- `rg -n "billing_admin|commercial_admin|canManageTenantBilling|tenant_members|stripe|hotmart|kiwify|webhook|checkout|customer portal" docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/71-scp-007-commercial-feature-key-catalog-planning.md` — ocorrências apenas em fora de escopo, proibição e governança.
- `rg -n "getCommercialFeatureDecision|decideCommercialFeature|normalizeFeatureKey" src/lib/api/commercial docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/71-scp-007-commercial-feature-key-catalog-planning.md` — SCP-007 apenas documenta a relação com SCP-006, sem alterar a implementação runtime.

## 15. Próximo passo recomendado

Aguardar auditoria externa desta SCP-007 antes de iniciar SCP-008 (Commercial Feature Key Catalog Materialization / Validation), que só será iniciada após aprovação arquitetural explícita.
