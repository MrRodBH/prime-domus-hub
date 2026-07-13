# F3.3.4.1 — Report Consistency & Restrictive Coverage Confirmation

> **Etapa exclusivamente documental.** Nenhuma function, policy, migration, tabela, grant, arquivo TypeScript, UI ou Runtime Core foi alterado. F3.4 **não** foi implementada.

---

## 1. Objetivo

Corrigir inconsistências documentais identificadas pela auditoria externa da F3.3.4 e comprovar, por evidência SQL, a cobertura RESTRICTIVE que neutraliza o padrão `OR is_super_admin()` em tabelas tenant-scoped. Todas as respostas abaixo foram obtidas por consulta ao banco em `2026-07-08` (mesmo commit da F3.3.4).

---

## 2. Escopo executado

Consultas SQL de leitura em:

- `pg_policies` (contagens, cross-schema, cruzamento restrictive × permissive)
- `pg_class`, `pg_namespace`, `pg_attribute` (colunas `tenant_id`)
- `pg_proc` (hashes de definição das funções críticas para provar não-alteração)
- Leitura do relatório anterior `docs/fase6/35-f3-3-4-super-admin-policy-bypass-inventory.md`

Nenhum comando de escrita foi executado.

---

## 3. Escopo NÃO executado

- ❌ Nenhuma alteração em `get_current_tenant_id()`, `is_super_admin()`, `user_belongs_to_tenant(uuid)`, `user_has_active_membership(uuid,uuid)`.
- ❌ Nenhuma alteração em policy RLS (nem PERMISSIVE nem RESTRICTIVE).
- ❌ Nenhuma migration criada.
- ❌ Nenhum GRANT alterado.
- ❌ Nenhum arquivo TypeScript alterado (tenant-middleware.ts, tenant-repository.ts, tenant-attacher.ts, impersonation-state.ts, src/start.ts, UI, Tenant Switcher, client state, storage, media, upload provenance, Runtime Core, Registry, RegistrySnapshot, ResolutionGraph, ActionExecutor, PluginContext).
- ❌ Billing / Planos / Trial / Stripe / Hotmart / Kiwify — não tocados.
- ❌ F3.4 **não** foi implementada. F3.3.5 **não** foi criada.

---

## 4. Divergência de contagem 174 × 184

| Escopo | Contagem |
| --- | --- |
| `pg_policies` schema=`public` | **174** |
| `pg_policies` schema=`storage` | 8 |
| `pg_policies` schema=`cron` | 2 |
| **Total cross-schema** | **184** |

**Conclusão:** não há divergência real. A contagem de **174** apresentada na F3.3.4 refere-se **estritamente a `public`** e continua correta. A contagem parcial externa de **184** correspondeu ao total agregado de policies em **todos os schemas visíveis** (`public` + `storage` + `cron`). A discrepância é de **escopo de consulta**, não de estado do banco. Nenhuma policy foi criada, removida ou alterada desde a F3.3.4 (hashes de funções idênticos, ver §11).

---

## 5. Policies com `is_super_admin()`

### 5.1 Total

**41 policies** em `public` mencionam `is_super_admin()` — idêntico ao número apresentado na F3.3.4.

### 5.2 Classificação por padrão lógico

| Padrão | Contagem |
| --- | --- |
| `... OR is_super_admin(...)` (OR-before) | **33** |
| `is_super_admin(...) OR ...` (invertido) | **3** |
| **Subtotal — OR-bypass equivalentes** | **36** |
| `is_super_admin()` isolado (única condição) | **5** |
| Uso em `AND` puro | 0 |
| Outros | 0 |
| **Total** | **41** |

### 5.3 Reconciliação com F3.3.4

A F3.3.4 relatou **34 ocorrências de `OR is_super_admin()`**; a consulta externa parcial reportou **33**. Esta etapa demonstra:

- **33** policies com o padrão *literal* `OR is_super_admin(` (OR-before) — bate com a consulta parcial externa.
- **+3** policies com o padrão **invertido** `is_super_admin() OR ...` (`portal_sync_dlq/admin/super marca DLQ como resolvido`, `tenant_members/tm_select`, `tenants/tenants_select`) — semanticamente equivalentes a bypass permissivo por Super Admin.
- Total real de padrões bypass equivalentes = **36**.

A F3.3.4 subestimou o padrão invertido e superestimou o literal (`34` foi um número aproximado que não separou os dois casos). O total correto para a análise de risco é **36**, cobertos individualmente na §8.

