# Relatório de execução — SCP-012

## Status

Blocked — Architectural Prerequisite Required

**Escopo:** preflight arquitetural obrigatório da SCP-012 e
formalização documental do bloqueio (Cenário B, §4.2). Promoção das
etapas SCP-011.3.2 e SCP-011.3.3 para `Accepted`. Nenhuma alteração em
runtime, testes, migrations, schema, RLS, grants, mutations,
enforcement, provider, webhook, checkout, frontend, roles ou
`storage.media_limit`.

## 1. Preflight — comandos executados e resultados

### 1.1 Inventário de mutations

```
rg -n 'from\(.tenant_members.\).*\.(insert|update|upsert|delete)' src/
```

→ **zero ocorrências**. Não existe mutation de membership em runtime.
As únicas escritas em `tenant_members` no repositório estão em
migrations históricas (`supabase/migrations/*.sql`).

```
rg -n 'tenant_members' src/
```

→ ocorrências limitadas a **leituras**: `tenant-repository.ts`,
`tenant-selection.functions.ts`, `super.functions.ts` (counts),
`seat-usage-reader.ts` (count) e comentários. Nenhuma mutation.

### 1.2 Enum de status e schema

- `membership_status = ('active','invited','suspended','revoked')`
  (confirmado em `types.ts` e migration `20260701204508`).
- `tenant_role = ('owner','admin','manager','broker','captador',
  'secretaria','viewer')`.
- PK composta `(tenant_id, user_id)`; FKs para `tenants(id)` e
  `auth.users(id)`.
- Trigger `tg_tenant_members_set_updated_at` (BEFORE UPDATE).
- Índices `tenant_members_tenant_idx`, `tenant_members_active_lookup_idx`
  `(user_id, tenant_id, membership_status)`, `tenant_members_user_idx`.
- RLS habilitada; policies `tm_select` e `tm_write` para `authenticated`;
  grants `SELECT` a `authenticated`, `ALL` a `service_role`.
- Sem coluna `version` — concorrência exige lock explícito.

### 1.3 Autoridade comercial

Toda a resolução (`feature-catalog`, `feature-gate`, `read-models`,
`limit-decision`, `seat-limit-runtime`, `seat-usage-reader`,
`commercial.functions`) é **TypeScript puro**, sem função SQL, sem
RPC, sem view autoritativa. Client Supabase não oferece transação
callback multi-statement.

## 2. Decisão de viabilidade

**Cenário B (§4.2) — confirmado.** A resolução comercial autoritativa
não pode participar da mesma transação Postgres da mutation; qualquer
tentativa de contornar viola §5 (segundo resolver) ou §9 (aceitar
decisão comercial do client). Enforcement parcialmente atômico é
explicitamente proibido.

## 3. Ações executadas

### 3.1 Promoção de status para `Accepted`

Aplicada substituição pontual `Ready for External Audit` → `Accepted`
em:

- `docs/architecture/impact-analysis/SCP-011.3.2-accepted-status-finalization-scp-012-authorization.md`
- `docs/delivery/phase-04-saas-commercial-platform/103-scp-011-3-2-accepted-status-finalization-scp-012-authorization.md`
- `docs/architecture/impact-analysis/SCP-011.3.3-exact-status-token-cleanup-final-gate-closure.md`
- `docs/delivery/phase-04-saas-commercial-platform/104-scp-011-3-3-exact-status-token-cleanup-final-gate-closure.md`

### 3.2 Roadmap atualizado (bloco final)

```
15.3.2 SCP-011.3.2 — Accepted Status Finalization & SCP-012 Authorization — Accepted.
15.3.3 SCP-011.3.3 — Exact Status Token Cleanup & Final Gate Closure — Accepted.
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — Blocked: transaction-safe commercial authority unavailable.
16.0 SCP-012.0 — Transaction-Safe Commercial Resolver Materialization — prerequisite futura planejada; não iniciada.
```

### 3.3 Prerequisite proposta

**SCP-012.0 — Transaction-Safe Commercial Resolver Materialization**
(detalhes no documento de impacto SCP-012, §6).

## 4. Não executado por bloqueio arquitetural

Não criada: migration, função SQL, RPC de mutation, boundary
server-side de membership, DTO de resultado de mutação, helper de
delta, teste unitário do delta, teste de integração em banco, teste
real de concorrência, alteração de RLS, novo grant/revoke. Nenhum
runtime alterado.

## 5. Arquivos criados

- `docs/architecture/impact-analysis/SCP-012-commercial-seat-limit-atomic-enforcement-integration.md`
- `docs/delivery/phase-04-saas-commercial-platform/105-scp-012-commercial-seat-limit-atomic-enforcement-integration.md`

## 6. Arquivos alterados

- `docs/architecture/impact-analysis/SCP-011.3.2-accepted-status-finalization-scp-012-authorization.md`
- `docs/delivery/phase-04-saas-commercial-platform/103-scp-011-3-2-accepted-status-finalization-scp-012-authorization.md`
- `docs/architecture/impact-analysis/SCP-011.3.3-exact-status-token-cleanup-final-gate-closure.md`
- `docs/delivery/phase-04-saas-commercial-platform/104-scp-011-3-3-exact-status-token-cleanup-final-gate-closure.md`
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`

## 7. Confirmações negativas

Nenhum `tenantId`, `limit`, `used`, `source`, decisão comercial ou
qualquer outro campo comercial aceito do client (nenhum boundary novo).
Nenhum segundo resolver comercial criado. Nenhuma mutation direta em
`tenant_members` introduzida. Nenhum bypass de Super Admin. Nenhuma RLS
permissiva criada. Nenhum grant para `anon`/`authenticated` criado.
Nenhum frontend utilizado como autoridade. Nenhum enforcement apenas em
memória. Nenhum teste de concorrência simulado declarado como real.
SCP-012 permanece **Blocked**; SCP-012.0 permanece **não iniciada**;
runtime read-only da SCP-011 integralmente preservado.
