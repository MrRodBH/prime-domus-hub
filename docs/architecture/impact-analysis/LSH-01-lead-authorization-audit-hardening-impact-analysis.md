# LSH-01 — Lead Authorization & Audit Hardening — Impact Analysis

## 1. Status

**Status:** Ready for External Audit.
**Stage type:** independent first-class architectural gate.
Lote A — Completed. Lote B — Completed. Lote C — Completed.
Nenhuma limitação conhecida dentro do escopo LSH-01.

## 2. Contexto e predecessor

Predecessor: **LSO-01 (Rejected)**. A LSO-01 falhou o Definition of Done
integral em ciclo único (defeitos em autorização, grants da tabela de
auditoria, `ON DELETE CASCADE`, default autoritativo de tenant, cast
inseguro em `adminAtualizarLead`, `select('*')` em
`adminListarCorretores`, Zod frouxo no retorno da RPC, ausência de
boundary tipado consumido pelo runtime). As obrigações estruturais
foram transferidas à LSH-01; as provas operacionais reais (multi-JWT,
RLS multiusuário, rollback multi-sessão, impersonation runtime) foram
transferidas à LSV-01. Nenhuma obrigação da LSO-01 permanece sem
destino.

Sucessora: **LSV-01 (Planned · blocked until external acceptance of
LSH-01)**.

## 3. Baseline arquitetural

- Baseline inicial LSH-01: `704ae40a18e19a14332256e25964cf2fbb51cc9f`.
- Baseline Lote A: `9c54c6ca9d8c38cc2be1b0139bb36d6efd627737`.
- Baseline Lote B: `768f1f6789bf31421771b97722145a5cb5a1b5a4` (após Lote A).
- **Implementation Evidence HEAD:** `20265f950b541e2d9f499e747b7577b28fc29a4a`
  ("Hardened lead auth & audit").

O Closure HEAD produzido pelo Lote C é registrado no relatório final da
execução — este documento evita o loop autorreferencial de tentar
gravar dentro do próprio arquivo o SHA do commit que o modifica.

## 4. Problemas herdados da LSO-01

| # | Defeito | Correção LSH-01 |
|---|---------|-----------------|
| 1 | `lead_audit_events` com `GRANT ALL` a `service_role` e `GRANT SELECT` a `authenticated` | Todos os grants revogados; escrita apenas via SECURITY DEFINER |
| 2 | Policy `lead_audit_events_select` permissiva | Removida; RLS habilitada sem policy |
| 3 | `ON DELETE CASCADE` na FK `lead_id` | Substituída por `ON DELETE RESTRICT` |
| 4 | `DEFAULT get_current_tenant_id()` em `tenant_id` | Removido; tenant_id explícito |
| 5 | Ausência de constraint em `event_type` | CHECK `IN ('manual_lead_created')` |
| 6 | Autorização espalhada em `ensureAdmin` + `ensureActiveTenantMembership` sem tipagem | Boundary tipado `lead-authorization.server.ts` com matriz por operação |
| 7 | `select("*")` em `adminListarCorretores` | Projeção mínima |
| 8 | `.update(rest as never)` em `adminAtualizarLead` | Payload tipado; select-return; falha explícita quando `rowCount = 0` |
| 9 | Retorno da RPC validado por Zod frouxo | `manualLeadReturnSchema` endurecido |
| 10 | RPC sem `search_path` seguro nem validações DB-level | `SET search_path = 'public','pg_temp'`; validações determinísticas |
| 11 | Boundary tipado não consumido pelo runtime | 5/5 operações Lead compõem `requireTenant` → boundary |
| 12 | Impersonação inferida heuristicamente (`admin` app_role ou presença de header) | Contrato canônico: `is_super_admin` + UUID válido + header = tenant resolvido |

## 5. Modelo de ameaça

- Escrita direta na trilha de auditoria por rota autenticada — mitigada
  por revoke total.
- Exclusão silenciosa de auditoria via CASCADE — mitigada por RESTRICT.
- Escalonamento cross-tenant por default automático — mitigado pela
  remoção do default.
- Falso sucesso em `adminAtualizarLead` — mitigado por `select("id")` +
  rowCount check.
- SQL injection / search_path hijack em `create_manual_lead` — mitigado
  por `SET search_path`.
- Impersonação forjada por header — mitigada pelo contrato canônico
  cumulativo em TypeScript e SQL.
- Autoridade tipada não consumida — mitigada pela integração das 5
  operações Lead ao boundary.

## 6. Tenant authority

Contrato canônico consumido pelo boundary: `requireTenant` resolve
`TenantContext` server-side com origem `impersonation` | `selection` |
`single-membership`. `deriveLeadTenantContext` colapsa `selection` e
`single-membership` para `membership`, preservando `impersonation`.
Nenhum caminho consome tenant vindo do client.