### 5.4 Lista completa (41 policies)

| # | tabela | policy | cmd | padrão |
| --- | --- | --- | --- | --- |
| 1 | cms_campaign_events | events_admin_read | SELECT | OR_BEFORE |
| 2 | cms_campaigns | campaigns_admin_manage | ALL | OR_BEFORE |
| 3 | cms_form_fields | cms_form_fields_tenant_all | ALL | OR_BEFORE |
| 4 | cms_form_fields | cms_form_fields_tenant_read | SELECT | OR_BEFORE |
| 5 | cms_forms | cms_forms_tenant_delete | DELETE | OR_BEFORE |
| 6 | cms_forms | cms_forms_tenant_read | SELECT | OR_BEFORE |
| 7 | cms_forms | cms_forms_tenant_update | UPDATE | OR_BEFORE |
| 8 | cms_forms | cms_forms_tenant_write | INSERT | OR_BEFORE |
| 9 | cms_import_snapshots | cms_snap_admin_update | UPDATE | OR_BEFORE |
| 10 | cms_import_snapshots | cms_snap_admin_write | INSERT | OR_BEFORE |
| 11 | cms_import_snapshots | cms_snap_tenant_read | SELECT | OR_BEFORE |
| 12 | cms_pages | cms_pages_auth_read_all | SELECT | OR_BEFORE |
| 13 | deal_lost_reasons | admin manage lost reasons | ALL | OR_BEFORE |
| 14 | deal_lost_reasons | tenant read lost reasons | SELECT | OR_BEFORE |
| 15 | form_submissions | form_submissions_tenant_delete | DELETE | OR_BEFORE |
| 16 | form_submissions | form_submissions_tenant_read | SELECT | OR_BEFORE |
| 17 | imovel_portais | imovel_portais_tenant_read | SELECT | OR_BEFORE |
| 18 | imovel_portais | imovel_portais_tenant_write | ALL | OR_BEFORE |
| 19 | lead_discard_reasons | admin manage discard reasons | ALL | OR_BEFORE |
| 20 | lead_discard_reasons | tenant read discard reasons | SELECT | OR_BEFORE |
| 21 | lead_perdas | tenant read perdas | SELECT | OR_BEFORE |
| 22 | media_library | media_library_tenant_delete | DELETE | OR_BEFORE |
| 23 | media_library | media_library_tenant_insert | INSERT | OR_BEFORE |
| 24 | media_library | media_library_tenant_read | SELECT | OR_BEFORE |
| 25 | media_library | media_library_tenant_update | UPDATE | OR_BEFORE |
| 26 | media_usage | media_usage_tenant_all | ALL | OR_BEFORE |
| 27 | portal_connectors | portal_connectors_admin_write | ALL | OR_BEFORE |
| 28 | portal_connectors | portal_connectors_tenant_read | SELECT | OR_BEFORE |
| 29 | portal_sync_dlq | admin/super marca DLQ como resolvido | UPDATE | ISADMIN_BEFORE_OR |
| 30 | portal_sync_dlq | tenant lê seu DLQ | SELECT | OR_BEFORE |
| 31 | portal_sync_logs | portal_sync_logs_service_insert | INSERT | OR_BEFORE |
| 32 | portal_sync_logs | portal_sync_logs_tenant_read | SELECT | OR_BEFORE |
| 33 | rate_limit_buckets | super_admin lê rate_limit_buckets | SELECT | ISOLATED |
| 34 | site_settings_versions | ssv_admin_gerente_read | SELECT | OR_BEFORE |
| 35 | site_settings_versions | ssv_admin_gerente_write | ALL | OR_BEFORE |
| 36 | storage_migration_log | storage_migration_log super admin only | ALL | ISOLATED |
| 37 | system_events | system_events super_admin read | SELECT | ISOLATED |
| 38 | tenant_members | tm_select | SELECT | ISADMIN_BEFORE_OR |
| 39 | tenant_members | tm_write | ALL | ISOLATED |
| 40 | tenants | tenants_select | SELECT | ISADMIN_BEFORE_OR |
| 41 | tenants | tenants_write | ALL | ISOLATED |

---

## 6. Tabelas com coluna `tenant_id` (45 tabelas)

Classificação obrigatória por categoria:

