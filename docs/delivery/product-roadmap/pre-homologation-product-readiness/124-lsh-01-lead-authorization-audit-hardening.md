# 124 — LSH-01: Lead Authorization & Audit Hardening

**Status:** Ready for External Audit

- Lote A — Runtime Authorization Integration: Completed
- Lote B — SQL Authority Alignment: Completed
- Lote C — Documentation Reconciliation & External Audit Gate Closure: Completed

**Predecessor:** LSO-01 (Rejected — obrigações estruturais transferidas para
LSH-01; obrigações operacionais para LSV-01).
**Successor:** LSV-01 (Planned · blocked until external acceptance of LSH-01).

## Baselines vinculantes

- **Baseline inicial LSH-01:** `704ae40a18e19a14332256e25964cf2fbb51cc9f`
- **Baseline Lote A:** `9c54c6ca9d8c38cc2be1b0139bb36d6efd627737`
- **Baseline Lote B:** `768f1f6…` (após Lote A; ver Impact Analysis)
- **Implementation Evidence HEAD:** `20265f950b541e2d9f499e747b7577b28fc29a4a`
  (commit "Hardened lead auth & audit"). O Closure HEAD produzido pelo
  Lote C é registrado no relatório final da execução — não neste
  documento, para evitar loop autorreferencial.

## Motivo da Recovery Mode

A LSH-01 foi conduzida em Recovery Mode após auditoria externa da versão
inicial identificar dois bloqueios: (i) o boundary TypeScript não era
consumido pelo runtime das 5 operações Lead; (ii) a autoridade SQL não
possuía contrato canônico de impersonação nem cardinalidade explícita. A
recuperação foi executada em três lotes operacionais (A, B, C), sem
criação de subetapas, sem numeração decimal, e sem transferir requisitos
da LSH-01 para a LSV-01.

## Objetivo

Materializar a autoridade tipada de autorização Lead, endurecer a tabela
de auditoria e a RPC canônica de criação manual, e sanear as server
functions do domínio. A prova operacional multiusuário/RLS/JWT sob
sessões reais permanece escopo exclusivo da LSV-01.

## Artefatos principais

Runtime TypeScript:

- `src/lib/leads/lead-authorization.server.ts` — boundary tipado único.
- `src/lib/leads/lead-operations.server.ts` — operações Lead testáveis.
- `src/lib/api/admin.functions.ts` — wrappers finos compõem
  `requireTenant` → `deriveLeadTenantContext` → `authorizeLeadOperation`.
- `src/components/content/adapters/useLeadAdapter.ts` — mutation surface
  ausente (`runAction` falha explícita).
- `src/components/pipeline/hooks/usePipelineData.ts` — consome
  `adminListarLeadAssignees` (boundary-compliant).

Testes determinísticos:

- `src/lib/leads/__tests__/lead-authorization.spec.ts` — 22 unit.
- `src/lib/leads/__tests__/lead-runtime-operations.spec.ts` — 15 runtime.
- `src/lib/leads/__tests__/lead-structural.spec.ts` — 27 structural.
- `src/lib/leads/__tests__/lead-sql-structural.spec.ts` — 17 SQL
  structural.
- `src/lib/leads/__tests__/lead-transition.spec.ts` — 35 transition
  regression (PR-M1, preservada).

Migrations aplicadas na LSH-01:

- `supabase/migrations/20260715222734_*.sql` — hardening inicial de
  `lead_audit_events` e `create_manual_lead`.
- `supabase/migrations/20260716155328_61a679da-33cc-430e-a8f0-40601e37f02b.sql`
  — SQL Authority Alignment (cardinalidade explícita, grants finais).
- `supabase/migrations/20260716161352_755f2a57-6bd3-45fd-ac2d-fb3dc6b7c9f4.sql`
  — Canonical Impersonation Closure.

Impact Analysis:

- `docs/architecture/impact-analysis/LSH-01-lead-authorization-audit-hardening-impact-analysis.md`

## Matriz de operações Lead

| Operation | Required role (any of) | Tenant-wide roles |
|-----------|------------------------|-------------------|
| lead.list | admin, gerente, corretor | admin, gerente |
| lead.list_assignees | admin, gerente | admin, gerente |
| lead.list_properties | admin, gerente, corretor | admin, gerente |
| lead.create_manual | admin, corretor | admin |
| lead.update_fields | admin, gerente, corretor | admin, gerente |
| lead.workspace_action | (nenhum — surface removida) | — |

`secretaria` e `captador` são negados em todas as operações
(fail-closed). Super Admin impersonando ignora a matriz por papel e opera
com `scope = tenant_wide`, exceto `lead.workspace_action` que permanece
sempre negada.

## Contrato de tenant

Contrato canônico consumido pelo boundary: middleware `requireTenant`
resolve `TenantContext` server-side; `deriveLeadTenantContext` colapsa
`selection` / `single-membership` para `origin = 'membership'` e preserva
`impersonation`. Nenhum caminho consome tenant vindo do client.

## Contrato de Super Admin

Detectado exclusivamente por `public.is_super_admin()`. `admin`
(`app_role`) ≠ Super Admin. Super Admin sem impersonação canônica é
negado (`super_admin_requires_impersonation`).

