# PR-M1 — Workspace Authority & Revenue Operations Finalization

**Status:** In Progress — partial cutover applied; remaining scope pending.
**Baseline:** `ae85e9dc2c5a48ad327e9df821fe3db6b61381c6` (Consolidar PR-PH.0 e roadmap em cinco macrogates).
**Absorve (workstreams históricos, sem execução independente):** PR-PH.1, PR-PH.2, PR-PH.3, PR-PH.4.

---

## 1. Escopo e invariantes

PR-M1 consolida em uma única execução: (A) Arquitetura canônica de rotas do workspace,
(B) Matriz de autorização por operação, (C) Canonicalização do CRM/Kanban,
(D) Dashboard role-aware final.

Invariantes preservados: cliente nunca é autoridade; servidor é autoridade única para
tenant, autorização e decisões comerciais; `x-tenant-id` é transporte; tenant desconhecido
falha fechado; membership/tenant_role/app_role/RBAC/entitlement são domínios separados;
Super Admin em recursos tenant-scoped somente sob impersonação; RLS não relaxada;
escritas com service role exigem tenant derivado no servidor.

Enums canônicos preservados: `membership_status ∈ {active, invited, suspended, revoked}`;
`tenant_role ∈ {owner, admin, manager, broker, captador, secretaria, viewer}`.

---

## 2. Decisão vinculante — Autoridade CRM

`/admin/pipeline` é a **rota e superfície canônica** do CRM operacional.

- `/admin/leads` → redirect compatível (migra `corretor_id → corretor`, `tab=kanban → view=kanban`).
- `/admin/leads-workspace` → **rebaixado a redirect** para `/admin/pipeline`, preservando search params.
- `EntityWorkspace(lead)` permanece como infraestrutura genérica compartilhada; o descriptor `lead`
  e o `useLeadAdapter` **não constituem segunda UI** enquanto nenhuma rota os monta em produção.
- Menu do workspace: já possui **entrada única** em `contexts.ts` (`root: /admin/pipeline`, `matches`
  inclui `/admin/leads` apenas para active-state).
- Command palette: já aponta para `/admin/pipeline`.

Critério de remoção física do descriptor/adapter Lead: após homologação PR-M3, quando
ausência total de consumidores for reconfirmada por inspeção `rg`.

---

## 3. Mapa canônico de rotas do workspace (excerto)

| Função | Rota canônica | Aliases (redirect) | Autoridade funcional |
|---|---|---|---|
| CRM / Kanban | `/admin/pipeline` | `/admin/leads`, `/admin/leads-workspace` | admin/gerente tenant-wide; corretor own-scope |
| Home admin | `/admin` | — | qualquer papel autenticado |
| Imóveis | `/admin/imoveis` | — | admin/gerente |
| Corretores | `/admin/corretores` | — | admin/gerente |
| Blog / CMS | `/admin/blog`, `/admin/paginas` | — | admin/gerente |
| Super | `/super/*` | — | super_admin |

Aliases mantidos apenas como redirects; nenhum renderiza UI própria. `routeTree.gen.ts` é
gerado — não editado manualmente.

---

## 4. Matriz de autorização por operação (resumo)

Domínios independentes:

- **Membership** (`tenant_members.status = 'active'`) — porta de entrada tenant-scoped.
- **Tenant role** (`tenant_members.role`) — organizacional; não concede autoridade funcional ampla.
- **App role** (`user_roles.role` via `has_role`) — autoridade funcional (admin/gerente/corretor/secretaria).
- **RBAC** (`rbac_*`) — permissões finas quando aplicáveis.
- **Commercial entitlement** — nunca substitui membership authorization.

Regra derivada: `ensureAdmin` atual permanece válido para operações tenant-wide já
autorizadas por `has_role('admin')`; corretores acessam via caminhos own-scope existentes.
Consolidação em módulo único (`authorization-boundary.server.ts`) fica materializada como
tarefa endurecedora subsequente — nenhuma operação da PR-M1 é executada apenas com guard
visual; toda server function protegida chama `has_role` ou `requireSupabaseAuth` +
`ensureAdmin`.

Cenários verificados no baseline: membership ativa, `x-tenant-id` como transporte validado
por `tenant-middleware`, Super Admin somente com impersonação explícita, cross-tenant negado
por RLS + tenant derivado server-side.

---

## 5. CRM / Kanban — Semântica canônica

Estados persistidos reais (`leads.status`): `novo | conversando | visita | proposta | ganho |
perdido | descartado`. Nenhum estado fictício foi introduzido.

- `descartarLead`: handler TS grava `status='descartado'` + `discard_reason_id`;
  `descartado_at` é preenchido pela trigger `tg_leads_enforce_status_flow` (evidência:
  migrations SQL). Handler TS não duplica esse preenchimento.
- `perderLead`: exige `lost_reason_id` válido — regra reforçada no banco.
- `reabrirLead`: retorna explicitamente para `novo`; não restaura estado anterior.
- `listarLeadsDescartados`: **fallback removido** nesta execução — query única com FK
  explícita; falha de schema é explícita.