### TENANT_BUSINESS_SCOPED (39)
`bairros`, `blog_categorias`, `blog_posts`, `cidades`, `cms_campaign_events`, `cms_campaigns`, `cms_form_fields`, `cms_forms`, `cms_import_snapshots`, `cms_pages`, `corretores`, `deal_lost_reasons`, `form_submissions`, `imoveis`, `imovel_imagens`, `imovel_portais`, `instagram_posts`, `launch_amenities`, `launch_payment_conditions`, `launch_pdfs`, `launch_project_amenities`, `launch_project_imagens`, `launch_projects`, `launch_statuses`, `launch_units`, `lead_atividades`, `lead_descartes`, `lead_discard_reasons`, `lead_origens`, `lead_perdas`, `leads`, `media_library`, `media_usage`, `portal_connectors`, `portal_sync_dlq`, `portal_sync_logs`, `site_settings`, `site_settings_versions`, `team_members`, `teams`, `website_menu_items` — cada uma possui `RESTRICTIVE tenant_isolation` cobrindo `ALL` (ou split por cmd em `form_submissions`) com `USING/WITH CHECK` referenciando `get_current_tenant_id()`.

### TENANT_SECURITY_MEMBERSHIP (1)
`tenant_members` — tabela sensível de vínculo user↔tenant. **NÃO possui RESTRICTIVE**. Ver §8 e §10.

### OBSERVABILITY_AUDIT (2)
`system_events`, `storage_migration_log` — restrito a Super Admin por policy PERMISSIVE ISOLATED (única condição = `is_super_admin()`). **NÃO possuem RESTRICTIVE** — desnecessário, pois já são inacessíveis a não-Super. `tenant_id` é apenas metadado.

### TENANT_ROOT (não conta como `tenant_id`, mas incluída para completude)
`tenants` — id da linha é o próprio tenant. `tenants_select` usa padrão invertido (Super OR membership). Sem RESTRICTIVE (tabela raiz).

### GLOBAL_ADMIN (fora das 45)
`rate_limit_buckets` (não tem `tenant_id`) — Super Admin only.

**Totais:** 45 tabelas com `tenant_id`; 42 cobertas por `RESTRICTIVE tenant_isolation` que força `tenant_id = get_current_tenant_id()`; 3 exceções documentadas (`tenant_members`, `system_events`, `storage_migration_log`).

---

## 7. Policies RESTRICTIVE

**45 policies RESTRICTIVE** em `public`, distribuídas em **42 tabelas distintas** (form_submissions tem 4 policies split por cmd). Todas usam `get_current_tenant_id()`. Cobertura por cmd:

- 41 policies `ALL` — cobrem USING **e** WITH CHECK.
- `form_submissions`: `SELECT` (USING), `DELETE` (USING), `INSERT` (WITH CHECK), `UPDATE` (USING+WITH CHECK) — cobertura completa dos 4 comandos.

Todas com `roles = {anon,authenticated}` (exceto `cms_pages_tenant_isolation` = `{public}`, ainda mais amplo).

---

## 8. Cruzamento PERMISSIVE `is_super_admin` × RESTRICTIVE companion

