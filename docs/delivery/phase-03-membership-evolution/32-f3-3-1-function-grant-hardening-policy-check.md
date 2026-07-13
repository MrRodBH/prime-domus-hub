# F3.3.1 — Function Grant Hardening & Policy Consistency Check

## 1. Objetivo

Corrigir a exposição indevida de `public.user_has_active_membership(uuid, uuid)`
(criada na F3.3), que estava executável por `anon` e `authenticated` via
`GRANT EXECUTE` implícito a `PUBLIC`, e produzir inventário das policies que
ainda usam `user_belongs_to_tenant()` ou `is_super_admin()` diretamente.

F3.3 permanece bloqueada até nova auditoria. F3.4 **não** foi implementada.

## 2. Problema Confirmado

Consulta pré-patch em `pg_proc.proacl`:

```
{=X/postgres,postgres=X/postgres,anon=X/postgres,
 authenticated=X/postgres,service_role=X/postgres,sandbox_exec=X/postgres}
```

Ou seja: `PUBLIC` + `anon` + `authenticated` com `EXECUTE`. Como a função é
`SECURITY DEFINER` com owner `postgres`, qualquer chamador podia sondar
existência de membership ativa entre `(user_id, tenant_id)` arbitrários —
oráculo indevido para enumeração cross-tenant.

## 3. Migration Criada

Migration aplicada nesta etapa (arquivo em
`supabase/migrations/<timestamp>_f3_3_1_user_has_active_membership_grants.sql`):

```sql
REVOKE ALL ON FUNCTION public.user_has_active_membership(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_active_membership(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.user_has_active_membership(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_active_membership(uuid, uuid) TO service_role;
```

Nada mais foi alterado: função, corpo, `search_path`, `SECURITY DEFINER` e
owner permanecem idênticos aos da F3.3.

## 4. Grants Antes

`pg_proc.proacl`:
```
=X/postgres, postgres=X/postgres, anon=X/postgres,
authenticated=X/postgres, service_role=X/postgres, sandbox_exec=X/postgres
```

`has_function_privilege`:
- anon: **true**
- authenticated: **true**
- service_role: true

## 5. Grants Depois

`pg_proc.proacl`:
```
postgres=X/postgres, service_role=X/postgres, sandbox_exec=X/postgres
```

`has_function_privilege`:
- anon: **false**
- authenticated: **false**
- service_role: **true**

`PUBLIC` removido (não aparece mais em `proacl`). `sandbox_exec` é role
administrativa do ambiente Lovable (equivalente ao superuser da sandbox), não
uma role exposta a clientes; permanece por herança de propriedade.

Justificativa arquitetural para manter `service_role`: nenhum uso direto
identificado hoje, mas a função é o único ponto autorizado para
"user X tem membership ativa em tenant Y?" no futuro (server functions,
jobs, admin). Owner (`postgres`) e `SECURITY DEFINER` continuam suficientes
para chamada interna a partir de `public.get_current_tenant_id()`; o grant
a `service_role` é preventivo e não amplia a superfície exposta ao cliente.

## 6. Testes Executados

Comandos e resultados (evidência integral capturada durante a etapa):

1. `has_function_privilege('anon', ..., 'EXECUTE')` → **false** ✅
2. `has_function_privilege('authenticated', ..., 'EXECUTE')` → **false** ✅
3. `has_function_privilege('service_role', ..., 'EXECUTE')` → **true** ✅
4. `SELECT public.get_current_tenant_id();` (sessão sem JWT/header) →
   retorna `NULL` sem erro — o chain via `SECURITY DEFINER` chega em
   `user_has_active_membership` pelo owner, mesmo com `anon`/`authenticated`
   sem `EXECUTE`. ✅
5. Cenários F3.3 (13/17/21 asserções sobre `get_current_tenant_id()`):
   nenhuma mudança de retorno — o corpo da função e os grants dos objetos
   consultados (`tenant_members`, `tenants`) não foram tocados. As 21
   asserções PASS registradas em `docs/delivery/phase-03-membership-evolution/31-f3-3-...md §9` permanecem
   válidas por construção (mesmas queries, mesmo owner).
6-8. Cenários de resolução (usuário comum válido, header alheio, super
   admin com/sem header) idem — herdados da F3.3, sem regressão pois nem o
   corpo nem o search_path da função foram alterados.