## 7. Membership cardinality

Consulta em `tenant_members` filtrada por `membership_status='active'`
com cardinalidade explícita: 0 → `membership_missing`; N>1 →
`membership_ambiguous`; 1 → decisão prossegue. Cardinalidade SQL usa
`COUNT(*)` explícito; nunca `IF NOT EXISTS` heurístico ou `MIN(id)`.

## 8. Super Admin e impersonação

Super Admin é detectado exclusivamente por `public.is_super_admin()`.
`admin` (app_role) ≠ Super Admin.

Contrato canônico de impersonação (cumulativo, fail-closed):

1. `is_super_admin = true`;
2. header `x-tenant-id` presente e conversível para UUID (parse
   fail-closed em SQL via `EXCEPTION WHEN OTHERS THEN NULL`);
3. UUID do header igual ao tenant retornado por
   `get_current_tenant_id()`.

TypeScript espelha o contrato: `impersonating = isSuperAdmin &&
tenant.origin === 'impersonation'`. Nunca constante `false`, nunca
alias isolado de `isSuperAdmin`, nunca derivada apenas da presença do
header.

Super Admin sem impersonação canônica → `super_admin_requires_impersonation`.
Super Admin com impersonação canônica → `scope = tenant_wide`, ignora
membership comum e matriz por papel, exceto `lead.workspace_action`
(sempre negada).

## 9. Matriz de operações

| Operation | Required role (any of) | Tenant-wide roles |
|-----------|------------------------|-------------------|
| lead.list | admin, gerente, corretor | admin, gerente |
| lead.list_assignees | admin, gerente | admin, gerente |
| lead.list_properties | admin, gerente, corretor | admin, gerente |
| lead.create_manual | admin, corretor | admin |
| lead.update_fields | admin, gerente, corretor | admin, gerente |
| lead.workspace_action | (nenhum — surface removida) | — |

`secretaria` e `captador` são negados em todas as operações.

## 10. Runtime TypeScript

- `src/lib/leads/lead-authorization.server.ts` — boundary tipado único.
  `LeadAuthorizationContext` derivado inteiramente server-side; não
  aceita `impersonating`, `isSuperAdmin`, `tenantId` ou `tenantOrigin`
  vindos do caller.
- `src/lib/leads/lead-operations.server.ts` — 5 operações testáveis com
  gateway injetável.
- `src/lib/api/admin.functions.ts` — wrappers finos:
  `adminListarLeads`, `adminListarLeadAssignees`,
  `adminListarImoveisLite`, `adminAtualizarLead`, `criarLeadManual`
  compõem `requireTenant` (que compõe `requireSupabaseAuth`) e
  propagam `context.tenant` para o boundary via
  `buildLeadAuthorizationContext`.
- `src/components/content/adapters/useLeadAdapter.ts` — mutation
  surface ausente; `runAction` falha explícita.
- `src/components/pipeline/hooks/usePipelineData.ts` — consome
  `adminListarLeadAssignees` (boundary-compliant).

## 11. Runtime SQL

A autoridade final de `lead.create_manual` é a RPC
`public.create_manual_lead(...)`. Contrato SQL final:

```
auth.uid()
public.is_super_admin()
public.get_current_tenant_id()
membership cardinality (COUNT(*))
functional role
scope
assignee eligibility (membership + role)
assignee membership cardinality (COUNT(*))
corretor cardinality (COUNT(*))
property validation (tenant + ativo)
lead insert
audit event
```

Impersonação SQL:

```
v_is_impersonating :=
  v_is_super_admin
  AND v_header_tenant IS NOT NULL
  AND v_header_tenant = v_tenant
```

O header `x-tenant-id` é transporte; não é autoridade isolada.

Grants: `REVOKE` explícito de `PUBLIC`, `anon`, `service_role`;
`GRANT EXECUTE` apenas para `authenticated`.

## 12. Assignee e corretor

`assigned_to` validado no servidor: mesma tenant, membership ativa,
functional role permitida. Corretor não pode atribuir a outro usuário.
`corretor_id` resolvido server-side por `(tenant_id, user_id, ativo)`
com cardinalidade explícita 0/1/N.

## 13. Imóvel

`imovel_id`, quando informado, validado no mesmo tenant e em status
`'ativo'`. Cross-tenant e inexistente são indistinguíveis (não vaza
existência).

## 14. Audit trail

- `lead_audit_events`: RLS habilitada, zero policies diretas, zero
  grants diretos de DML;
- `tenant_id` explícito;
- `event_type` restringido por CHECK;
- `ON DELETE RESTRICT` na FK `lead_id`;
- escrita atômica lead + evento em uma única transação via
  `SECURITY DEFINER`;