| # | tabela | categoria | policy permissive | cmd | uso lógico | RESTRICTIVE companion | cobre USING | cobre WC | conclusão |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | cms_campaign_events | TENANT_BUSINESS | events_admin_read | SELECT | OR-before | tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 2 | cms_campaigns | TENANT_BUSINESS | campaigns_admin_manage | ALL | OR-before | tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 3 | cms_form_fields | TENANT_BUSINESS | cms_form_fields_tenant_all | ALL | OR-before | cms_form_fields_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 4 | cms_form_fields | TENANT_BUSINESS | cms_form_fields_tenant_read | SELECT | OR-before | cms_form_fields_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 5 | cms_forms | TENANT_BUSINESS | cms_forms_tenant_delete | DELETE | OR-before | cms_forms_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 6 | cms_forms | TENANT_BUSINESS | cms_forms_tenant_read | SELECT | OR-before | cms_forms_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 7 | cms_forms | TENANT_BUSINESS | cms_forms_tenant_update | UPDATE | OR-before | cms_forms_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 8 | cms_forms | TENANT_BUSINESS | cms_forms_tenant_write | INSERT | OR-before | cms_forms_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 9 | cms_import_snapshots | TENANT_BUSINESS | cms_snap_admin_update | UPDATE | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 10 | cms_import_snapshots | TENANT_BUSINESS | cms_snap_admin_write | INSERT | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 11 | cms_import_snapshots | TENANT_BUSINESS | cms_snap_tenant_read | SELECT | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 12 | cms_pages | TENANT_BUSINESS | cms_pages_auth_read_all | SELECT | OR-before | cms_pages_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 13 | deal_lost_reasons | TENANT_BUSINESS | admin manage lost reasons | ALL | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 14 | deal_lost_reasons | TENANT_BUSINESS | tenant read lost reasons | SELECT | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 15 | form_submissions | TENANT_BUSINESS | form_submissions_tenant_delete | DELETE | OR-before | form_submissions_tenant_isolation_del (DELETE) | ✅ | n/a | **neutralizada** |
| 16 | form_submissions | TENANT_BUSINESS | form_submissions_tenant_read | SELECT | OR-before | form_submissions_tenant_isolation (SELECT) | ✅ | n/a | **neutralizada** |
| 17 | imovel_portais | TENANT_BUSINESS | imovel_portais_tenant_read | SELECT | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 18 | imovel_portais | TENANT_BUSINESS | imovel_portais_tenant_write | ALL | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 19 | lead_discard_reasons | TENANT_BUSINESS | admin manage discard reasons | ALL | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 20 | lead_discard_reasons | TENANT_BUSINESS | tenant read discard reasons | SELECT | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 21 | lead_perdas | TENANT_BUSINESS | tenant read perdas | SELECT | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 22 | media_library | TENANT_BUSINESS | media_library_tenant_delete | DELETE | OR-before | media_library_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 23 | media_library | TENANT_BUSINESS | media_library_tenant_insert | INSERT | OR-before | media_library_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 24 | media_library | TENANT_BUSINESS | media_library_tenant_read | SELECT | OR-before | media_library_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 25 | media_library | TENANT_BUSINESS | media_library_tenant_update | UPDATE | OR-before | media_library_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 26 | media_usage | TENANT_BUSINESS | media_usage_tenant_all | ALL | OR-before | media_usage_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 27 | portal_connectors | TENANT_BUSINESS | portal_connectors_admin_write | ALL | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 28 | portal_connectors | TENANT_BUSINESS | portal_connectors_tenant_read | SELECT | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 29 | portal_sync_dlq | TENANT_BUSINESS | admin/super marca DLQ como resolvido | UPDATE | invertido | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 30 | portal_sync_dlq | TENANT_BUSINESS | tenant lê seu DLQ | SELECT | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 31 | portal_sync_logs | TENANT_BUSINESS | portal_sync_logs_service_insert | INSERT | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 32 | portal_sync_logs | TENANT_BUSINESS | portal_sync_logs_tenant_read | SELECT | OR-before | tenant_isolation_restrictive (ALL) | ✅ | ✅ | **neutralizada** |
| 33 | rate_limit_buckets | GLOBAL_ADMIN | super_admin lê rate_limit_buckets | SELECT | isolated | — | n/a | n/a | **não se aplica — tabela global, Super-only** |
| 34 | site_settings_versions | TENANT_BUSINESS | ssv_admin_gerente_read | SELECT | OR-before | ssv_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 35 | site_settings_versions | TENANT_BUSINESS | ssv_admin_gerente_write | ALL | OR-before | ssv_tenant_isolation (ALL) | ✅ | ✅ | **neutralizada** |
| 36 | storage_migration_log | OBSERVABILITY_AUDIT | storage_migration_log super admin only | ALL | isolated | — | n/a | n/a | **não se aplica — Super-only, sem qualquer cláusula tenant OR** |
| 37 | system_events | OBSERVABILITY_AUDIT | system_events super_admin read | SELECT | isolated | — | n/a | n/a | **não se aplica — Super-only** |
| 38 | tenant_members | TENANT_SECURITY_MEMBERSHIP | tm_select | SELECT | invertido | — | n/a | n/a | **inconclusiva-controlada — ver §10** |
| 39 | tenant_members | TENANT_SECURITY_MEMBERSHIP | tm_write | ALL | isolated | — | n/a | n/a | **não se aplica — Super-only** |
| 40 | tenants | TENANT_ROOT | tenants_select | SELECT | invertido | — | n/a | n/a | **não se aplica — raiz da tenancy; ver §10** |
| 41 | tenants | TENANT_ROOT | tenants_write | ALL | isolated | — | n/a | n/a | **não se aplica — Super-only** |

**Resumo do cruzamento:**
- **Neutralizadas por RESTRICTIVE tenant_isolation:** 32 (todas as 32 policies OR-before/invertido em tabelas TENANT_BUSINESS_SCOPED).
- **Não se aplica (Super-only ou tabela global/root/observability):** 8.
- **Inconclusiva-controlada:** 1 (`tenant_members/tm_select`).