## Contrato de impersonação

TypeScript: `LeadAuthorizationDecision.impersonating = isSuperAdmin &&
tenant.origin === 'impersonation'`. Nunca constante `false`, nunca alias
isolado de `isSuperAdmin`, nunca derivado apenas da presença do header
`x-tenant-id`.

SQL (RPC `create_manual_lead`):

```
v_is_impersonating :=
  v_is_super_admin
  AND v_header_tenant IS NOT NULL
  AND v_header_tenant = v_tenant
```

O header `x-tenant-id` é transporte; a autoridade é sempre derivada
server-side.

## Escopos

`tenant_wide` (admin/gerente ou Super Admin impersonando) e
`own_assigned` (corretor). Escopo é aplicado server-side na query,
nunca inferido no client.

## Audit trail

- Tabela `lead_audit_events`: RLS habilitada, zero policies diretas,
  zero grants diretos de DML.
- `tenant_id` explícito, sem `DEFAULT get_current_tenant_id()`.
- `event_type` restringido por CHECK ao conjunto suportado.
- `ON DELETE RESTRICT` na FK `lead_id`.
- Escrita somente via função `SECURITY DEFINER` autorizada
  (`create_manual_lead`), na mesma transação do INSERT do lead.

## Content Workspace

`workspace_runtime_reachable = no`. `workspace_mutation_surface =
absent`. `useLeadAdapter.runAction` falha explicitamente para qualquer
`actionId`, redirecionando o operador para `/admin/pipeline`.

## Matriz de transferência LSO-01 → LSH-01 / LSV-01

| Obrigação | Destino | Estado |
|-----------|---------|--------|
| Boundary tipado de autorização | LSH-01 | Materialized |
| Integração runtime → 5 operações Lead | LSH-01 | Materialized |
| Hardening SQL de `create_manual_lead` | LSH-01 | Materialized |
| Hardening SQL de `lead_audit_events` | LSH-01 | Materialized |
| Testes determinísticos (unit/runtime/structural/SQL) | LSH-01 | Materialized |
| Live grants & RLS proof (multi-JWT) | LSV-01 | Planned |
| Multi-JWT attack matrix | LSV-01 | Planned |
| Impersonation runtime multi-sessão | LSV-01 | Planned |
| Live rollback proof | LSV-01 | Planned |

## Matriz final de evidências

| Contrato | Evidência |
|----------|-----------|
| Boundary único | `src/lib/leads/lead-authorization.server.ts` |
| Operações testáveis | `src/lib/leads/lead-operations.server.ts` |
| Tenant Context canônico | `requireTenant` |
| Super Admin | `public.is_super_admin()` |
| Impersonação TypeScript | `isSuperAdmin && origin === 'impersonation'` |
| Impersonação SQL | `v_is_super_admin AND header UUID válido AND header = get_current_tenant_id()` |
| Membership cardinality (TS) | `array.length` 0/1/N |
| Membership cardinality (SQL) | `COUNT(*)` explícito |
| Lead list scope | `tenant_wide` / `own_assigned` |
| Lead update scope | `tenant_wide` / `own_assigned` |
| Manual lead authority | RPC `create_manual_lead` |
| Assignee eligibility | membership ativa + functional role |
| Corretor cardinality | 0/1/N explícito |
| Property validation | existence + tenant + `ativo` |
| Audit atomicity | lead + event em uma transação |
| Audit protection | sem grants/policies diretas de DML |
| Workspace mutation | absent |
| Unit tests | `run-lead-authorization-specs.ts` — 22/22 |
| Runtime tests | `run-lead-runtime-operations-specs.ts` — 15/15 |
| Structural tests | `run-lead-structural-specs.ts` — 27/27 |
| SQL structural tests | `run-lead-sql-structural-specs.ts` — 17/17 |
| Transition regression | `run-lead-transition-specs.ts` — 35/35 |
| Live security proof | LSV-01 (Planned) |

## Definition of Done

Todos os itens vinculantes atendidos:

- `impact_analysis_single_canonical_narrative = true`
- `delivery_status = Ready for External Audit`
- `roadmap_status = Ready for External Audit`
- `lso_status = Rejected`, `pr_m1_status = Superseded`
- `lot_a_status = lot_b_status = lot_c_status = Completed`
- `stale_macro_gate_text = 0`, `stale_lso_status = 0`,
  `stale_lsh_status = 0`, `stale_impersonation_contract = 0`,
  `unassigned_lso_obligations = 0`
- `implementation_evidence_head = documented`
- `unit/runtime/structural/sql-structural/transition_regression failed = 0`
- `known_limitations_inside_lsh_scope = 0`
- `live_security_items_are_assigned_only_to_lsv = true`

## Não escopo

LSV-01, RDA-01, RC-01, PR-M2, dashboard, CMS, host resolution, domains,
billing.

## Estado final

- LSH-01 — Ready for External Audit
- LSV-01 — Planned · blocked until external acceptance of LSH-01

Nenhuma declaração de `Accepted` para a LSH-01: a aprovação depende
exclusivamente da auditoria crítica externa.