- `impersonation_active` reflete apenas impersonação canônica
  validada em SQL.

## 15. Content Workspace

`workspace_runtime_reachable = no`. `workspace_mutation_surface =
absent`. A autoridade CRM é `/admin/pipeline`. `useLeadAdapter.runAction`
lança erro para qualquer `actionId`.

## 16. Lote A — Runtime Authorization Integration

Baseline: `9c54c6ca9d8c38cc2be1b0139bb36d6efd627737`.

Conteúdo:

- boundary refatorado: remoção do input livre `impersonating`,
  detecção de Super Admin exclusivamente via
  `public.is_super_admin()`;
- 5/5 operações Lead migradas para o boundary; guards legados
  (`ensureAdmin`, `ensureActiveTenantMembership`) removidos das
  regiões Lead;
- `src/lib/leads/lead-operations.server.ts` criado como gateway
  injetável testável;
- suíte determinística `lead-runtime-operations.spec.ts` adicionada;
- `tsx` fixado em `devDependencies`; scripts `test:lsh-01:*`
  padronizados com binário local.

Reservas para o Lote B (agora resolvidas): cardinalidade explícita em
SQL, revalidação canônica de impersonação em SQL, grants finais do
audit trail.

## 17. Lote B — SQL Authority Alignment (Canonical Impersonation Closure)

Migrations:

- `supabase/migrations/20260716155328_61a679da-33cc-430e-a8f0-40601e37f02b.sql`
  — `create_manual_lead` com cardinalidade explícita `COUNT(*)`,
  grants finais.
- `supabase/migrations/20260716161352_755f2a57-6bd3-45fd-ac2d-fb3dc6b7c9f4.sql`
  — Canonical Impersonation Closure (`v_header_tenant`, parse
  fail-closed, `v_is_impersonating` cumulativo).

Alinhamento TypeScript: `LeadAuthorizationContext` deixa de aceitar
tenant/impersonation vindos do caller; `deriveLeadTenantContext`
mapeia origem canônica; `LeadAuthorizationDecision.impersonating`
nunca é constante `false` nem alias isolado de `isSuperAdmin`.

A afirmação anterior de que "presença de `x-tenant-id` = impersonação"
foi revogada e substituída pelo contrato canônico documentado na
seção 8. Qualquer texto histórico contrário é obsoleto.

## 18. Testes e evidências

Runners e resultados observados no Lote C:

| Runner | Passed | Failed |
|--------|--------|--------|
| `test:lsh-01:unit` | 22 | 0 |
| `test:lsh-01:runtime` | 15 | 0 |
| `test:lsh-01:structural` | 27 | 0 |
| `test:lsh-01:sql-structural` | 17 | 0 |
| `test:lsh-01:transition-regression` | 35 | 0 |
| `test:lsh-01:lot-a` | agregado | 0 |
| `test:lsh-01:lot-b` | agregado | 0 |
| `test:lsh-01` | agregado | 0 |

Typecheck (`tsgo --noEmit`): exit 0. Build (`bun run build`): exit 0.
`git diff --check`: limpo.

## 19. Obrigações da LSV-01

Reservadas exclusivamente à LSV-01, jamais atribuídas à LSH-01:

- prova operacional multi-JWT sob sessões reais;
- prova de RLS efetivo no banco aplicado;
- prova de grants efetivos no banco aplicado;
- impersonation runtime multi-sessão;
- rollback e atomicidade sob concorrência real;
- fixtures multi-tenant / multiusuário.

## 20. Definition of Done

- boundary consumido pelas 5 operações Lead;
- guards legados ausentes das operações Lead alvo;
- Super Admin detectado apenas por `is_super_admin()`;
- impersonação canônica cumulativa em TypeScript e SQL;
- cardinalidade explícita `COUNT(*)` em SQL e `array.length` em TS;
- audit trail append-only, sem grants/policies diretos;
- workspace mutation surface ausente;
- typecheck, build e todas as suítes de teste com `failed = 0`;
- documentação reconciliada em narrativa única;
- nenhuma obrigação de escopo LSH-01 transferida para "known
  limitations" nem para a LSV-01 além do que este documento reserva.

## 21. Decisão de fechamento

A LSH-01 está **Ready for External Audit**. A aprovação como Accepted
depende exclusivamente da auditoria crítica externa. A LSV-01
permanece Planned e bloqueada até o aceite externo da LSH-01. O
Lote C não altera a arquitetura aprovada nos Lotes A e B, não cria
nova migration, não altera RLS, grants, schema ou runtime funcional.

## Fora de escopo

LSV-01, RDA-01, RC-01, PR-M2, dashboard, CMS, host resolution,
domains, billing.