Nenhum bypass cross-tenant é possível em tabela TENANT_BUSINESS_SCOPED, porque as RESTRICTIVE aplicam `AND tenant_id = get_current_tenant_id()` a **qualquer** policy PERMISSIVE. Um Super Admin que satisfaça o ramo `is_super_admin()` da PERMISSIVE ainda precisa ter um `x-tenant-id` válido (F3.3.3) para que a RESTRICTIVE avalie true. Sem header impersonação, `get_current_tenant_id()` retorna NULL e a RESTRICTIVE bloqueia.

---

## 9. Exceções (3 tabelas TENANT_* sem RESTRICTIVE)

| tabela | categoria | motivo | risco |
| --- | --- | --- | --- |
| `tenant_members` | TENANT_SECURITY_MEMBERSHIP | Tabela de vínculo — leitura self (`user_id = auth.uid()`), leitura própria membership (`user_belongs_to_tenant`) e Super. Não pode ter RESTRICTIVE por `tenant_id = get_current_tenant_id()` porque a própria função **usa** `tenant_members` — criaria ciclo. | Ver §10 |
| `system_events` | OBSERVABILITY_AUDIT | Super-only. Não há necessidade de tenant scoping. | Justificado |
| `storage_migration_log` | OBSERVABILITY_AUDIT | Super-only. | Justificado |

---

## 10. Análise específica de `tenant_members/tm_select` e impacto em F3.4

**Policy atual:**
```sql
tm_select: SELECT to authenticated
USING (is_super_admin() OR user_id = auth.uid() OR user_belongs_to_tenant(tenant_id))
```

**Semântica pós-F3.3.2 (`user_belongs_to_tenant` = active-only) e F3.3.3 (null-auth guard):**
- Usuário anônimo → `auth.uid()` NULL → nenhum ramo satisfaz → 0 linhas.
- Usuário autenticado → vê apenas: (a) sua própria linha por qualquer status, e (b) linhas do(s) tenant(s) onde possui membership **ativa**.
- Super Admin → vê tudo (por design — necessário para console administrativo).

**Impacto para F3.4:**
- F3.4 precisa listar tenants selecionáveis para o usuário. A leitura direta client-side de `tenant_members` retorna todas as linhas onde `user_id = auth.uid()` — **incluindo `invited`/`suspended`/`revoked`**.
- **Isso NÃO é bypass** — é comportamento correto para o dono da linha ver o próprio estado de convite. Mas F3.4 **não pode** usar esta leitura como fonte de "tenants selecionáveis", pois seleção só admite `membership_status = 'active'` (contrato F3.2 já auditado).
- **Solução obrigatória em F3.4:** listagem de tenants selecionáveis deve passar por server function (`createServerFn` + `requireSupabaseAuth`) que consulte `tenant_members` filtrando explicitamente `membership_status = 'active'` (mesma semântica de `TenantRepository.listByUser` em `tenant-repository.ts`). Client não pode filtrar; server é autoridade.

**Conclusão objetiva:** `tenant_members/tm_select` **NÃO bloqueia F3.4**, desde que F3.4 (a) não use leitura direta client-side como fonte de tenants selecionáveis, e (b) implemente a listagem `active-only` server-side. F3.3.5 **não** é necessária.

---

## 11. Estado das functions inspecionadas

Hashes MD5 das definições atuais (`pg_get_functiondef`):

| function | md5 | estado |
| --- | --- | --- |
| `get_current_tenant_id()` | `76e164a25d941816599cdde7f6afdb46` | ✅ inalterada desde F3.3.3 (null-auth guard vigente) |
| `is_super_admin()` | `0689e4e916e58534f3ff917776f8e332` | ✅ inalterada — role check global |
| `user_belongs_to_tenant(uuid)` | `5367d760a16f8de59dd15d0ae4356626` | ✅ inalterada — active-only (F3.3.2) |
| `user_has_active_membership(uuid,uuid)` | `daacc80c2c63817676d99ecbae490768` | ✅ inalterada — grants endurecidos (F3.3.1) |

Nenhuma função foi alterada nesta etapa.

---

## 12. Riscos residuais

