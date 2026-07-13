# SCP-009.1 — Roadmap Deduplication & Inspection Evidence Cleanup

## Status

Accepted

## Objetivo

Corrigir a inconsistência documental residual após a SCP-009 —
Commercial Usage Limit Evaluation Planning, eliminando duplicidade
de numeração no roadmap da Fase 4 e consolidando a evidência de
inspeção de roadmap dentro do relatório da SCP-009.

Etapa exclusivamente documental/governança. Nenhum código de
runtime, migration, tabela, RLS policy, grant, seed, hook,
UI, contador de uso ou enforcement de limite foi produzido.

## Arquivos alterados

- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — subseção
  `#### Gates e sequência inicial da Fase 4` reescrita
  deterministicamente por script Python (substituição do bloco
  entre o marcador de início da subseção e o marcador `### 🟡 Fase 5`).
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/84-scp-009-commercial-usage-limit-evaluation-planning.md`
  — única linha de evidência de roadmap na seção
  `## 15. Inspeções executadas` normalizada ao texto canônico
  exigido pela SCP-009.1.
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/85-scp-009-1-roadmap-deduplication-inspection-evidence-cleanup.md`
  — este relatório.

## Confirmações

- **Script determinístico**: a reescrita do roadmap foi executada por
  script Python inline, sem edição manual da subseção da Fase 4.
  O script falha explicitamente se SCP-009 ou SCP-010 aparecerem mais
  de uma vez, se restar linha residual `SCP-009 — próxima etapa`, ou
  se a linha canônica `13. SCP-009 — ... — Implemented / Ready for
  External Audit.` estiver ausente.
- **SCP-009 aparece uma única vez** no roadmap, na linha 13, como
  `Implemented / Ready for External Audit`.
- **SCP-010 aparece uma única vez**, na linha 14, apenas como próxima
  etapa futura (`próxima etapa a definir após auditoria da SCP-009`).
- **Evidência de inspeção da SCP-009 corrigida**: existe agora uma
  única linha canônica de roadmap na seção `## 15. Inspeções executadas`
  do documento da SCP-009, refletindo o estado final pós SCP-009.1.
- **SCP-010 não foi iniciada** — nenhum documento SCP-010 foi criado,
  nenhuma seção de planejamento SCP-010 foi produzida.
- **Nenhuma alteração de código** foi feita nesta etapa.

## Escopo negativo (confirmado)

Nesta SCP-009.1 NÃO houve:

- código runtime;
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
- billing_admin;
- commercial_admin;
- canManageTenantBilling;
- alteração em `tenant_members`;
- alteração em `getCommercialFeatureDecision`;
- alteração em `decideCommercialFeature`;
- alteração em `normalizeFeatureKey`;
- alteração em `feature-catalog.ts`;
- emissão runtime de `limit_reached`;
- contador de uso;
- enforcement de limite.

## Próximo passo recomendado

Auditoria externa da SCP-009 consolidada (SCP-009 + SCP-009.1).
Após aprovação, iniciar SCP-010. **Não iniciar SCP-010 nesta etapa.**

## Correction Note

A SCP-009.1 deixou duplicidade residual na evidência de roadmap da seção `## 15. Inspeções executadas` do documento da SCP-009. A limpeza final foi concluída pela SCP-009.2.
