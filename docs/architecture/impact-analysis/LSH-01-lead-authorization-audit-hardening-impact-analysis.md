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

---

## Recovery Mode — Lote A: Runtime Authorization Integration

**Baseline (Lote A):** `9c54c6ca9d8c38cc2be1b0139bb36d6efd627737`

### Contratos canônicos identificados no runtime atual

- **Auth context:** `requireSupabaseAuth` (`src/integrations/supabase/auth-middleware.ts`) expõe `{ supabase, userId, claims }`; não carrega tenant nem impersonation.
- **Tenant efetivo:** RPC `get_current_tenant_id()` (autoritativa server-side).
- **Membership:** `tenant_members(user_id, tenant_id, membership_status='active')` com cardinalidade explícita.
- **Super Admin:** RPC `is_super_admin()` (não `has_role admin`).
- **Impersonação:** middleware canônico `requireTenant` deriva `origin='impersonation'` server-side; o `authenticated context` do Lote A não a expõe. Fail-closed: `decision.impersonating` reflete apenas `isSuperAdmin`. Evidência SQL adicional é reservada ao Lote B.
- **App roles reais:** `admin | corretor | secretaria | gerente | captador` (roleEnum em `admin.functions.ts`).

### Matriz TypeScript utilizada (Lote A)

| operação             | autorizados                | tenant_wide          |
|----------------------|----------------------------|----------------------|
| lead.list            | admin, gerente, corretor   | admin, gerente       |
| lead.list_assignees  | admin, gerente             | admin, gerente       |
| lead.list_properties | admin, gerente, corretor   | admin, gerente       |
| lead.create_manual   | admin, corretor            | admin                |
| lead.update_fields   | admin, gerente, corretor   | admin, gerente       |
| lead.workspace_action| (nenhum — sempre denied)   | —                    |

`secretaria` e `captador` são negados em todas as operações (fail-closed).

### Consumidores do boundary (5/5)

- `adminListarLeads` → `listLeadsAuthorized` (`lead.list`)
- `adminListarLeadAssignees` → `listLeadAssigneesAuthorized` (`lead.list_assignees`)
- `adminListarImoveisLite` → `listLeadPropertiesAuthorized` (`lead.list_properties`)
- `adminAtualizarLead` → `updateLeadFieldsAuthorized` (`lead.update_fields`)
- `criarLeadManual` → `createManualLeadAuthorized` (`lead.create_manual`)

Nenhum destes handlers chama `ensureAdmin` ou `ensureActiveTenantMembership`.

### Arquivos alterados (Lote A)

- `src/lib/leads/lead-authorization.server.ts` — removido input livre `impersonating`; adicionado `buildLeadAuthorizationContext`; `isSuperAdmin` derivado via RPC canônica.
- `src/lib/leads/lead-operations.server.ts` — novo módulo: gateway injetável + funções operacionais tipadas.
- `src/lib/api/admin.functions.ts` — wrappers finos das 5 operações; guards legados removidos das regiões Lead.
- `src/lib/leads/__tests__/lead-authorization.spec.ts` — teste `impersonation flag is preserved` removido; adicionados testes para `is_super_admin` canônico e input livre bloqueado por tipo.
- `src/lib/leads/__tests__/lead-runtime-operations.spec.ts` — nova suíte determinística das 5 operações.
- `src/lib/leads/__tests__/lead-structural.spec.ts` — provas estruturais adicionais.
- `run-lead-runtime-operations-specs.ts` — novo runner.
- `package.json` — `tsx` fixado em devDependencies; scripts `test:lsh-01:*` usam binário local.

### Testes

- `test:lsh-01:unit` — 18/18
- `test:lsh-01:runtime` — 11/11
- `test:lsh-01:structural` — 23/23
- `test:lsh-01:transition-regression` — 35/35

### Itens reservados ao Lote B (SQL Authority Alignment)

- `CREATE OR REPLACE FUNCTION create_manual_lead` com cardinalidade explícita (COUNT) e revalidação canônica de impersonação em SQL.
- Endurecimento SQL adicional de `lead_audit_events` (grants finais e RLS effetiva).
- Prova de rollback multi-JWT no banco aplicado (LSV-01).

## Recovery Mode — Lote B: SQL Authority Alignment (Canonical Impersonation Closure)

**Baseline (Lote B):** `768f1f6` (após Lote A)
**Migrations do lote:**
- `supabase/migrations/20260716155328_61a679da-33cc-430e-a8f0-40601e37f02b.sql`
- `supabase/migrations/20260716161352_755f2a57-6bd3-45fd-ac2d-fb3dc6b7c9f4.sql` — closure aditiva

### Contratos canônicos (correção do bloqueio de auditoria)