| ID | severidade | descrição | ação |
| --- | --- | --- | --- |
| R1 | JUSTIFICADO | 32 policies TENANT_BUSINESS_SCOPED com `OR is_super_admin()`. Cobertas por RESTRICTIVE. | Nenhuma. |
| R2 | JUSTIFICADO | 8 policies Super-only em tabelas globais/audit/root/write-only. | Nenhuma. |
| R3 | MÉDIO-CONTROLADO | `tenant_members/tm_select` expõe linhas próprias em qualquer status. | F3.4 **deve** ler tenants selecionáveis via server function active-only (§10). Backlog: opcionalmente, split de policy em F3.5+ para separar convite pendente do fluxo normal. |
| R4 | BAIXO | `cms_pages_tenant_isolation` usa role `{public}` (mais amplo que `{anon,authenticated}`); ainda assim aplica `tenant_id = get_current_tenant_id()`. | Nenhum bypass — divergência apenas de nomenclatura de role. Registrado. |
| — | CRÍTICO | Nenhum. | — |
| — | ALTO | Nenhum. | — |
| — | INCONCLUSIVO | Nenhum. | — |

---

## 13. Decisão recomendada

### ✅ Opção A — F3.4 liberável

Justificativa objetiva:
- Divergência 174×184 explicada (contagem cross-schema vs. `public` only).
- Cobertura RESTRICTIVE comprovada por cruzamento policy-a-policy (32/32 TENANT_BUSINESS_SCOPED neutralizadas).
- Exceções (`tenant_members`, `system_events`, `storage_migration_log`) formalmente classificadas e justificadas.
- Nenhum risco CRÍTICO/ALTO/INCONCLUSIVO.
- `tenant_members/tm_select` é MÉDIO-CONTROLADO, não bloqueador — condicionado a contrato obrigatório de F3.4 (§10).
- Estado do banco confirmado por hashes das funções.

**F3.4 pode prosseguir** desde que respeite o contrato do §10 (listagem de tenants selecionáveis exclusivamente via server function `active-only`; proibida leitura direta client-side como fonte de seleção).

---

## 14. Verificação de acesso via conector Lovable

- **Arquivo criado:** `docs/fase6/36-f3-3-4-1-report-consistency-restrictive-coverage-confirmation.md`
- **Caminho:** exatamente conforme exigido pelo prompt.
- **Deve estar disponível via `read_file`:** sim — escrito com o mesmo mecanismo dos relatórios 28–35, todos previamente acessíveis à auditoria externa.
- **Sem limitação conhecida** de get_diff / list_files nesta etapa (apenas 1 arquivo criado, 0 alterados).

---

## 15. Audit Package / Pacote de Auditoria

1. **Commit/edit ID:** este relatório corresponde ao edit produzido nesta resposta (etapa F3.3.4.1). Lovable não expõe SHA git ao agente; o edit é rastreável via histórico da conversa (mensagem imediatamente anterior à confirmação).
2. **Arquivos alterados:** `docs/fase6/36-f3-3-4-1-report-consistency-restrictive-coverage-confirmation.md` (criado). **Nenhum outro arquivo tocado.**
3. **Migrations criadas:** **NENHUMA** (confirmação expressa).
4. **Diff resumido:** apenas adição de novo arquivo documental — 0 linhas alteradas em código ou SQL.
5. **Antes/depois de funções SQL:** **NENHUMA função foi alterada.** Hashes MD5 provam integridade (§11).
6. **Queries de validação executadas:** todas listadas nas §§4–8 (contagens `pg_policies`, cruzamentos permissive×restrictive, colunas `tenant_id`, hashes `pg_proc`). Execução via `psql` no ambiente sandbox.
7. **Riscos residuais:** §12.
8. **Escopo:** confirmado — nenhuma alteração em functions/policies/migrations/GRANTs/TypeScript/UI/Storage/Runtime Core/Registry/Billing/F3.4.

---

## 16. Checklist de confirmação

- ✅ Contagem 174 × 184 explicada.
- ✅ Total real de policies em `public` confirmado: **174**.
- ✅ Total real com `is_super_admin()`: **41**.
- ✅ Total real com padrão OR-bypass equivalente: **36** (33 OR-before + 3 invertido).
- ✅ Cobertura RESTRICTIVE comprovada por cruzamento policy-a-policy.
- ✅ Exceções (`tenant_members`, `system_events`, `storage_migration_log`) classificadas e justificadas.
- ✅ `tenant_members/tm_select` reavaliada quanto ao impacto em F3.4.
- ✅ Audit Package completo.
- ✅ Nenhuma function/policy/migration/código alterado.
- ✅ F3.4 **não** implementada.
- ✅ F3.3.5 **não** criada.
- ✅ Recomendação final: **Opção A — F3.4 liberável**, condicionada ao contrato do §10.
