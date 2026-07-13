# SCP-008.1 — Roadmap Deduplication & Inspection Evidence Cleanup

## Status

Accepted

## 1. Objetivo

Corrigir resíduo documental após a SCP-008: consolidar as restrições permanentes da Fase 4 (adicionando o bloco `SCP-008 não ...`) e corrigir a linha de evidência de inspeção do roadmap no relatório da SCP-008 para refletir o estado final pós-SCP-008.1.

Etapa exclusivamente documental/governança. Sem código.

## 2. Arquivos alterados

- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — bloco `Restrições permanentes` estendido com as restrições da SCP-008 (sem duplicar numeração da lista ordenada da Fase 4).
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/79-scp-008-commercial-feature-key-catalog-materialization-server-validation.md` — linha única de evidência de inspeção do roadmap reescrita no formato consolidado.
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/80-scp-008-1-roadmap-deduplication-inspection-evidence-cleanup.md` — este relatório.

## 3. Confirmações

- Roadmap sem duplicidade: a subseção `#### Gates e sequência inicial da Fase 4` contém exatamente 13 itens numerados, sem repetição.
- SCP-008 aparece uma única vez, na linha 12, como `Implemented / Ready for External Audit`.
- SCP-009 aparece uma única vez, na linha 13, como próxima etapa futura.
- Não existe mais a linha residual `SCP-008 — próxima etapa a definir após aprovação arquitetural.`
- A evidência de inspeção do roadmap na seção `## 10. Inspeções textuais` do relatório da SCP-008 foi corrigida em linha única, refletindo o estado final.

## 4. Ausência de mudanças runtime

Nenhuma das seguintes superfícies foi criada ou alterada nesta etapa:

- código de produto;
- migration;
- tabela;
- RLS policy;
- grant;
- seed;
- mutation;
- provider integration;
- webhook;
- checkout;
- customer portal;
- `billing_admin`;
- `commercial_admin`;
- `canManageTenantBilling`;
- alteração em `tenant_members`;
- alteração em `getCommercialFeatureDecision`;
- alteração em `decideCommercialFeature`;
- alteração em `normalizeFeatureKey`;
- alteração em `src/lib/api/commercial/feature-catalog.ts`.

SCP-009 não foi iniciada.

## Correction Note

A SCP-008.1 deixou duplicidade residual na linha de evidência de roadmap da seção `## 10. Inspeções textuais` do documento da SCP-008. A limpeza final foi concluída pela SCP-008.2.

## 5. Próximo passo recomendado

Aguardar auditoria externa da SCP-008 e SCP-008.1. Iniciar SCP-009 apenas após aprovação arquitetural explícita. Não iniciar SCP-009.
