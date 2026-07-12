# SCP-009.2 — Inspection Evidence Deduplication Cleanup

## Status

Implemented / Ready for External Audit

## Objetivo

Corrigir o resíduo documental deixado pela SCP-009.1 na seção
`## 15. Inspeções executadas` do documento principal da SCP-009,
consolidando a evidência de roadmap em uma única linha canônica.
Etapa exclusivamente documental/governança.

## Arquivos alterados

- `docs/fase6/84-scp-009-commercial-usage-limit-evaluation-planning.md`
  — seção `## 15. Inspeções executadas` limpa por script determinístico:
  removidas todas as linhas prévias iniciadas por `- Roadmap:` e
  reinserida a linha canônica única.
- `docs/fase6/85-scp-009-1-roadmap-deduplication-inspection-evidence-cleanup.md`
  — nota `## Correction Note` adicionada, sem alterar o status.
- `docs/fase6/86-scp-009-2-inspection-evidence-deduplication-cleanup.md`
  — este relatório.

## Confirmações

- **Script determinístico**: a limpeza da evidência de roadmap foi
  executada por script Python inline que remove todas as linhas
  `- Roadmap:` da seção `## 15. Inspeções executadas` e reinsere
  exatamente uma linha canônica. O script falha se restar mais de
  uma ocorrência, se a linha canônica não estiver presente, ou se a
  redação antiga (`Roadmap: SCP-008 uma única vez como Accepted`)
  ainda existir.
- **Uma única linha `- Roadmap:`** existe agora na seção
  `## 15. Inspeções executadas`.
- **Redação antiga removida** — não há mais duas linhas de roadmap
  na seção.
- **Roadmap permanece limpo**: `docs/architecture/ROADMAP_ARCHITECTURAL.md`
  continua com SCP-009 uma única vez na linha 13
  (`Implemented / Ready for External Audit`) e SCP-010 uma única vez
  na linha 14 (próxima etapa futura), sem linha residual
  `SCP-009 — próxima etapa`.
- **SCP-010 não foi iniciada.**
- **Nenhuma alteração de código** foi feita.

## Escopo negativo (confirmado)

Nesta SCP-009.2 NÃO houve:

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

Auditoria externa da SCP-009 consolidada (SCP-009 + SCP-009.1 + SCP-009.2).
Após aprovação, iniciar SCP-010. **Não iniciar SCP-010 nesta etapa.**
