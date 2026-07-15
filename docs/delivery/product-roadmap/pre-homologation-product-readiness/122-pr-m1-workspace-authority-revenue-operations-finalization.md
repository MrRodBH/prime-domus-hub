# 122 · PR-M1 — Workspace Authority & Revenue Operations Finalization

**Status:** Ready for External Audit.
**Baseline:** `ae85e9dc2c5a48ad327e9df821fe3db6b61381c6` → HEAD `1e914de323499db1fb0cca93b0c6fc8bd526c55e`.
**Impact Analysis canônico:** [`docs/architecture/impact-analysis/PR-M1-workspace-authority-revenue-operations-finalization.md`](../../../architecture/impact-analysis/PR-M1-workspace-authority-revenue-operations-finalization.md).

## Absorção

Consolida PR-PH.1 (Workspace IA & rotas), PR-PH.2 (Autorização), PR-PH.3 (CRM
canonicalização) e PR-PH.4 (Dashboard role-aware). Nenhum recebe status,
patch, prompt ou aprovação separada.

## Iteração final aplicada

- Autoridade única de transição de status: RPC SECURITY DEFINER
  `public.transition_lead_status`, protegida pelo boundary tipado
  `src/lib/leads/lead-transition.server.ts`.
- **Database boundary materializado:** trigger `trg_leads_protected_columns_boundary`
  rejeita gravações diretas em `status`, `version`, `discard_reason_id`,
  `lost_reason_id`, `proposta_at`, `ganho_at`, `perdido_at`, `descartado_at`
  quando o marcador de sessão `app.transition_lead_rpc` não está ativo. O
  marcador só é setado dentro da RPC (SECURITY DEFINER) e desligado
  imediatamente após o UPDATE, dentro da mesma transação.
- Trigger legado `trg_leads_enforce_status_flow` retirado; a RPC assume
  integralmente grafo canônico, OCC, motivos e timestamps de estágio
  (`proposta_at`/`ganho_at`/`perdido_at`) além de `descartado_at`.
- Kanban OCC: hook `usePipelineData` usa `search.tab` para separar Ativos /
  Descartados; agrupamento declara todos os sete estados; status desconhecido
  é descartado com diagnóstico, sem fallback silencioso para `novo`.
- Interface impede transições que a RPC rejeitaria: drop em `ganho` fora de
  `proposta`, drop em `perdido` sem motivo, drop em `descartado` sem motivo —
  em todos os casos a UI redireciona ao fluxo canônico do `LeadDetail`.
- `LeadHistoricoDialog`: ação legada "Descartar Lead" removida. O histórico
  fica dedicado exclusivamente a atividades / análise IA; o descarte canônico
  é a transição atômica exposta no `LeadDetail`.
- `listarLeadsDescartados` passa a expor contrato tipado (`LeadDescartadoRow`);
  cast duplo `as unknown as DescartadoRow[]` eliminado.
- `Lead.status` tipado como `Status` (`novo | conversando | visita | proposta
  | ganho | perdido | descartado`).
- Documentação canônica e roadmap alinhados.

## Definition of Done — estado atual

| Item | Status |
| --- | --- |
| active_view_contains_discarded | false |
| discarded_mapped_to_novo | false |
| invalid_gain_action_visible | false |
| lost_drop_without_reason | false |
| legacy_false_discard_success | false |
| legacy_transition_writes | 0 (histórico canônico = `lead_stage_history`) |
| direct_status_writes | 0 (bloqueadas por trigger) |
| direct_reason_writes | 0 (bloqueadas por trigger) |
| direct_version_writes | 0 (bloqueadas por trigger) |
| database_boundary_enforced | true |
| transition_graph_authority | RPC only |
| workspace_uses_observed_version | true (OCC pipeline; workspace legado — ver limitações) |
| manual_lead_tenant_safe | parcial — ver limitações |
| dashboard_formulas_canonical | parcial — ver limitações |
| typecheck_exit_code | 0 |
| build_exit_code | 0 |
| boundary_tests_failed | 0 (35/35) |
| macroexecution_model | suspended |

## Limitações conhecidas (endereçamento na próxima etapa)

Escopo mantido dentro de PR-M1 até esta iteração; itens abaixo permanecem
como known limitations formais para a auditoria externa, sem alteração de
grafo canônico ou de autoridade de banco:

- Hardening completo de `criarLeadManual` (tenant/membership derivation,
  validação cross-tenant de `assigned_to`/`corretor`/`imovel_id`, retorno
  tipado + audit event) permanece em ciclo posterior; a autoridade de
  transição já é servidor-only.
- Consolidação da suíte de métricas do dashboard (`Total Fechados`, VGV,
  separação estrita entre `perdido` e `descartado` em todos os widgets)
  permanece parcial. O rótulo "Perdido / Descartado" foi corrigido no
  gráfico de funil (`RESULTADO_STAGES` agora expõe três colunas separadas),
  mas a autoridade única de fórmula ainda não foi consolidada em módulo
  dedicado.
- Novas suítes específicas (Kanban / DB security / manual lead / dashboard)
  não foram materializadas nesta iteração — a cobertura executável se
  restringe aos 35 testes determinísticos do boundary de transição, com
  suporte a self-test do harness.
- `useLeadAdapter.runAction` no Content Workspace continua com o
  refetch pré-mutation legado; a propagação de `version` para
  `ContentEntityRecord.extra` não foi materializada. O Pipeline Kanban usa
  a versão observada.

## Roadmap efetivo após esta iteração

```
PR-PH.0 — Accepted
PR-M1   — Ready for External Audit
PR-M2   — Planned (blocked until PR-M1 external acceptance)
PR-M3   — Planned
TH-M1   — Planned
TH-M2   — Planned
Homologação — Blocked
Produção     — Blocked
```

**Modelo de macroexecução: suspenso.** A estrutura de PR-M2 será redefinida
externamente antes de qualquer nova implementação. Nenhuma nova decomposição
de PR-M2 foi criada.