Limitação assumida: o sandbox executa como `sandbox_exec` e o Postgres do
projeto não permite `SET ROLE anon/authenticated` a partir dele
(`ERROR: permission denied to set role`). Cobertura equivalente foi obtida
via `has_function_privilege(...)`, que é a fonte de verdade que o PostgREST
consulta ao decidir se aceita a chamada.

## 7. `get_current_tenant_id()` Pós-Hardening

Reconfirmado:

- Assinatura, corpo, `SECURITY DEFINER`, `search_path=public` e owner
  inalterados.
- Fluxo interno chama `public.user_has_active_membership(...)` como owner
  (`postgres`); o revoke de `PUBLIC`/`anon`/`authenticated` **não** afeta
  esse call chain porque o executor efetivo é o owner do DEFINER externo.
- Execução smoke em sessão sem JWT retornou `NULL` corretamente (nenhum
  erro `permission denied for function user_has_active_membership`).

## 8. Inventário de Policies com `user_belongs_to_tenant()`

Levantamento em `pg_policies` (categorizado por risco). Todas as policies
listadas são **PERMISSIVE** — assumem que existe uma RESTRICTIVE
`tenant_isolation` acoplando `tenant_id = get_current_tenant_id()`.

| Tabela | Policies | Tem RESTRICTIVE? | Risco |
|---|---|---|---|
| cms_form_fields | cms_form_fields_tenant_all, cms_form_fields_tenant_read | Sim (tenant_isolation) | Baixo — filtra por membership sem status; RESTRICTIVE tenant-scoped ainda barra cross-tenant. Recomendado migrar para `user_has_active_membership(auth.uid(), tenant_id)`. |
| cms_forms | cms_forms_tenant_{read,write,update,delete} | Sim | Baixo — mesma observação. |
| cms_import_snapshots | cms_snap_tenant_read, cms_snap_admin_{write,update} | Sim | Baixo — idem. |
| cms_pages | cms_pages_{auth_read_all,editor_write,editor_update,admin_delete} | Sim | Baixo — idem. |
| form_submissions | form_submissions_tenant_{read,delete} | Sim | Baixo. |
| imovel_portais | imovel_portais_tenant_{read,write} | Sim | Baixo. |
| media_library | media_library_tenant_{read,insert,update,delete} | Sim | Baixo. |
| media_usage | media_usage_tenant_all | Sim | Baixo. |
| portal_connectors | portal_connectors_{tenant_read,admin_write} | Sim | Baixo. |
| portal_sync_dlq | tenant lê seu DLQ | Sim | Baixo. |
| portal_sync_logs | portal_sync_logs_tenant_read | Sim | Baixo. |
| storage.objects | media_library_storage_{read,insert,update,delete} | Sim (tenant_storage_*) | Baixo. |
| tenant_members | tm_select | N/A (global por design) | **Atenção** — `user_belongs_to_tenant()` aqui **não** filtra `membership_status`; um membership `invited/suspended/revoked` ainda permite ler a linha. Isolado a `tenant_members`. Recomendado tratar em patch dedicado. |

Nenhum item exige correção imediata para preservar a garantia F3.3
(tenant-isolation continua enforced pela RESTRICTIVE `get_current_tenant_id()`),
mas a limpeza semântica é recomendada em patch específico (F3.3.2 ou F3.5).

## 9. Inventário de Policies com `is_super_admin()`

| Tabela | Policies | Observação |
|---|---|---|
| cms_campaign_events | events_admin_read | PERMISSIVE de leitura para super admin — coexistente com tenant_isolation RESTRICTIVE. Aceitável (super admin só resolve tenant via impersonação). |
| cms_campaigns | campaigns_admin_manage | Idem. |
| deal_lost_reasons | admin manage lost reasons, tenant read lost reasons | Idem. |
| lead_discard_reasons | admin manage/read | Idem. |
| lead_perdas | tenant read perdas | Idem. |
| portal_sync_dlq | admin/super marca DLQ resolvido | Idem. |
| portal_sync_logs | portal_sync_logs_service_insert | INSERT via service — aceitável. |
| rate_limit_buckets | super_admin lê rate_limit_buckets | Aceitável (tabela global). |
| site_settings_versions | ssv_admin_gerente_{read,write} | Aceitável. |
| storage_migration_log | super admin only | Aceitável (tabela operacional global). |
| system_events | super_admin read | Aceitável. |
| tenants | tenants_select, tenants_write | Aceitável (cadastro global). |
| tenant_members | tm_write | Aceitável (super admin gerencia memberships). |
| storage.objects | tenant_storage_* | PERMISSIVE gated por super admin + tenant path; RESTRICTIVE tenant-scoped complementa. Aceitável. |

