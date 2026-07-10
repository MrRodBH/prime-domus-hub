# SCP-005.1 — Roadmap Deduplication & Inspection Evidence Cleanup

## Status

Implemented / Ready for External Audit

## 1. Objetivo

Corrigir inconsistências documentais residuais após a SCP-005 —
Commercial Entitlement Runtime Boundary Planning:

- Deduplicar a subseção `#### Gates e sequência inicial da Fase 4` no
  roadmap, consolidando SCP-005 uma única vez como
  `Implemented / Ready for External Audit` e SCP-006 apenas como
  próxima etapa futura.
- Corrigir a redação da seção `## 16. Inspeções executadas` no
  documento da SCP-005 para evidência textual precisa, reconhecendo
  que termos SQL/superfícies proibidas aparecem legitimamente em
  comandos de inspeção e blocos de proibição/governança.

Etapa exclusivamente documental/governança.

## 2. Arquivos alterados

- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — subseção
  `#### Gates e sequência inicial da Fase 4` substituída integralmente
  pelo conteúdo consolidado.
- `docs/fase6/62-scp-005-commercial-entitlement-runtime-boundary-planning.md` —
  seção `## 16. Inspeções executadas` reescrita com formulação precisa
  para as duas confirmações (ausência de SQL operacional e ausência de
  superfícies runtime proibidas).
- `docs/fase6/63-scp-005-1-roadmap-deduplication-inspection-evidence-cleanup.md` —
  criado (este relatório).

## 3. Confirmações

- Roadmap não possui duplicidade na subseção da Fase 4.
- SCP-005 aparece uma única vez, como
  `Implemented / Ready for External Audit`, na linha numerada 9.
- SCP-006 aparece apenas como próxima etapa futura, na linha
  numerada 10, sem status de implementação.
- A linha "SCP-005 — próxima etapa" não existe mais na subseção.
- SCP-004 permanece uma única vez como `Accepted`.
- A seção `## 16. Inspeções executadas` da SCP-005 foi ajustada para
  evidência textual precisa: reconhece que ocorrências de termos SQL
  ou superfícies comerciais proibidas aparecem apenas em comandos de
  inspeção ou em contexto de proibição/governança/risco arquitetural,
  sem falsas afirmações de zero ocorrências absolutas.
- Hard gates SCP5-G1..SCP5-G8 preservados sem alteração.
- Decisão arquitetural da SCP-005 preservada sem alteração.

## 4. Confirmação de ausência de alterações runtime

Nenhuma alteração de código foi introduzida por esta etapa.

Nenhuma das superfícies abaixo foi criada, alterada ou iniciada:

- migration;
- RLS policy;
- grant;
- mutation;
- provider integration;
- webhook;
- checkout;
- customer portal;
- billing_admin;
- commercial_admin;
- canManageTenantBilling;
- alteração em `tenant_members`.

## 5. Próximo passo recomendado

Aguardar auditoria externa da SCP-005 e da SCP-005.1. Iniciar SCP-006
apenas após aprovação e conforme critérios §14 da SCP-005 e hard gates
SCP5-G1..SCP5-G8. Não iniciar SCP-006.
