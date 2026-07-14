# 122 · PR-M1 — Workspace Authority & Revenue Operations Finalization

**Status:** In Progress.
**Baseline:** `ae85e9dc2c5a48ad327e9df821fe3db6b61381c6`.
**Impact Analysis canônico:** [`docs/architecture/impact-analysis/PR-M1-workspace-authority-revenue-operations-finalization.md`](../../../architecture/impact-analysis/PR-M1-workspace-authority-revenue-operations-finalization.md).

## Absorção

Este delivery consolida os workstreams históricos PR-PH.1 (Workspace IA & rotas),
PR-PH.2 (Autorização), PR-PH.3 (CRM canonicalização), PR-PH.4 (Dashboard role-aware).
Nenhum recebe status, patch, prompt ou aprovação separada.

## Iteração aplicada

- Decisão vinculante: `/admin/pipeline` = autoridade única do CRM.
- `/admin/leads-workspace` rebaixado a redirect com preservação de search params.
- `/admin/leads` mantido como redirect compatível.
- `listarLeadsDescartados`: fallback com segundo SELECT removido; falha explícita.
- Documentação canônica PR-M1 criada; roadmap atualizado para In Progress.

## Definition of Done pendente

Ver §9 do Impact Analysis. Itens permanecem dentro do macrogate PR-M1 e serão
finalizados em iteração subsequente do mesmo gate — sem novos identificadores
(nenhum PR-M1.1 / PR-PH.x.y é criado).

## Status

`PR-M1 — In Progress`. Ready for External Audit **não** concedido nesta iteração.