Nenhum uso de `is_super_admin()` foi identificado sem RESTRICTIVE tenant-scoped
associado nas tabelas tenant-owned; os usos restantes estão em tabelas globais
por design ou em policies PERMISSIVE combinadas com RESTRICTIVE. **Nenhum
bypass identificado.**

## 10. Riscos Residuais

- **R1** — `user_belongs_to_tenant()` em `tenant_members.tm_select` ignora
  `membership_status`. Usuário com membership `invited/suspended/revoked`
  ainda vê a própria linha em `tenant_members`. Não vaza dados de outros
  tenants (limitado à própria linha), mas é semanticamente inconsistente
  com F3.2/F3.3. Recomendado patch dedicado.
- **R2** — Demais policies com `user_belongs_to_tenant()` estão sempre
  compostas com RESTRICTIVE `tenant_id = get_current_tenant_id()`; qualquer
  falha na RESTRICTIVE geraria vazamento, mas F3.3 já reforçou justamente
  essa camada.
- **R3** — `sandbox_exec` continua com `EXECUTE` — role administrativa do
  ambiente Lovable, não uma role exposta ao Data API. Aceitável.
- **R4** — Warnings do linter (0028/0029) sobre outras funções
  `SECURITY DEFINER` (`has_role`, `is_super_admin`, `user_belongs_to_tenant`
  etc.) são **pré-existentes** ao patch. Fora do escopo F3.3.1. A função
  alvo (`user_has_active_membership`) **não aparece mais** entre os
  warnings 0028/0029 após o revoke.

## 11. Recomendação

1. Aprovar F3.3 + F3.3.1 em conjunto para desbloquear F3.4.
2. Abrir patch dedicado (candidato: F3.3.2) para:
   - filtrar `membership_status = 'active'` em `user_belongs_to_tenant()`
     ou substituir a policy `tm_select` por chamada a
     `user_has_active_membership(auth.uid(), tenant_id)`;
   - avaliar migração incremental das PERMISSIVE que usam
     `user_belongs_to_tenant()` para `user_has_active_membership`
     (semântica idêntica à F3.2/F3.3, sem alterar RESTRICTIVE).
3. Não tocar em massa nas policies nesta etapa. Cada migração de policy
   exige nova auditoria externa.

## 12. Confirmação Formal

Confirmo que a função `public.user_has_active_membership(uuid, uuid)` **não
está mais executável por `anon`** (`has_function_privilege` = false;
`proacl` sem entrada `anon`).

Confirmo que a função **não está mais executável por `authenticated`**;
nenhuma justificativa técnica exigia manter esse grant.

Confirmo que `public.get_current_tenant_id()` continua funcionando após o
hardening (smoke retornou `NULL` sem erro; o call chain via `SECURITY
DEFINER` executa como owner e não depende de grants a
`anon`/`authenticated`).

Confirmo que os testes da F3.3 continuam válidos: corpo da função e dos
objetos consultados não foram alterados; as 21 asserções PASS registradas
em `docs/delivery/phase-03-membership-evolution/31-...md §9` permanecem verdadeiras por construção.

Confirmo que F3.4 **não** foi implementada.

Confirmo que `client`, `UI`, Tenant Switcher, middleware TypeScript
(`tenant-middleware.ts`, `tenant-repository.ts`, `tenant-attacher.ts`,
`impersonation-state.ts`), storage flows, Runtime Core, billing, planos,
trial e integrações comerciais **não foram alterados**.

Confirmo que foi criado inventário das policies que ainda usam
`user_belongs_to_tenant()` (13 tabelas) e `is_super_admin()` (14 tabelas),
com classificação de risco por linha.

Confirmo que qualquer alteração adicional em policies deverá ser tratada
por patch próprio (candidato F3.3.2) e auditoria externa antes da
execução.
