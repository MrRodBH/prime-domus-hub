# F3.1 — Membership Schema Foundation

## 1. Objetivo

Preparar a fundação de dados de `public.tenant_members` para suportar a
futura Fase 3 — Membership Evolution Model, sem alterar runtime, RLS de
domínio, impersonação, UI ou billing.

## 2. Contexto

- Fase 2 — Multi-Tenant Core encerrada.
- IA-005 aprovada com recomendação da **Alternativa B**
  (`x-tenant-id` como transporte, validado server-side contra membership
  ativa).
- Esta é a primeira subetapa autorizada da Fase 3. As subetapas
  seguintes (F3.2 Server-Side Tenant Selection, F3.3 RLS Membership
  Selection Patch, F3.4 UI Switcher) permanecem fora de escopo.

## 3. Estado Real Antes da Implementação

### 3.1 Colunas
| Coluna | Tipo | Nullable | Default |
|---|---|---|---|
| `tenant_id` | uuid | NOT NULL | — |
| `user_id` | uuid | NOT NULL | — |
| `is_owner` | boolean | NOT NULL | `false` |
| `is_default` | boolean | NOT NULL | `true` |
| `joined_at` | timestamptz | NOT NULL | `now()` |

### 3.2 Constraints
- PK composta: `(tenant_id, user_id)` — já garante unicidade lógica por
  par `user_id + tenant_id`.

### 3.3 Índices
- `tenant_members_pkey` — btree `(tenant_id, user_id)`
- `tenant_members_user_idx` — btree `(user_id)`

### 3.4 Foreign Keys
- `tenant_id → public.tenants(id) ON DELETE CASCADE`
- `user_id → auth.users(id) ON DELETE CASCADE`

### 3.5 Policies RLS (não alteradas)
- `tm_select` (SELECT, PERMISSIVE, authenticated):
  `is_super_admin() OR user_id = auth.uid() OR user_belongs_to_tenant(tenant_id)`
- `tm_write` (ALL, PERMISSIVE, authenticated):
  `is_super_admin()` (USING + WITH CHECK)

### 3.6 Dados Existentes
- 4 memberships totais.
- 4 pares `(user_id, tenant_id)` distintos.
- 0 duplicidades.
- 0 registros órfãos (`tenants` verificado; `auth.users` não consultável
  via schema `auth` mas protegido por FK `ON DELETE CASCADE`).

### 3.7 Divergência IA-005: "5 colunas vs 4 listadas"
A IA-005 informou "5 colunas" mas listou apenas 4 (`id`, `user_id`,
`tenant_id`, `created_at`).

**Realidade auditada:** a tabela possui **5 colunas**, mas o conjunto real
é:
`tenant_id`, `user_id`, `is_owner`, `is_default`, `joined_at`.

Não existe `id`, não existe `created_at`. A chave primária é composta
`(tenant_id, user_id)` e o timestamp de vínculo é `joined_at`.

A listagem da IA-005 estava incorreta em conteúdo (nomes de colunas) mas
correta na contagem. Divergência resolvida documentalmente — nenhuma
correção retroativa no documento IA-005 é feita nesta etapa.

**Observação sobre `is_owner` e `is_default`:** ambas as colunas já
existem historicamente. Elas **não são** utilizadas por
`get_current_tenant_id()` como critério de resolução automática (função
auditada e confirmada), portanto não configuram violação da regra
arquitetural. Esta migration **preserva** essas colunas sem promovê-las
a mecanismo de resolução runtime.

## 4. Alterações Implementadas

Adicionadas colunas evolutivas em `public.tenant_members`:

| Coluna | Tipo | Nullable | Default |
|---|---|---|---|
| `tenant_role` | `public.tenant_role` (enum) | NOT NULL | `'viewer'` |
| `membership_status` | `public.membership_status` (enum) | NOT NULL | `'active'` |
| `invited_at` | timestamptz | NULL | — |
| `accepted_at` | timestamptz | NULL | — |
| `suspended_at` | timestamptz | NULL | — |
| `revoked_at` | timestamptz | NULL | — |
| `updated_at` | timestamptz | NOT NULL | `now()` |

Backfill dos 4 registros existentes:
- `tenant_role = 'owner'` quando `is_owner = true`, senão `'admin'`.
- `membership_status = 'active'`.
- `accepted_at = joined_at`.

## 5. Migration Criada

Migration aplicada com sucesso (via Supabase migration tool). Conteúdo
essencial:

1. `CREATE TYPE public.tenant_role AS ENUM ('owner','admin','manager','broker','captador','secretaria','viewer')`
2. `CREATE TYPE public.membership_status AS ENUM ('active','invited','suspended','revoked')`
3. `ALTER TABLE public.tenant_members ADD COLUMN ...` (colunas novas, inicialmente nullable)
4. Backfill conservador (UPDATE preservando dados)
5. `ALTER TABLE ... SET NOT NULL` + defaults
6. `CREATE INDEX tenant_members_tenant_idx (tenant_id)`
7. `CREATE INDEX tenant_members_active_lookup_idx (user_id, tenant_id, membership_status)`
8. Trigger `tg_tenant_members_set_updated_at` executando
   `public.tg_set_updated_at()` (helper padrão do projeto — reusado, não
   criado).

