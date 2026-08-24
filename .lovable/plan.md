# Execução sequencial: Fase 2 → M2b → M3

## Fase 2 — Middleware de resolução de tenant + Super Admin

### 2.1 Helpers server-side
Criar `src/lib/tenant.server.ts`:
- `resolveTenantByHost(host: string)` — consulta `tenants.dominio_principal` (fallback: RM Prime para `*.lovable.app`, `localhost`, previews).
- `getCurrentTenantIdFromContext(supabase)` — chama RPC `get_current_tenant_id()`.
- `publicSupabaseForTenant(tenantId)` — cria client publishable com header `x-tenant-id: {tenantId}` para SSR de rotas públicas.

### 2.2 Middleware `requireTenant`
Criar em `src/integrations/supabase/tenant-middleware.ts`:
- Compõe com `requireSupabaseAuth`.
- Injeta `tenantId` no context lendo do `tenant_members` do `userId`.
- Se `super_admin` + header `x-tenant-id` presente → usa esse (impersonação).

### 2.3 Client bearer + tenant header
Atualizar `src/integrations/supabase/auth-attacher.ts` (ou middleware local) para anexar header `x-tenant-id` quando super_admin estiver impersonando (lido de `localStorage.impersonate_tenant_id`).

### 2.4 Super Admin UI
Nova rota `src/routes/_authenticated.super.tsx` (layout) + índice:
- `/super` — dashboard com lista de tenants (nome, slug, status, domínio, plano, #usuários, #imóveis, #leads).
- `/super/tenants/novo` — form: nome, slug, dominio_principal, owner_email (opcional).
- `/super/tenants/$id` — detalhes + editar status (ativo/suspenso/cancelado/trial), plano, domínio.
- Botão "Impersonar" → grava `localStorage.impersonate_tenant_id` e redireciona para `/admin`.
- Badge no header quando impersonando + botão "Sair da impersonação".

Server functions em `src/lib/api/super.functions.ts`:
- `listarTenants()`, `criarTenant()`, `atualizarTenant()`, `estatisticasTenant(id)`.
- Todas com `requireSupabaseAuth` + check `is_super_admin()`.

Guard: `beforeLoad` de `/super` chama `meuAcessoSuperAdmin()` server fn.

### 2.5 Sidebar
Adicionar item "Super Admin" no `AdminShell` visível só quando `is_super_admin=true`.

### 2.6 Testes (Playwright)
- Login como `rodolfovaz882@gmail.com` → ver item "Super Admin".
- `/super` lista o tenant RM Prime.
- Rotas públicas continuam abrindo (fallback funciona).

---

## M2b — Policies restritivas por tenant

Migration adicionando policies `RESTRICTIVE` em **todas** as tabelas de negócio com `tenant_id`:
```sql
CREATE POLICY tenant_isolation ON public.<tabela>
AS RESTRICTIVE FOR ALL TO authenticated, anon
USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());
```

Tabelas: `leads, lead_atividades, lead_descartes, lead_origens, imoveis, imovel_imagens, launch_projects, launch_units, launch_amenities, launch_project_amenities, launch_project_imagens, launch_payment_conditions, launch_pdfs, launch_statuses, corretores, teams, team_members, blog_posts, blog_categorias, cidades, bairros, instagram_posts, audit_log, site_settings`.

RESTRICTIVE compõe (AND) com as policies existentes — isolamento por tenant é obrigatório, sem quebrar RLS de negócio.

Testes: acessar `/admin/leads`, `/admin/imoveis`, home pública — tudo continua listando RM Prime normalmente.

---

## M3 — Storage por tenant

Migration:
1. Drop policies antigas dos buckets `imoveis`, `site`, `lancamentos`.
2. Novas policies exigindo `(storage.foldername(name))[1]::uuid = get_current_tenant_id() OR is_super_admin()`.
3. Mover arquivos existentes: renomear `imoveis/{x}/...` → `imoveis/{RM_TENANT}/{x}/...` via SQL de storage (batch UPDATE em `storage.objects.name`).
4. Atualizar refs em BD: `imovel_imagens.storage_path`, `site_settings.branding.*_url`, `launch_project_imagens.storage_path`, `launch_pdfs.storage_path` — prefixar com `{RM_TENANT}/` onde ainda não estiver.

Código:
- `src/lib/property-images.ts`, `LancamentoForm`, `GaleriaLancamento`, `PdfsLancamento`, upload de site — prefixar uploads novos com `${tenantId}/`.
- Ler `tenantId` do context/loader.

Testes: upload de nova imagem em imóvel, visualização pública, edição de branding.

---

## Ordem de execução

1. Fase 2 (código + migração leve se precisar de índice) → build → testes → resumo.
2. M2b (migração) → aprovação → build → testes → resumo.
3. M3 (migração + rename storage + refactor código) → aprovação → build → testes → resumo.

Confirmação: se aprovar este plano, disparo Fase 2 agora, aguardo build/testes, depois M2b como migração separada, depois M3 como migração + refactor.