- **Tenant efetivo:** `public.get_current_tenant_id()` — autoridade única. A RPC não recebe `tenant_id` como argumento do client.
- **Super Admin:** `public.is_super_admin()` — nunca `has_role(actor,'admin')`. `admin` (app_role) ≠ Super Admin.
- **Impersonação — contrato final:** presença de `x-tenant-id` **não é** autoridade. Impersonação exige, cumulativamente:
  1. `is_super_admin` = true;
  2. header `x-tenant-id` presente e conversível para UUID (parse fail-closed);
  3. o UUID do header **igual** ao tenant retornado por `get_current_tenant_id()`.
  Usuário comum com header forjado nunca é marcado como impersonação (`v_is_impersonating = false`).
- **Fail-closed:** Super Admin sem impersonação canônica → `super_admin_requires_impersonation`.

A afirmação anterior de que "presença de `x-tenant-id` = impersonação" é revogada e substituída pelo contrato acima.

### Alterações SQL (create_manual_lead — migration de closure)

- Variável dedicada `v_header_tenant uuid`; parse via `btrim(v_header_raw)::uuid` dentro de bloco `EXCEPTION WHEN OTHERS THEN v_header_tenant := NULL`. Header vazio/whitespace produz `NULL`.
- `v_is_impersonating := v_is_super_admin AND v_header_tenant IS NOT NULL AND v_header_tenant = v_tenant`.
- Ordem canônica: (1) `is_super_admin()`, (2) parse do header, (3) `get_current_tenant_id()`, (4) cálculo de impersonação, (5) fail-closed Super Admin, (6) matriz de escopo.
- Cardinalidades preservadas (membership do ator, assignee, corretores) e validação de imóvel.
- Escrita atômica lead + `lead_audit_events`; `impersonation_active` reflete apenas impersonação validada.
- Grants reafirmados: `authenticated` executa; `PUBLIC`/`anon`/`service_role` revogados.

### Alinhamento TypeScript (paridade com SQL)

- `LeadAuthorizationContext` deixa de aceitar `tenantId`, `tenantOrigin`, `isSuperAdmin` ou `impersonating` vindos do caller. O `tenant: LeadTenantContext` é derivado server-side de `requireTenant` via `deriveLeadTenantContext` / `mapTenantOrigin`.
- `LeadTenantOrigin = 'membership' | 'impersonation'` colapsa `selection`/`single-membership` do middleware canônico.
- Ordem de decisão do boundary: (1) validar ator; (2) validar tenant; (3) Super Admin → exige `origin = 'impersonation'`, senão `super_admin_requires_impersonation`; ignora membership + matriz; scope `tenant_wide`; `workspace_action` sempre negada; (4) usuário comum → `origin = 'impersonation'` implica `operation_forbidden`; caso contrário, cardinalidade de membership + matriz por papel.
- `LeadAuthorizationDecision.impersonating = isSuperAdmin && origin === 'impersonation'` — nunca constante `false`, nunca alias de `isSuperAdmin` sozinho.
- Wrappers Lead em `admin.functions.ts` compõem `requireTenant` (que já compõe `requireSupabaseAuth`) e propagam `context.tenant` para `createRuntimeLeadOperationsDeps`.
- `useLeadAdapter.ts` e `usePipelineData.ts` continuam usando `adminListarLeadAssignees`. `adminListarCorretores` permanece exclusivo dos domínios administrativos não-Lead.

### Testes adicionados/atualizados

- `src/lib/leads/__tests__/lead-authorization.spec.ts` — casos determinísticos para Super Admin sem/ com impersonação, bypass de membership e matriz para Super Admin impersonando, `workspace_action` negada, usuário comum com origem `impersonation` negada, admin (app_role) ≠ Super Admin.
- `src/lib/leads/__tests__/lead-runtime-operations.spec.ts` — inclui casos para `listLeadsAuthorized` e `createManualLeadAuthorized` com Super Admin impersonando (gateway acionado, tenant_wide) e Super Admin sem impersonação (gateway não acionado).
- `src/lib/leads/__tests__/lead-sql-structural.spec.ts` — localiza a migration de closure pelo padrão de nome de arquivo + `v_header_tenant`, cobrindo: variável `v_header_tenant`, parse fail-closed, chamada de `get_current_tenant_id`, `v_is_impersonating` requer `v_is_super_admin`, UUID válido e igualdade com o tenant resolvido; `impersonation_active` derivado apenas de `v_is_impersonating`; regressões preservadas.
- `src/lib/leads/__tests__/lead-structural.spec.ts` — asserta que os wrappers compõem `requireTenant`, forwardam `context.tenant`, e que o boundary consome o Tenant Context canônico (`mapTenantOrigin`, `deriveLeadTenantContext`, `LeadTenantContext`).

### Bloqueios eliminados

1. **Paridade TypeScript × SQL para Super Admin:** o boundary alcança a RPC via caminho canônico de impersonação (`origin = 'impersonation'`), sem exigir membership comum nem `app_role` tenant-scoped.
2. **Evidência SQL de impersonação:** header presente sem UUID válido ou sem coincidência com o tenant resolvido não caracteriza impersonação; usuário comum com header forjado permanece `impersonation_active = false`.

### Itens reservados

- **Lote C:** encerramento documental, limpeza histórica.
- **LSV-01:** prova operacional multi-JWT/RLS/rollback sob sessões reais.