## 6. Modelo Final de `tenant_members`

Colunas:
`tenant_id`, `user_id`, `is_owner` *(legado, preservado)*,
`is_default` *(legado, preservado)*, `joined_at`, `tenant_role`,
`membership_status`, `invited_at`, `accepted_at`, `suspended_at`,
`revoked_at`, `updated_at`.

Índices: `tenant_members_pkey (tenant_id, user_id)`,
`tenant_members_user_idx (user_id)`,
`tenant_members_tenant_idx (tenant_id)`,
`tenant_members_active_lookup_idx (user_id, tenant_id, membership_status)`.

FKs preservadas. Policies RLS **inalteradas**.

## 7. Regras Preservadas

- Cliente nunca é autoridade.
- Servidor permanece autoridade única de tenant.
- Sem tenant default, sem fallback, sem seleção automática entre N.
- Sem `LIMIT 1`, sem `ORDER BY`, sem heurística.
- `is_default`/`is_owner` **não** foram promovidos a mecanismo de
  resolução automática.
- Header `x-tenant-id` continua transporte, nunca autoridade para
  usuário comum.
- RLS de domínio inalterada.
- `get_current_tenant_id()` inalterada.
- `is_super_admin()`, `user_belongs_to_tenant()` inalteradas.
- Runtime Core intocado.

## 8. Itens Não Alterados

- `src/integrations/supabase/tenant-middleware.ts`
- `src/integrations/supabase/tenant-repository.ts`
- `src/integrations/supabase/tenant-attacher.ts`
- `src/integrations/supabase/impersonation-state.ts`
- `src/hooks/use-tenant.ts`
- `src/start.ts`
- Qualquer server function, client, UI, storage, Registry, Snapshot,
  ResolutionGraph, ActionExecutor, PluginContext.
- Policies RLS de qualquer tabela de domínio.
- Policies da própria `tenant_members` (`tm_select`, `tm_write`).

## 9. Testes Executados

- Auditoria de schema antes/depois (`\d public.tenant_members`).
- Contagem de registros: 4 antes / 4 depois — preservados.
- Verificação de duplicidades por par `(user_id, tenant_id)` → 0.
- Verificação de órfãos em `tenants` → 0.
- Enums criados e aplicados como default; valores inválidos rejeitados
  pelo próprio tipo enum do Postgres.
- Backfill verificado: `tenant_role`, `membership_status`,
  `accepted_at` populados em todos os 4 registros.

Testes automatizados novos: **não criados nesta etapa**. A suíte
`tests/security/test_tenant_isolation.py` continua válida (auditoria
RESTRICTIVE de tabelas com `tenant_id` — `tenant_members` permanece na
allowlist global, como antes).

## 10. Riscos Residuais

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| R1 | `tenant_role` default `'viewer'` para futuras inserções pode ser conservador demais para casos owner-first. | Baixa | Fluxos de convite (F3.2+) definirão o papel explicitamente na criação da membership. |
| R2 | `is_owner`/`is_default` legados coexistem com `tenant_role`/`membership_status`. | Baixa | Documentado; sem promoção a resolução runtime. Deprecar em subetapa futura. |
| R3 | Enum `tenant_role` fixo — evolução exige `ALTER TYPE ... ADD VALUE`. | Baixa | Padrão do projeto (`app_role`, `rbac_action` seguem o mesmo modelo). |

Nenhum risco bloqueante identificado.

## 11. Próxima Subetapa Recomendada

**F3.2 — Server-Side Tenant Selection**, sujeita a prompt próprio,
Impact Analysis complementar (se necessária) e auditoria externa.
Escopo previsto (não executado aqui): evoluir `resolveTenantContext` /
`requireTenant` / `TenantRepository` para aceitar `x-tenant-id` de
usuário comum **exclusivamente** quando validado contra membership
`active` (via `tenant_members_active_lookup_idx`).

## 12. Confirmação Formal

Confirmo que a F3.1 — Membership Schema Foundation foi executada como
etapa limitada à fundação de schema de memberships.

Confirmo que o estado real de `public.tenant_members` foi verificado
antes da migration.

Confirmo que a divergência documental "5 colunas vs 4 listadas" foi
esclarecida.

Confirmo que nenhuma lógica runtime de resolução de tenant foi alterada.

Confirmo que `requireTenant`, `resolveTenantContext`, `TenantRepository`
e `get_current_tenant_id()` não foram alterados.

Confirmo que nenhuma policy RLS de domínio foi alterada.

Confirmo que impersonação, client, UI, storage e Runtime Core não foram
alterados.

Confirmo que billing, planos, trial, inadimplência, integrações
comerciais e tenant switcher não foram implementados.

Confirmo que não foram criados tenant default, fallback, `is_default`,
`is_owner` novos ou seleção automática — as colunas legadas `is_default`
e `is_owner` foram apenas preservadas, sem uso runtime.

Confirmo que a próxima etapa recomendada é apenas
**F3.2 — Server-Side Tenant Selection**, sujeita a prompt próprio,
relatório próprio e auditoria externa.
