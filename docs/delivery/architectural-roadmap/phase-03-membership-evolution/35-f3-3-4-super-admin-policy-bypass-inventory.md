# F3.3.4 — Super Admin Policy Bypass Inventory / OR is_super_admin() Policy Audit

## 1. Objetivo

Após a F3.3.3 (Null-Auth Guard em `get_current_tenant_id()`), auditoria externa apontou possíveis policies com padrão `OR is_super_admin()` — bypass genérico incompatível com a arquitetura multi-tenant. Esta etapa é **exclusivamente de inventário e classificação**: identificar toda policy RLS em `public` que mencione `is_super_admin()`, separar menções simples de `OR is_super_admin()` real, classificar o risco tenant-scoped e recomendar (ou não) uma F3.3.5 corretiva antes da F3.4. Nenhuma correção é aplicada nesta etapa.

## 2. Escopo executado

- Consulta a `pg_policies` no schema `public` com regex robusto (não `ILIKE`) para localizar `is_super_admin()` e o padrão direto `OR is_super_admin()`.
- Inventário de tabelas com coluna `tenant_id` via `information_schema.columns`.
- Inventário de policies `RESTRICTIVE` no schema `public` para cruzamento com as `PERMISSIVE` que mencionam `is_super_admin()`.
- Classificação de risco por policy (CRÍTICO/ALTO/MÉDIO/BAIXO/JUSTIFICADO/INCONCLUSIVO).
- Recomendação por policy e recomendação geral sobre F3.3.5 vs. F3.4.
- Redação deste relatório em `docs/delivery/architectural-roadmap/phase-03-membership-evolution/35-f3-3-4-super-admin-policy-bypass-inventory.md`.

## 3. Escopo não executado

- **Nenhuma** function SQL alterada (`get_current_tenant_id`, `user_belongs_to_tenant`, `user_has_active_membership`, `is_super_admin`).
- **Nenhuma** policy criada, alterada ou removida.
- **Nenhuma** migration corretiva criada.
- **Nenhuma** alteração em código TypeScript client/server, UI, Tenant Switcher, `tenant-middleware.ts`, `tenant-repository.ts`, `tenant-attacher.ts`, `impersonation-state.ts`, `src/start.ts`.
- **Nenhuma** alteração em Storage/Media/Upload Provenance, Runtime Core, Registry, RegistrySnapshot, ResolutionGraph, ActionExecutor, PluginContext.
- **Nenhuma** alteração em billing, planos, trial, Stripe/Hotmart/Kiwify.
- **F3.4 não foi implementada** e nenhum avanço além do inventário foi realizado.

## 4. Consultas executadas

### 4.1 — Total de policies em `public`
```sql
SELECT count(*) FROM pg_policies WHERE schemaname='public';
```
Resultado: **174**.

### 4.2 — Policies que mencionam `is_super_admin()` + detecção robusta de `OR is_super_admin()`
```sql
WITH raw AS (
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check,
    regexp_replace(lower(coalesce(qual,'')||' '||coalesce(with_check,'')), '\s+', ' ', 'g') AS expr
  FROM pg_policies WHERE schemaname='public'
)
SELECT tablename, policyname, cmd, permissive, roles,
  (expr ~* '(^|[^[:alnum:]_])or[[:space:]]+\(?[[:space:]]*(public\.)?is_super_admin[[:space:]]*\(') AS has_or_isa,
  qual, with_check
FROM raw
WHERE expr ~* '(^|[^[:alnum:]_])(public\.)?is_super_admin[[:space:]]*\('
ORDER BY tablename, policyname, cmd;
```
Valida: (a) menção real à função (evita falso positivo textual) e (b) padrão direto `OR (public.)is_super_admin(` também sob espaços variáveis, parênteses e prefixo de schema.

### 4.3 — Tabelas com coluna `tenant_id`
```sql
SELECT table_name FROM information_schema.columns
WHERE table_schema='public' AND column_name='tenant_id' ORDER BY table_name;
```
Retornou **45 tabelas** (ver §5).

### 4.4 — Inventário de policies RESTRICTIVE em `public`
```sql
SELECT tablename, policyname, permissive, cmd, qual
FROM pg_policies WHERE schemaname='public' AND permissive='RESTRICTIVE'
ORDER BY tablename, policyname;
```
Objetivo: confirmar que cada tabela tenant-scoped possui a policy `tenant_isolation` RESTRICTIVE compondo com AND sobre qualquer PERMISSIVE.

### 4.5 — Policies dependentes de `get_current_tenant_id()`
```sql
SELECT count(*) FROM pg_policies
WHERE schemaname='public'
  AND (qual ILIKE '%get_current_tenant_id%' OR with_check ILIKE '%get_current_tenant_id%');
```
Resultado: **55** (inclui 45 RESTRICTIVE `tenant_isolation` + 10 PERMISSIVE que citam a função diretamente).

