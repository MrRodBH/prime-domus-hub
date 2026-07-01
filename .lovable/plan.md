
# Fase 1 — Fundação Multi-Tenant

Objetivo: transformar a base single-tenant atual (RM Prime) numa fundação SaaS multi-tenant limpa, com isolamento total de dados via `tenant_id` + RLS + Storage por tenant. Nenhum módulo novo (CMS/CRM/Portais/IA) será tocado nesta fase — apenas a fundação.

Ambiente é dev/homologação, então a estratégia é **recriar limpo** ao invés de migrar preservando dados.

---

## 1. Novas estruturas

### 1.1 Tabela `tenants`
Campos de domínio: `slug` (único, ex: `rm-prime`), `nome`, `status` (`ativo|suspenso|cancelado|trial`), `dominio_principal` (nullable), `plano_codigo` (nullable, para Fase 3), `owner_user_id` (nullable), `metadata jsonb`.

RLS: leitura restrita a membros do tenant + super_admin; escrita apenas super_admin.

### 1.2 Tabela `tenant_members`
Vincula `user_id` ↔ `tenant_id` (many-to-many, um usuário pode pertencer a mais de um tenant no futuro). Campos: `tenant_id`, `user_id`, `is_owner boolean`, `joined_at`. PK composta.

### 1.3 Enum `app_role` recebe novo valor `super_admin`
`super_admin` = operador da plataforma SaaS (nós). Não pertence a nenhum tenant, enxerga tudo.

### 1.4 Funções auxiliares (SECURITY DEFINER)
- `get_current_tenant_id()` → resolve o tenant do usuário atual. Estratégia:
  1. Se `super_admin` e header/JWT claim `x-tenant-id` presente → usa esse (impersonação — implementado na Fase 2, mas função já suporta).
  2. Caso contrário, retorna o único `tenant_id` de `tenant_members` para `auth.uid()`.
  3. Se usuário pertence a múltiplos, retorna o marcado como default (coluna `is_default` em `tenant_members`) ou o primeiro.
- `is_super_admin()` → wrapper sobre `has_role(auth.uid(), 'super_admin')`.
- `user_belongs_to_tenant(_tenant uuid)` → boolean.

---

## 2. Refatoração das tabelas existentes

**Todas as tabelas de domínio recebem `tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`** e todas as RLS são reescritas para filtrar por `tenant_id = get_current_tenant_id() OR is_super_admin()`.

