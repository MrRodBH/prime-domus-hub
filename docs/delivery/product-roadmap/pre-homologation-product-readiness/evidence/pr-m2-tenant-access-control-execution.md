# PR-M2 — Tenant Access Control Execution Evidence

## Status

```text
STAGE = PR-M2 — Functional Completion
INCREMENT = Tenant-scoped RBAC, Profile Assignment, Team Management & Legacy User Authority Cutover
EXECUTION_MODEL = ChatGPT GitHub-native
INITIAL_HEAD = d826340eb6e50813b158d243915a62faa4045f30
PULL_REQUEST = 60
PR_STATE = open / draft
MERGE_EXECUTED = false
LOVABLE_EXECUTED = false
```

## 1. Objetivo executado

Este incremento substitui a autoridade tenant-scoped baseada em `requireSupabaseAuth + has_role(admin)`, perfis globais e mutations diretas por um boundary único composto por:

- `requireTenant` como origem trusted de tenant e origin;
- owner ativo como autoridade raiz;
- Super Admin exclusivamente por impersonação explícita;
- delegação somente por `access_control:gerenciar:global`;
- perfis customizados vinculados a tenant;
- associações de perfil vinculadas a tenant;
- resolução fechada de scopes `global > equipe > proprio`;
- equipes e membros de equipes tenant-scoped;
- mutations transacionais service-role-only;
- auditoria dentro da mesma transação;
- diretório profissional separado do lifecycle de autenticação e membership.

## 2. Schema antes

```text
rbac_modules = global catalog
rbac_profiles.tenant_id = absent
rbac_permissions = profile-scoped
user_profiles.tenant_id = absent
user_roles = global app role table and legacy profile sync source
teams.tenant_id = present
team_members.tenant_id = present
audit_log.tenant_id = present
```

Riscos vigentes antes do incremento:

- perfil customizado global reutilizável entre tenants;
- associação de usuário sem tenant explícito;
- fallback de leitura em `meusModulos`;
- `has_role(admin)` usado como autoridade tenant-scoped;
- mutations diretas de perfis, permissões, associações e equipes;
- trigger global `user_roles → user_profiles` incompatível com tenant authority;
- fluxo ativo de criação de Auth user e senha pelo Tenant Admin;
- exclusão de corretor removendo `user_roles` e usuário Auth;
- equipes lidas e alteradas sem filtro explícito de tenant.

## 3. Schema proposto depois da migration

```text
rbac_modules = immutable global catalog
rbac_profiles.system_template = sistema=true / tenant_id=null
rbac_profiles.tenant_profile = sistema=false / tenant_id=explicit
user_profiles = tenant_id + user_id + profile_id
scope_precedence = global > equipe > proprio
teams = tenant-scoped
team_members = tenant-scoped
user_roles = global-only; not tenant authority
direct anon/authenticated RBAC access = denied
service_role boundary = allowed
```

A migration é fail-closed:

- associação legada sem exatamente um tenant não revogado aborta;
- perfil customizado sem tenant consumidor aborta;
- perfis customizados reutilizados são clonados deterministicamente por tenant;
- permissões são copiadas para cada clone;
- associações são remapeadas;
- duplicidades exatas são eliminadas antes do índice tenant-aware;
- triggers de `user_roles` que escrevem ou leem perfis são removidos por inspeção estrutural;
- migrations históricas não são alteradas.

## 4. Primitives transacionais

```text
resolve_tenant_permission
assert_tenant_access_manager
mutate_tenant_access_profile
set_tenant_profile_permission
set_tenant_member_profiles
mutate_tenant_team
```

Contratos:

- `SECURITY DEFINER`;
- `SET search_path = public, pg_temp`;
- `REVOKE ALL` de `PUBLIC`, `anon` e `authenticated`;
- `GRANT EXECUTE` somente para `service_role`;
- lock determinístico do tenant antes das mutations;
- actor, tenant, origin e membership revalidados no banco;
- cross-tenant negado;
- owner protegido;
- privilege escalation negada;
- audit log persistido na mesma transação;
- DTO JSON fechado.

## 5. Runtime e interface

Arquivos canônicos adicionados:

```text
src/lib/api/tenant-access-control-authority.server.ts
src/lib/api/tenant-access-control.functions.ts
src/lib/api/tenant-broker-directory.functions.ts
```

`src/lib/api/tenant-broker-directory.functions.ts` é uma extensão necessária do `FILES_ALLOWED`: o cutover somente seria real se `adminSalvarCorretor` e `adminExcluirCorretor` deixassem de criar/remover Auth users, senhas, roles e memberships. O novo módulo preserva o diretório profissional como domínio independente e tenant-scoped.

Superfícies migradas:

```text
/admin/perfis
/admin/equipes
/admin/memberships
/admin/corretores
/admin/auditoria
```

O fluxo ativo final é:

```text
new tenant member → inviteTenantMember
membership role/status → tenant lifecycle boundary
permission bundles → tenant access control boundary
broker/corretor data → tenant broker directory
team membership → tenant access control boundary
```

Não existe mais criação de senha administrativa na UI ativa.

## 6. Evidência e limites

```text
PROVED_BY_REPOSITORY = schema contract, RPC definitions, wrappers, UI cutover, legacy active-path retirement
PROVED_BY_DETERMINISTIC_TEST = structural invariants, ACL declarations, no direct mutations, no password flow, cross-tenant guards
PROVED_BY_GITHUB_ACTIONS = pending exact-head Release Gate
NOT_EXECUTED_AGAINST_MANAGED_LIVE_BACKEND = migration, backfill counts, live RLS/grant behavior, live RPC behavior
```

A migration não foi aplicada ao backend gerenciado nesta execução. Portanto:

```text
BACKFILL_COUNTS = not executed against managed live backend
ORPHAN_COUNTS = not executed against managed live backend
LIVE_CROSS_TENANT_NEGATIVE_RESULTS = not executed against managed live backend
```

A aplicação futura deverá ocorrer somente no estágio autorizado de banco/homologação, preservando Same-Backend Homologation Cell.

## 7. Estado do roadmap

```text
PR-M2 = in progress in PR #60
CURRENT_INCREMENT = Tenant Access Control
NEXT_PRM2_INCREMENT = Configuration Center & White Label Functional Completion
DCA-01 = required after PR-M2
BCA-01 = required after DCA-01
PR-M3 = blocked by BCA-01
```

O incremento não inicia DCA-01, BCA-01, PR-M3, homologação ou produção.