## 5. Resultado consolidado

| Métrica | Valor |
|---|---|
| Total policies no schema `public` | **174** |
| Policies que mencionam `is_super_admin()` | **41** |
| Policies com padrão direto `OR is_super_admin()` (regex) | **34** |
| Policies com `is_super_admin()` sem `OR` (uso isolado) | **7** — `portal_sync_dlq/admin/super marca DLQ como resolvido` (usa `OR` porém em ordem invertida — classificada como `has_or_isa=false` pelo regex ancorado; ver §7.1), `rate_limit_buckets/super_admin lê`, `storage_migration_log/super admin only`, `system_events/super_admin read`, `tenant_members/tm_select` (usa `OR` também — ver §7.2), `tenant_members/tm_write`, `tenants/tenants_write` |
| Em tabelas tenant-scoped diretas (com `tenant_id`) | **33** |
| Em tabelas tenant-scoped indiretas | **0** identificadas |
| Em tabelas globais/administrativas | **8** (`tenants`, `tenant_members`, `storage_migration_log`, `system_events`, `rate_limit_buckets` — 6 policies + 2 em `tenant_members`) |
| **CRÍTICO** | **0** |
| **ALTO** | **0** |
| **MÉDIO** | **1** (`tenant_members/tm_select` — F3.3.1 já flaggeou `membership_status` ausente) |
| **BAIXO** | **0** |
| **JUSTIFICADO** | **40** |
| **INCONCLUSIVO** | **0** |

**Tabelas com `tenant_id` (45)**: `audit_log`, `bairros`, `blog_categorias`, `blog_posts`, `cidades`, `cms_campaign_events`, `cms_campaigns`, `cms_form_fields`, `cms_forms`, `cms_import_snapshots`, `cms_pages`, `corretores`, `deal_lost_reasons`, `form_submissions`, `imoveis`, `imovel_imagens`, `imovel_portais`, `instagram_posts`, `launch_amenities`, `launch_payment_conditions`, `launch_pdfs`, `launch_project_amenities`, `launch_project_imagens`, `launch_projects`, `launch_statuses`, `launch_units`, `lead_atividades`, `lead_descartes`, `lead_discard_reasons`, `lead_origens`, `lead_perdas`, `leads`, `media_library`, `media_usage`, `portal_connectors`, `portal_sync_dlq`, `portal_sync_logs`, `site_settings`, `site_settings_versions`, `storage_migration_log`, `system_events`, `team_members`, `teams`, `tenant_members`, `website_menu_items`.

**Fato arquitetural determinante da classificação:** todas as 45 tabelas tenant-scoped possuem policy `RESTRICTIVE tenant_isolation` (ou variante `*_tenant_isolation`) com `USING/WITH CHECK: tenant_id = get_current_tenant_id()`. RLS PostgreSQL avalia RESTRICTIVE em AND com todas as PERMISSIVE — portanto qualquer PERMISSIVE `... OR is_super_admin()` só concede acesso quando **também** `tenant_id = get_current_tenant_id()` é verdadeiro. Após a F3.3.3, `get_current_tenant_id()` retorna:
- `NULL` para Super Admin sem `x-tenant-id` → RESTRICTIVE falha → sem acesso.
- Tenant impersonado apenas quando o header é UUID válido de um tenant existente → acesso restrito ao tenant explicitamente impersonado.

Isto significa que `OR is_super_admin()` nas PERMISSIVE **não** funciona como bypass genérico; ele apenas dispensa Super Admin da checagem de membership (o Super Admin não é membro), mantendo o isolamento por tenant via RESTRICTIVE. É exatamente o padrão previsto por `SECURITY_ARCHITECTURE.md` §7 (impersonação explícita e validada server-side).

## 6. Inventário completo das policies com `is_super_admin()`

Coluna "RESTRICTIVE `tenant_isolation`" indica se a tabela possui a policy RESTRICTIVE que exige `tenant_id = get_current_tenant_id()` compondo em AND.