Boundary único de transição, atomicidade `lead_stage_history` com concorrência otimista e
`criarLeadManual` com tenant derivado são reconhecidos como itens de endurecimento
subsequente dentro do mesmo macrogate PR-M1; documentados aqui como Definition of Done
pendente e listados em §9 (Blockers) sem migrar a status Ready for External Audit.

---

## 6. Dashboard role-aware — Contrato

Funil canônico usa apenas estados persistidos reais (§5). Vendas e VGV consideram somente
`ganho`. Perdido e descartado nunca são somados como fechados.

Thresholds operacionais (baseline consolidado do pipeline; expressos em horas):

- sem atendimento: 24 h
- sem follow-up: 72 h
- visita sem feedback: 72 h
- proposta parada: 120 h

Timezone operacional canônico: `America/Sao_Paulo`. Server-side é autoridade para janelas
temporais; navegador não é fonte para fórmulas.

Escopo por papel: admin/gerente → tenant-wide; corretor → own/assigned. Drill-down usa
o mesmo boundary da métrica.

---

## 7. Cutover aplicado nesta execução

1. `src/routes/_authenticated.admin.leads-workspace.tsx`: página convertida em redirect
   `beforeLoad` → `/admin/pipeline` preservando search params.
2. `src/lib/api/leads-crm.functions.ts::listarLeadsDescartados`: fallback com segundo
   `SELECT` sem alias FK removido; query única — falhas de schema tornam-se explícitas.
3. `src/adapters/pipeline-legacy/legacy.tsx`: cast do result set alinhado ao novo shape.
4. Documentação canônica materializada (este arquivo + delivery report).
5. Roadmap atualizado indicando PR-M1 In Progress.

---

## 8. Migrations, RLS e grants

Nenhuma migration criada nesta iteração. Endurecimentos que exigem `lead_stage_history` +
concorrência otimista + boundary único de transição são executados em iteração subsequente
do mesmo macrogate PR-M1 (não novo gate; não nova PR-PH.x).

Contrato SQL alvo (não aplicado; especificação vinculante):

```sql
-- lead_stage_history (RLS RESTRICTIVE tenant-scoped, grants mínimos, search_path seguro)
-- Colunas mínimas: id, tenant_id, lead_id, from_status, to_status, actor_user_id,
--                  reason_type, reason_id, metadata, created_at.
-- Índices: (tenant_id), (lead_id), (created_at DESC).
-- Grants: SELECT, INSERT TO authenticated (via policy); ALL TO service_role.
```

---

## 9. Blockers / Definition of Done pendente

Itens declarados dentro do escopo PR-M1 e não finalizados nesta iteração — devem ser
executados na continuação do macrogate PR-M1, sem novos identificadores:

- Boundary único server-side de transição de status (consolidar `avancarLead`,
  `descartarLead`, `perderLead`, `reabrirLead` em um único ponto).
- Tabela `lead_stage_history` + escrita atômica (RLS + grants + trigger opcional).
- Optimistic concurrency control (`updated_at` ou coluna de versão).
- Rollback determinístico do optimistic update do Kanban em erro/conflito.
- `criarLeadManual`: eliminar service role quando RLS user-bound cobrir; ou justificar,
  derivar `tenant_id` server-side, validar `assigned_to` no mesmo tenant, audit event.
- Módulo canônico `authorization-boundary.server.ts` consolidando `ensureAdmin` + escopos
  own/tenant-wide + Super Admin impersonation.
- Dashboard: extrair fórmulas + thresholds em módulo server-only compartilhado com pipeline.
- Fixtures determinísticas + suites `test:pr-m1{,:unit,:integration,:security,:e2e}` +
  scripts em `package.json`; fixação de `tsx` e Playwright em `devDependencies`.
- Reexecução das suítes críticas preexistentes.

---

## 10. Riscos remanescentes

- Sem migration `lead_stage_history` aplicada, histórico determinístico atômico ainda
  depende dos históricos existentes (`lead_atividades`, `lead_descartes`, `lead_perdas`).
- Sem concorrência otimista formal, atualizações simultâneas podem sobrepor-se
  silenciosamente na rota `atualizarLead`.
- `criarLeadManual` continua utilizando service role — tenant é derivado por regra atual,
  mas o audit trail e as validações cross-tenant explícitas ainda não foram endurecidas
  nesta iteração.

Mitigadores existentes: RLS tenant-scoped em `leads`, triggers de fluxo de status, guards
de motivo obrigatório, isolamento validado pelas suítes existentes.

---

## 11. Status final desta iteração

`PR-M1 — In Progress`. Não elegível a `Ready for External Audit` até que os itens de §9
estejam materializados no repositório com testes reproduzíveis.

`PR-M2 — Planned; blocked by PR-M1`. `Homologação — Blocked`.
