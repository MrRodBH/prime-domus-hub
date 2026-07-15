# LSH-01 — Lead Authorization & Audit Hardening — Impact Analysis

**Stage type:** independent first-class architectural gate
**Predecessor:** LSO-01 (Rejected)
**Successor:** LSV-01 (Planned, blocked)
**Baseline HEAD:** `704ae40a18e19a14332256e25964cf2fbb51cc9f`

## 1. Escopo

Materializar (a) uma autoridade server-side única e tipada de autorização
para o domínio Lead, (b) o endurecimento da tabela de auditoria criada em
LSO-01, e (c) o endurecimento da RPC canônica de criação manual. A prova
operacional multi-tenant/multi-JWT/RLS pertence à LSV-01.

## 2. Inventário do runtime atual

- `src/lib/api/admin.functions.ts` — `adminListarLeads`, `adminListarCorretores`,
  `adminListarImoveisLite`, `adminAtualizarLead`, `criarLeadManual`.
- `src/lib/api/leads-crm.functions.ts` — transições e discard/lost/reopen (boundary
  transacional consolidado em PR-M1).
- `src/lib/leads/lead-transition.server.ts` + specs (PR-M1).
- `src/components/content/adapters/useLeadAdapter.ts` — mutation surface removida
  em LSO-01.
- Migrations: `20260715220034` (LSO-01) + `20260715222734` (LSH-01, esta etapa).

## 3. Defeitos herdados da LSO-01

| # | Defeito | Correção LSH-01 |
|---|---------|-----------------|
| 1 | `lead_audit_events` com `GRANT ALL` a `service_role` e `GRANT SELECT` a `authenticated` | Todos os grants revogados; escrita apenas via SECURITY DEFINER |
| 2 | Policy `lead_audit_events_select` permissiva | Removida; RLS habilitada sem policy |
| 3 | `ON DELETE CASCADE` na FK `lead_id` | Substituída por `ON DELETE RESTRICT` |
| 4 | `DEFAULT get_current_tenant_id()` em `tenant_id` | Removido; tenant_id explícito |
| 5 | Ausência de constraint em `event_type` | CHECK `IN ('manual_lead_created')` |
| 6 | Autorização espalhada em `ensureAdmin` + `ensureActiveTenantMembership` sem tipagem/decisão por operação | Boundary tipado `lead-authorization.server.ts` com matriz por operação |
| 7 | `select("*")` em `adminListarCorretores` | Projeção mínima |
| 8 | `.update(rest as never)` em `adminAtualizarLead` | Payload tipado; select-return; falha explícita quando `rowCount = 0` |
| 9 | Retorno da RPC validado por Zod frouxo | `manualLeadReturnSchema` endurecido: `status=literal('novo')`, `version.int().positive()`, `createdAt.datetime()` |
| 10 | RPC sem `search_path` seguro nem validação DB-level de tamanho | `SET search_path = 'public','pg_temp'`; validações de nome/email/telefone/observações |

## 4. Modelo de ameaça

- Escrita direta na trilha de auditoria por rota autenticada — mitigada por revoke total.
- Exclusão silenciosa de auditoria via CASCADE — mitigada por RESTRICT.
- Escalonamento cross-tenant em auditoria via default automático — mitigado pela remoção do default.
- Falso sucesso em `adminAtualizarLead` — mitigado por `select("id")` + rowCount check.
- SQL injection / search_path hijack em `create_manual_lead` — mitigado por `SET search_path`.

## 5. Matriz de autorização por operação (TypeScript boundary)

| Operation | Required role (any of) | tenant_wide roles |
|-----------|------------------------|-------------------|
| lead.list | admin, gerente, corretor | admin, gerente |
| lead.list_assignees | admin, gerente | admin, gerente |
| lead.list_properties | admin, gerente, corretor | admin, gerente |
| lead.create_manual | admin, corretor | admin |
| lead.update_fields | admin, gerente, corretor | admin, gerente |
| lead.workspace_action | (nenhum) | (nenhum) — surface removida |

## 6. Tenant provenance

Derivado no servidor via RPC canônica `get_current_tenant_id()`.
Nenhum caminho consome tenant vindo do client. Nenhum fallback, default,
LIMIT 1 ou resolver paralelo.

## 7. Membership e cardinalidade

Consulta em `tenant_members` filtrada por `membership_status='active'`.
Cardinalidade explícita: 0 → `membership_missing`; N>1 → `membership_ambiguous`;
1 → decisão prossegue.

## 8. Super Admin e impersonation

Preservado o contrato permanente: Super Admin sem impersonação válida não
opera recursos tenant-scoped. O boundary consome o mecanismo canônico já
existente (`tenant-middleware`/`impersonation-state`). Nenhum estado paralelo
foi introduzido. Prova operacional multi-sessão pertence à LSV-01.

## 9. Boundary TypeScript

`src/lib/leads/lead-authorization.server.ts` — autoridade única e tipada.
Tipos: `LeadOperation`, `LeadAccessScope`, `LeadAuthorizationDecision`,
`LeadAuthorizationError`, `LeadAuthorizationRepository`. Sem `any`, sem
`as never`, sem `as unknown as`.

## 10. Modelo transacional da RPC

`create_manual_lead` executa INSERT do lead + INSERT do audit event na mesma
transação, com rollback natural. Tenant fornecido explicitamente ao audit
event. Retorno JSON tipado (id, tenantId, status, version, assignedTo,
corretorId, imovelId, createdAt).

## 11. Audit trail

Append-only por contrato: nenhum papel possui INSERT/UPDATE/DELETE direto;
apenas a função SECURITY DEFINER pode inserir. `ON DELETE RESTRICT` preserva
histórico. `event_type` restringido ao conjunto suportado.

## 12. RLS e grants

- `lead_audit_events`: RLS habilitada, zero policies, zero grants diretos.
- `create_manual_lead`: `EXECUTE` apenas para `authenticated`; revogado de PUBLIC/anon/service_role.

## 13. Server functions afetadas

- `adminListarLeads` — mantém tenant scope; membership + admin exigidos.
- `adminListarCorretores` — projeção mínima; filtra por `ativo=true`.
- `adminListarImoveisLite` — membership ativa exigida; projeção mínima.
- `adminAtualizarLead` — payload tipado; select-return; falha explícita.
- `criarLeadManual` — handler fino; toda autoridade na RPC.

## 14. Content Workspace

`workspace_runtime_reachable=no`; `workspace_mutation_surface=absent`.
`runAction` lança erro para qualquer `actionId`. Comentários legados
saneados.

## 15. Testes determinísticos

- Unit boundary: 15/15
- Structural: 16/16
- Transition regression: 35/35

## 16. Riscos e limitações

Nenhum item de escopo LSH-01 pendente. Provas operacionais reais —
múltiplos JWTs, RLS efetivo sob multiusuário, grants verificados no banco
aplicado, impersonation runtime, rollback multi-sessão — pertencem
exclusivamente à LSV-01.

## 17. Definition of Done — vide seção 19 do runbook.

## 18. Fora de escopo

LSV-01, RDA-01, RC-01, PR-M2, dashboard, CMS, host resolution, domains,
billing.