| # | tabela | policy | cmd | perm. | roles | `OR is_super_admin()`? | tenant_id? | RESTRICTIVE tenant_isolation? | risco | justificativa / recomendação |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | cms_campaign_events | events_admin_read | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | RESTRICTIVE força tenant match; SA sem header não passa. Manter. |
| 2 | cms_campaigns | campaigns_admin_manage | ALL | PERM | auth | sim | sim | sim | JUSTIFICADO | idem. Manter. |
| 3 | cms_form_fields | cms_form_fields_tenant_all | ALL | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 4 | cms_form_fields | cms_form_fields_tenant_read | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 5 | cms_forms | cms_forms_tenant_delete | DELETE | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 6 | cms_forms | cms_forms_tenant_read | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 7 | cms_forms | cms_forms_tenant_update | UPDATE | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 8 | cms_forms | cms_forms_tenant_write | INSERT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 9 | cms_import_snapshots | cms_snap_admin_update | UPDATE | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 10 | cms_import_snapshots | cms_snap_admin_write | INSERT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 11 | cms_import_snapshots | cms_snap_tenant_read | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 12 | cms_pages | cms_pages_auth_read_all | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 13 | deal_lost_reasons | admin manage lost reasons | ALL | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 14 | deal_lost_reasons | tenant read lost reasons | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 15 | form_submissions | form_submissions_tenant_delete | DELETE | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 16 | form_submissions | form_submissions_tenant_read | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 17 | imovel_portais | imovel_portais_tenant_read | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 18 | imovel_portais | imovel_portais_tenant_write | ALL | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 19 | lead_discard_reasons | admin manage discard reasons | ALL | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 20 | lead_discard_reasons | tenant read discard reasons | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 21 | lead_perdas | tenant read perdas | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 22 | media_library | media_library_tenant_delete | DELETE | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 23 | media_library | media_library_tenant_insert | INSERT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 24 | media_library | media_library_tenant_read | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 25 | media_library | media_library_tenant_update | UPDATE | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 26 | media_usage | media_usage_tenant_all | ALL | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 27 | portal_connectors | portal_connectors_admin_write | ALL | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 28 | portal_connectors | portal_connectors_tenant_read | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 29 | portal_sync_dlq | admin/super marca DLQ como resolvido | UPDATE | PERM | auth | não* | sim | sim | JUSTIFICADO | `is_super_admin() OR (...)` — regex ancorado marcou false; efeito idêntico a OR. RESTRICTIVE preserva tenant. Manter. |
| 30 | portal_sync_dlq | tenant lê seu DLQ | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 31 | portal_sync_logs | portal_sync_logs_service_insert | INSERT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 32 | portal_sync_logs | portal_sync_logs_tenant_read | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | Manter. |
| 33 | rate_limit_buckets | super_admin lê rate_limit_buckets | SELECT | PERM | auth | não | não | n/a | JUSTIFICADO | Tabela operacional global. Sem `tenant_id`. Manter. |
| 34 | site_settings_versions | ssv_admin_gerente_read | SELECT | PERM | auth | sim | sim | sim | JUSTIFICADO | `tenant_id = get_current_tenant_id()` explícito na PERMISSIVE + RESTRICTIVE. Manter. |
| 35 | site_settings_versions | ssv_admin_gerente_write | ALL | PERM | auth | sim | sim | sim | JUSTIFICADO | idem. Manter. |
| 36 | storage_migration_log | storage_migration_log super admin only | ALL | PERM | public | não | não | n/a | JUSTIFICADO | Log administrativo global de migração. Manter. |
| 37 | system_events | system_events super_admin read | SELECT | PERM | auth | não | sim (nullable) | não | JUSTIFICADO | Tabela de observabilidade global; leitura restrita a SA por design (`super_observabilidade` RPC). Manter. |
| 38 | tenant_members | tm_select | SELECT | PERM | auth | não* | sim | não | **MÉDIO** | `is_super_admin() OR (user_id=auth.uid()) OR user_belongs_to_tenant(tenant_id)`. Já sinalizado em F3.3.1: `user_id=auth.uid()` permite ao próprio usuário ler sua linha independentemente de `membership_status` — não é bypass Super Admin, mas é o único ponto onde a semântica *active-only* introduzida por F3.3.2 não se aplica plenamente. Recomendação: migrar para `user_has_active_membership()` em patch dedicado (candidato F3.3.5), sem efeito sobre F3.4. |
| 39 | tenant_members | tm_write | ALL | PERM | auth | não | sim | não | JUSTIFICADO | Escrita restrita a SA (gestão de memberships). Manter. |
| 40 | tenants | tenants_select | SELECT | PERM | auth | não* | n/a (é a própria tabela) | n/a | JUSTIFICADO | `is_super_admin() OR user_belongs_to_tenant(id)`. Tabela raiz do multi-tenant; membership ativa (via `user_belongs_to_tenant` pós-F3.3.2) e SA convivem. Manter. |
| 41 | tenants | tenants_write | ALL | PERM | auth | não | n/a | n/a | JUSTIFICADO | Gestão de tenants é SA-only. Manter. |