Tabelas afetadas (todas as `public.*` de negócio):
- `corretores`, `user_roles`, `user_profiles`, `rbac_profiles`, `rbac_permissions`, `rbac_modules` (modules ficam globais, permissions/profiles por tenant), `teams`, `team_members`
- `imoveis`, `imovel_imagens`, `cidades`, `bairros`
- `launch_projects`, `launch_units`, `launch_amenities`, `launch_project_amenities`, `launch_project_imagens`, `launch_payment_conditions`, `launch_pdfs`, `launch_statuses`
- `leads`, `lead_atividades`, `lead_descartes`, `lead_origens`
- `blog_posts`, `blog_categorias`
- `instagram_posts`
- `site_settings` (vira 1 linha por tenant)
- `audit_log`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`

Tabelas **globais** (sem `tenant_id`):
- `tenants`, `tenant_members`
- `rbac_modules` (catálogo de módulos do sistema é global)
- Filas `pgmq.*`, `cron.*`, `email_queue_*`

RBAC: `rbac_profiles` e `rbac_permissions` passam a ter `tenant_id` — cada tenant define seus próprios perfis. Os perfis-sistema (`admin`, `corretor`, `secretaria`, `gerente`, `captador`) serão criados **por tenant** via seed automático ao criar o tenant.

---

## 3. Storage multi-tenant

Buckets atuais: `imoveis`, `site`, `lancamentos` (todos privados).

Estratégia: manter os 3 buckets, mudar a **convenção de path** para prefixo `{tenant_id}/...`:
- `imoveis/{tenant_id}/{imovel_id}/{arquivo}`
- `site/{tenant_id}/{arquivo}`
- `lancamentos/{tenant_id}/{launch_id}/{arquivo}`

Policies de Storage: `(storage.foldername(name))[1]::uuid = get_current_tenant_id() OR is_super_admin()`.

Arquivos existentes serão descartados (ambiente dev).

---

## 4. Seed inicial — RM Prime como "tenant 1"

Migração final:
1. Cria `tenants` com `slug='rm-prime'`, `nome='RM Prime Imóveis'`, `status='ativo'`, `dominio_principal='rmprimeimoveis.com.br'`.
2. Cria `tenant_members` para todos os usuários existentes em `auth.users` apontando para esse tenant, `is_owner=true` para `rodolfovaz882@gmail.com`.
3. Concede `super_admin` a `rodolfovaz882@gmail.com` (além de `admin` do tenant).
4. Copia catálogo global de `rbac_modules` como está.
5. Cria os 5 perfis-sistema do RM Prime em `rbac_profiles` com as permissões atuais.

Como não há dados reais a preservar, **todas as tabelas de negócio são truncadas** antes da adição do `tenant_id NOT NULL`. Isso evita backfill frágil.

---

## 5. Camada de código (`src/lib/api/*.functions.ts`)

- Nova função `getCurrentTenantId()` em `src/lib/tenant.server.ts` que chama a RPC `get_current_tenant_id()` via `context.supabase`.
- Middleware `requireTenant` que compõe com `requireSupabaseAuth` e injeta `tenantId` no contexto.
- Todas as server functions de negócio passam a usar `requireTenant`. Inserts recebem `tenant_id: context.tenantId` automaticamente.
- Rotas públicas SSR (`/`, `/imoveis`, `/imovel/$slug`, `/lancamentos`, `/blog`, etc.) resolvem o tenant por **domínio** (Host header):
  - Novo helper `resolveTenantByHost(host)` — consulta `tenants.dominio_principal` e `domains` (tabela criada na Fase 5, por enquanto só `tenants.dominio_principal`).
  - Fallback: `rm-prime` se host = `*.lovable.app` ou localhost.
- Cliente server publishable passa `x-tenant-id` como header no request para que RLS público funcione — implementado via helper `publicSupabaseForTenant(tenantId)`.

---

## 6. Rotas admin

Sem mudança visível nesta fase — o usuário admin do RM Prime continua vendo apenas os dados do RM Prime porque `get_current_tenant_id()` resolve para ele automaticamente. Super Admin UI e switcher entram só na Fase 2.

---

## 7. Ordem de execução (migrações separadas)

Todas via `supabase--migration`, aprovadas uma por uma:

1. **M1** — Criar `tenants`, `tenant_members`, enum `super_admin`, funções `get_current_tenant_id`, `is_super_admin`, `user_belongs_to_tenant`. GRANTs. Inserir tenant `rm-prime` e vincular usuários existentes. Conceder `super_admin` ao owner.
2. **M2** — Truncar tabelas de negócio, adicionar `tenant_id NOT NULL` em todas, dropar policies antigas, criar policies novas por tenant, índices em `(tenant_id, ...)`.
3. **M3** — Storage: dropar policies antigas dos buckets, criar policies novas com prefixo `{tenant_id}/`.
4. **M4** — Seed dos 5 perfis-sistema e permissões para o tenant `rm-prime`.

## 8. Refactor de código (após M1–M4 aprovadas)

- Criar `src/lib/tenant.server.ts` (`getCurrentTenantId`, `requireTenant` middleware, `resolveTenantByHost`, `publicSupabaseForTenant`).
- Adicionar `tenant_id` em todos os `insert(...)` e filtros implícitos (RLS já filtra, mas mantemos código explícito onde crítico).
- Ajustar upload paths de Storage nos formulários e server fns para incluir `{tenant_id}/`.
- Ajustar SSR loaders públicos para receber o `Host` header e resolver tenant.
- Nenhuma UI nova.

## 9. Fora do escopo desta Fase

- Super Admin UI, tenant switcher, impersonação → Fase 2
- Planos, limites, feature flags → Fase 3
- Onboarding automático, webhook Hotmart → Fase 4
- Tabela `domains`, validação DNS → Fase 5
- Auditoria expandida, LGPD, observabilidade → Fase 6

---

## Riscos e mitigações

- **Reset destrutivo**: confirmado pelo usuário (ambiente dev). Cada migração `TRUNCATE` será executada apenas após aprovação explícita.
- **RLS recursiva**: todas as checagens usam funções `SECURITY DEFINER` (`get_current_tenant_id`, `is_super_admin`), evitando loops.
- **SSR sem tenant**: `resolveTenantByHost` sempre retorna um tenant (fallback `rm-prime` em preview/dev), garantindo que build/prerender não quebre.
- **Bearer sem tenant claim**: `get_current_tenant_id()` deriva do `tenant_members` do `auth.uid()`, não depende de claim JWT — funciona no fluxo atual sem mudar Auth.

---

## Próximo passo

Aprovar este plano. Em seguida disparo a **Migração M1** (tenants + funções + seed RM Prime) e aguardo aprovação antes de M2.