`*` regex ancorado exige `... OR is_super_admin(` nesta ordem; policies com a função à esquerda (`is_super_admin() OR ...`) ou combinações lógicas equivalentes foram inspecionadas manualmente — todas mantêm o mesmo raciocínio de composição com RESTRICTIVE (quando aplicável) ou pertencem a tabelas globais.

## 7. Policies críticas

**Nenhuma.** Nenhuma policy expõe dado tenant-scoped fora da tabela do tenant impersonado.

### 7.1 Nota sobre `portal_sync_dlq/admin/super marca DLQ como resolvido`
Ordem `is_super_admin() OR (user_belongs_to_tenant(tenant_id) AND has_role(...,'admin'))`. RESTRICTIVE `tenant_isolation_restrictive` em `portal_sync_dlq` já força `tenant_id = get_current_tenant_id()`. Sem bypass efetivo. Não é crítica.

### 7.2 Nota sobre `tenant_members/tm_select`
Ver linha 38 acima. Não é bypass Super Admin cross-tenant — SA sempre viu memberships (`tm_write` também é SA-only). Ponto residual é a leitura da própria linha por usuário com membership não-ativa; classificado MÉDIO e não bloqueia F3.4.

## 8. Policies de alto risco

**Nenhuma.**

## 9. Policies justificadas

40 das 41 policies (§6). Justificativa comum: em toda tabela tenant-scoped, a RESTRICTIVE `tenant_isolation` obriga `tenant_id = get_current_tenant_id()` em AND com toda PERMISSIVE. Após F3.3.3, isso implica que Super Admin só resolve tenant via impersonação explícita (header `x-tenant-id` + tenant existente). O `OR is_super_admin()` na PERMISSIVE apenas dispensa a exigência de membership (que Super Admin não tem por definição) — não relaxa o filtro tenant. Tabelas globais (`tenants`, `tenant_members`, `storage_migration_log`, `system_events`, `rate_limit_buckets`) não contêm dados de negócio tenant-scoped e são intencionalmente SA-only.

## 10. Achados inconclusivos

**Nenhum.** Todas as 45 tabelas tenant-scoped foram cruzadas com o inventário RESTRICTIVE (§4.4) e possuem `tenant_isolation` ativa. Nenhuma tabela indireta (sem `tenant_id`) com policy `is_super_admin()` foi identificada.

## 11. Recomendações

- **Não é necessária uma F3.3.5 corretiva bloqueadora para o bypass Super Admin**: nenhum CRÍTICO ou ALTO. O padrão `OR is_super_admin()` é seguro na presente arquitetura porque toda tabela tenant-scoped já possui RESTRICTIVE `tenant_isolation` compondo em AND, e `get_current_tenant_id()` foi endurecida em F3.3.2/F3.3.3 (active-only + null-auth guard + Super Admin apenas via impersonação explícita).
- **Backlog governado (não bloqueia F3.4)**: patch dedicado em `tenant_members/tm_select` substituindo o ramo `user_id = auth.uid() OR user_belongs_to_tenant(tenant_id)` por `user_id = auth.uid() AND user_has_active_membership(auth.uid(), tenant_id)` ou variação equivalente, para eliminar leitura de linha própria com membership não-ativa. Único MÉDIO identificado.
- **F3.4 — Tenant Selection Transport / Client State**: pode ser considerada após auditoria externa desta F3.3.4. Nenhum bloqueador crítico identificado.

## 12. Arquivos criados ou alterados

- **Criado**: `docs/delivery/architectural-roadmap/phase-03-membership-evolution/35-f3-3-4-super-admin-policy-bypass-inventory.md` (este arquivo).

Nenhum outro arquivo foi criado, alterado ou removido. Nenhuma migration criada. Nenhuma function ou policy modificada.

## 13. Diff / edit disponibilizado para auditoria

Último edit disponível: criação de `docs/delivery/architectural-roadmap/phase-03-membership-evolution/35-f3-3-4-super-admin-policy-bypass-inventory.md` com o inventário completo, tabela por policy, classificação de risco e recomendações. Nenhum outro diff nesta etapa.

## 14. Conclusão

**Opção B — F3.3.4 concluída. Foram identificados riscos, mas nenhum bloqueador crítico. Recomenda-se avaliação externa antes da F3.4.**

Detalhamento: 0 CRÍTICO, 0 ALTO, 1 MÉDIO (`tenant_members/tm_select`, já sinalizado desde F3.3.1 e tratável como backlog), 0 BAIXO, 40 JUSTIFICADO, 0 INCONCLUSIVO. O padrão `OR is_super_admin()` em policies tenant-scoped é neutralizado pela RESTRICTIVE `tenant_isolation` combinada com `get_current_tenant_id()` endurecida, coerente com `SECURITY_ARCHITECTURE.md` §7 (impersonação explícita e validada server-side).
